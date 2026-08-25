/**
 * Voice I/O for the mock interview: officer speech (expo-speech TTS) and
 * applicant answers (expo-speech-recognition, on-device only).
 *
 * Privacy: recognition runs with requiresOnDeviceRecognition — audio is never
 * sent over the network, there are no API keys and no server. If a device
 * cannot recognize on-device (or the native module is absent, e.g. Expo Go or
 * a browser without the Web Speech API), `micStatus` reports it and screens
 * fall back to typed answers instead of dead-ending.
 *
 * This module never scores audio. It only produces transcripts; matching is
 * keyword-based in src/lib/answer-matching.ts by design — pronunciation and
 * accent are never judged.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

// The native module is missing in Expo Go (it needs a development build) and
// throws at require time. Load it defensively so the screen still renders and
// the typed-answer fallback takes over.
type SpeechRecognitionApi = typeof import('expo-speech-recognition');
let SpeechRecognition: SpeechRecognitionApi | null = null;
try {
  SpeechRecognition = require('expo-speech-recognition');
} catch {
  SpeechRecognition = null;
}

export type MicStatus =
  /** Not asked yet. */
  | 'unknown'
  /** Permission granted and recognition available. */
  | 'ready'
  /** User declined the microphone / speech permission. */
  | 'denied'
  /** No usable recognizer on this device or build. */
  | 'unavailable';

/** Slightly slower than default — the audience is elderly and often stressed. */
const OFFICER_SPEECH_RATE = 0.9;
const SPEECH_LANGUAGE = 'en-US';

export interface InterviewVoice {
  micStatus: MicStatus;
  /** True while the recognizer is capturing the applicant's answer. */
  listening: boolean;
  /** Live interim transcript while listening (may lag or be empty). */
  transcript: string;
  /** True while the officer voice is speaking. */
  speaking: boolean;
  /** Ask for mic + speech permission. Resolves to the resulting status. */
  requestMic: () => Promise<MicStatus>;
  /** Speak a line in the officer voice, interrupting any current speech. */
  speak: (text: string, onDone?: () => void) => void;
  stopSpeaking: () => void;
  /**
   * Start capturing one answer. `bias` phrases are passed to the recognizer
   * (iOS contextualStrings) — with the acceptable answers known in advance,
   * this is the biggest accuracy lever for accented speech.
   */
  startListening: (bias: string[]) => void;
  /** Finish capturing and deliver a final transcript. */
  stopListening: () => void;
}

export function useInterviewVoice(
  onFinalTranscript: (transcript: string) => void,
): InterviewVoice {
  const [micStatus, setMicStatus] = useState<MicStatus>(
    SpeechRecognition ? 'unknown' : 'unavailable',
  );
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speaking, setSpeaking] = useState(false);

  // Latest interim transcript + whether this capture already delivered a
  // final result ("result isFinal", "error" and "end" can all arrive; the
  // first one wins).
  const interimRef = useRef('');
  const deliveredRef = useRef(true);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const deliver = useCallback((text: string) => {
    if (deliveredRef.current) return;
    deliveredRef.current = true;
    setListening(false);
    onFinalRef.current(text.trim());
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognizer = SpeechRecognition.ExpoSpeechRecognitionModule;

    const subscriptions = [
      recognizer.addListener('result', (event) => {
        const text = event.results[0]?.transcript ?? '';
        interimRef.current = text;
        setTranscript(text);
        if (event.isFinal) deliver(text);
      }),
      recognizer.addListener('error', (event) => {
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed') setMicStatus('denied');
        if (
          event.error === 'service-not-allowed' ||
          event.error === 'language-not-supported'
        ) {
          // No on-device recognizer — flip the whole session to typed input.
          setMicStatus('unavailable');
        }
        // 'no-speech' and friends: finish with whatever we heard (usually
        // nothing); the matcher reports an empty transcript kindly.
        deliver(interimRef.current);
      }),
      recognizer.addListener('end', () => {
        deliver(interimRef.current);
      }),
    ];

    return () => {
      subscriptions.forEach((s) => s.remove());
      recognizer.abort();
      Speech.stop();
    };
  }, [deliver]);

  const requestMic = useCallback(async (): Promise<MicStatus> => {
    if (!SpeechRecognition) return 'unavailable';
    try {
      if (!SpeechRecognition.ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setMicStatus('unavailable');
        return 'unavailable';
      }
      const result =
        await SpeechRecognition.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      const status: MicStatus = result.granted ? 'ready' : 'denied';
      setMicStatus(status);
      return status;
    } catch {
      setMicStatus('unavailable');
      return 'unavailable';
    }
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    Speech.stop();
    setSpeaking(true);
    const finish = () => {
      setSpeaking(false);
      onDone?.();
    };
    Speech.speak(text, {
      language: SPEECH_LANGUAGE,
      rate: OFFICER_SPEECH_RATE,
      onDone: finish,
      onStopped: () => setSpeaking(false),
      onError: finish,
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  const startListening = useCallback((bias: string[]) => {
    if (!SpeechRecognition) return;
    // Never record the officer's own voice.
    Speech.stop();
    setSpeaking(false);
    interimRef.current = '';
    deliveredRef.current = false;
    setTranscript('');
    setListening(true);
    try {
      SpeechRecognition.ExpoSpeechRecognitionModule.start({
        lang: SPEECH_LANGUAGE,
        interimResults: true,
        continuous: false,
        // Hard privacy requirement: nothing leaves the device.
        requiresOnDeviceRecognition: true,
        addsPunctuation: false,
        contextualStrings: bias,
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'measurement',
        },
      });
    } catch {
      setMicStatus('unavailable');
      deliver('');
    }
  }, [deliver]);

  const stopListening = useCallback(() => {
    if (!SpeechRecognition) return;
    try {
      SpeechRecognition.ExpoSpeechRecognitionModule.stop();
    } catch {
      deliver(interimRef.current);
    }
  }, [deliver]);

  return {
    micStatus,
    listening,
    transcript,
    speaking,
    requestMic,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  };
}
