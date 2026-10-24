/**
 * The ONLY place that knows which model we use.
 * To switch models or providers, change .env.local. Nothing else.
 *
 *   AI_BASE_URL  any OpenAI-compatible endpoint (default: local Ollama)
 *   AI_MODEL     model name (default: qwen2.5:3b, small and fast on a laptop)
 *   AI_API_KEY   only for providers that need one (Ollama doesn't)
 */
export const aiConfig = {
  baseUrl: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
  model: process.env.AI_MODEL ?? "qwen2.5:3b",
  apiKey: process.env.AI_API_KEY ?? "ollama",
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 45_000),
};
