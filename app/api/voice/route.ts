import { clientIp, forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { currentStudent } from "@/lib/student/auth";
import { checkWav, transcribe, voiceBusy, voiceReady } from "@/lib/voice/server";

/** A minute of 16 kHz mono speech, plus a little */
const MAX_BYTES = 2_000_000;

/** The request body, or null as soon as it's bigger than `max` (never reads a flood into memory) */
async function readCapped(request: Request, max: number): Promise<ArrayBuffer | null> {
  if (!request.body) return null;
  const parts: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > max) return null;
    parts.push(chunk);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out.buffer;
}

/** Can this laptop turn speech into words right now? (The mic button only shows when something can.) */
export async function GET() {
  return Response.json({ ready: await voiceReady() });
}

/**
 * Voice typing: a WAV clip in, the words out. The clip is only held in memory while whisper.cpp
 * (on this laptop) listens to it, then it's gone. Nothing is saved, nothing is logged, nothing leaves
 * this computer. The words go back to the student's box to check, then through the same safety
 * checks as anything typed.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  // a student talks maybe a few times a minute; this only stops floods (a whole class can share one address)
  if (!limit(`voice:${clientIp(request)}`, 240, 60 * 1000)) return tooMany();
  const me = await currentStudent();
  if (me && !limit(`voice-student:${me.id}`, 12, 60 * 1000)) return tooMany();
  if (!(request.headers.get("content-type") ?? "").startsWith("audio/wav")) {
    return Response.json({ error: "That recording didn't come through right. Try again." }, { status: 400 });
  }
  // refuse anything bigger than a minute of speech before reading it all
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > MAX_BYTES) return Response.json({ error: "That was a long one! Try saying it in shorter parts." }, { status: 413 });
  const language = new URL(request.url).searchParams.get("lang") === "fr" ? "fr" : "en";
  const wav = await readCapped(request, MAX_BYTES);
  const check = wav ? checkWav(wav) : "long";
  if (!wav || check === "long") return Response.json({ error: "That was a long one! Try saying it in shorter parts." }, { status: 413 });
  if (check === "bad") return Response.json({ error: "That recording didn't come through right. Try again." }, { status: 400 });
  if (voiceBusy()) return Response.json({ error: "Lots of people are talking right now. Try again in a moment, or type it." }, { status: 503 });
  try {
    return Response.json({ text: await transcribe(wav, language) });
  } catch {
    return Response.json({ error: "Voice typing isn't running on your teacher's laptop right now. Type it for now." }, { status: 503 });
  }
}
