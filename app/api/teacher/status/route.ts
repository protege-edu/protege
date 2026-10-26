import { limit, tooMany } from "@/lib/auth/request";
import { studentAddress } from "@/lib/hosting/address";
import { VERSION, checkForUpdate, laptopStatus } from "@/lib/hosting/status";
import { requireTeacher } from "@/lib/teacher/api";

/** Is everything this laptop runs for a class working? (the teacher's status page) */
export async function GET(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  return Response.json({ version: VERSION, checks: await laptopStatus(studentAddress(request)) });
}

/** "Check for updates": only ever when a teacher presses the button */
export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  if (!limit(`updates:${me.id}`, 10, 60 * 60 * 1000)) return tooMany();
  return Response.json(await checkForUpdate());
}
