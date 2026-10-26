import { z } from "zod";
import { voice } from "@/lib/ai/companion";
import { getAgeStyle } from "@/lib/age-styles";
import { getSession, recordTurn } from "@/lib/companion/session";
import { maySeeStudent } from "@/lib/student/auth";
import { lessonRecap } from "@/lib/lesson";
import { getApprovedLesson } from "@/lib/teacher/lessons";

const Body = z.object({ sessionId: z.string().min(1), all: z.boolean().optional() });

/**
 * TEST MODE ONLY (never in a real build): teach Gloam the next idea, or every idea, instantly,
 * so you can see the "I get it" moment, the walk, chapters, the finale and the journal without
 * typing real explanations. It saves exactly like a real turn (progress, levels, the dashboard).
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const found = getSession(parsed.data.sessionId);
  const session = found && (await maySeeStudent(found.studentId)) ? found : null;
  const lesson = session && getApprovedLesson(session.lessonId);
  if (!session || !lesson) return Response.json({ error: "No such session" }, { status: 404 });

  const before = session.understanding;
  const unlit = lesson.concepts.filter((c) => (before[c.id] ?? 0) < 3);
  const teach = parsed.data.all ? unlit : unlit.slice(0, 1);
  if (!teach.length) return Response.json({ error: "Gloam already gets everything" }, { status: 409 });
  const after = { ...before, ...Object.fromEntries(teach.map((c) => [c.id, 3 as const])) };
  const finished = lesson.concepts.every((c) => after[c.id] === 3);
  const style = getAgeStyle(lesson.ageStyle, lesson.language);
  // Gloam says the idea it just got, in its own words (its "gets it" line from the lesson)
  const reply = voice(finished ? lesson.finale : teach[0].beliefs[3], style);
  const saved = recordTurn({
    sessionId: session.id,
    studentText: parsed.data.all ? "(test mode: taught everything)" : `(test mode: taught "${teach[0].name}")`,
    reply,
    emotion: "eureka",
    before,
    after,
    judged: teach.map((c) => ({ id: c.id, quality: "clear" as const })),
    finished,
  });
  return Response.json({
    type: "reply",
    reply,
    emotion: "eureka",
    understanding: after,
    improved: teach.map((c) => c.id),
    clicked: teach.map((c) => c.id),
    finished,
    checkpoints: saved.checkpoints,
    gloam: saved.after,
    levelUp: saved.after.level > saved.before.level,
    ...(finished ? { recap: lessonRecap(lesson) } : {}),
  });
}
