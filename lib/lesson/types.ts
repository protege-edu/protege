/**
 * A lesson blueprint is everything Gloam needs to "not get" a lesson.
 * In Phase 1 we hand-write one. In Phase 2 the AI generates one from a
 * teacher's pasted notes, in exactly this shape, and the whole class reuses it.
 */

/** 0 = clueless, 1 = something's clicking, 2 = almost, 3 = got it */
export type Level = 0 | 1 | 2 | 3;

export interface Concept {
  id: string;
  /** Short name shown on the candle, written how a student would say it */
  name: string;
  /** The actual idea. Used ONLY to judge the student. Gloam must never say it first. */
  truth: string;
  /** The wrong idea Gloam starts with */
  misconception: string;
  /** What Gloam believes at each level, in Gloam's own voice (shown on candles) */
  beliefs: [string, string, string, string];
  /** Questions Gloam can ask to nudge the student toward this idea */
  questions: string[];
  /**
   * Words that would give the idea away. If Gloam says one of these before
   * the student has, it's "giving away the answer" and we retry.
   */
  giveaways: string[];
  /**
   * Word stems a real explanation of this idea would almost certainly use.
   * The judge can only give credit if the student's message contains one,
   * so "yes" or "idk" can never accidentally count as teaching.
   */
  evidence: string[];
}

export interface LessonBlueprint {
  id: string;
  title: string;
  subject: string;
  /** Gloam's very first line */
  opener: string;
  concepts: Concept[];
  /** Short story beats, revealed as more of the lantern lights up */
  storyBeats: string[];
  /** Gloam's line when every candle is lit */
  finale: string;
}
