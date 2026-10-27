import { z } from "zod";
import { clientIp, forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { currentStudent } from "@/lib/student/auth";
import { speak, speakBusy, speakReady } from "@/lib/voice/speak";
import { isSpokenVoice, SPOKEN_MAX_CHARS } from "@/lib/voice/voices";

/** Can this laptop read aloud in Gloam's voice right now? (If not, the browser uses the device's voice.) */
export async function GET() {
  return Response.json({ ready: await speakReady() });
}

const Ask = z.object({
  text: z.string().trim().min(1).max(SPOKEN_MAX_CHARS),
  voice: z.string().refine(isSpokenVoice),
  speed: z.number().min(0.7).max(1.3),
});

/**
 * Read-aloud: a piece of a line in, Gloam's voice out (WAV), made on this laptop. The words are only held
 * in memory (see lib/voice/speak.ts), never saved or logged, and never sent anywhere else.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  // a line is a few pieces, and a whole class can share one address: this only stops floods
  if (!limit(`speak:${clientIp(request)}`, 600, 60 * 1000)) return tooMany();
  const me = await currentStudent();
  if (me && !limit(`speak-student:${me.id}`, 60, 60 * 1000)) return tooMany();
  const ask = Ask.safeParse(await request.json().catch(() => null));
  if (!ask.success || !isSpokenVoice(ask.data.voice)) return Response.json({ error: "bad request" }, { status: 400 });
  if (speakBusy()) return Response.json({ error: "busy" }, { status: 503 });
  try {
    const wav = await speak(ask.data.text, { name: ask.data.voice, speed: ask.data.speed });
    return new Response(wav, { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "not running" }, { status: 503 });
  }
}
