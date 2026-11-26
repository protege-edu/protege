/**
 * A student who's already signed in lands on /join. Do we send them straight to their own Gloam (/me),
 * or keep them on the join screen? Only "no code given" or "the code is for my own class" means /me.
 * A code that matches NO class must keep them here so the "that code isn't a class" error shows — otherwise
 * a random or mistyped code would silently drop a signed-in student into whatever class they're already in.
 * `?switch` (someone else wants to sign in on a shared device) always keeps them on the join screen.
 *
 * Pure (no server imports) so it's unit-tested in check-logic.
 */
export function signedInGoesToMyGloam(opts: { myClassId: string | null; codeGiven: boolean; linkedClassId: string | null; switching: boolean }): boolean {
  if (!opts.myClassId || opts.switching) return false;
  return !opts.codeGiven || opts.linkedClassId === opts.myClassId;
}
