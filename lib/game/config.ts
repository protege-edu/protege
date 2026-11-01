/**
 * Is the game layer (challenges, the rival, the boss fight, fireflies) on?
 * Off until its screens are finished, so a half-built game never reaches a classroom.
 * While building it: PROTEGE_GAME=on in .env.
 */
export function gameOn(): boolean {
  return process.env.PROTEGE_GAME === "on";
}
