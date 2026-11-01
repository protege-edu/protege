/**
 * The game layer's state. A lesson is a run of chapters (one per idea). Each idea's last step is a
 * CHALLENGE, and once every candle is lit, the Muddle comes for a BOSS FIGHT. Plain data: the rules
 * that change it are in ./engine.ts, and everything here is saved on the session (teach_sessions.play).
 */

export type ChallengeKind = "notebook" | "rival" | "whatif" | "order" | "recital";

/** A challenge or the boss, open right now. Holds the answers too: the browser only gets `view()` of it. */
export type Encounter =
  | {
      kind: "notebook";
      conceptId: string;
      /** Gloam's three lines, shuffled, and which one is wrong */
      lines: string[];
      wrong: number;
      phase: "spot" | "fix";
      tries: number;
    }
  | { kind: "rival"; conceptId: string; claim: string; phase: "argue"; tries: number }
  | { kind: "whatif"; conceptId: string; scenario: string; phase: "predict"; tries: number }
  | {
      kind: "order";
      conceptId: string;
      /** the cards in the order the student sees them, and the right order (indexes into `cards`) */
      cards: string[];
      answer: number[];
      phase: "order" | "link";
      tries: number;
    }
  | { kind: "recital"; conceptId: string; speech: string; phase: "listen" | "fix"; tries: number }
  | {
      kind: "boss";
      /** one round per idea (the Muddle says its wrong idea), the last one a mash-up of two */
      rounds: { conceptId: string; claim: string; mash?: string }[];
      round: number;
      /** clean hits in a row: charges Gloam's Flare */
      combo: number;
      /** glancing hits on this round (two of them land it) */
      glances: number;
      tries: number;
    };

/** What the browser may see: no answers */
export type EncounterView =
  | { kind: "notebook"; conceptId: string; lines: string[]; phase: "spot" | "fix"; picked?: number; tries: number }
  | { kind: "rival"; conceptId: string; claim: string; tries: number }
  | { kind: "whatif"; conceptId: string; scenario: string; tries: number }
  | { kind: "order"; conceptId: string; cards: string[]; phase: "order" | "link"; tries: number }
  | { kind: "recital"; conceptId: string; speech: string; phase: "listen" | "fix"; tries: number }
  | { kind: "boss"; rounds: number; round: number; claim: string; combo: number; glances: number; tries: number };

export type ChallengeOutcome = "won" | "skipped";

/** Everything the game remembers for one student's session */
export interface Play {
  /** Each idea's challenge kind (decided once, when the session starts) */
  plan: Record<string, ChallengeKind>;
  /** How each idea's challenge went */
  done: Record<string, ChallengeOutcome>;
  open: Encounter | null;
  boss: "won" | null;
}

/** What the student did inside a challenge (free text is "explain") */
export type Action =
  | { type: "explain" }
  | { type: "pick"; value: number }
  | { type: "order"; value: number[] }
  | { type: "stop" }
  | { type: "skip" };
