# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
This project tracks Expo SDK 57 (`expo: ^57.0.0` in package.json) because iOS
Expo Go only ever ships the newest SDK, so an older pin cannot be opened on an
iPhone at all. Do not write against newer SDK APIs.

Two things that moved in the 54 to 57 jump and will bite again:

- `StyleSheet.absoluteFillObject` no longer exists in React Native 0.86. Use
  `AbsoluteFill` from `src/constants/design.ts`. The old property is now
  `undefined` on native, and `{ ...undefined }` is legal JavaScript that
  silently contributes nothing, so a style loses its positioning with no
  error. react-native-web still ships the old property, which means the web
  build keeps working and hides it.
- `expo-router` 57 vendored React Navigation and dropped the dependency on it.
  Import `ThemeProvider`, `DefaultTheme` and friends from `expo-router`, not
  from `@react-navigation/native`, which is no longer installed.

TypeScript 6 stopped auto-including ambient `@types/*` packages, so
`tsconfig.json` now lists `"types": ["jest"]` explicitly. Without it the whole
test suite fails to compile with "cannot find name describe".

# Hermes has no Intl

The iOS JS engine ships without the `Intl` constructors. `Intl.PluralRules` is
`undefined` there, and calling it throws "undefined cannot be used as a
constructor" mid-render, which takes the whole screen down.

Nothing on web will ever show this: every browser has `Intl`, so the web build
stays green while the phone crashes. `src/lib/ui-i18n.ts` guards for it and
falls back to one/other, and `ui-i18n.test.ts` deletes the global to prove the
fallback holds.

Before reaching for `Intl.NumberFormat`, `Intl.DateTimeFormat`,
`Intl.Collator`, `Intl.ListFormat` or `toLocaleString`, assume it is absent on
device and guard the same way. `String.prototype.normalize` and
`localeCompare` are fine; they exist, `localeCompare` just ignores the locale.

# This app has no backend, and one network feature

There is still no server of our own, and adding one is not a fix. Everything
except spoken answers must work with the device in airplane mode, signed out,
on first launch.

- **One network call, in one file.** `src/lib/groq.ts` is the only module
  allowed to use `fetch`. It sends a recording to Groq's Whisper for
  transcription and the resulting text to a Groq chat model for grading,
  because Expo Go has no on-device speech recognizer and keyword matching
  marked correct answers wrong whenever the wording differed.
- **Anywhere else, no network calls.** No API client, no `EXPO_PUBLIC_*` base
  URL. If a feature seems to need a server, it needs bundled data or local
  storage instead.
- **Groq is always optional.** With no key, no signal, or a failed request,
  the Mock Interview falls back to typed answers graded by
  `answer-matching.ts`, and every other screen is unaffected. Never write code
  that assumes the key exists or the request succeeded.
- **The key is public.** `EXPO_PUBLIC_GROQ_API_KEY` is inlined into the
  bundle, so anyone who downloads the app can read it. That is the price of
  having no server. Never put anything behind that prefix that would be worse
  than a Groq key to lose.
- **Content is bundled.** The 128 official USCIS questions, translated into all
  48 languages, live in `src/data/questions.json`. Regenerate it from the
  Citizenly website's `data/questions.ts` by *executing* that module - 29 of its
  48 languages are applied by merge loops at load time, so copying the source
  file silently loses them. **Strip em dashes as part of that step** (replace
  with a spaced hyphen), or the upstream ones come straight back.

# No em dashes

Not in code, comments, docs, UI copy or bundled content. Replace with a spaced
hyphen, a comma, a colon or a full stop, whichever reads best. En dashes are
fine in numeric ranges (`56-72px`, `ages 50-75`) and names (Fisher-Yates).

`node -e "..."` one-liners and find-and-replace both work, but check the result:
a standalone em dash used as an empty-value placeholder ("Email: -") needs real
words ("Not set"), not a bare hyphen.
- **Accounts and mistakes are local.** `src/lib/local-account.ts` and
  `src/lib/local-mistakes.ts` own them, both backed by AsyncStorage. Accounts do
  not sync, transfer, or recover; that's deliberate.
- **Every button works.** No dead handlers, no "couldn't reach the server", no
  dead ends. If something can't be done, say so in plain language and offer the
  thing that can.

# Styling

StyleSheet only, against the tokens in `src/constants/design.ts`. NativeWind and
Tailwind were removed - do not reintroduce class names. Honor the existing
touch-target sizes (56–72px); the audience is elderly and often low-vision.

Depth comes from `Elevation.card | raised | chrome`, never from ad-hoc shadows.
Type comes from the `Typography` variants; tracking is size-specific there
(negative on display sizes, positive on small labels) so do not add a blanket
`letterSpacing`.

# Motion

Springs, not timed transitions, for anything a person touches. Use the presets
in `src/constants/motion.ts` rather than hand-rolling configs:

- `SPRING` / `SPRING_SNAPPY` - critically damped. The default for everything.
- `SPRING_MOMENTUM` / `SPRING_SHEET` - the only places overshoot is allowed,
  and only because the user's own flick or drag put the element in motion.
- `FADE` / `FADE_OUT` - mirrored curves, so a reversible transition retraces
  its own path.

Every preset carries `ReduceMotion.System`, so the OS setting is handled
without call sites knowing. Press feedback belongs to `PressableSurface`: it
responds on press-*down*, not on release, and scales rather than dimming
because a dip is invisible on the navy fill.

Calm is the brief. Bouncing UI is harder to track for the audience this app is
for, so a spring that overshoots needs a reason a user could name.

# Before claiming work is done

`npx tsc --noEmit` and `npm test` must both pass.
