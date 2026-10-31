import { sweep } from "@/lib/privacy/sweep";

export const maxDuration = 300;

/**
 * The daily clean-up, started by Vercel's schedule (vercel.json: crons). Vercel sends the CRON_SECRET it
 * was given; anyone else gets "not found". Says what it removed (counts only).
 */
export async function GET(request: Request) {
  const want = process.env.CRON_SECRET;
  if (!want || request.headers.get("authorization") !== `Bearer ${want}`) return new Response(null, { status: 404 });
  return Response.json(await sweep());
}
