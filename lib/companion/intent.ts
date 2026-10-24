import type { Intent } from "@/lib/ai/schemas";

/**
 * Fast, plain-code guesses for the most common non-explanations, so Gloam answers
 * "yea", "idk" or "js tell me" instantly. Anything this can't place goes to the AI.
 * Only used when the message mentions none of the lesson's ideas.
 */
export function quickIntent(message: string): Intent | null {
  const m = message.toLowerCase().replace(/[^a-z0-9'\s?]/g, " ").replace(/\s+/g, " ").trim();
  if (!m) return "chatting";

  if (/\b(just|js|jus|pls|please|plz|can you|can u|could you)?\s*(tell|give|say|show) (me|us) (the )?(answer|it|why|reason)\b|\bwhat'?s the answer\b|\bwhat is the answer\b|\bjust say it\b|\byou (explain|tell me|say it)\b|\bu (explain|tell me)\b|\bexplain it to me\b|\bwhat'?s the (real )?reason\b/.test(m)) {
    return "asking_for_answer";
  }
  if (/^(just |js |jus |pls |please |plz |bro |bruh )*(tell me|tell us|say it|explain|answer)( pls| please| bro)?\s*\??$/.test(m)) return "asking_for_answer";
  if (/^(idk|i dk|idek|dunno|i dunno|i don'?t know|i dont know|no idea|no clue|not sure|im not sure|i'?m confused|confused|help|i'?m stuck|stuck|huh|what\??|wdym|i give up|bro what|wait what)\b/.test(m)) {
    return "stuck";
  }
  const words = m.split(" ");
  if (words.length <= 3 && /^(y(e|a)+h?|yes|yep|yup|ya|ok(ay)?|k|kk|sure|no|nope|nah|hey|hi|hello|yo|sup|lol|lmao|haha|bruh|bro|hmm+|cool|nice|true|facts|fr|real|wow|oh|ah|right|mhm|maybe)\b/.test(m)) {
    return "chatting";
  }
  return null;
}
