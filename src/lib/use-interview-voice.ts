/**
 * Voice I/O for the mock interview: officer speech out (expo-speech) and
 * applicant answers in (expo-audio recording, transcribed by Groq Whisper).
 *
 * Why not on-device recognition: Expo Go ships no speech recognizer, so the
 * old `expo-speech-recognition` path reported "unavailable" on every phone and
 * pushed the applicant into a text box. Practising a spoken interview by
 * typing is not practice. Recording is something Expo Go can do, so the audio
 * goes to Whisper instead.
 *
 * Whisper is given no language hint, so someone can answer in any of the 48
 * languages the app teaches and still be understood.
 *
 * This module never scores audio. It produces a transcript; grading happens in
 * `groq.ts` against the question's acceptable answers, with
 * `answer-matching.ts` as the offline fallback. Pronunciation and accent are
 * never judged.
 */

import * as Speech from 'expo-speech';
import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { GroqError, isGroqConfigured, transcribeAudio } from '@/lib/groq';

export type MicStatus =
  /** Not asked yet. */
  | 'unknown'
  /** Permission granted and transcription configured. */
  | 'ready'
  /** User declined the microphone permission. */
  | 'denied'
  /** No recorder, or no transcription key bundled. */
  | 'unavailable';

/** Slightly slower than default - the audience is elderly and often stressed. */
const OFFICER_SPEECH_RATE = 0.9;
const SPEECH_LANGUAGE = 'en-US';

/**
 * Recording settings tuned for speech, not music.
 *
 * `RecordingPresets.HIGH_QUALITY` is 44.1kHz stereo at 128kbps, which is about
 * 240KB for a fifteen second answer. Whisper resamples everything to 16kHz
 * mono before it looks at it, so all of that extra data is uploaded from a
 * phone, over mobile data, to be thrown away. 16kHz mono at 32kbps is roughly
 * an eighth the size with nothing lost that the model would have used, and
 * the upload is what was timing out.
 */
const SPEECH_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
};

export interface InterviewVoice {
  micStatus: MicStatus;
  /** True while the microphone is capturing the applicant's answer. */
  listening: boolean;
  /** True while the recording is being transcribed. */
  transcribing: boolean;
  /** The last transcript, or a short status line while working. */
  transcript: string;
  /** True while the officer voice is speaking. */
  speaking: boolean;
  /** Set when the last attempt failed, phrased for the applicant. */
  error: string | null;
  /** Ask for mic permission. Resolves to the resulting status. */
  requestMic: () => Promise<MicStatus>;
  /** Speak a line in the officer voice, interrupting any current speech. */
  speak: (text: string, onDone?: () => void) => void;
  stopSpeaking: () => void;
  /**
   * Start capturing one answer. `bias` phrases are handed to Whisper as
   * vocabulary context, which is what keeps proper nouns intact in accented
   * speech.
   */
  startListening: (bias: string[]) => void;
  /** Finish capturing, transcribe, and deliver the text. */
  stopListening: () => void;
}

export function useInterviewVoice(
  onFinalTranscript: (transcript: string) => void,
): InterviewVoice {
  const recorder = useAudioRecorder(SPEECH_RECORDING);

  const [micStatus, setMicStatus] = useState<MicStatus>(
    isGroqConfigured() ? 'unknown' : 'unavailable',
  );
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinalRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  // Guards a late transcription landing after the screen moved on, which would
  // otherwise grade the previous question's audio against the current one.
  const captureRef = useRef(0);
  const biasRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      captureRef.current += 1;
      Speech.stop();
    };
  }, []);

  const requestMic = useCallback(async (): Promise<MicStatus> => {
    if (!isGroqConfigured()) {
      setMicStatus('unavailable');
      return 'unavailable';
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setMicStatus('denied');
        return 'denied';
      }
      // Required on iOS before the first record, and it is what lets playback
      // of the officer's voice share the session with the microphone.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      setMicStatus('ready');
      return 'ready';
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
    // Never record the officer's own voice.
    Speech.stop();
    setSpeaking(false);
    setError(null);
    setTranscript('');
    biasRef.current = bias;
    void (async () => {
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        setListening(true);
      } catch {
        setListening(false);
        setError('The microphone would not start.');
        setMicStatus('unavailable');
      }
    })();
  }, [recorder]);

  const stopListening = useCallback(() => {
    const capture = (captureRef.current += 1);
    void (async () => {
      setListening(false);
      let uri: string | null = null;
      try {
        await recorder.stop();
        uri = recorder.uri;
      } catch {
        // fall through to the empty-recording path below
      }

      if (!uri) {
        if (capture === captureRef.current) {
          setError('Nothing was recorded.');
          onFinalRef.current('');
        }
        return;
      }

      setTranscribing(true);
      try {
        const result = await transcribeAudio(uri, biasRef.current);
        if (capture !== captureRef.current) return;
        setTranscript(result.text);
        onFinalRef.current(result.text);
      } catch (e) {
        if (capture !== captureRef.current) return;
        // A failed transcription must not be graded as a wrong answer, so the
        // screen is told nothing and shown why instead.
        setError(
          e instanceof GroqError
            ? e.message
            : 'Could not reach the transcription service.',
        );
      } finally {
        if (capture === captureRef.current) setTranscribing(false);
      }
    })();
  }, [recorder]);

  return {
    micStatus,
    listening,
    transcribing,
    transcript,
    speaking,
    error,
    requestMic,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  };
}

/** Exposed so screens can tell "no key" apart from "user said no". */
export { isGroqConfigured };
export type { AudioModule };
