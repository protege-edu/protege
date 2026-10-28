import { z } from "zod";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { deleteUnit, draftNext, getUnit, renameUnit } from "@/lib/teacher/units";

/** A unit and its lessons in order, with where each one is (drafting, waiting its turn, ready to review…) */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/units/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  // (after a restart, waiting lessons carry on)
  draftNext();
  const unit = getUnit(id, me.id);
  return unit ? Response.json(unit) : notYours();
}

/** Rename the unit */
export async function PUT(request: Request, ctx: RouteContext<"/api/teacher/units/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  if (!getUnit(id, me.id)) return notYours();
  const body = z.object({ title: z.string().trim().min(1).max(120) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return bad("Give the unit a name (up to 120 characters).");
  renameUnit(id, body.data.title);
  return Response.json({ ok: true });
}

/** Delete the unit, its lessons, and everything students did in them (the page asks first) */
export async function DELETE(request: Request, ctx: RouteContext<"/api/teacher/units/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  if (!getUnit(id, me.id)) return notYours();
  deleteUnit(id);
  return Response.json({ ok: true });
}
