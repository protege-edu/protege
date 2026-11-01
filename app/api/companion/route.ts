import { z } from "zod";
import { mayTeach } from "@/lib/ai/allowance";
import { voice } from "@/lib/ai/companion";
import { playTurn, transcriptOf } from "@/lib/ai/game-turn";
import { gameOn } from "@/lib/game/config";
import { getAgeStyle, pickLine } from "@/lib/age-styles";
import { hearingLine } from "@/lib/ai/queue";
import { clientIp, forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { featsOf, getSession, recordTurn } from "@/lib/companion/session";
import { classPaused, maySeeStudent } from "@/lib/student/auth";
import { lessonRecap } from "@/lib/lesson";
import { getApprovedLesson, playedBy } from "@/lib/teacher/lessons";

const Body = z.object({
  sessionId: z.string().min(1),
  message: z.string().trim().min(1).max(600),
  /** Most of the message was pasted in, not typed */
  pasted: z.boolean().optional(),
  /** Test mode (only honoured while developing): pasted answers may teach Gloam */
  test: z.boolean().optional(),
  /** a move inside a challenge: tap a notebook line, put the cards in order, stop Gloam, or skip it */
  action: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("explain") }),
      z.object({ type: z.literal("pick"), value: z.number().int().min(0).max(10) }),
      z.object({ type: z.literal("order"), value: z.array(z.number().int().min(0).max(10)).max(10) }),
      z.object({ type: z.literal("stop") }),
      z.object({ type: z.literal("skip") }),
    ])
    .optional(),
});

/**
 * One teaching turn. Streams newline-separated JSON events:
 *   {"type":"judged", ...}  as soon as we know what the student explained (candles react)
 *   {"type":"reply", ...}   when Gloam has finished talking
 *   {"type":"offline"}      the model isn't running
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  // a real student types maybe 3 messages a minute; this only stops floods (every message costs Claude tokens)
  if (!limit(`turn:${clientIp(request)}`, 240, 60 * 1000)) return tooMany();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That message didn't come through right. Try sending it again." }, { status: 400 });
  }
  const session = await getSession(parsed.data.sessionId);
  if (session && !limit(`turn-session:${session.id}`, 12, 60 * 1000)) return tooMany();
  if (!session || !(await maySeeStudent(session.studentId))) {
    return Response.json({ error: "This session ended. Refresh the page to start a new one." }, { status: 404 });
  }

  // the teacher paused the class: Gloam sleeps (the message isn't lost; the student sends it again later)
  if (await classPaused(session.studentId)) return Response.json({ error: "Your teacher paused the class." }, { status: 423 });

  const approved = await getApprovedLesson(session.lessonId);
  const lesson = approved && await playedBy(approved, session.studentId);
  if (!lesson) {
    return Response.json({ error: "This lesson isn't available right now. Ask your teacher to check it's approved." }, { status: 404 });
  }
  const encoder = new TextEncoder();

  // today's use of Gloam's brain is used up (lib/ai/allowance.ts): Gloam falls asleep, in character, and nothing goes to Claude
  if (!(await mayTeach(session.studentId))) {
    const style = getAgeStyle(lesson.ageStyle, lesson.language);
    const said = session.messages.filter((m) => m.from === "gloam").map((m) => m.text);
    const reply = voice(pickLine(style.lines.tired, { topic: lesson.topic, question: "" }, said.slice(-6)), style);
    const event = { type: "reply", reply, source: "tired", emotion: "sheepish", understanding: session.understanding, improved: [], clicked: [], finished: false, checkpoints: session.checkpoints, gloam: session.gloam, levelUp: false };
    return new Response(`${JSON.stringify(event)}\n`, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
  }

  // the game layer, unless the teacher switched it off for this class
  const game = await gameOn(session.classId);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        // while other students' Gloams are thinking, this one hears its place in line (and says so, in character)
        const out = await hearingLine((ahead) => send({ type: "queued", ahead }), () =>
          playTurn(
          {
            lesson,
            understanding: session.understanding,
            // (Gloam's brain reads the student and Gloam; the rival's and the Muddle's lines are hand-written)
            history: session.messages.flatMap((m) => (m.from === "student" || m.from === "gloam" ? [{ from: m.from, text: m.text, about: m.about }] : [])),
            message: parsed.data.message,
            pasted: parsed.data.pasted,
            allowCopied: parsed.data.test === true && process.env.NODE_ENV !== "production",
            play: session.play,
            action: parsed.data.action,
            gameOn: game,
          },
          { onJudged: (e) => send({ type: "judged", ...e }) },
          ),
        );

        if (out.source === "offline") {
          send({ type: "offline" });
        } else {
          const saved = await recordTurn({
            sessionId: session.id,
            studentText: parsed.data.message,
            reply: out.reply,
            emotion: out.emotion,
            about: out.about,
            followUp: out.followUp,
            ...(out.game ? { lines: transcriptOf(out) } : {}),
            play: out.play,
            fireflies: out.fireflies,
            resolved: out.resolved,
            before: session.understanding,
            after: out.understanding,
            judged: out.judged,
            finished: out.finished,
          });
          send({
            type: "reply",
            reply: out.reply,
            // where the words came from (the AI, a hand-written line, busy mode); the load test counts these
            source: out.source,
            emotion: out.emotion,
            understanding: out.understanding,
            improved: out.improved,
            clicked: out.clicked,
            finished: out.finished,
            // the next question, straight after a candle lights
            ...(out.followUp ? { followUp: out.followUp.text } : {}),
            // the game layer: the challenge or boss fight as the browser may see it, and who said what
            ...(out.game ? { game: out.game } : {}),
            fireflies: out.fireflies,
            checkpoints: saved.checkpoints,
            gloam: saved.after,
            levelUp: saved.after.level > saved.before.level,
            ...(out.finished ? { recap: lessonRecap(lesson), feats: await featsOf(session.id) } : {}),
          });
        }
      } catch (err) {
        // only what KIND of error: an AI error can quote what the student wrote, and logs never hold students' words
        console.error("[companion] turn failed:", err instanceof Error ? err.name : typeof err);
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
