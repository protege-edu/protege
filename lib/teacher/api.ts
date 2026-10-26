import "server-only";
import { z } from "zod";
import { forbidden, sameOrigin } from "@/lib/auth/request";
import { currentTeacher, type Teacher } from "./auth";

/**
 * Every teacher API route starts with this: only a signed-in teacher gets through, and only for
 * requests that came from Protégé's own pages. Returns the teacher, or the response to send back.
 *   const me = await requireTeacher(request); if (me instanceof Response) return me;
 */
export async function requireTeacher(request?: Request): Promise<Teacher | Response> {
  if (request && !sameOrigin(request)) return forbidden();
  const t = await currentTeacher();
  if (t) return t;
  return Response.json({ error: "Please sign in to the teacher side first." }, { status: 401 });
}

export const bad = (error: string, status = 400) => Response.json({ error }, { status });
export const notYours = () => bad("We couldn't find that. It might belong to another teacher.", 404);

/** What a teacher's edited blueprint must look like before we save it */
export const BlueprintInput = z.object({
  id: z.string(),
  ageStyle: z.enum(["little", "junior", "middle", "senior"]),
  grade: z.number().int().min(0).max(12),
  topic: z.string().min(1).max(40),
  topicWords: z.array(z.string().max(30)).max(30),
  title: z.string().min(2).max(120),
  subject: z.string().max(60),
  opener: z.string().min(2).max(500),
  concepts: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().min(1).max(60),
        truth: z.string().max(600),
        misconception: z.string().max(400),
        beliefs: z.tuple([z.string().max(300), z.string().max(300), z.string().max(300), z.string().max(300)]),
        questions: z.array(z.string().max(220)).max(6),
        giveaways: z.array(z.string().max(40)).max(12),
        evidence: z.array(z.string().max(30)).max(24),
        recap: z.string().max(500),
      }),
    )
    .min(1)
    .max(8),
  storyBeats: z.array(z.string().max(160)).max(8),
  finale: z.string().max(600),
  reviewNotes: z.array(z.object({ conceptId: z.string().optional(), note: z.string() })).optional(),
});
