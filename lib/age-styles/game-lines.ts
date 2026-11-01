import type { AgeStyleId, Language } from "./types";

type Line = string;

/**
 * Everything the game layer says: the rival, the boss (the Muddle) and Gloam's reactions in each challenge.
 * Hand-written for each age (no AI, no cost, always kid-safe). The rival and the Muddle only ever say the
 * lesson's own wrong ideas ({claim}) and these lines, and they pick on Gloam, never on the student.
 * Placeholders: {claim} {scenario} {question} {a} {b} {n} (hits in a row) {topic}
 */
export interface GameLines {
  /** the recurring rival who's always confidently wrong */
  rival: string;
  /** the boss: the fog that feeds on wrong ideas */
  boss: string;
  notebook: { open: Line[]; wrongPick: Line[]; spotted: Line[]; glance: Line[]; miss: Line[]; nothing: Line[]; won: Line[] };
  /** rival.* are said BY the rival, except tempted (Gloam, wavering) and won (Gloam, won back) */
  rivalSays: { arrive: Line[]; glance: Line[]; miss: Line[]; defeated: Line[]; nothing: Line[] };
  rivalGloam: { tempted: Line[]; won: Line[] };
  whatif: { open: Line[]; glance: Line[]; miss: Line[]; nothing: Line[]; won: Line[] };
  order: { open: Line[]; misordered: Line[]; ordered: Line[]; glance: Line[]; miss: Line[]; nothing: Line[]; won: Line[] };
  recital: { open: Line[]; stopped: Line[]; glance: Line[]; miss: Line[]; nothing: Line[]; won: Line[] };
  /** said BY the Muddle */
  bossSays: { arrive: Line[]; round: Line[]; glance: Line[]; miss: Line[]; hit: Line[]; nothing: Line[]; defeated: Line[] };
  /** Gloam, during the fight */
  bossGloam: { flare: Line[]; hint: Line[] };
  skipped: Line[];
}

const senior: GameLines = {
  rival: "corvin",
  boss: "the muddle",
  notebook: {
    open: ["ok. i took notes. they're perfect. probably. one of these might be... less perfect. find it?", "behold: my notes. i'm proud of them. check them anyway?"],
    wrongPick: ["no, that one's right. i'm proud of that one.", "that one's fine. keep looking. (please don't find anything.)", "nope, that line's solid. it's one of the others."],
    spotted: ["oh no. that one. ok, i'm listening. what should it say?", "...yeah, that one looks shaky now that you're pointing at it. fix it for me?"],
    glance: ["closer. but WHY is it wrong? i need the reason or i'll write it again.", "ok, but explain it. future me needs to understand this page."],
    miss: ["hm. that sounds like what i already wrote. which part is actually wrong?", "wait, that agrees with my notes. are my notes... right? no. explain."],
    nothing: ["the notes are right there. which line is wrong, and what should it say?", "i'll wait. dramatically. which line?"],
    won: ["crossing it out. rewriting it. this page is actually correct now.", "fixed. my notes are finally worth reading."],
  },
  rivalSays: {
    arrive: ["corvin here. small correction to everything you've learned: {claim} you're welcome.", "oh, gloam's being taught? adorable. anyway, facts: {claim}", "corvin is never wrong. so, listen: {claim}"],
    glance: ["that's a point. a small one. why though?", "hm. you've almost said something. finish the thought.", "interesting. unconvincing. explain the why."],
    miss: ["see? even your teacher agrees with corvin. as everyone eventually does.", "exactly what i said. great minds.", "ha. told you, gloam."],
    defeated: ["...fine. FINE. you're right. this is unbearable. corvin is leaving.", "this is a temporary setback for corvin. goodbye.", "i'm not wrong, i'm... early. to being right. later."],
    nothing: ["corvin is waiting for an actual argument.", "is that a rebuttal? that's not a rebuttal."],
  },
  rivalGloam: {
    tempted: ["wait. corvin sounds really sure. is corvin right? tell me corvin's wrong. with reasons.", "ok corvin's very confident and i'm very easily swayed. help."],
    won: ["corvin's gone. i understand it now, and i'm keeping it.", "we won an argument. against a crow. i've never felt so alive."],
  },
  whatif: {
    open: ["ok new thought experiment. {scenario}", "hypothetical. hear me out. {scenario}"],
    glance: ["ooh, maybe. but what would actually change, and why?", "right direction. walk me through the why."],
    miss: ["hm. that's what i'd have guessed, which is worrying. explain it?", "wait, really? that sounds like my old idea. walk me through it."],
    nothing: ["the hypothetical is still sitting here. {scenario}", "humor me. {scenario}"],
    won: ["whoa. if that's true then i actually get it. not just memorized it. GET it.", "ok that's a twist i can actually predict now. i'm a scientist."],
  },
  order: {
    open: ["i dropped my cards and now they're in the wrong order. put them back?", "these go in an order. i don't know which. you do."],
    misordered: ["hm, not quite. some of these are in the right spot. not all.", "close. a couple are swapped."],
    ordered: ["that's the order. ok but why does \"{a}\" lead to \"{b}\"?", "perfect. now the hard part: why does \"{a}\" cause \"{b}\"?"],
    glance: ["sort of. what's the actual link between them?", "keep going. why does one lead to the next?"],
    miss: ["wait, that doesn't connect them. why does one cause the other?", "hm. that doesn't feel like the link."],
    nothing: ["the cards are waiting.", "order first. then the why."],
    won: ["oh, it's a chain. one thing pushes the next. it all connects.", "a chain reaction. i understand the whole thing now."],
  },
  recital: {
    open: ["ok. i'm going to explain this to corvin. stop me if i mess up.", "watch this. i'm presenting. hit stop if i get it wrong."],
    stopped: ["what? what did i say? ok, fix it.", "rude. but fine. what's wrong with it?"],
    glance: ["ok, so what's the missing piece?", "almost. what am i leaving out?"],
    miss: ["that's... what i said? so what's actually wrong?", "hm. that sounds like my version. what's the fix?"],
    nothing: ["i'll start again. stop me where it's wrong.", "should i keep going? where's the mistake?"],
    won: ["ok, let me try again, properly this time. ...yeah. that's right. finally.", "presenting the corrected version. corvin, take notes."],
  },
  bossSays: {
    arrive: ["the fog thickens. a voice: \"{claim}\"", "something in the dark wants gloam's light. it whispers: \"{claim}\""],
    round: ["the muddle shifts. \"{claim}\"", "the fog rolls back in. \"{claim}\"", "\"{claim}\" the muddle sounds very sure."],
    glance: ["the fog flickers. that stung. not enough.", "a crack of light. the muddle laughs it off."],
    miss: ["the muddle swells. it liked that.", "the fog gets thicker. that fed it."],
    hit: ["light tears through the fog.", "the muddle shrieks and pulls back.", "a hole of light, right through it."],
    nothing: ["the muddle waits. it's patient. it's fog.", "nothing happens. the fog hums."],
    defeated: ["the muddle breaks apart into a thousand fireflies.", "the fog bursts. the light wins."],
  },
  bossGloam: {
    flare: ["{n} in a row. my lantern is CHARGING.", "that's {n}. i feel powerful. weird.", "{n} hits. the fog is scared of us now.", "{n} in a row. don't stop. i'm glowing."],
    hint: ["i think this one's about {topic}. what did you teach me about it?", "remember what you taught me. say it again, out loud."],
  },
  skipped: ["fine. we'll come back to it. {question}", "skipping the drama. {question}"],
};

const storybook = (big: boolean, age: AgeStyleId): GameLines => {
  const rival = age === "little" ? "Fib" : age === "junior" ? "Know-It-Owl" : "count contrary";
  const S = (simple: string, middle: string) => (big ? simple : middle);
  return {
    rival,
    boss: S("the Muddle", "the muddle"),
    notebook: {
      open: [S("Look at my notes! One of them is silly. Can you find it?", "behold my notes! one of them might be… a disaster. find it?")],
      wrongPick: [S("No, that one's right! Try another.", "nope, that one's fine! keep looking."), S("That one's okay! Look again!", "that line is perfect, thank you. another one.")],
      spotted: [S("Oh no! That one! What should it say?", "oh no. that one. what should it say?")],
      glance: [S("Ooh, why is it wrong?", "almost! but why is it wrong?")],
      miss: [S("Hmm, that sounds like my note! What's wrong with it?", "wait, that's what i wrote! what's wrong with it?")],
      nothing: [S("Which line is silly?", "which line is the disaster?")],
      won: [S("I fixed my notes! Thank you!", "fixed! my notes are finally right!")],
    },
    rivalSays: {
      arrive: [S(`${age === "little" ? "Honk!" : "Hoo hoo!"} I'm ${rival}! Everybody knows: {claim}`, `behold! it is i, ${rival}! the truth is: {claim}`), S(`${age === "little" ? "Honk honk!" : "Hoo!"} ${rival} knows best: {claim}`, `${rival} has arrived to correct you: {claim}`)],
      glance: [S("Hmm! Maybe. But why?", "a fair point… but WHY?")],
      miss: [S("See? I'm right!", "ha! you agree with me!")],
      defeated: [S(`Oh! You're right. ${rival} is going home now. Bye!`, `noooo! defeated! ${rival} will return!`), S("Okay, okay, I was wrong!", "fine! i was wrong! this time!")],
      nothing: [S("Can you tell me why I'm wrong?", "is that an argument? i don't think so.")],
    },
    rivalGloam: {
      tempted: [S(`Wait… ${rival} sounds so sure! Who's right? Tell me!`, `${rival} sounds SO sure. help! who's right?`)],
      won: [S(`Yay! You beat ${rival}! I get it now!`, `we beat ${rival}! i get it now!`)],
    },
    whatif: {
      open: [S("Ooh, what if… {scenario}", "what if… {scenario}")],
      glance: [S("Ooh! And why?", "ooh, maybe! but why?")],
      miss: [S("Hmm, really? Tell me more!", "wait, really? explain!")],
      nothing: [S("What do you think? {scenario}", "what do you think? {scenario}")],
      won: [S("Wow! I can guess what happens now!", "whoa, i can predict it now! i really get it!")],
    },
    order: {
      open: [S("Oops! I dropped my cards! Can you put them in order?", "i dropped my cards! put them back in order?")],
      misordered: [S("Almost! Some are mixed up.", "close! a couple are swapped.")],
      ordered: [S("Yay! But why does \"{a}\" come before \"{b}\"?", "perfect! but why does \"{a}\" lead to \"{b}\"?")],
      glance: [S("Ooh, and why?", "keep going! why?")],
      miss: [S("Hmm, how are they connected?", "hmm, that doesn't connect them.")],
      nothing: [S("Can you put the cards in order?", "the cards are waiting!")],
      won: [S("It's like a chain! I get it!", "it's a chain! i get it!")],
    },
    recital: {
      open: [S(`I'm going to tell ${rival} what I learned! Say stop if I'm wrong!`, `watch me explain it to ${rival}! hit stop if i mess up!`)],
      stopped: [S("Oops! What did I get wrong?", "what? what did i say? fix it!")],
      glance: [S("What did I forget?", "almost! what am i missing?")],
      miss: [S("Hmm, that's what I said! What's wrong?", "that's what i said! what's the fix?")],
      nothing: [S("Should I keep going?", "should i keep going? where's the mistake?")],
      won: [S("Now I'll say it the right way!", "ok, the right version. nailed it!")],
    },
    bossSays: {
      arrive: [S("A grumpy cloud floats in. \"{claim}\"", "a storm rolls in, laughing. \"{claim}\"")],
      round: [S("The cloud grumbles: \"{claim}\"", "the muddle roars: \"{claim}\"")],
      glance: [S("The cloud wobbles!", "the storm flickers! not enough!")],
      miss: [S("The cloud gets bigger!", "the storm grows! it liked that!")],
      hit: [S("Poof! The cloud gets smaller!", "BOOM! light blasts through the storm!")],
      nothing: [S("The cloud is waiting.", "the storm waits.")],
      defeated: [S("The cloud pops into a hundred fireflies!", "the storm explodes into fireflies!")],
    },
    bossGloam: {
      flare: [S("{n} in a row! My lantern is so bright!", "{n} in a row! my lantern is CHARGING!"), S("Wow, {n}! Keep going!", "{n} hits! COMBO!"), S("{n}! The cloud is scared!", "{n}! the storm is scared of us!")],
      hint: [S("Remember what you taught me about {topic}!", "remember what you taught me! say it again!")],
    },
    skipped: [S("Okay! Let's try something else. {question}", "skipping! ok: {question}")],
  };
};

const frSenior: GameLines = {
  rival: "corvin",
  boss: "la brume",
  notebook: {
    open: ["ok. j'ai pris des notes. elles sont parfaites. probablement. une d'entre elles est peut-être… moins parfaite. tu la trouves?", "voici mes notes. j'en suis fier. vérifie quand même?"],
    wrongPick: ["non, celle-là est bonne. j'en suis fier, de celle-là.", "celle-là est correcte. cherche encore. (s'il te plaît, trouve rien.)", "non, cette ligne-là tient la route. c'est une des autres."],
    spotted: ["oh non. celle-là. ok, j'écoute. elle devrait dire quoi?", "…ouais, maintenant que tu la pointes, elle a l'air bancale. tu la corriges?"],
    glance: ["plus proche. mais POURQUOI c'est faux? sinon je vais la réécrire pareil.", "ok, mais explique. le moi du futur doit comprendre cette page."],
    miss: ["hm. ça ressemble à ce que j'ai déjà écrit. qu'est-ce qui est faux, au juste?", "attends, ça confirme mes notes. elles sont… bonnes? non. explique."],
    nothing: ["les notes sont juste là. quelle ligne est fausse, et elle devrait dire quoi?", "j'attends. dramatiquement. quelle ligne?"],
    won: ["je la raye. je la réécris. cette page est enfin correcte.", "corrigé. mes notes valent enfin la peine d'être lues."],
  },
  rivalSays: {
    arrive: ["corvin ici. petite correction à tout ce que t'as appris : {claim} de rien.", "oh, on enseigne à gloam? mignon. bref, les faits : {claim}", "corvin a jamais tort. alors, écoute : {claim}"],
    glance: ["c'est un argument. un petit. mais pourquoi?", "hm. t'as presque dit quelque chose. finis ta pensée.", "intéressant. pas convaincant. explique le pourquoi."],
    miss: ["tu vois? même ton prof est d'accord avec corvin. comme tout le monde, éventuellement.", "exactement ce que j'ai dit. les grands esprits.", "ha. je te l'avais dit, gloam."],
    defeated: ["…bon. BON. t'as raison. c'est insupportable. corvin s'en va.", "c'est un revers temporaire pour corvin. au revoir.", "j'ai pas tort, je suis… en avance. pour avoir raison. plus tard."],
    nothing: ["corvin attend un vrai argument.", "c'est une réplique, ça? c'est pas une réplique."],
  },
  rivalGloam: {
    tempted: ["attends. corvin a l'air vraiment sûr. corvin a raison? dis-moi que corvin a tort. avec des raisons.", "ok corvin est très confiant et moi je me laisse très facilement convaincre. à l'aide."],
    won: ["corvin est parti. je comprends maintenant, et je le garde.", "on a gagné un débat. contre un corbeau. je me suis jamais senti aussi vivant."],
  },
  whatif: {
    open: ["ok, nouvelle expérience de pensée. {scenario}", "hypothèse. écoute-moi bien. {scenario}"],
    glance: ["ooh, peut-être. mais qu'est-ce qui changerait vraiment, et pourquoi?", "bonne direction. explique-moi le pourquoi."],
    miss: ["hm. c'est ce que j'aurais deviné, et ça m'inquiète. explique?", "attends, vraiment? ça ressemble à mon ancienne idée. explique-moi."],
    nothing: ["l'hypothèse est encore là. {scenario}", "fais-moi plaisir. {scenario}"],
    won: ["wow. si c'est vrai, alors je comprends pour vrai. pas juste par cœur. je COMPRENDS.", "ok, ce revirement-là, je peux le prédire maintenant. je suis un scientifique."],
  },
  order: {
    open: ["j'ai échappé mes cartes et maintenant elles sont dans le désordre. tu les replaces?", "elles vont dans un ordre. je sais pas lequel. toi, oui."],
    misordered: ["hm, pas tout à fait. certaines sont à la bonne place. pas toutes.", "proche. il y en a deux d'inversées."],
    ordered: ["c'est le bon ordre. ok, mais pourquoi « {a} » mène à « {b} »?", "parfait. maintenant, la partie difficile : pourquoi « {a} » cause « {b} »?"],
    glance: ["un peu. c'est quoi le vrai lien entre les deux?", "continue. pourquoi l'une mène à l'autre?"],
    miss: ["attends, ça les relie pas. pourquoi l'une cause l'autre?", "hm. ça ressemble pas au lien."],
    nothing: ["les cartes attendent.", "l'ordre d'abord. ensuite le pourquoi."],
    won: ["oh, c'est une chaîne. une chose pousse la suivante. tout se tient.", "une réaction en chaîne. je comprends tout maintenant."],
  },
  recital: {
    open: ["ok. je vais expliquer ça à corvin. arrête-moi si je me trompe.", "regarde bien. je présente. appuie sur stop si je me trompe."],
    stopped: ["quoi? j'ai dit quoi? ok, corrige.", "impoli. mais d'accord. qu'est-ce qui cloche?"],
    glance: ["ok, alors c'est quoi le morceau qui manque?", "presque. qu'est-ce que j'oublie?"],
    miss: ["c'est… ce que j'ai dit? alors qu'est-ce qui est faux?", "hm. ça ressemble à ma version. c'est quoi la correction?"],
    nothing: ["je recommence. arrête-moi où c'est faux.", "je continue? où est l'erreur?"],
    won: ["ok, je réessaie, comme il faut cette fois. …ouais. c'est ça. enfin.", "je présente la version corrigée. corvin, prends des notes."],
  },
  bossSays: {
    arrive: ["la brume s'épaissit. une voix : « {claim} »", "quelque chose dans le noir veut la lumière de gloam. ça chuchote : « {claim} »"],
    round: ["la brume bouge. « {claim} »", "le brouillard revient. « {claim} »", "« {claim} » la brume a l'air très sûre d'elle."],
    glance: ["la brume vacille. ça a piqué. pas assez.", "une fissure de lumière. la brume s'en moque."],
    miss: ["la brume gonfle. elle a aimé ça.", "le brouillard s'épaissit. ça l'a nourri."],
    hit: ["la lumière déchire la brume.", "la brume hurle et recule.", "un trou de lumière, en plein milieu."],
    nothing: ["la brume attend. elle est patiente. c'est du brouillard.", "rien ne se passe. le brouillard bourdonne."],
    defeated: ["la brume éclate en mille lucioles.", "le brouillard explose. la lumière gagne."],
  },
  bossGloam: {
    flare: ["{n} de suite. ma lanterne se CHARGE.", "ça fait {n}. je me sens puissant. bizarre.", "{n} coups. la brume a peur de nous maintenant.", "{n} de suite. arrête pas. je brille."],
    hint: ["je pense que celle-là parle de {topic}. qu'est-ce que tu m'as appris là-dessus?", "rappelle-toi ce que tu m'as appris. redis-le, à voix haute."],
  },
  skipped: ["bon. on y reviendra. {question}", "on saute le drame. {question}"],
};

const frStorybook = (big: boolean, age: AgeStyleId): GameLines => {
  const rival = age === "little" ? "Bobard" : age === "junior" ? "Hibou-Je-Sais-Tout" : "comte contraire";
  const S = (simple: string, middle: string) => (big ? simple : middle);
  return {
    rival,
    boss: S("la Brume", "la brume"),
    notebook: {
      open: [S("Regarde mes notes! Une d'elles est drôle. Tu la trouves?", "voici mes notes! une d'elles est peut-être… une catastrophe. tu la trouves?")],
      wrongPick: [S("Non, celle-là est bonne! Essaie une autre.", "non, celle-là est correcte! cherche encore."), S("Celle-là est correcte! Regarde encore!", "cette ligne est parfaite, merci. une autre.")],
      spotted: [S("Oh non! Celle-là! Elle devrait dire quoi?", "oh non. celle-là. elle devrait dire quoi?")],
      glance: [S("Ooh, pourquoi c'est faux?", "presque! mais pourquoi c'est faux?")],
      miss: [S("Hmm, ça ressemble à ma note! Qu'est-ce qui cloche?", "attends, c'est ce que j'ai écrit! qu'est-ce qui cloche?")],
      nothing: [S("Quelle ligne est drôle?", "quelle ligne est la catastrophe?")],
      won: [S("J'ai corrigé mes notes! Merci!", "corrigé! mes notes sont enfin bonnes!")],
    },
    rivalSays: {
      arrive: [S(`${age === "little" ? "Coin!" : "Hou hou!"} Je suis ${rival}! Tout le monde le sait : {claim}`, `voici! c'est moi, ${rival}! la vérité, c'est : {claim}`), S(`${age === "little" ? "Coin coin!" : "Hou!"} ${rival} sait tout : {claim}`, `${rival} est arrivé pour te corriger : {claim}`)],
      glance: [S("Hmm! Peut-être. Mais pourquoi?", "bon argument… mais POURQUOI?")],
      miss: [S("Tu vois? J'ai raison!", "ha! t'es d'accord avec moi!")],
      defeated: [S(`Oh! T'as raison. ${rival} rentre à la maison. Bye!`, `noooon! vaincu! ${rival} reviendra!`), S("D'accord, d'accord, je me suis trompé!", "bon! je me suis trompé! cette fois!")],
      nothing: [S("Tu peux me dire pourquoi je me trompe?", "c'est un argument, ça? je pense pas.")],
    },
    rivalGloam: {
      tempted: [S(`Attends… ${rival} a l'air tellement sûr! Qui a raison? Dis-moi!`, `${rival} a l'air TELLEMENT sûr. à l'aide! qui a raison?`)],
      won: [S(`Youpi! T'as battu ${rival}! Je comprends maintenant!`, `on a battu ${rival}! je comprends maintenant!`)],
    },
    whatif: {
      open: [S("Ooh, et si… {scenario}", "et si… {scenario}")],
      glance: [S("Ooh! Et pourquoi?", "ooh, peut-être! mais pourquoi?")],
      miss: [S("Hmm, vraiment? Dis-m'en plus!", "attends, vraiment? explique!")],
      nothing: [S("Qu'est-ce que t'en penses? {scenario}", "t'en penses quoi? {scenario}")],
      won: [S("Wow! Je peux deviner ce qui arrive maintenant!", "wow, je peux le prédire! je comprends pour vrai!")],
    },
    order: {
      open: [S("Oups! J'ai échappé mes cartes! Tu peux les mettre en ordre?", "j'ai échappé mes cartes! tu les remets en ordre?")],
      misordered: [S("Presque! Certaines sont mélangées.", "proche! il y en a deux d'inversées.")],
      ordered: [S("Youpi! Mais pourquoi « {a} » vient avant « {b} »?", "parfait! mais pourquoi « {a} » mène à « {b} »?")],
      glance: [S("Ooh, et pourquoi?", "continue! pourquoi?")],
      miss: [S("Hmm, comment elles sont reliées?", "hmm, ça les relie pas.")],
      nothing: [S("Tu peux mettre les cartes en ordre?", "les cartes attendent!")],
      won: [S("C'est comme une chaîne! Je comprends!", "c'est une chaîne! je comprends!")],
    },
    recital: {
      open: [S(`Je vais dire à ${rival} ce que j'ai appris! Dis stop si je me trompe!`, `regarde-moi l'expliquer à ${rival}! appuie sur stop si je me trompe!`)],
      stopped: [S("Oups! Qu'est-ce que j'ai mal dit?", "quoi? j'ai dit quoi? corrige!")],
      glance: [S("Qu'est-ce que j'ai oublié?", "presque! qu'est-ce qui me manque?")],
      miss: [S("Hmm, c'est ce que j'ai dit! Qu'est-ce qui cloche?", "c'est ce que j'ai dit! c'est quoi la correction?")],
      nothing: [S("Je continue?", "je continue? où est l'erreur?")],
      won: [S("Maintenant je vais le dire comme il faut!", "ok, la bonne version. réussi!")],
    },
    bossSays: {
      arrive: [S("Un nuage grognon arrive. « {claim} »", "une tempête arrive en riant. « {claim} »")],
      round: [S("Le nuage grogne : « {claim} »", "la brume rugit : « {claim} »")],
      glance: [S("Le nuage tremble!", "la tempête vacille! pas assez!")],
      miss: [S("Le nuage grossit!", "la tempête grossit! elle a aimé ça!")],
      hit: [S("Pouf! Le nuage rapetisse!", "BOUM! la lumière traverse la tempête!")],
      nothing: [S("Le nuage attend.", "la tempête attend.")],
      defeated: [S("Le nuage éclate en cent lucioles!", "la tempête explose en lucioles!")],
    },
    bossGloam: {
      flare: [S("{n} de suite! Ma lanterne brille tellement!", "{n} de suite! ma lanterne se CHARGE!"), S("Wow, {n}! Continue!", "{n} coups! COMBO!"), S("{n}! Le nuage a peur!", "{n}! la tempête a peur de nous!")],
      hint: [S("Rappelle-toi ce que tu m'as appris sur {topic}!", "rappelle-toi ce que tu m'as appris! redis-le!")],
    },
    skipped: [S("D'accord! Essayons autre chose. {question}", "on passe! ok : {question}")],
  };
};

/** The game's words for an age style, in a language */
export function gameLines(age: AgeStyleId, lang: Language = "en"): GameLines {
  if (age === "senior") return lang === "fr" ? frSenior : senior;
  const big = age === "little" || age === "junior";
  return lang === "fr" ? frStorybook(big, age) : storybook(big, age);
}
