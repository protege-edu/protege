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
  fs.writeFileSync(file(), JSON.stringify({ url, pid, room: null, at: Date.now() }));
}

/** The tunnel's room on the website (functions/api/room), once it has one */
export function saveTunnelRoom(room: string) {
  try {
    fs.writeFileSync(file(), JSON.stringify({ ...JSON.parse(fs.readFileSync(file(), "utf8")), room }));
  } catch {
    // (no tunnel any more: nothing to add it to)
  }
}

export function clearTunnel() {
  fs.rmSync(file(), { force: true });
}

/** The tunnel's address (and its room on the website), if one is running right now */
export function currentTunnel(): { url: string; room: string | null } | null {
  try {
    const t = JSON.parse(fs.readFileSync(file(), "utf8")) as { url?: string; pid?: number; room?: string | null };
    if (!t.url || !t.pid) return null;
    // (throws if that process is gone)
    process.kill(t.pid, 0);
    return { url: t.url, room: t.room ?? null };
  } catch {
    return null;
  }
}
