import { checkBrain } from "@/lib/ai/client";

/** Is Gloam's brain (the local model) running? Also warms it up. */
export async function GET() {
  return Response.json(await checkBrain());
}
