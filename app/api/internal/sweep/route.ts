import { fromOurWorker } from "@/lib/auth/internal";
import { sweep } from "@/lib/privacy/sweep";

/** The daily clean-up, started by Cloudflare's schedule (worker.ts). Says what it removed (counts only). */
export async function POST(request: Request) {
  if (!(await fromOurWorker(request))) return new Response(null, { status: 404 });
  return Response.json(await sweep());
}
