import { z } from "zod";
import { runTurn } from "@/lib/ai/companion";
import { getSession, recordTurn } from "@/lib/companion/session";
import { lessonRecap } from "@/lib/lesson";
import { getApprovedLesson } from "@/lib/teacher/lessons";

const Body = z.object({
  sessionId: z.string().min(1),
  message: z.string().trim().min(1).max(600),
  /** Most of the message was pasted in, not typed */
  pasted: z.boolean().optional(),
});

/**
 * One teaching turn. Streams newline-separated JSON events:
 *   {"type":"judged", ...}  as soon as we know what the student explained (candles react)
 *   {"type":"reply", ...}   when Gloam has finished talking
 *   {"type":"offline"}      the model isn't running
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That message didn't come through right. Try sending it again." }, { status: 400 });
  }
  const session = getSession(parsed.data.sessionId);
  if (!session) {
    return Response.json({ error: "This session ended. Refresh the page to start a new one." }, { status: 404 });
  }

  const lesson = getApprovedLesson(session.lessonId);
  if (!lesson) {
    return Response.json({ error: "This lesson isn't available right now. Ask your teacher to check it's approved." }, { status: 404 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const out = await runTurn(
          {
            lesson,
            understanding: session.understanding,
            history: session.messages.map((m) => ({ from: m.from, text: m.text })),
            message: parsed.data.message,
            pasted: parsed.data.pasted,
          },
          { onJudged: (e) => send({ type: "judged", ...e }) },
        );

        if (out.source === "offline") {
          send({ type: "offline" });
        } else {
          const saved = recordTurn({
            sessionId: session.id,
            studentText: parsed.data.message,
            reply: out.reply,
            emotion: out.emotion,
            before: session.understanding,
            after: out.understanding,
            judged: out.judged,
            finished: out.finished,
          });
          send({
            type: "reply",
            reply: out.reply,
            emotion: out.emotion,
            understanding: out.understanding,
            improved: out.improved,
            clicked: out.clicked,
            finished: out.finished,
            checkpoints: saved.checkpoints,
            gloam: saved.after,
            levelUp: saved.after.level > saved.before.level,
            ...(out.finished ? { recap: lessonRecap(lesson) } : {}),
          });
        }
      } catch (err) {
        console.error("[companion] turn failed", err);
        send({ type: "offline" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
