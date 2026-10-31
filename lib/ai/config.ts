/**
 * The ONLY place that knows which model we use.
 * To switch models, change the environment (.env locally, the hosting settings online). Nothing else.
 *
 *   ANTHROPIC_API_KEY  the Claude API key (CLAUDE_API_KEY works too). Server only: never sent to a browser.
 *   AI_MODEL           model name (default: Claude Haiku 5.5: fast, and cheap enough for a whole class)
 *   AI_TIMEOUT_MS      how long one call may take before Gloam gives up on it
 *   AI_CONCURRENCY     how many AI calls one server runs at once (the rest wait in line, see queue.ts)
 */
export const aiConfig = {
  model: process.env.AI_MODEL ?? "claude-haiku-5-5",
  get apiKey() {
    return process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
  },
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30_000),
  concurrency: Math.max(1, Number(process.env.AI_CONCURRENCY ?? 16)),
};
