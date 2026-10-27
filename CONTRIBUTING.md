# Helping with Protégé

Thanks for wanting to help. Protégé is used by real students, so a few rules matter more than usual.

## The rules every change follows

1. **Nothing paid, nothing in the cloud.** Every library, font, model and service must be free and open
   source (or free forever) and run on the school's own computer. All AI goes through `lib/ai/`.
2. **No real student data, ever.** Not in code, tests, screenshots, issues or pull requests. Use made-up
   nicknames. No analytics, trackers or third-party scripts.
3. **Kid-safe.** Gloam stays on topic, never mocks a student, and never gives away the answer.
4. **Nothing feels like a test.** If a change makes school more stressful or boring, it doesn't belong.
5. **Every age style and both languages.** A new screen or word has to work for K–2 through grade 12, in
   English and French (`lib/age-styles/`). Nothing on a student screen is hard-coded.
6. **Accessible.** WCAG 2.2 AA, keyboard only, screen readers, "Ways to play", and less motion.

## Getting set up

Follow [Run it from the code](README.md#run-it-from-the-code) in the README. Then, before you open a pull
request:

```
npm run typecheck
npm run lint
npm run test:logic
npm run test:accounts
npm run licenses
```

GitHub runs the same checks on every pull request. If you change a screen, add before and after
screenshots, and run the every-page check (`scripts/audit.ts`) if you can.

## Reporting a problem

- **Bugs and ideas:** open an issue. Never include a student's name, nickname, or what they wrote.
- **Security or privacy problems:** report them privately (see [SECURITY.md](SECURITY.md)), not in an issue.

## Licence

Protégé is under the [AGPL-3.0](LICENSE). By sending a change, you agree it's shared under the same licence.
