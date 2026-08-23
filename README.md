# Citizenly — Congressional App Challenge

Our entry for the **[Congressional App Challenge](https://www.congressionalappchallenge.us/)** —
and we're going to win it.

This repo is a working duplicate of the Citizenly mobile app
(`aryanairz/citizenly-app`), developed here as the Congressional App Challenge
submission. It is *unofficially* the Citizenly app: same codebase, same
mission, evolving independently for the competition.

Citizenly is a free, multilingual study tool that helps immigrant parents
(50+) prepare for the **U.S. citizenship civics test** in their native
language. Large touch targets, big type, and a deliberately calm pace —
designed for elders, set up by their adult children.

> Social-impact project. No ads, no subscriptions, no fees.

This app has **no backend of its own**. It is a client for the Citizenly
Next.js website (repo: `aryanairz/ourparents`), calling its `/api/*` routes
for auth, questions, and mistake tracking.

---

## Running it (two terminals)

**Terminal 1 — the website/API** (in the `forourparents` repo):

```bash
npm run dev        # Next.js API + site on http://localhost:3000
```

**Terminal 2 — this app:**

```bash
npm install
cp .env.example .env   # then edit — see below
npx expo start         # web on http://localhost:8081, QR code for Expo Go
```

### `.env` — pointing the app at the API

The only variable is `EXPO_PUBLIC_API_BASE` (inlined into the bundle at
build/start time; restart with `npx expo start -c` after changing it).

- **Web / simulator on the same machine:** `http://localhost:3000`
  (Android emulator: `http://10.0.2.2:3000`)
- **Physical phone via Expo Go:** `localhost` points at the phone itself —
  use your computer's LAN IP, e.g. `http://192.168.1.42:3000`, with the
  website running and both devices on the same Wi-Fi. Find the IP with
  `ipconfig` (Windows, IPv4 Address).

Cross-origin requests work because the website ships a CORS `proxy.ts` for
`/api/*` (permissive in dev; production origins come from its
`CORS_ALLOWED_ORIGINS` env var).

`npx tsc --noEmit` type-checks; `npm run lint` lints.

---

## What works today

- **Auth** — email + 5-digit PIN against the shared backend (JWT in
  SecureStore on iOS/Android, AsyncStorage on web). Offline-tolerant session
  restore: cached user shows immediately, background `/api/auth/me` refresh,
  only an explicit invalid-session answer signs out.
- **Onboarding** — sign-up → study language → exemption (50/20, 55/15,
  65/20) → state + congressional district (two-step picker); the account is
  created in one `/api/signup` call at the end.
- **Study modes** — Study Questions (browse + expand answers), Flashcards
  (swipe/flip), and Quiz (multiple choice), all over the live question pool:
  the official 128-question bank plus state-personalized questions
  (governor, senators, representative, capital), with a 10-question offline
  fallback set.
- **Review Mistakes** — quiz over the server-side mistake set; answering
  correctly is the only thing that resolves a mistake (mirrors the website).
  Mistakes recorded offline queue in AsyncStorage per user and flush on
  reconnect/sign-in/foreground.
- **Profile** — email change (PIN-confirmed), PIN change, state/district
  change, log out.
- **48 languages** — question content renders in the user's study language
  with per-string English fallback (`src/lib/i18n.ts`); the language list
  and codes exactly match the website's `Lang` union.
- **Partial UI i18n** — the app chrome is being translated via
  `src/lib/ui-strings.ts` (dictionary generated from the website's complete
  48-language `lib/i18n.ts`) + `t()`/`tCount()` (`src/lib/ui-i18n.ts`, with
  `Intl.PluralRules` plurals) + `useLang()`. ~20 high-traffic keys are wired
  (welcome, auth, nav, mode titles, quiz session chrome).

## Known gaps

- **No RTL support.** Arabic and Hebrew are selectable and their *question
  content* renders, but layouts don't mirror and content isn't
  right-aligned. Needs `writingDirection`/`textAlign` handling (or full
  `I18nManager`) before those languages are truly usable.
- **~150 UI strings are still English-only** — validation/error copy,
  onboarding questions, profile editors, dialogs, loading/empty states,
  "Check Answer"/"Finish", the Profile tab, mode descriptions. The i18n
  infrastructure handles them the moment translations are added to
  `ui-strings.ts`.
- **Mock Interview is a UI mock** — hardcoded questions, no audio recorded
  or played, results cycle on a fixed pattern. The `PRO` badge has no
  billing behind it. (A real AI interview prototype exists separately:
  `aryanairz/citizenlyfeature`.)
- **No 65/20 reduced question set** — the exemption choice is stored, but
  study modes always use the full pool; the website's `?set=6520` bank
  isn't fetched yet.
- **Read-aloud is a placeholder** — speaker buttons render but play nothing.
  The website's `/api/tts` covers 45 of 48 languages and is the intended
  backend.
- **Dashboard progress is hardcoded to 0** — no progress tracking yet
  (`/api/quiz-attempts` exists on the website and is unused here).
- Expo template leftovers (`src/app/explore.tsx`, a few components/hooks)
  are still present and slated for deletion.

---

## Tech notes

| Layer      | Choice                                                       |
|------------|--------------------------------------------------------------|
| Framework  | Expo SDK 54 (pinned for Expo Go compatibility) · React 19 · RN 0.81 |
| Routing    | expo-router v6, typed routes                                  |
| Styling    | StyleSheet + shared design tokens (`src/constants/design-tokens.js` feeds both Tailwind config and typed runtime constants); NativeWind 4 is wired but lightly used |
| State      | Two React contexts (session, onboarding) + hooks — no Redux/Query |
| Storage    | SecureStore (native) / AsyncStorage (web) via `src/lib/token-store.ts` |
| Type/lint  | TypeScript strict · `expo lint`                               |

### API routes this app depends on (served by the website)

`/api/auth/login` · `/api/auth/me` · `/api/signup` ·
`/api/questions?set=official|6520` · `/api/personalized-questions` ·
`/api/mistakes` (GET/POST/DELETE) · `/api/users/email|pin|place` (PATCH) —
and, once read-aloud is real, `/api/tts`.

### Layout of `src/`

```
src/
├── app/            expo-router screens (welcome, auth, onboarding/, dashboard,
│                   select-topic, study-list, flashcards, quiz, review-mistakes,
│                   mock-interview, profile, edit-location)
├── components/     Design-system primitives (Button, Input, PinInput, OptionRow,
│                   ScreenContainer, quiz UI, state/district picker, …)
├── constants/      design tokens · brand + 48 languages · topics · exemptions ·
│                   US states · offline mock questions
└── lib/            api client · session context · question pool · mistake queue ·
    │               content i18n (localize) · UI i18n (t/tCount, ui-strings) ·
    └──             token-store · digits · use-lang
```
