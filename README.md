# Citizenly - Congressional App Challenge

Our entry for the **[Congressional App Challenge](https://www.congressionalappchallenge.us/)** -
and we're going to win it.

This repo is a working duplicate of the Citizenly mobile app
(`aryanairz/citizenly-app`), developed here as the Congressional App Challenge
submission. It is *unofficially* the Citizenly app: same codebase, same
mission, evolving independently for the competition.

Citizenly is a free, multilingual study tool that helps immigrant parents
(50+) prepare for the **U.S. citizenship civics test** in their native
language. Large touch targets, big type, and a deliberately calm pace -
designed for elders, set up by their adult children.

> Social-impact project. No ads, no subscriptions, no fees.

**The app is entirely self-contained.** There is no server, no API and no
network call anywhere: all 128 official questions in all 48 languages are
bundled into the app, accounts live on the device, and every screen works in
airplane mode.

---

## Running it

```bash
npm install
npx expo start     # web on http://localhost:8081, QR code for Expo Go
```

No environment variables, no second terminal, nothing to configure.

`npx tsc --noEmit` type-checks; `npm run lint` lints; `npm test` runs the Jest
suite over the bundled content and the interview logic.

> Voice input in the Mock Interview needs a **development build**
> (`npx expo run:ios` / `run:android`) - `expo-speech-recognition` is a native
> module and isn't in Expo Go. Everywhere else, and in Expo Go, the interview
> falls back to typed answers.

### Viewing it on the web

`http://localhost:8081`. It's a phone app, so open DevTools (F12) and switch on
device emulation (Ctrl/Cmd+Shift+M) to see it at a real phone width - full
desktop width leaves large gaps the layout was never designed for.

Since accounts are stored on the device, `localStorage.clear()` in the browser
console resets you to a first-time user.

---

## What works today

- **Bundled content** - the **128 official USCIS questions** in **all 48
  languages**, shipped in the app (`src/data/questions.json`, 2.2 MB). Zero
  empty translations: nothing silently falls back to English. Generated from
  the website's bank by *executing* its module, because 29 of its 48
  languages are only applied by merge loops at load time. The website's 23
  "extra practice" records are deliberately excluded - they have no standing
  on the real test.
- **Accounts, on the device** - email + 5-digit PIN stored in AsyncStorage
  (`src/lib/local-account.ts`). Sign up, log in, change your email or PIN,
  change your state - all local, all instant, all working offline.
- **Onboarding** - sign-up → study language (**searchable**, matching native
  name, English name or code) → exemption (50/20, 55/15, 65/20) → state +
  congressional district.
- **Study modes** - Study Questions (browse + expand answers), Flashcards
  (swipe/flip), and Quiz (multiple choice). 65/20 users get exactly the 20
  questions USCIS designates instead of 128; setting a state swaps the
  generic state questions for ones naming your real governor, senators,
  representative and capital.
- **Review Mistakes** - quiz over the device's mistake bank. Every mode
  enrolls wrong answers; answering correctly here is the only thing that
  removes one, so the bank drains itself as you improve.
- **Read-aloud** - every question, answer and explanation can be spoken in
  the user's study language through on-device TTS (`expo-speech`), so someone
  who reads little English can study unaided. Quiz also speaks the verdict and
  explanation automatically after grading; that auto-play is one tap to turn
  off in Profile, and the manual speaker buttons keep working either way.
  Hmong, Haitian Creole and Slovenian have no voice on any platform, so the
  button is hidden rather than left silently broken
  (`src/lib/speech-languages.ts`).
- **Profile** - email change (PIN-confirmed), PIN change, state/district
  change, log out.
- **Mock Interview** - a full simulated naturalization interview, entirely
  offline: an eligibility step routes you to the right test (2008 vs 2025 by
  age and years as an LPR (50/20, 55/15 and 65/20 special consideration),
  then a pure state machine (`src/lib/interview-machine.ts`) runs oath →
  eligibility → reading → writing → civics with the officer stopping the
  moment the outcome is decided. The officer speaks (expo-speech), answers
  are transcribed **on-device** (expo-speech-recognition - needs a dev
  build; typed-answer fallback in Expo Go/web or with mic denied), and
  scoring is keyword-based (`src/lib/answer-matching.ts`) - pronunciation
  and accent are never judged. The 128-question bank is bundled
  (`src/data/civics-2025.ts`) with ids mirroring the website's, so misses
  land in Review Mistakes.
- **Partial UI i18n** - the app chrome is being translated via
  `src/lib/ui-strings.ts` (dictionary generated from the website's complete
  48-language `lib/i18n.ts`) + `t()`/`tCount()` (`src/lib/ui-i18n.ts`, with
  `Intl.PluralRules` plurals) + `useLang()`. Roughly two dozen high-traffic
  keys are wired (welcome, auth, nav, mode titles, quiz session chrome).

## How it looks

The audience is elderly, often low-vision, and frequently reading a second
language. Every visual decision below follows from that, and the rules live in
`src/constants/design-tokens.js` rather than in any screen.

- **One typeface, three weights.** DM Sans at 400/600/700. The 500 Medium face
  is deliberately absent: it failed to resolve at runtime and fell through to
  the browser's serif default, which is what once turned every question into
  Times New Roman. The family name carries the weight, so no `fontWeight` is
  ever emitted, and on web the family is followed by a system sans stack. A
  serif fallback is now structurally impossible rather than merely fixed.
- **Tracking is size-specific.** Display sizes take negative tracking because
  letters read as drifting apart the larger they get; small labels take
  positive tracking to stay legible. Leading moves the opposite way, and stays
  generous throughout. Nothing gets a blanket `letterSpacing`, which would also
  break complex-script ligatures in Devanagari, Malayalam and Gujarati.
- **Depth, not outlines.** Surfaces sit on `Elevation.card | raised | chrome`,
  with navy-tinted rather than black shadows so they do not muddy the white
  ground. A border on top of a shadow is two devices doing one job.
- **Touch targets stay 56-72px** and the primary action is always a single
  filled button. A second button of equal weight makes the user choose twice.
- **Springs, not timed transitions**, from `src/constants/motion.ts`, described
  by damping ratio and response. Overshoot is allowed only where the user's own
  flick or drag put the element in motion. `PressableSurface` responds on
  press-*down* and scales rather than dimming, because a dip in opacity is
  invisible on the navy fill. Every preset carries `ReduceMotion.System`.
- **The welcome screen** is the name, one headline, one line of copy, two rows
  of the 48 language names drifting past in opposite directions, and one
  button. It used to pitch three times over with a sample question, a row of
  figures and a feature list. Showing someone their own alphabet does more than
  telling them the number 48 does.

## Known gaps

- **35 strings in the question bank never got translated** (`audit/language-leaks.md`).
  19 of them are Hmong, which needs a native-speaker reviewer rather than a
  script. Nothing here is missing or empty, so no screen breaks; the reader
  just sees English where their own language should be. No test guards this
  yet, so a bad regeneration would not be caught the way a missing field is.
- **No RTL support.** Arabic and Hebrew are selectable and their *question
  content* renders, but layouts don't mirror and content isn't
  right-aligned. Needs `writingDirection`/`textAlign` handling (or full
  `I18nManager`) before those languages are truly usable.
- **183 UI strings are still English-only** (counted by
  `scripts/audit-untranslated-ui.js`; full list in
  `audit/untranslated-ui.md`) - validation/error copy,
  onboarding questions, profile editors, dialogs, loading/empty states,
  "Check Answer"/"Finish", the Profile tab, mode descriptions. The i18n
  infrastructure handles them the moment translations are added to
  `ui-strings.ts`.
- **Dashboard progress is hardcoded to 0** - no progress tracking, streaks,
  or per-topic mastery yet.
- **The splash screen is still Expo's template blue** (`#208AEF` in
  `app.json`, with `#E6F4FE` behind the adaptive icon). Neither is in the
  palette, so the first thing anyone sees on launch belongs to a different
  app than the one that opens.
- **No timed test** - the website's exam simulator (20 questions / 10 min /
  12 to pass, or 10 / 5 / 6 for 65/20) has no app equivalent yet.
- **Accounts don't sync or transfer.** They live on one device with no
  recovery, so "Forgot PIN?" offers a fresh start rather than a reset. That
  is deliberate for a frontend-only app, not an oversight.
- **Only the current (2025) civics test is bundled.** `interview-machine.ts`
  models the real filing-date rule - N-400s filed before 2025-10-20 sit the
  legacy 100-question 2008 test - but that bank isn't shipped, so every mock
  interview practises the current 128-question test. An early filer still
  waiting on an interview would be studying slightly the wrong material.

---

## Tech notes

| Layer      | Choice                                                       |
|------------|--------------------------------------------------------------|
| Framework  | Expo SDK 57 (iOS Expo Go only ships the newest SDK) · React 19.2 · RN 0.86 |
| Routing    | expo-router v6, typed routes                                  |
| Styling    | StyleSheet + shared design tokens (`src/constants/design-tokens.js` → typed constants in `src/constants/design.ts`), incl. depth and a size-specific type scale |
| Motion     | Reanimated 4 springs from `src/constants/motion.ts`, described by damping ratio + response; reduced-motion handled in the presets |
| State      | Two React contexts (session, onboarding) + hooks - no Redux/Query |
| Data       | Bundled JSON - no network layer at all                        |
| Storage    | AsyncStorage (account, mistakes) · SecureStore/AsyncStorage via `token-store.ts` |
| Type/lint  | TypeScript strict · `expo lint` · Jest                        |

### Layout of `src/`

```
src/
├── app/            expo-router screens (welcome, auth, onboarding/, dashboard,
│                   select-topic, study-list, flashcards, quiz, review-mistakes,
│                   mock-interview, profile, edit-location)
├── components/     Design-system primitives (Button, Input, PinInput, OptionRow,
│                   ScreenContainer, quiz UI, language + state pickers, …)
├── constants/      design tokens · brand + 48 languages · topics · exemptions ·
│                   US states
├── data/           questions.json (128 × 48 languages) · question-bank (pool
│                   building) · personalized questions + representatives ·
│                   civics-2025 + english-test (mock interview)
└── lib/            local-account · local-mistakes · session context · question
    │               pool · content i18n (localize) · UI i18n (t/tCount) ·
    └──             answer-matching · interview-machine · interview voice
```

Outside `src/`:

```
scripts/           audit-language-leaks.js · audit-untranslated-ui.js
audit/             the reports those two produce, checked in so the gaps are
                   visible rather than remembered
```

`audit-language-leaks.js` checks all 36,096 translated strings for values that
never got translated. Comparing against English alone produces mostly noise,
because proper nouns are legitimately identical across languages, so instead it
counts how many of the 47 non-English languages leave a value byte-identical:
"Joe Biden" is unchanged in about 30 because it is a name, while "Capitalism"
is unchanged in exactly one because one translator skipped it. Anything shared
by more than 14 languages is filed as a proper noun rather than counted. What
survives is **35 hard leaks**, plus 87 medium-confidence and 109 length
findings.

### Regenerating the question bank

`src/data/questions.json` is generated from the Citizenly website's
`data/questions.ts`. **Do not copy that file across.** Only 19 of its 48
languages are in the array literal; the other 29 are applied by 32 mutation
loops when the module loads, so a plain copy silently drops them with no type
error and no runtime error - the app would just quietly serve English.

The regeneration step must *execute* the module and serialize the merged
result, filtering to `topic !== 'extra'`. `src/data/__tests__/question-bank.test.ts`
guards the outcome: it asserts 128 questions and a non-empty string for every
field in every one of the 48 languages, so a bad regeneration fails the suite
rather than shipping.

The same applies to `personalized-questions.ts`, `representatives.ts` and
`territories.ts` - those are plain data and *can* be copied, with their import
paths repointed at `@/data/…`.
