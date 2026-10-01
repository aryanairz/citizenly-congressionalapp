# Repository audit

Audited 2026-10-01 against commit `412c69a`. Every number below was measured,
not estimated; the commands are in the appendix so each one can be re-run.

## Verdict

The codebase is in good shape and unusually disciplined about its own rules.
The constraints in `AGENTS.md` are not aspirational: zero network calls, zero
em dashes, zero Tailwind, zero ad-hoc shadows, zero `Alert.alert`, zero
leftover `console.*`, zero `TODO`. That is rare and it is worth saying first.

What is weak is not the app code. It is everything around it: the persistence
layer has no tests, the app identity in `app.json` still reads as a template,
and the two civics banks have drifted into a maintenance trap. None of those
show up when you use the app, which is exactly why they need writing down.

## Health

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | Clean |
| Types, strict unused | `npx tsc --noEmit --noUnusedLocals` | Clean |
| Tests | `npm test` | 64 passing, 5 suites |
| Lint | `npm run lint` | 0 errors, 4 warnings (**was broken, see P1-1**) |
| Question bank | `question-bank.test.ts` | 128 questions, 48 languages, topics sum to 128 |

Scale: 36 `.tsx`, 36 `.ts`, about 14,600 lines of source, 625 lines of test,
15 routes, 26 commits.

## Constraint compliance

Measured against the rules in `AGENTS.md`.

| Rule | Status |
|---|---|
| No network calls (`fetch`, `axios`, `XMLHttpRequest`, `EXPO_PUBLIC_*`) | **0 occurrences** |
| No em dashes anywhere | **0 occurrences** in `src/`, `README.md`, `AGENTS.md` |
| StyleSheet only, no NativeWind or Tailwind | **0 occurrences** of `className`, `nativewind`, `tailwind` |
| Depth via `Elevation`, never ad-hoc shadows | **0** raw `shadowColor` / `boxShadow` outside `design-tokens.js` |
| No raw `Alert.alert` (silent no-op on web) | **0** outside `lib/confirm.ts` |
| Springs from `motion.ts`, not hand-rolled | **3 violations**, see P3-1 |
| No debug artifacts | **0** `TODO`, `FIXME`, `HACK`, `console.*` |

One rule is partially broken and three are clean enough to stop checking.

## Findings

Priority reflects impact on a Congressional App Challenge submission, where a
judge installs the app, opens it once, and forms an opinion in a minute.

### P1: fix before submitting

**P1-1. `npm run lint` was broken.** `eslint` was listed nowhere in
`devDependencies` and was not installed, so the command in the README failed
with `Cannot find module 'eslint'`. Running `npx expo lint` self-repaired it by
installing `eslint@^9` and `eslint-config-expo@~10` and writing
`eslint.config.js`. **I left that repair in place**, see "What this audit
changed". Lint now reports 0 errors and 4 warnings.

**P1-2. The app identifies itself as a template.** In `app.json`:

| Field | Current | Problem |
|---|---|---|
| `name` | `citizenly-app` | This is the label under the home-screen icon. It should read `Citizenly`. |
| `slug` | `citizenly-app` | Cosmetic, but it leaks into URLs. |
| splash `backgroundColor` | `#208AEF` | Bright blue. Not in the palette. Navy is `#1B2A4A`. |
| `adaptiveIcon.backgroundColor` | `#E6F4FE` | Pale blue. Also not in the palette. |
| `ios` | absent | No `bundleIdentifier`. Fine for Expo Go, blocks a real build. |
| `android.package` | absent | Same. |

The splash colour is the single highest-leverage fix in this document. It is
the first thing anyone sees, it belongs to a different app than the one that
opens, and it is a one-line change.

**P1-3. The persistence layer has no tests.** `src/lib/local-account.ts` and
`src/lib/local-mistakes.ts` own every piece of user data in an app that
deliberately has no backend and no recovery path. A regression there silently
destroys someone's account with no way back. Both have zero tests.

Untested modules in full:

```
lib/   confirm, digits, i18n, local-account, local-mistakes, speech,
       token-store, ui-i18n, ui-strings, use-interview-voice, use-lang,
       use-question-pool
data/  civics-2025, english-test, personalized-questions, question-types,
       representatives, state-data-types, territories
```

Tested: `answer-matching`, `interview-machine`, `speech-languages`,
`question-bank`, `civics-questions`. The hard logic is covered. The data
layer is not.

### P2: should fix

**P2-1. Two civics banks describe the same 128 questions.**
`src/data/questions.json` (128 questions, 48 languages, 2.2 MB) feeds Quiz,
Flashcards and Study. `src/data/civics-2025.ts` (1,228 lines, English only)
feeds the Mock Interview. They overlap entirely in subject matter, and **7
entries are marked `dynamic: true`**, meaning they name current officeholders
and change with elections. Those have to be corrected in two files, in two
formats, or the app contradicts itself. Last verified 2026-08-23.

**P2-2. Dashboard progress is a hardcoded `0`.** `src/app/dashboard.tsx:101`
declares `const mastered = 0` with the comment "Placeholder until real
progress tracking is wired up". The navy hero, the 52px figure and the
progress bar are the visual centrepiece of the screen and they always read
zero. It also makes the next line dead code: the `mastered === 0` branch
means the "Going well" encouragement can never render.

For judging, a dashboard that never moves is worse than no dashboard. Either
wire it to the mistake bank, which already tracks per-question state, or
replace the figure with something true.

**P2-3. 183 UI strings are English-only.** The app ships 48 languages of
*question* content but roughly 30 `t()` call sites and 29 defined keys, so the
chrome around it is almost entirely English: validation copy, onboarding
questions, profile editors, dialogs, empty states, "Check Answer", "Finish".
Full list in `audit/untranslated-ui.md`. For an app whose entire premise is
"study in your own language", this is the gap most visible to the target user.

**P2-4. 35 question strings never got translated.** Detailed in
`audit/language-leaks.md`. 19 of the 35 are Hmong, which needs a native
speaker rather than a script. Nothing is missing or empty so no screen breaks;
the reader just sees English where their language should be. **No test guards
this**, so a bad regeneration would not be caught the way a missing field is.

**P2-5. 26 dependency vulnerabilities (9 high) in the production tree.**
`@xmldom/xmldom`, `brace-expansion`, `browserslist`, `image-size`, `js-yaml`,
`nanoid`, `postcss`, `tar`, `undici`. All arrive transitively through Expo
tooling rather than from app code, and an app that makes no network calls and
parses no untrusted input has little real exposure. Worth knowing before
someone else runs `npm audit` and asks.

**P2-6. Three dependencies drifted from the SDK 54 baseline.**

```
expo            54.0.35  ->  ~54.0.37
expo-constants  18.0.13  ->  ~18.0.14
@types/jest     30.0.0   ->  29.5.14
```

The `@types/jest` one matters more than it looks: `jest` is pinned to `^29.7.0`
precisely because `ts-jest@29` breaks against Jest 30. Having the v30 types
against a v29 runtime is the same mismatch waiting in the type layer.

### P3: cleanup

**P3-1. Three hand-rolled springs.** `AGENTS.md` says to use the presets in
`motion.ts`. These three inline their own:

- `src/components/option-row.tsx:87` - `ZoomIn.springify().damping(12).stiffness(220)`
- `src/components/quiz-ui.tsx:195` and `:200` - `ZoomIn.springify().damping(11).stiffness(200)`

Both work out to a damping ratio near 0.4, so they overshoot heavily. That is
defensible for a verdict icon landing on the user's own answer, and the code
says so, but it should be a named preset (`ENTER_VERDICT`) rather than two
different magic pairs doing the same job. An underdamped spring hand-written
inline is exactly how the feedback panel's bounce bug got in.

**P3-2. About 851 KB of unreferenced image assets.** Zero references anywhere
in `src/` or `app.json`:

```
logo.png        229 KB
logo-glow.png   332 KB
og-image.png    290 KB
```

`og-image.png` is a social-share card with no web page pointing at it.
`logo.png` and `logo-glow.png` are superseded by `citizenly-wordmark.png`.
Separately, `icon.png` is 799 KB, which is large for an app icon.

**P3-3. Unused dependencies.** `expo-blur`, `expo-symbols` and `expo-device`
are declared and never imported. Note that `expo-linking`, `expo-constants`,
`expo-system-ui` and `react-native-gesture-handler` also show zero direct
imports but are pulled in by `expo-router` and friends, so leave those alone.

**P3-4. Dead export.** `isAutoSpeakOn()` in `src/lib/speech.ts:114` is
exported and called from nowhere.

## What is genuinely good

Worth recording so it does not get refactored away by accident.

- **The frontend-only constraint actually holds.** Not one network call, in a
  codebase of 14,600 lines that replaced a backend-backed website. Every
  feature works signed out, first launch, airplane mode.
- **The question bank is guarded by a test that would catch a bad
  regeneration.** `question-bank.test.ts` asserts 128 questions and a
  non-empty string for every field in all 48 languages. Given the merge-loop
  trap documented in `AGENTS.md`, that test is the thing standing between the
  app and silently serving English.
- **The design system is real.** Tokens in one place, depth from `Elevation`,
  a size-specific type scale, springs described in Apple's damping-ratio and
  response terms, and `ReduceMotion.System` carried by every preset so call
  sites never think about it.
- **Accessibility is wired in, not bolted on.** 25 `accessibilityRole`, 20
  `accessibilityLabel`, 8 `accessibilityState`, 16 reduced-motion call sites.
  `PressableSurface` shows no role of its own because it forwards the
  caller's, which is correct.
- **The mock interview is the strongest feature.** A pure state machine with
  its own test suite, on-device speech, and a deliberate refusal to score
  pronunciation or accent.

## What this audit changed

An audit should be read-only. One thing was not, and it is disclosed here
rather than buried:

Running `npx expo lint` to measure lint health caused Expo to self-repair the
broken setup. Three files changed:

- `package.json` gained `eslint@^9.0.0` and `eslint-config-expo@~10.0.0`
- `package-lock.json` updated accordingly
- `eslint.config.js` created

I left it in place because the README already advertises `npm run lint` and it
now does what the README says. To undo: `git checkout package.json
package-lock.json && rm eslint.config.js`.

No source file was modified.

## Appendix: reproducing these checks

```bash
# Health
npx tsc --noEmit --noUnusedLocals
npm test
npm run lint

# Constraint compliance
grep -rnE "\bfetch\(|XMLHttpRequest|axios|EXPO_PUBLIC_" src/ --include=*.ts --include=*.tsx
node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log([...t].filter(c=>c.charCodeAt(0)===8212).length)" README.md   # 8212 = em dash
grep -rn "className=\|nativewind\|tailwind" src/ package.json
grep -rn "shadowColor\|boxShadow" src/ | grep -v design-tokens
grep -rn "Alert.alert" src/ | grep -v lib/confirm.ts
grep -rn "damping(\|stiffness(" src/ | grep -v constants/motion.ts

# Data integrity
node -e "const q=require('./src/data/questions.json');console.log(q.length)"
grep -c "dynamic: true" src/data/civics-2025.ts

# Dependencies
npx expo install --check
npm audit --omit=dev

# Dead assets
for i in logo logo-glow og-image; do echo -n "$i.png: "; grep -rF "$i.png" src/ app.json | wc -l; done
```
