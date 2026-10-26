import "server-only";
import { randomBytes } from "node:crypto";
import { clear, readSigned, setSigned } from "./cookies";

/**
 * "Continue with Google", the standard OAuth sign-in, built by hand (no extra library, nothing paid).
 * Hidden unless all three are set (see README, "Google sign-in"):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  from a free Google Cloud project
 *   PUBLIC_URL                              Protégé's fixed https address (the tunnel), e.g. https://protege.example.ts.net
 *
 * Teachers: we ask Google for their email (it's their login name).
 * Students: we ask ONLY for "openid", so Google doesn't even tell us their name or email.
 *           We keep just a keyed hash of Google's account id, to recognise them next time.
 */
export type GoogleFor = { who: "teacher"; invite?: string } | { who: "student"; classId: string };

const STATE = "protege_oauth";

export function googleEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.PUBLIC_URL?.startsWith("https://"));
}

const redirectUri = () => `${process.env.PUBLIC_URL!.replace(/\/$/, "")}/api/auth/google/callback`;

/** Where to send the browser to start. Remembers who it's for in a signed cookie (also stops forged callbacks). */
export async function googleStartUrl(forWho: GoogleFor): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  const purpose = forWho.who === "teacher" ? `teacher~${forWho.invite ?? ""}` : `student~${forWho.classId}`;
  await setSigned(STATE, `${nonce}~${purpose}`, 0.01);
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: forWho.who === "teacher" ? "openid email" : "openid",
    state: nonce,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export interface GoogleResult {
  forWho: GoogleFor;
  /** Google's account id (only ever stored as a keyed hash) */
  sub: string;
  /** teachers only */
  email?: string;
}

/** Finish: check the state, swap the code for a token, have Google confirm the token. Null if anything's off. */
export async function googleFinish(url: URL): Promise<GoogleResult | null> {
  const state = await readSigned(STATE);
  await clear(STATE);
  const code = url.searchParams.get("code");
  if (!state || !code) return null;
  const [nonce, kind, extra] = state.split("~");
  if (nonce !== url.searchParams.get("state")) return null;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(), grant_type: "authorization_code" }),
      signal: AbortSignal.timeout(10000),
    });
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return null;
    // Google checks the token's signature for us
    const info = (await (await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`, { signal: AbortSignal.timeout(10000) })).json()) as {
      aud?: string;
      iss?: string;
      sub?: string;
      email?: string;
      email_verified?: string;
    };
    if (info.aud !== process.env.GOOGLE_CLIENT_ID || !info.sub || !["accounts.google.com", "https://accounts.google.com"].includes(info.iss ?? "")) return null;
    if (kind === "teacher") {
      if (!info.email || info.email_verified !== "true") return null;
      return { forWho: { who: "teacher", invite: extra || undefined }, sub: info.sub, email: info.email.toLowerCase() };
    }
    return { forWho: { who: "student", classId: extra }, sub: info.sub };
  } catch {
    return null;
  }
}
