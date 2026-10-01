import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  AppText,
  Button,
  Card,
  Input,
  OptionRow,
  ScreenContainer,
  ScreenHeader,
} from '@/components';
import { Colors, Elevation, Radius, Spacing } from '@/constants/design';
import {
  INTERVIEW_POOLS,
  QUESTION_BY_ID,
  isServerQuestionId,
} from '@/data/civics-questions';
import { ENGLISH_SENTENCES } from '@/data/english-test';
import {
  biasStringsFor,
  feedbackFor,
  matchAnswer,
  type CivicsQuestion,
  type MatchResult,
} from '@/lib/answer-matching';
import { confirmAction } from '@/lib/confirm';
import { normalizeDigits } from '@/lib/digits';
import {
  civicsProgress,
  createInterview,
  currentQuestionId,
  determineRouting,
  reduce,
  summarize,
  type ApplicantProfile,
  type InterviewEvent,
  type InterviewState,
} from '@/lib/interview-machine';
import { addMastered, removeMastered } from '@/lib/local-mastery';
import { addMistake } from '@/lib/local-mistakes';
import { useSession } from '@/lib/session-context';
import { useInterviewVoice, type InterviewVoice } from '@/lib/use-interview-voice';
import { useLang } from '@/lib/use-lang';

/**
 * Mock Interview - a full simulated USCIS naturalization interview.
 *
 * The flow is driven entirely by the pure reducer in
 * src/lib/interview-machine.ts (oath → eligibility → reading → writing →
 * civics → result, with the officer stopping the moment the outcome is
 * decided). This component only renders state and dispatches events - it
 * never re-implements scoring or stop rules.
 *
 * Fully offline: questions come from the bundled banks in src/data, the
 * officer speaks through on-device TTS, and answers are transcribed
 * on-device. Nothing is sent anywhere, and pronunciation is never scored -
 * matching is keyword-based (src/lib/answer-matching.ts).
 */

/** Fixed seed for reproducible demo recordings. Toggle is only shown in dev. */
const DEMO_SEED = 20250620;

/**
 * Every practice session runs the current (2025) civics test. The machine
 * still routes by N-400 filing date - this is simply a date on the current
 * side of the 2025-10-20 cutoff, since the legacy test isn't bundled.
 */
const CURRENT_TEST_FILING_DATE = '2026-01-15';

/** A sentence attempt passes when this share of its content words is present. */
const SENTENCE_PASS_SCORE = 0.8;

const OATH_TEXT =
  'Please raise your right hand. Do you swear or affirm that the statements ' +
  'you will give today are the truth, the whole truth, and nothing but the truth?';

/**
 * N-400 style questions for the eligibility review. In a real interview this
 * conversation IS the speaking test: the officer only needs to see that you
 * understand and respond. Answers are personal, so they are spoken freely and
 * never recorded or scored.
 */
const ELIGIBILITY_QUESTIONS = [
  'What is your full legal name?',
  'What is your date of birth?',
  'What is your current home address?',
  'Have you traveled outside the United States since you became a permanent resident?',
  'Are you willing to take the full Oath of Allegiance to the United States?',
];

type Stage = 'setup' | 'confirm' | 'interview';

function sentenceScore(spoken: string, sentence: string): number {
  const result = matchAnswer(spoken, {
    id: 'sentence',
    prompt: sentence,
    acceptableAnswers: [sentence],
  });
  return result.best?.score ?? 0;
}

export default function MockInterviewScreen() {
  const router = useRouter();
  const session = useSession();
  const lang = useLang();

  const [stage, setStage] = useState<Stage>('setup');

  // --- Setup form ---
  const [ageText, setAgeText] = useState('');
  const [lprText, setLprText] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [demoSeed, setDemoSeed] = useState(false);

  // --- Interview machine ---
  const [itv, setItv] = useState<InterviewState | null>(null);
  const [seed, setSeed] = useState(0);
  const dispatch = (event: InterviewEvent) =>
    setItv((s) => (s ? reduce(s, event) : s));

  // --- Per-phase local UI state ---
  const [eligIndex, setEligIndex] = useState(0);
  const [typedMode, setTypedMode] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [pendingCivics, setPendingCivics] = useState<{
    transcript: string;
    result: MatchResult;
  } | null>(null);
  const [readingFeedback, setReadingFeedback] = useState<{
    heard: string;
    passed: boolean;
  } | null>(null);
  const [writingFeedback, setWritingFeedback] = useState<{
    typed: string;
    sentence: string;
    passed: boolean;
  } | null>(null);
  const mistakesRecorded = useRef(false);

  const question: CivicsQuestion | null = useMemo(() => {
    if (!itv) return null;
    const id = currentQuestionId(itv);
    return id ? (QUESTION_BY_ID.get(id) ?? null) : null;
  }, [itv]);

  const readingSentence = itv
    ? ENGLISH_SENTENCES[(seed + itv.reading.attempts) % ENGLISH_SENTENCES.length]
        .reading
    : '';
  const writingSentence = itv
    ? ENGLISH_SENTENCES[
        (seed + 7 + itv.writing.attempts) % ENGLISH_SENTENCES.length
      ].writing
    : '';

  // --- Voice ---
  const voice = useInterviewVoice((finalText) => {
    if (!itv) return;
    if (itv.phase === 'civics' && question && !pendingCivics) {
      gradeCivicsAnswer(finalText);
    } else if (itv.phase === 'reading' && !readingFeedback) {
      const passed = sentenceScore(finalText, readingSentence) >= SENTENCE_PASS_SCORE;
      setReadingFeedback({ heard: finalText, passed });
    }
  });

  const gradeCivicsAnswer = (answerText: string) => {
    if (!question) return;
    const result = matchAnswer(answerText, question);
    setPendingCivics({ transcript: answerText, result });
    setTypedAnswer('');
  };

  // --- Officer speech: one line per "moment", spoken when the moment changes ---
  const speech = useMemo((): { key: string; text: string } | null => {
    if (stage !== 'interview' || !itv) return null;
    switch (itv.phase) {
      case 'oath':
        return { key: 'oath', text: OATH_TEXT };
      case 'eligibility':
        return eligIndex < ELIGIBILITY_QUESTIONS.length
          ? { key: `elig-${eligIndex}`, text: ELIGIBILITY_QUESTIONS[eligIndex] }
          : {
              key: 'elig-done',
              text: 'Thank you. Were you able to understand my questions?',
            };
      case 'reading':
        return {
          key: `read-${itv.reading.attempts}`,
          text: 'Please read the sentence on the screen out loud.',
        };
      case 'writing':
        return {
          key: `write-${itv.writing.attempts}`,
          text: `Please write this sentence: ${writingSentence}`,
        };
      case 'civics':
        return question ? { key: `q-${question.id}`, text: question.prompt } : null;
      case 'result':
        return {
          key: 'result',
          text:
            itv.outcome === 'passed'
              ? 'Congratulations. You passed this practice interview.'
              : 'This practice interview is over. Keep practicing, and try again any time.',
        };
      default:
        return null;
    }
  }, [stage, itv, eligIndex, question, writingSentence]);

  const speechKey = speech?.key;
  useEffect(() => {
    if (speech && !voice.listening) voice.speak(speech.text);
    // Speak once per moment - not on every re-render of the same moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey]);

  const sayThatAgain = () => {
    if (!speech) return;
    dispatch({ type: 'REQUEST_REPEAT' });
    voice.speak(speech.text);
  };

  // --- Record misses into the device's mistake bank, same as every other
  // study mode, so Review Mistakes picks them up. ---
  const phase = itv?.phase;
  useEffect(() => {
    if (phase !== 'result' || !itv || mistakesRecorded.current) return;
    mistakesRecorded.current = true;
    const summary = summarize(itv);
    const userId = session.user?.id;
    if (userId) {
      for (const id of summary.missedQuestionIds.filter(isServerQuestionId)) {
        void addMistake(userId, id);
        void removeMastered(userId, id);
      }
      // A simulated interview counts as real practice, so the answers that
      // were right move the dashboard the same way a quiz would.
      for (const id of summary.correctQuestionIds.filter(isServerQuestionId)) {
        void addMastered(userId, id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // --- Stage transitions ---
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);

  const parseSetup = ():
    | { profile: ApplicantProfile; error?: undefined }
    | { profile?: undefined; error: string } => {
    const age = Number(normalizeDigits(ageText));
    const lpr = Number(normalizeDigits(lprText));
    if (!age || age < 18 || age > 120) {
      return { error: 'Please enter an age between 18 and 120.' };
    }
    if (lprText.trim() === '' || lpr > age) {
      return { error: 'Please enter your years as a permanent resident.' };
    }
    return {
      profile: {
        ageYears: age,
        lprYears: lpr,
        // Only the current (2025) test is bundled, so every practice session
        // routes to it - see src/data/civics-questions.ts.
        n400FiledOn: CURRENT_TEST_FILING_DATE,
        preferredLanguage: lang,
      },
    };
  };

  const submitSetup = () => {
    const parsed = parseSetup();
    if (!parsed.profile) {
      setSetupError(parsed.error ?? null);
      return;
    }
    setSetupError(null);
    setProfile(parsed.profile);
    setStage('confirm');
  };

  const routing = profile ? determineRouting(profile) : null;

  const startInterview = () => {
    if (!profile) return;
    const nextSeed = demoSeed ? DEMO_SEED : Date.now();
    setSeed(nextSeed);
    setItv(reduce(createInterview(profile, INTERVIEW_POOLS, nextSeed), { type: 'BEGIN' }));
    setStage('interview');
    setEligIndex(0);
    setTypedMode(false);
    setTypedAnswer('');
    setPendingCivics(null);
    setReadingFeedback(null);
    setWritingFeedback(null);
    mistakesRecorded.current = false;
    void voice.requestMic();
  };

  const interviewActive =
    stage === 'interview' && itv !== null && itv.phase !== 'result';

  /** Leave the screen, falling back to the dashboard when there's no history
   *  to pop - a reload or a deep link straight to /mock-interview would
   *  otherwise leave the back button doing nothing. */
  const leave = () => {
    voice.stopSpeaking();
    if (router.canGoBack()) router.back();
    else router.replace('/dashboard');
  };

  const handleBack = () => {
    if (stage === 'confirm') {
      setStage('setup');
      return;
    }
    if (interviewActive) {
      void confirmAction({
        title: 'End this practice interview?',
        message: 'You will see a result for the questions answered so far.',
        confirmLabel: 'End interview',
        cancelLabel: 'Keep going',
        destructive: true,
      }).then((confirmed) => {
        if (confirmed) dispatch({ type: 'ABORT' });
      });
      return;
    }
    leave();
  };

  const micReady = voice.micStatus === 'ready';
  const useMic = micReady && !typedMode;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <ScreenContainer
      padded={false}
      keyboardAvoiding
      footer={
        stage === 'setup' ? (
          <View style={styles.footerPad}>
            <Button label="Continue" onPress={submitSetup} />
          </View>
        ) : stage === 'confirm' ? (
          <View style={styles.footerPad}>
            <Button label="Start Interview" onPress={startInterview} />
          </View>
        ) : itv?.phase === 'result' ? (
          <View style={[styles.footerPad, styles.footerStack]}>
            <Button label="Practice Again" onPress={startInterview} />
            <Button
              label="Back to Home"
              variant="secondary"
              onPress={() => {
                voice.stopSpeaking();
                router.replace('/dashboard');
              }}
            />
          </View>
        ) : interviewActive ? (
          <View style={styles.footerPad}>
            {/* Applicants may always ask the officer to repeat - teach it. */}
            <Button label="Say that again" variant="secondary" onPress={sayThatAgain} />
          </View>
        ) : undefined
      }>
      <View style={styles.body}>
        <ScreenHeader title="Mock Interview" onBack={handleBack} />

        {stage === 'setup' ? (
          <SetupStage
            ageText={ageText}
            lprText={lprText}
            error={setupError}
            onAge={(t) => setAgeText(normalizeDigits(t))}
            onLpr={(t) => setLprText(normalizeDigits(t))}
            speak={voice.speak}
          />
        ) : null}

        {stage === 'confirm' && routing ? (
          <ConfirmStage
            routing={routing}
            demoSeed={demoSeed}
            onToggleDemo={() => setDemoSeed((d) => !d)}
            speak={voice.speak}
          />
        ) : null}

        {stage === 'interview' && itv ? (
          <>
            {itv.phase === 'oath' ? (
              <OfficerMoment
                overline="The officer says"
                text={OATH_TEXT}
                speak={voice.speak}
                action={<Button label="I do" onPress={() => dispatch({ type: 'SWORN_IN' })} />}
              />
            ) : null}

            {itv.phase === 'eligibility' ? (
              <EligibilityPhase
                index={eligIndex}
                speak={voice.speak}
                onAnswered={() => setEligIndex((i) => i + 1)}
                onComplete={(understood) => {
                  dispatch({ type: 'ELIGIBILITY_COMPLETE', understood });
                }}
              />
            ) : null}

            {itv.phase === 'reading' ? (
              <ReadingPhase
                sentence={readingSentence}
                attempt={itv.reading.attempts}
                feedback={readingFeedback}
                voice={voice}
                useMic={useMic}
                onSelfReport={(passed) =>
                  setReadingFeedback({ heard: '', passed })
                }
                onContinue={() => {
                  const passed = readingFeedback?.passed ?? false;
                  setReadingFeedback(null);
                  dispatch({ type: 'READING_ATTEMPT', passed });
                }}
              />
            ) : null}

            {itv.phase === 'writing' ? (
              <WritingPhase
                attempt={itv.writing.attempts}
                typed={typedAnswer}
                onTyped={setTypedAnswer}
                feedback={writingFeedback}
                speak={voice.speak}
                onCheck={() => {
                  const passed =
                    sentenceScore(typedAnswer, writingSentence) >=
                    SENTENCE_PASS_SCORE;
                  setWritingFeedback({
                    typed: typedAnswer,
                    sentence: writingSentence,
                    passed,
                  });
                  setTypedAnswer('');
                }}
                onContinue={() => {
                  const passed = writingFeedback?.passed ?? false;
                  setWritingFeedback(null);
                  dispatch({ type: 'WRITING_ATTEMPT', passed });
                }}
              />
            ) : null}

            {itv.phase === 'civics' && question ? (
              <CivicsPhase
                itv={itv}
                question={question}
                voice={voice}
                useMic={useMic}
                typed={typedAnswer}
                onTyped={setTypedAnswer}
                onTypedSubmit={() => {
                  if (typedAnswer.trim()) gradeCivicsAnswer(typedAnswer);
                }}
                onSwitchToTyping={() => setTypedMode(true)}
                onSwitchToMic={() => setTypedMode(false)}
                micReady={micReady}
                pending={pendingCivics}
                onNext={() => {
                  const correct = pendingCivics?.result.correct ?? false;
                  setPendingCivics(null);
                  dispatch({ type: 'CIVICS_ANSWER', correct });
                }}
              />
            ) : null}

            {itv.phase === 'result' ? (
              <ResultPhase itv={itv} speak={voice.speak} />
            ) : null}
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Speakable text - every question, answer and label can be tapped to hear it.
// ---------------------------------------------------------------------------

function Speakable({
  text,
  speak,
  variant = 'bodyLg',
  color = 'ink',
  center = false,
  style,
}: {
  text: string;
  speak: (text: string) => void;
  variant?: ComponentProps<typeof AppText>['variant'];
  color?: ComponentProps<typeof AppText>['color'];
  center?: boolean;
  style?: ComponentProps<typeof AppText>['style'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint="Tap to hear this read out loud"
      onPress={() => speak(text)}>
      <AppText variant={variant} color={color} center={center} style={style}>
        {text}
      </AppText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Setup + confirmation
// ---------------------------------------------------------------------------

function SetupStage({
  ageText,
  lprText,
  error,
  onAge,
  onLpr,
  speak,
}: {
  ageText: string;
  lprText: string;
  error: string | null;
  onAge: (t: string) => void;
  onLpr: (t: string) => void;
  speak: (text: string) => void;
}) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.stageContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Speakable
        text="A few questions first. Your answers decide which test the officer gives you, just like a real interview."
        speak={speak}
        variant="bodyLg"
        color="muted"
      />
      <Input
        label="Your age"
        value={ageText}
        onChangeText={onAge}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Input
        label="Years as a permanent resident (green card)"
        value={lprText}
        onChangeText={onLpr}
        keyboardType="number-pad"
        maxLength={2}
      />
      {error ? (
        <AppText variant="bodyMd" color="red">
          {error}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function ConfirmStage({
  routing,
  demoSeed,
  onToggleDemo,
  speak,
}: {
  routing: ReturnType<typeof determineRouting>;
  demoSeed: boolean;
  onToggleDemo: () => void;
  speak: (text: string) => void;
}) {
  const reduced = routing.civicsTrack === 'reduced_65_20';
  const testLine = reduced
    ? 'Up to 10 civics questions. 6 correct answers pass. The officer stops as soon as the result is decided.'
    : 'Up to 20 civics questions. 12 correct answers pass. The officer stops as soon as the result is decided.';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.stageContent}
      showsVerticalScrollIndicator={false}>
      <Speakable text="Your interview" speak={speak} variant="headlineMd" color="navy" />
      <Card surface="muted">
        <Speakable text={routing.rationale} speak={speak} variant="questionText" color="navy" />
      </Card>
      <Card>
        <Speakable
          text={`The current civics test. ${testLine}`}
          speak={speak}
          variant="bodyLg"
          color="ink"
        />
      </Card>
      {routing.englishExempt ? (
        <Card>
          <Speakable
            text="No English reading or writing test. In the real interview you may bring an interpreter; this practice keeps the questions in English."
            speak={speak}
            variant="bodyLg"
            color="ink"
          />
        </Card>
      ) : (
        <Card>
          <Speakable
            text="The officer will also check reading, writing, and that you can understand spoken English."
            speak={speak}
            variant="bodyLg"
            color="ink"
          />
        </Card>
      )}
      {__DEV__ ? (
        <OptionRow
          title="Demo mode"
          description="Fixed question order, for reproducible screen recordings"
          selected={demoSeed}
          onPress={onToggleDemo}
        />
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Interview phases
// ---------------------------------------------------------------------------

function OfficerMoment({
  overline,
  text,
  speak,
  action,
}: {
  overline: string;
  text: string;
  speak: (text: string) => void;
  action: ReactNode;
}) {
  return (
    <View style={styles.phaseBody}>
      <View style={styles.questionBlock}>
        <AppText variant="labelMd" color="muted" style={styles.overline}>
          {overline}
        </AppText>
        <Speakable text={text} speak={speak} variant="questionText" color="navy" />
      </View>
      <View style={styles.actionArea}>{action}</View>
    </View>
  );
}

function EligibilityPhase({
  index,
  speak,
  onAnswered,
  onComplete,
}: {
  index: number;
  speak: (text: string) => void;
  onAnswered: () => void;
  onComplete: (understood: boolean) => void;
}) {
  const done = index >= ELIGIBILITY_QUESTIONS.length;
  if (done) {
    return (
      <View style={styles.phaseBody}>
        <View style={styles.questionBlock}>
          <AppText variant="labelMd" color="muted" style={styles.overline}>
            The officer asks
          </AppText>
          <Speakable
            text="Were you able to understand my questions?"
            speak={speak}
            variant="questionText"
            color="navy"
          />
          <Speakable
            text="Be honest. In a real interview the officer only needs to see that you understand and respond."
            speak={speak}
            variant="bodyMd"
            color="muted"
          />
        </View>
        <View style={styles.actionStack}>
          <Button label="Yes, I understood" onPress={() => onComplete(true)} />
          <Button
            label="No, I could not understand"
            variant="secondary"
            onPress={() => onComplete(false)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.phaseBody}>
      <View style={styles.questionBlock}>
        <AppText variant="labelMd" color="muted" style={styles.overline}>
          {`Eligibility review · Question ${index + 1} of ${ELIGIBILITY_QUESTIONS.length}`}
        </AppText>
        <Speakable
          text={ELIGIBILITY_QUESTIONS[index]}
          speak={speak}
          variant="questionText"
          color="navy"
        />
        <Speakable
          text="Answer out loud in your own words. This part is about understanding, not right answers. Nothing is recorded."
          speak={speak}
          variant="bodyMd"
          color="muted"
        />
      </View>
      <View style={styles.actionArea}>
        <Button label="I answered out loud" onPress={onAnswered} />
      </View>
    </View>
  );
}

function ReadingPhase({
  sentence,
  attempt,
  feedback,
  voice,
  useMic,
  onSelfReport,
  onContinue,
}: {
  sentence: string;
  attempt: number;
  feedback: { heard: string; passed: boolean } | null;
  voice: InterviewVoice;
  useMic: boolean;
  onSelfReport: (passed: boolean) => void;
  onContinue: () => void;
}) {
  if (feedback) {
    return (
      <ResultMoment
        passed={feedback.passed}
        title={feedback.passed ? 'Good reading!' : 'Let’s try another sentence.'}
        lines={feedback.heard ? [`Heard: “${feedback.heard}”`] : []}
        speak={voice.speak}
        onContinue={onContinue}
      />
    );
  }

  return (
    <View style={styles.phaseBody}>
      <View style={styles.questionBlock}>
        <AppText variant="labelMd" color="muted" style={styles.overline}>
          {`Reading test · Sentence ${attempt + 1} of 3`}
        </AppText>
        <Speakable
          text="Read this sentence out loud:"
          speak={voice.speak}
          variant="bodyLg"
          color="muted"
        />
        <Card surface="muted">
          <Speakable
            text={sentence}
            speak={voice.speak}
            variant="headlineMd"
            color="navy"
          />
        </Card>
      </View>
      {useMic ? (
        <MicCluster voice={voice} bias={[sentence]} />
      ) : (
        <View style={styles.actionStack}>
          <AppText variant="bodyMd" color="muted" center>
            Without the microphone the app can’t hear your reading. Read it
            out loud, then tell us how it went.
          </AppText>
          <Button label="I read it out loud" onPress={() => onSelfReport(true)} />
          <Button
            label="This one is hard, try another"
            variant="secondary"
            onPress={() => onSelfReport(false)}
          />
        </View>
      )}
    </View>
  );
}

function WritingPhase({
  attempt,
  typed,
  onTyped,
  feedback,
  speak,
  onCheck,
  onContinue,
}: {
  attempt: number;
  typed: string;
  onTyped: (t: string) => void;
  feedback: { typed: string; sentence: string; passed: boolean } | null;
  speak: (text: string) => void;
  onCheck: () => void;
  onContinue: () => void;
}) {
  if (feedback) {
    return (
      <ResultMoment
        passed={feedback.passed}
        title={feedback.passed ? 'Good writing!' : 'Not quite.'}
        lines={[
          `You wrote: “${feedback.typed}”`,
          `The sentence was: “${feedback.sentence}”`,
        ]}
        speak={speak}
        onContinue={onContinue}
      />
    );
  }

  return (
    <View style={styles.phaseBody}>
      <View style={styles.questionBlock}>
        <AppText variant="labelMd" color="muted" style={styles.overline}>
          {`Writing test · Sentence ${attempt + 1} of 3`}
        </AppText>
        <Speakable
          text="Listen to the officer, then write the sentence you hear. Use “Say that again” as many times as you need."
          speak={speak}
          variant="bodyLg"
          color="muted"
        />
      </View>
      <View style={styles.actionStack}>
        <Input
          label="Write the sentence here"
          value={typed}
          onChangeText={onTyped}
          autoCapitalize="sentences"
          autoCorrect={false}
          onSubmitEditing={onCheck}
        />
        <Button label="Check my sentence" onPress={onCheck} disabled={!typed.trim()} />
      </View>
    </View>
  );
}

function CivicsPhase({
  itv,
  question,
  voice,
  useMic,
  typed,
  onTyped,
  onTypedSubmit,
  onSwitchToTyping,
  onSwitchToMic,
  micReady,
  pending,
  onNext,
}: {
  itv: InterviewState;
  question: CivicsQuestion;
  voice: InterviewVoice;
  useMic: boolean;
  typed: string;
  onTyped: (t: string) => void;
  onTypedSubmit: () => void;
  onSwitchToTyping: () => void;
  onSwitchToMic: () => void;
  micReady: boolean;
  pending: { transcript: string; result: MatchResult } | null;
  onNext: () => void;
}) {
  const progress = civicsProgress(itv);

  if (pending) {
    const { result, transcript } = pending;
    return (
      <ResultMoment
        passed={result.correct}
        title={feedbackFor(result, question)}
        lines={[
          ...(transcript ? [`You said: “${transcript}”`] : []),
          `One correct answer: ${question.acceptableAnswers[0]}`,
        ]}
        speak={voice.speak}
        onContinue={onNext}
      />
    );
  }

  return (
    <View style={styles.phaseBody}>
      <View style={styles.questionBlock}>
        <AppText variant="labelMd" color="muted" style={styles.overline}>
          {`Civics test · Question ${progress.asked + 1}`}
        </AppText>
        {/* Distance-to-pass framing, never a raw score. */}
        <Speakable
          text={progress.label}
          speak={voice.speak}
          variant="labelLg"
          color="navy"
        />
        <Speakable
          text={question.prompt}
          speak={voice.speak}
          variant="questionText"
          color="navy"
        />
      </View>

      {useMic ? (
        <View style={styles.actionStack}>
          {/* The acceptable answers are known in advance - hand them to the
              recognizer as contextual hints (the accuracy lever for accented
              speech). */}
          <MicCluster voice={voice} bias={biasStringsFor(question)} />
          <Pressable
            accessibilityRole="button"
            onPress={onSwitchToTyping}
            style={styles.linkRow}>
            <AppText variant="labelMd" color="muted" center>
              Type my answer instead
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionStack}>
          {!micReady ? (
            <AppText variant="bodyMd" color="muted" center>
              Microphone is off. You can type your answer.
            </AppText>
          ) : null}
          <Input
            label="Your answer"
            value={typed}
            onChangeText={onTyped}
            autoCorrect={false}
            onSubmitEditing={onTypedSubmit}
          />
          <Button label="Answer" onPress={onTypedSubmit} disabled={!typed.trim()} />
          {micReady ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSwitchToMic}
              style={styles.linkRow}>
              <AppText variant="labelMd" color="muted" center>
                Use the microphone instead
              </AppText>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function ResultPhase({
  itv,
  speak,
}: {
  itv: InterviewState;
  speak: (text: string) => void;
}) {
  const summary = summarize(itv);
  const passed = summary.outcome === 'passed';
  const missed = summary.missedQuestionIds
    .map((id) => QUESTION_BY_ID.get(id))
    .filter((q): q is CivicsQuestion => q !== undefined);

  const portionLabel = (value: boolean | null) =>
    value === true ? 'Passed' : value === false ? 'Not passed' : 'Not taken';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.stageContent}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.resultBanner,
          {
            backgroundColor: passed ? Colors.successTint : Colors.redTint,
            borderColor: passed ? Colors.success : Colors.red,
          },
        ]}>
        <MaterialIcons
          name={passed ? 'check-circle' : 'cancel'}
          size={36}
          color={passed ? Colors.success : Colors.red}
        />
        <Speakable
          text={passed ? 'You passed' : 'Not this time'}
          speak={speak}
          variant="headlineMd"
          color={passed ? 'success' : 'red'}
        />
      </View>

      <Card>
        <Speakable
          text={`Civics: ${summary.civics.correct} correct of ${summary.civics.asked} asked. ${summary.civics.required} correct answers pass.`}
          speak={speak}
          variant="bodyLg"
          color="ink"
        />
      </Card>

      {summary.englishExempt ? (
        <Card>
          <Speakable
            text="English test: exempt. Your civics test may be taken in your own language with an interpreter."
            speak={speak}
            variant="bodyLg"
            color="ink"
          />
        </Card>
      ) : (
        <Card>
          <Speakable
            text={`Reading: ${portionLabel(summary.reading)}. Writing: ${portionLabel(summary.writing)}. Spoken English: ${
              summary.speakingUnderstood === false ? 'needs practice' : 'understood'
            }.`}
            speak={speak}
            variant="bodyLg"
            color="ink"
          />
        </Card>
      )}

      {summary.repeatRequests > 0 ? (
        <Card surface="muted">
          <Speakable
            text={`You asked the officer to repeat ${summary.repeatRequests} ${
              summary.repeatRequests === 1 ? 'time' : 'times'
            } - that is always allowed in a real interview.`}
            speak={speak}
            variant="bodyMd"
            color="muted"
          />
        </Card>
      ) : null}

      {!passed && summary.retake.length > 0 ? (
        <Card surface="muted">
          <Speakable
            text={`At a real interview, you would be re-examined on: ${summary.retake
              .map((p) => (p === 'english' ? 'the English test' : 'the civics test'))
              .join(' and ')}. USCIS gives you a second chance 60 to 90 days later.`}
            speak={speak}
            variant="bodyMd"
            color="muted"
          />
        </Card>
      ) : null}

      {missed.length > 0 ? (
        <>
          <Speakable
            text="Questions to review"
            speak={speak}
            variant="labelLg"
            color="navy"
          />
          {missed.map((q) => (
            <Card key={q.id}>
              <View style={styles.missedRow}>
                <Speakable text={q.prompt} speak={speak} variant="bodyLg" color="ink" />
                <Speakable
                  text={q.acceptableAnswers[0]}
                  speak={speak}
                  variant="labelLg"
                  color="navy"
                />
              </View>
            </Card>
          ))}
          <AppText variant="bodyMd" color="muted">
            These are saved to Review Mistakes when you’re signed in.
          </AppText>
        </>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Shared interview UI pieces
// ---------------------------------------------------------------------------

/** Pass/fail interstitial between attempts and questions. */
function ResultMoment({
  passed,
  title,
  lines,
  speak,
  onContinue,
}: {
  passed: boolean;
  title: string;
  lines: string[];
  speak: (text: string) => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.phaseBody}>
      <View style={styles.questionBlock}>
        <View
          style={[
            styles.resultBanner,
            {
              backgroundColor: passed ? Colors.successTint : Colors.redTint,
              borderColor: passed ? Colors.success : Colors.red,
            },
          ]}>
          <MaterialIcons
            name={passed ? 'check-circle' : 'error-outline'}
            size={28}
            color={passed ? Colors.success : Colors.red}
          />
          <View style={styles.flexShrink}>
            <Speakable
              text={title}
              speak={speak}
              variant="labelLg"
              color={passed ? 'success' : 'red'}
            />
          </View>
        </View>
        {lines.map((line) => (
          <Speakable key={line} text={line} speak={speak} variant="bodyLg" color="ink" />
        ))}
      </View>
      <View style={styles.actionArea}>
        <Button label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

/** Mic button + live transcript for one spoken answer. */
function MicCluster({ voice, bias }: { voice: InterviewVoice; bias: string[] }) {
  return (
    <View style={styles.micCluster}>
      <MicButton
        listening={voice.listening}
        onPress={() =>
          voice.listening ? voice.stopListening() : voice.startListening(bias)
        }
      />
      <AppText variant="labelLg" color="navy" center>
        {voice.listening
          ? 'Listening… tap when you finish'
          : 'Tap, then say your answer'}
      </AppText>
      {voice.listening && voice.transcript ? (
        <AppText variant="bodyMd" color="muted" center>
          “{voice.transcript}”
        </AppText>
      ) : null}
    </View>
  );
}

/** Large circular red mic button; pulses with an expanding ring while listening. */
function MicButton({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!listening || reduceMotion) return;
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [listening, pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.6]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
  }));

  return (
    <View style={styles.micWrap}>
      {listening ? <Animated.View style={[styles.micRing, ringStyle]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : 'Tap to answer'}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}>
        <View style={[styles.mic, pressed && styles.micPressed]}>
          <MaterialIcons name={listening ? 'stop' : 'mic'} size={40} color={Colors.white} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: Spacing.screenX,
  },
  flex: {
    flex: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
  footerPad: {
    paddingHorizontal: Spacing.screenX,
    paddingBottom: Spacing.sm,
  },
  footerStack: {
    gap: Spacing.md,
  },
  stageContent: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  phaseBody: {
    flex: 1,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
  },
  questionBlock: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  overline: {
    textTransform: 'uppercase',
  },
  actionArea: {
    paddingBottom: Spacing.md,
  },
  actionStack: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  linkRow: {
    minHeight: 44,
    justifyContent: 'center',
  },
  micCluster: {
    alignItems: 'center',
    gap: Spacing.md,
    alignSelf: 'stretch',
    paddingBottom: Spacing.md,
  },
  micWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.full,
    backgroundColor: Colors.red,
  },
  mic: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPressed: {
    opacity: 0.85,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Elevation.raised,
  },
  missedRow: {
    gap: Spacing.sm,
  },
});
