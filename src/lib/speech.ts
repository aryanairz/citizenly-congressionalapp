/**
 * Read-aloud: on-device text-to-speech for study content.
 *
 * For a user who reads little or no English, hearing the question is the whole
 * point of the app - so this runs entirely on the device through expo-speech.
 * No network, no API key, nothing leaves the phone, and it works in airplane
 * mode like everything else here.
 *
 * Two rules the rest of the app depends on:
 *   - Only one utterance at a time. Every speak() stops whatever was talking,
 *     so tapping a second speaker button never layers two voices.
 *   - Never offer audio that won't play. Languages with no voice on any
 *     platform hide the button rather than appearing broken.
 */

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { LanguageCode } from '@/constants/brand';
import { canSpeak, speechTagFor } from '@/lib/speech-languages';

export { canSpeak, speechTagFor };

/** Slower than default: the audience is elderly and often hearing this in a second language. */
const RATE = 0.85;

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

type SpeakingListener = (speaking: boolean) => void;
const speakingListeners = new Set<SpeakingListener>();
let speaking = false;

function setSpeaking(next: boolean) {
  if (speaking === next) return;
  speaking = next;
  speakingListeners.forEach((fn) => fn(next));
}

/** Stop any current utterance. Safe to call when nothing is playing. */
export function stopSpeaking(): void {
  Speech.stop();
  setSpeaking(false);
}

/**
 * Speak `text` in `lang`. Interrupts anything already playing, so the most
 * recent tap always wins.
 */
export function speak(text: string, lang: LanguageCode): void {
  const body = text.trim();
  if (!body || !canSpeak(lang)) return;

  Speech.stop();
  setSpeaking(true);
  Speech.speak(body, {
    language: speechTagFor(lang),
    rate: RATE,
    onDone: () => setSpeaking(false),
    onStopped: () => setSpeaking(false),
    onError: () => setSpeaking(false),
  });
}

/** Subscribe to "is something speaking right now", for button state. */
export function useSpeaking(): boolean {
  const [value, setValue] = useState(speaking);
  useEffect(() => {
    const listener: SpeakingListener = (next) => setValue(next);
    speakingListeners.add(listener);
    setValue(speaking);
    return () => {
      speakingListeners.delete(listener);
    };
  }, []);
  return value;
}

// ---------------------------------------------------------------------------
// Auto-play preference
// ---------------------------------------------------------------------------

const AUTOPLAY_KEY = 'citizenly.autoSpeak';

/**
 * Whether answers and explanations are spoken automatically after grading.
 * On by default - it is the reason a non-reader can use the app unaided - but
 * it gets tiring fast for someone who can read, so it is one tap to turn off.
 *
 * Manual speaker buttons ignore this entirely; muting only stops the app from
 * speaking on its own.
 */
let autoSpeak = true;
let loaded = false;
const autoListeners = new Set<(on: boolean) => void>();

async function loadAutoSpeak(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(AUTOPLAY_KEY);
    if (raw !== null) {
      autoSpeak = raw === '1';
      autoListeners.forEach((fn) => fn(autoSpeak));
    }
  } catch {
    // Storage unavailable - keep the default.
  }
}

/** Read the current setting without subscribing (for one-off checks). */
export function isAutoSpeakOn(): boolean {
  return autoSpeak;
}

export function useAutoSpeak(): { autoSpeak: boolean; setAutoSpeak: (on: boolean) => void } {
  const [value, setValue] = useState(autoSpeak);

  useEffect(() => {
    const listener = (on: boolean) => setValue(on);
    autoListeners.add(listener);
    void loadAutoSpeak();
    setValue(autoSpeak);
    return () => {
      autoListeners.delete(listener);
    };
  }, []);

  const update = useCallback((on: boolean) => {
    autoSpeak = on;
    autoListeners.forEach((fn) => fn(on));
    if (!on) stopSpeaking();
    void AsyncStorage.setItem(AUTOPLAY_KEY, on ? '1' : '0').catch(() => {});
  }, []);

  return { autoSpeak: value, setAutoSpeak: update };
}

/** Speak only if the user hasn't turned auto-play off. */
export function speakAuto(text: string, lang: LanguageCode): void {
  if (!autoSpeak) return;
  speak(text, lang);
}
