import { z } from "zod";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { listLessons, startDraft } from "@/lib/teacher/lessons";
import { MAX_SOURCE_CHARS } from "@/lib/teacher/read";

export async function GET() {
  const denied = await requireTeacher();
  if (denied) return denied;
  return Response.json(listLessons());
}

const Body = z.object({
  source: z.string().min(80, "That's not much to go on. Add a bit more of your lesson."),
  sourceName: z.string().max(120),
  grade: z.number().int().min(0).max(12),
  titleHint: z.string().max(120).optional(),
});

/** Start drafting a lesson blueprint from the sections the teacher picked */
export async function POST(request: Request) {
  const denied = await requireTeacher();
  if (denied) return denied;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Something's missing.");
  if (body.data.source.length > MAX_SOURCE_CHARS) {
    return bad(`That's a lot of text for Gloam to read at once. Pick fewer sections (under ${MAX_SOURCE_CHARS.toLocaleString()} characters).`);
  }
  return Response.json({ id: startDraft(body.data) });
}
