import "server-only";
import { checkBrain } from "@/lib/ai/client";
import { voiceReady } from "@/lib/voice/server";
import { speakReady } from "@/lib/voice/speak";
import pkg from "../../package.json";

/**
 * The teacher's status page: is everything this laptop runs for a class working, and if not,
 * what to do about it, in plain words.
 */
export interface StatusCheck {
  id: "ai" | "voice" | "reading" | "address";
  ok: boolean | "optional";
  title: string;
  detail: string;
}

export const VERSION: string = pkg.version;
/** Where updates are published (GitHub releases). Set PROTEGE_REPO="owner/name", or "repository" in package.json. */
export const UPDATE_REPO: string | null = process.env.PROTEGE_REPO ?? ((pkg as { repository?: string }).repository?.replace(/^github:/, "") || null);

async function aiCheck(): Promise<StatusCheck> {
  const { online, model } = await checkBrain();
  return online
    ? { id: "ai", ok: true, title: "Gloam's brain is ready", detail: `Claude (${model}) is answering.` }
    : { id: "ai", ok: false, title: "Gloam's brain can't be reached", detail: "Check the internet connection and the Claude API key. Students' messages wait safely until it's back." };
}

export async function laptopStatus(address: { url: string; local: boolean; locator: string | null; site: string }): Promise<StatusCheck[]> {
  const [voice, reading] = await Promise.all([voiceReady(), speakReady()]);
  return [
    await aiCheck(),
    voice
      ? { id: "voice", ok: true, title: "Voice typing is on", detail: "Students can talk instead of typing. Their voice is turned into words on this laptop and never saved." }
      : { id: "voice", ok: "optional", title: "Voice typing is off", detail: "Optional. To turn it on, run `npm run voice:setup` once, then start class with `npm run class`." },
    reading
      ? { id: "reading", ok: true, title: "Gloam's voice is on", detail: "Read-aloud uses Gloam's natural voice, made on this laptop. Nothing is saved." }
      : { id: "reading", ok: "optional", title: "Read-aloud uses each device's voice", detail: "Optional: for Gloam's natural voice, run `npm run voice:setup` once, then start class with `npm run class`. Until then, students' own devices read aloud (it sounds more robotic)." },
    address.locator && !address.local && /trycloudflare\.com/.test(address.url)
      ? { id: "address", ok: true, title: `Students go to ${address.site.replace(/^https?:\/\//, "")}/j`, detail: `And type the code on the projector (Show the code). Online through a Cloudflare quick tunnel (${address.url}), so it works on any network; this laptop's room on the website keeps the link the same every class. Cloudflare's servers can see what students type through it, so it's fine for trying Protégé out; for a real class, check your school is okay with it.` }
      : address.locator
      ? { id: "address", ok: true, title: `Students go to ${address.site.replace(/^https?:\/\//, "")}/j`, detail: `And type the code on the projector (Show the code). It sends them to this laptop (${address.url}), so it works when students are on the same Wi-Fi. If your school's Wi-Fi keeps devices apart, start Protégé online instead.` }
      : address.local
      ? { id: "address", ok: true, title: `Students go to ${address.url}`, detail: "Works when students are on the same Wi-Fi as this laptop. To let students join from anywhere, see \"Students outside the school network\" in the setup guide." }
      : /trycloudflare\.com/.test(address.url)
        ? { id: "address", ok: true, title: `Students go to ${address.url}`, detail: "Online through a Cloudflare quick tunnel: it works on any network, even school Wi-Fi that keeps devices apart. The address is new each time you start Protégé online. Cloudflare's servers can see what students type through it, so it's fine for trying Protégé out; for a real class, check your school is okay with it." }
        : { id: "address", ok: true, title: `Students go to ${address.url}`, detail: "Reachable from anywhere, over https, encrypted all the way to this laptop." },
  ];
}

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0));
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

/** Only when the teacher presses "Check for updates": asks GitHub for the latest release (no student data involved) */
export async function checkForUpdate(): Promise<{ state: "none" | "available" | "unknown"; latest?: string; url?: string; message: string }> {
  if (!UPDATE_REPO) return { state: "unknown", message: "Updates aren't set up for this copy of Protégé yet." };
  try {
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { state: "unknown", message: "Couldn't check right now. Try again later." };
    const r = (await res.json()) as { tag_name: string; html_url: string };
    return newer(r.tag_name, VERSION)
      ? {
          state: "available",
          latest: r.tag_name,
          // the website's install page (download and run the new installer: classes are kept), or the release itself
          url: (pkg as { homepage?: string }).homepage ? `${(pkg as { homepage: string }).homepage}/guide#update` : r.html_url,
          message: `Version ${r.tag_name.replace(/^v/, "")} is out (you have ${VERSION}).`,
        }
      : { state: "none", message: `You have the latest version (${VERSION}).` };
  } catch {
    return { state: "unknown", message: "Couldn't reach the internet to check. That's fine: Protégé works without it." };
  }
}
