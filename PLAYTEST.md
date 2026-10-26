# Play-testing Protégé with friends

Phase 1 isn't done until real people have played it. This is a short plan for one play-test session (about 30 minutes per friend). You need this laptop, and friends can use their own phones or Chromebooks on the same Wi-Fi.

## Before they arrive

1. Open the **Ollama** app, then run `npm run class`. It checks the AI, starts Protégé in real mode, and prints the address for friends with a QR code.
2. On this laptop, open http://localhost:3000/teacher, sign in (or make your account with the setup code), and make a class called "Play-test" for your grade. Give it the seasons lesson (or your own).
3. On the class page, press **Show the code**. Friends open the address or scan the QR code, type the code, and pick a **made-up nickname** (no real names) and their secret pictures. Joining is part of the test: watch whether it's easy.
4. Don't use `?test`: test mode lets pasted answers work, and you want to see what friends do without it (it doesn't exist in `npm run class` anyway).
5. Have a piece of paper ready for notes. Write notes about what happened, not about who they are.

## What to say (and not say)

Say only: *"This is a game where you teach a confused character about seasons. Try it and think out loud."*

Then **don't help**. Don't explain buttons, don't hint at answers. If they get stuck for more than a minute, note where, then you can nudge.

## What to watch for

- **Joining:** do they manage the code, the nickname and the pictures without help? Do they remember their pictures if they sign in again?
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

Bring the notes back to Claude Code ("here are my play-test notes") and we'll fix what they found. Your class page also shows where each player got stuck, what the group got wrong most, and every conversation. You can download it as a spreadsheet, and delete the class when you're done.
