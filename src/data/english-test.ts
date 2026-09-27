/**
 * Sentences for the English reading and writing portions of the mock
 * interview. Composed strictly from the official USCIS reading vocabulary
 * (M-715) and writing vocabulary (M-716) lists, the way real test sentences
 * are. Reading sentences are questions the applicant reads aloud; writing
 * sentences are dictated by the officer and typed by the applicant - the
 * classic interview pairing (read a question, write its answer).
 *
 * One-of-three rule: the machine allows up to three attempts per portion, so
 * the screen draws three sentences per session from these pools.
 */

export interface EnglishSentencePair {
  /** Shown on screen for the applicant to read out loud. */
  reading: string;
  /** Dictated via TTS for the applicant to write. Never shown before grading. */
  writing: string;
}

export const ENGLISH_SENTENCES: EnglishSentencePair[] = [
  {
    reading: 'Who was the first President?',
    writing: 'Washington was the first President.',
  },
  {
    reading: 'What is the capital of the United States?',
    writing: 'The capital of the United States is Washington, D.C.',
  },
  {
    reading: 'Where does the President live?',
    writing: 'The President lives in the White House.',
  },
  {
    reading: 'Who can vote?',
    writing: 'Citizens can vote.',
  },
  {
    reading: 'When is Independence Day?',
    writing: 'Independence Day is in July.',
  },
  {
    reading: 'Why do people want to be free?',
    writing: 'People want to be free.',
  },
  {
    reading: 'When is Memorial Day?',
    writing: 'Memorial Day is in May.',
  },
  {
    reading: 'Who elects Congress?',
    writing: 'The people elect Congress.',
  },
  {
    reading: 'What do we pay to the government?',
    writing: 'We pay taxes.',
  },
  {
    reading: 'What country is north of the United States?',
    writing: 'Canada is north of the United States.',
  },
  {
    reading: 'How many states do we have?',
    writing: 'The United States has fifty states.',
  },
  {
    reading: 'What are the colors of the flag?',
    writing: 'The flag is red, white, and blue.',
  },
];
