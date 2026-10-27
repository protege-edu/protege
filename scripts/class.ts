/**
 * Run Protégé for a real class from the code, in one command:
 *   npm run class                 build, start, and show the address students use (same Wi-Fi)
 *   npm run class -- --tunnel     ...and open a free tunnel, so students can join from anywhere
 *   npm run class -- --no-build   start the last build again (faster)
 *
 * It checks the AI first (Ollama running, Gloam's model downloaded), so class doesn't start with a broken Gloam,
 * and starts voice typing (whisper.cpp, on this laptop only) if `npm run voice:setup` was run once.
 * (Teachers who downloaded Protégé use the launcher instead: scripts/launch.ts, same steps.)
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { announce, children, ensureAI, relay, say, startReadAloud, startVoice, stopAll } from "./lib/run";

loadEnvConfig(process.cwd());
const PORT = Number(process.env.PORT ?? 3000);
const has = (flag: string) => process.argv.includes(flag);

async function main() {
  say("\nProtégé: getting ready for class\n");
  await ensureAI();
  await startVoice();
  await startReadAloud([...process.execArgv, path.join(path.dirname(path.resolve(process.argv[1])), "speak.ts")]);

  if (!has("--no-build")) {
    say("… building (about a minute)");
    const b = spawnSync("npx next build", { stdio: "ignore", shell: true });
    if (b.status !== 0) {
      say("The build failed. Run `npx next build` to see why.");
      process.exit(1);
    }
    say("✓ Built");
  }

  const server = spawn(`npx next start -p ${PORT} -H 0.0.0.0`, { stdio: ["ignore", "pipe", "inherit"], shell: true });
  children.push(server);
  relay(server);
  await announce(PORT, { useTunnel: has("--tunnel") });
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
void main();
