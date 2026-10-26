import { z } from "zod";
import { limit, tooMany } from "@/lib/auth/request";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { listLessons, startDraft } from "@/lib/teacher/lessons";
import { MAX_SOURCE_CHARS } from "@/lib/teacher/read";

export async function GET(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  return Response.json(listLessons(me.id));
}

const Body = z.object({
  source: z.string().min(80, "That's not much to go on. Add a bit more of your lesson."),
  sourceName: z.string().max(120),
  grade: z.number().int().min(0).max(12),
  titleHint: z.string().max(120).optional(),
});

/** Start drafting a lesson blueprint from the sections the teacher picked */
export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  // drafting keeps the AI busy for minutes: a few per hour per teacher is plenty
  if (!limit(`draft:${me.id}`, 12, 60 * 60 * 1000)) return tooMany();
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Something's missing.");
  if (body.data.source.length > MAX_SOURCE_CHARS) {
    return bad(`That's a lot of text for Gloam to read at once. Pick fewer sections (under ${MAX_SOURCE_CHARS.toLocaleString()} characters).`);
  }
  return Response.json({ id: startDraft({ ...body.data, teacherId: me.id }) });
}
