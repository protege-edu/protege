import { z } from "zod";
import { aiConfig } from "./config";
import { inLine, type Priority } from "./queue";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ChatResult<T> =
  | { ok: true; data: T; ms: number }
  // too_long: more than the model can read at once (Ollama's context), so asking again won't help
  | { ok: false; reason: "unreachable" | "timeout" | "invalid" | "too_long"; detail: string; ms: number };

/**
 * Ask the model for JSON that matches a Zod schema.
 * The schema is sent as JSON Schema so the model is forced to follow it,
 * and the answer is checked with Zod again here because we never trust it blindly.
 */
export async function chatJSON<T>(opts: {
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  name: string;
  temperature?: number;
  maxTokens?: number;
  /** Chat replies use the short default; long jobs (drafting a lesson) pass more */
  timeoutMs?: number;
  /** live: a student is waiting (default). background: drafting, goes after every student */
  priority?: Priority;
  /** while waiting in line: how many calls are ahead */
  onWait?: (ahead: number) => void;
}): Promise<ChatResult<T>> {
  // the clock for the timeout starts when it's this call's turn, not while it waits in line
  return inLine(() => callModel(opts), { priority: opts.priority, onWait: opts.onWait });
}

async function callModel<T>(opts: { messages: ChatMessage[]; schema: z.ZodType<T>; name: string; temperature?: number; maxTokens?: number; timeoutMs?: number }): Promise<ChatResult<T>> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? aiConfig.timeoutMs);

  try {
    const res = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.8,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.name, strict: true, schema: z.toJSONSchema(opts.schema) },
        },
      }),
    });

    if (!res.ok) {
      const said = (await res.text().catch(() => "")).slice(0, 300);
      // Ollama turns down a request longer than it can read: that isn't "the AI is off"
      if (res.status === 400 && /context/i.test(said)) return { ok: false, reason: "too_long", detail: said, ms: Date.now() - start };
      return { ok: false, reason: res.status >= 500 || res.status === 404 ? "unreachable" : "invalid", detail: `HTTP ${res.status} ${said}`, ms: Date.now() - start };
    }

    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    const parsed = opts.schema.safeParse(safeJSON(text));
    if (!parsed.success) {
      return { ok: false, reason: "invalid", detail: parsed.error.message.slice(0, 300), ms: Date.now() - start };
    }
    return { ok: true, data: parsed.data, ms: Date.now() - start };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      reason: aborted ? "timeout" : "unreachable",
      detail: err instanceof Error ? err.message : String(err),
      ms: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Is the model running? Also "warms it up" (loads it into memory) so the
 * student's first message doesn't wait for a cold start.
 */
export async function checkBrain(): Promise<{ online: boolean; model: string }> {
  try {
    const res = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiConfig.apiKey}` },
      body: JSON.stringify({ model: aiConfig.model, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
    });
    return { online: res.ok, model: aiConfig.model };
  } catch {
    return { online: false, model: aiConfig.model };
  }
}

function safeJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some models wrap JSON in extra text. Grab the outermost {...}.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
