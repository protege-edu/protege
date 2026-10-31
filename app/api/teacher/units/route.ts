import { z } from "zod";
import { limit, tooMany } from "@/lib/auth/request";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { listLessons, startDraft } from "@/lib/teacher/lessons";
import { MAX_SOURCE_CHARS } from "@/lib/teacher/limits";
import { createUnit, listUnits } from "@/lib/teacher/units";

/** This teacher's units, each with how far along its lessons are */
export async function GET(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const all = await listLessons(me.id);
  return Response.json(
    (await listUnits(me.id)).map((u) => {
      const mine = all.filter((l) => l.unitId === u.id);
      const count = (s: string) => mine.filter((l) => l.status === s).length;
      return { id: u.id, title: u.title, sourceName: u.sourceName, grade: u.grade, lessons: mine.length, approved: count("approved"), toReview: count("draft"), waiting: count("queued") + count("drafting"), failed: count("failed") };
    }),
  );
}

const Body = z.object({
  title: z.string().trim().min(1, "Give the unit a name.").max(120),
  sourceName: z.string().max(120),
  grade: z.number().int().min(0).max(12),
  lessons: z
    .array(
      z.object({
        title: z.string().trim().max(120),
        /** the teacher typed the title (drafting keeps it) */
        ownTitle: z.boolean().optional(),
        source: z.string().min(80, "One of the lessons has hardly any notes in it. Join it with the one next to it.").max(MAX_SOURCE_CHARS, "One of the lessons is too long for Gloam to read at once. Split it into two."),
      }),
    )
    .min(1, "Pick at least one part of your notes to teach.")
    .max(40, "That's more than 40 lessons. Make two units instead, one for each half of your notes."),
});

/**
 * Turn the teacher's notes into lessons: one lesson starts drafting right away; more become a unit whose
 * lessons are drafted one at a time, in order (lib/teacher/units.ts).
 */
export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  // drafting keeps the AI busy for minutes: a few uploads per hour per teacher is plenty
  if (!limit(`draft:${me.id}`, 12, 60 * 60 * 1000)) return tooMany();
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Something's missing.");
  const { title, sourceName, grade, lessons } = body.data;
  if (lessons.length === 1) {
    return Response.json({ lessonId: await startDraft({ source: lessons[0].source, sourceName, grade, titleHint: lessons[0].title || title, ownTitle: lessons[0].ownTitle, teacherId: me.id }) });
  }
  const unit = await createUnit({ teacherId: me.id, title, sourceName, grade, lessons });
  return Response.json({ unitId: unit.id, lessonId: unit.lessonIds[0] });
}
