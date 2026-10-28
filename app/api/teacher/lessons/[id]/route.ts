import { BUILT_IN } from "@/lib/lesson";
import { BlueprintInput, bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { blueprintWarnings, checkBlueprint } from "@/lib/teacher/checks";
import { listClasses } from "@/lib/teacher/classes";
import { canSee, deleteLesson, getLessonRow, saveBlueprint } from "@/lib/teacher/lessons";
import { getUnit } from "@/lib/teacher/units";

export async function GET(request: Request, ctx: RouteContext<"/api/teacher/lessons/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const row = getLessonRow(id);
  if (!row || !canSee(row, me.id)) return notYours();
  const { sourceText, ...rest } = row;
  // its unit (for "lesson 2 of 5" and the way to the next one), and which of this teacher's classes have it
  const unit = row.unitId ? getUnit(row.unitId, me.id) : null;
  const classes = listClasses(me.id).map((c) => ({ id: c.id, name: c.name, has: c.lessons.some((l) => l.id === id) }));
  return Response.json({
    ...rest,
    hasSource: !!sourceText,
    builtIn: id in BUILT_IN,
    problems: row.blueprint ? checkBlueprint(row.blueprint) : [],
    warnings: row.blueprint ? blueprintWarnings(row.blueprint) : [],
    unit: unit && { id: unit.id, title: unit.title, lessons: unit.lessons.map((l) => ({ id: l.id, title: l.title, status: l.status })) },
    classes,
  });
}

/** Save the teacher's edits (an approved lesson goes back to draft until re-approved) */
export async function PUT(request: Request, ctx: RouteContext<"/api/teacher/lessons/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  if (id in BUILT_IN) return bad("Built-in lessons can't be edited.");
  const row = getLessonRow(id);
  if (!row || !canSee(row, me.id)) return notYours();
  const body = BlueprintInput.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad("Some of the lesson details are missing or too long. Check each idea and try again.");
  saveBlueprint(id, body.data);
  return Response.json({ ok: true, problems: checkBlueprint(body.data), warnings: blueprintWarnings(body.data) });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/teacher/lessons/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  if (id in BUILT_IN) return bad("Built-in lessons can't be deleted.");
  const row = getLessonRow(id);
  if (!row || !canSee(row, me.id)) return notYours();
  deleteLesson(id);
  return Response.json({ ok: true });
}
