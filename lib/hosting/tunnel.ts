import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/db/location";

/**
 * The online address while "Start Protégé online" is running (its tunnel, scripts/lib/tunnel.ts), so the
 * projector and "Ready for class?" can show it. The launcher writes it and removes it when it stops; if it
 * stopped without tidying up, the tunnel's process is gone, and the address is ignored.
 */
const file = () => path.join(dataDir(), "tunnel.json");

export function saveTunnel(url: string, pid: number) {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify({ url, pid, at: Date.now() }));
}

export function clearTunnel() {
  fs.rmSync(file(), { force: true });
}

/** The tunnel's address, if one is running right now */
export function currentTunnel(): string | null {
  try {
    const t = JSON.parse(fs.readFileSync(file(), "utf8")) as { url?: string; pid?: number };
    if (!t.url || !t.pid) return null;
    // (throws if that process is gone)
    process.kill(t.pid, 0);
    return t.url;
  } catch {
    return null;
  }
}
