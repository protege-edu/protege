import { z } from "zod";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { createClass, listClasses } from "@/lib/teacher/classes";

export async function GET(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  return Response.json(listClasses(me.id));
}

const Body = z.object({ name: z.string().trim().min(1, "Give the class a name.").max(60), grade: z.number().int().min(0).max(12), language: z.enum(["en", "fr"]).optional() });

export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Something's missing.");
  return Response.json({ id: createClass(body.data.name, body.data.grade, me.id, body.data.language) });
}
