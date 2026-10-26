/**
 * The ONLY place that knows which model we use.
 * To switch models or providers, change .env.local. Nothing else.
 *
 *   AI_BASE_URL  any OpenAI-compatible endpoint (default: local Ollama)
 *   AI_MODEL     model name (default: qwen3:4b-instruct, the fairest judge in our evals)
 *   AI_API_KEY   only for providers that need one (Ollama doesn't)
 *   AI_CONCURRENCY  how many AI calls run at once (the rest wait in line, see queue.ts).
 *                   2 measured best on the dev laptop (Intel Arc) with a real class: 4 at once helps short
 *                   judge questions but slows Gloam's longer reply prompts, and a class got slower overall.
 *                   Try other numbers with `npm run load-test` on a faster GPU.
 */
export const aiConfig = {
  baseUrl: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
  model: process.env.AI_MODEL ?? "qwen3:4b-instruct",
  apiKey: process.env.AI_API_KEY ?? "ollama",
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 45_000),
  concurrency: Math.max(1, Number(process.env.AI_CONCURRENCY ?? 2)),
};
