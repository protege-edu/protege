import { limit, tooMany } from "@/lib/auth/request";
import { studentAddress } from "@/lib/hosting/address";
import { VERSION, checkForUpdate, laptopStatus } from "@/lib/hosting/status";
import { launcher, setupAvailable } from "@/lib/setup/control";
import { requireTeacher } from "@/lib/teacher/api";

/** Is everything this laptop runs for a class working? (the teacher's status page) */
export async function GET(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  return Response.json({ version: VERSION, checks: await laptopStatus(studentAddress(request)), canStop: setupAvailable() });
}

/** "Check for updates": only ever when a teacher presses the button */
export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  if (!limit(`updates:${me.id}`, 10, 60 * 60 * 1000)) return tooMany();
  return Response.json(await checkForUpdate());
}

/** "Stop Protégé" (when the download's launcher runs it: on a Mac there's no window to close) */
export async function DELETE(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  if (!setupAvailable()) return Response.json({ error: "Stop Protégé where it's running: close its window, or press Ctrl+C." }, { status: 400 });
  await launcher("/stop", {});
  return Response.json({ ok: true });
}
