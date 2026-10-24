import { z } from "zod";
import { aiConfig } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type ChatResult<T> =
  | { ok: true; data: T; ms: number }
  | { ok: false; reason: "unreachable" | "timeout" | "invalid"; detail: string; ms: number };

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
}): Promise<ChatResult<T>> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiConfig.timeoutMs);

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
      return { ok: false, reason: "unreachable", detail: `HTTP ${res.status}`, ms: Date.now() - start };
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
