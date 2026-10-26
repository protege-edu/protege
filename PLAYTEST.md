# Play-testing Protégé with friends

Phase 1 isn't done until real people have played it. This is a short plan for one play-test session (about 30 minutes per friend). You only need this laptop.

## Before they arrive

1. Open the **Ollama** app, then run `npm run dev` and open http://localhost:3000. Wait until Gloam is on the title screen.
2. Use the normal address, **not** `?test`. Test mode lets pasted answers work, and you want to see what friends do without it.
3. Give each friend a **made-up nickname** (no real names, nothing personal). If they play on the same computer, use a new private browser window for each one so they each get a fresh Gloam.
4. Have a piece of paper ready for notes. Write notes about what happened, not about who they are.

## What to say (and not say)

Say only: *"This is a game where you teach a confused character about seasons. Try it and think out loud."*

Then **don't help**. Don't explain buttons, don't hint at answers. If they get stuck for more than a minute, note where, then you can nudge.

## What to watch for

- **The first 30 seconds:** do they know what to do after the intro? Do they find the notebook?
- **Laughing or smiling:** write down which Gloam line did it. Those lines are gold.
- **Confusion:** any moment they say "what?" or go quiet. Where were they?
- **The "I get it" moment:** do they notice the candle and the walk? Do they react?
- **Boredom:** do they start typing random stuff? After how long?
- **Cheating:** do they try to paste, or ask Gloam for the answer? What happens?
- **Anything broken:** a weird reply, a wrong idea counted as right, something that didn't move, a slow reply.

## After they play (5 minutes)

Ask, and write the answers down:

1. What was your job in the game?
2. What was the funniest thing Gloam said?
3. Was there a moment you felt stuck or annoyed?
4. Did Gloam ever seem to understand something it shouldn't have (or not get something you explained well)?
5. Would you play another lesson like this in class? Why or why not?
6. If you could change one thing, what would it be?

## Afterwards

Bring the notes back to Claude Code ("here are my play-test notes") and we'll fix what they found. The teacher dashboard (http://localhost:3000/teacher) also shows where each player got stuck, if you put them in a class first.
