import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { aiConfig } from "./config";
import { inLine, type Priority } from "./queue";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export type ChatResult<T> =
  | { ok: true; data: T; ms: number; usage: Usage }
  // unreachable: no key, or Claude can't be reached. busy: Claude is overloaded or we hit our rate limit.
  // refused: Claude's safety check declined. too_long: more than the model can read at once.
  | { ok: false; reason: "unreachable" | "busy" | "timeout" | "invalid" | "refused" | "too_long"; detail: string; ms: number };

/** Every token this server has used since it started (the eval and the load test print it) */
export const usageTotals: Usage & { calls: number } = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };

let client: Anthropic | null = null;
function claude(): Anthropic | null {
  if (!aiConfig.apiKey) return null;
  // the SDK retries short outages and "overloaded" answers itself (with backoff)
  return (client ??= new Anthropic({ apiKey: aiConfig.apiKey, maxRetries: 2, timeout: aiConfig.timeoutMs }));
}

/**
 * Ask Claude for JSON that matches a Zod schema (structured outputs: Claude can only answer in that shape),
 * and check it with Zod again here, because we never trust it blindly.
 *
 * Saving tokens is built in:
 *   - the system part is cached, so every call after the first reads it at a tenth of the price
 *     (keep it the same for a whole lesson, and put what changes in the user message)
 *   - thinking is off unless a call asks for it, and effort is low: these are short, focused jobs
 *   - maxTokens stays small, so a rambling answer can't cost much
 */
export async function chatJSON<T>(opts: {
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  name: string;
  maxTokens?: number;
  /** let Claude think first (costs tokens): only for jobs that need it, like drafting a lesson */
  thinking?: boolean;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
  /** live: a student is waiting (default). background: drafting, goes after every student */
  priority?: Priority;
  /** while waiting in line: how many calls are ahead */
  onWait?: (ahead: number) => void;
}): Promise<ChatResult<T>> {
  // the clock for the timeout starts when it's this call's turn, not while it waits in line
  return inLine(() => callModel(opts), { priority: opts.priority, onWait: opts.onWait });
}

async function callModel<T>(opts: { messages: ChatMessage[]; schema: z.ZodType<T>; name: string; maxTokens?: number; thinking?: boolean; effort?: "low" | "medium" | "high"; timeoutMs?: number }): Promise<ChatResult<T>> {
  const start = Date.now();
  const fail = (reason: Extract<ChatResult<T>, { ok: false }>["reason"], detail: string): ChatResult<T> => {
    // for whoever runs Protégé (never shown to students, and never what a student wrote)
    if (reason !== "invalid") console.warn(`[ai] ${opts.name}: ${reason} (${detail.slice(0, 160)})`);
    return { ok: false, reason, detail, ms: Date.now() - start };
  };
  const api = claude();
  if (!api) return fail("unreachable", "no API key (set ANTHROPIC_API_KEY)");

  const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const turns = opts.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  try {
    const res = await api.messages.parse(
      {
        model: aiConfig.model,
        max_tokens: opts.maxTokens ?? 1024,
        ...(system ? { system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }] } : {}),
        messages: turns,
        thinking: opts.thinking ? { type: "adaptive" } : { type: "disabled" },
        output_config: { effort: opts.effort ?? "low", format: zodOutputFormat(opts.schema) },
      },
      { timeout: opts.timeoutMs ?? aiConfig.timeoutMs },
    );
    const usage: Usage = {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
      cacheWrite: res.usage.cache_creation_input_tokens ?? 0,
    };
    usageTotals.calls++;
    for (const k of ["input", "output", "cacheRead", "cacheWrite"] as const) usageTotals[k] += usage[k];

    if (res.stop_reason === "refusal") return fail("refused", res.stop_details?.category ?? "declined");
    if (res.stop_reason === "max_tokens") return fail("invalid", "ran out of room (max_tokens)");
    const parsed = opts.schema.safeParse(res.parsed_output);
    if (!parsed.success) return fail("invalid", parsed.error.message.slice(0, 300));
    return { ok: true, data: parsed.data, ms: Date.now() - start, usage };
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) return fail("timeout", err.message);
    if (err instanceof Anthropic.APIConnectionError) return fail("unreachable", err.message);
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) return fail("busy", err.message);
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return fail("unreachable", err.message);
    if (err instanceof Anthropic.BadRequestError) return fail(/too long|context/i.test(err.message) ? "too_long" : "invalid", err.message);
    if (err instanceof Anthropic.APIError) return fail(err.status && err.status >= 500 ? "busy" : "invalid", err.message);
    // the answer didn't fit the schema (structured outputs make this rare)
    return fail("invalid", err instanceof Error ? err.message : String(err));
  }
}

/** Can we reach Claude with this key? (Asks for the model's details: costs no tokens.) */
export async function checkBrain(): Promise<{ online: boolean; model: string }> {
  const api = claude();
  if (!api) return { online: false, model: aiConfig.model };
  try {
    await api.models.retrieve(aiConfig.model, {}, { timeout: 10_000 });
    return { online: true, model: aiConfig.model };
  } catch {
    return { online: false, model: aiConfig.model };
  }
}
