# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
This project pins Expo SDK 54 (`expo: ~54.0.0` in package.json) for Expo Go compatibility — do not write against newer SDK APIs.

# This app is frontend-only

There is no backend, and adding one is not a fix. Every feature must work with
the device in airplane mode, signed out, on first launch.

- **No network calls.** No `fetch`, no API client, no `EXPO_PUBLIC_*` base URL.
  If a feature seems to need a server, it needs bundled data or local storage
  instead.
- **Content is bundled.** The 128 official USCIS questions, translated into all
  48 languages, live in `src/data/questions.json`. Regenerate it from the
  Citizenly website's `data/questions.ts` by *executing* that module — 29 of its
  48 languages are applied by merge loops at load time, so copying the source
  file silently loses them.
- **Accounts and mistakes are local.** `src/lib/local-account.ts` and
  `src/lib/local-mistakes.ts` own them, both backed by AsyncStorage. Accounts do
  not sync, transfer, or recover; that's deliberate.
- **Every button works.** No dead handlers, no "couldn't reach the server", no
  dead ends. If something can't be done, say so in plain language and offer the
  thing that can.

# Styling

StyleSheet only, against the tokens in `src/constants/design.ts`. NativeWind and
Tailwind were removed — do not reintroduce class names. Honor the existing
touch-target sizes (56–72px); the audience is elderly and often low-vision.

# Before claiming work is done

`npx tsc --noEmit` and `npm test` must both pass.
