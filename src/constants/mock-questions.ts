/**
 * TEMP: 10 hardcoded civics questions (same set as the Mock Interview screen)
 * shaped like the real /api/questions feed, so screens can be tested without
 * the backend running. Only `en` text is real — other languages fall back to
 * English via localize().
 */

import type { LocalizedText, Question } from '@/lib/api';

/** Mock localized text: English only; ml/gu duplicate en to satisfy the type. */
const t = (en: string): LocalizedText => ({ en, ml: en, gu: en });

const q = (
  id: number,
  question: string,
  answer: string,
  explanation: string,
  distractors: string[] = [],
): Question => ({
  id: `mock-${id}`,
  topic: 'Civics',
  // Correct answer at index 0, like the real feed — quiz UIs must shuffle on
  // display or every correct answer would be "A".
  question: t(question),
  options: [t(answer), ...distractors.map(t)],
  correctIndex: 0,
  explanation: t(explanation),
  is6520: false,
});

export const MOCK_QUESTIONS: Question[] = [
  q(
    1,
    'What is the supreme law of the land?',
    'The Constitution',
    'The Constitution is the highest law in the United States. All other laws must follow it.',
    ['The Declaration of Independence', 'The Bill of Rights', 'The Articles of Confederation'],
  ),
  q(
    2,
    'Who is in charge of the executive branch?',
    'The President',
    'The President leads the executive branch, which carries out federal laws.',
    ['Congress', 'The Supreme Court', 'The Senate'],
  ),
  q(
    3,
    'What are the two parts of the US Congress?',
    'The Senate and House of Representatives',
    'Congress is the legislative branch of the federal government and has two chambers.',
    [
      'The House and the Supreme Court',
      'The Senate and the Cabinet',
      'The President and Vice President',
    ],
  ),
  q(
    4,
    'How many US senators are there?',
    'One hundred (100)',
    'Each of the 50 states elects two senators, no matter its size.',
    ['Fifty (50)', 'Four hundred thirty-five (435)', 'Two hundred (200)'],
  ),
  q(
    5,
    'What is the capital of the United States?',
    'Washington, D.C.',
    'Washington, D.C. has been the capital of the United States since 1800.',
    ['New York City', 'Philadelphia', 'Boston'],
  ),
  q(
    6,
    'What ocean is on the West Coast of the United States?',
    'The Pacific Ocean',
    'The Pacific Ocean borders the West Coast. The Atlantic Ocean borders the East Coast.',
    ['The Atlantic Ocean', 'The Gulf of Mexico', 'The Indian Ocean'],
  ),
  q(
    7,
    'Who wrote the Declaration of Independence?',
    'Thomas Jefferson',
    'Thomas Jefferson wrote the Declaration of Independence in 1776.',
    ['George Washington', 'Abraham Lincoln', 'Benjamin Franklin'],
  ),
  q(
    8,
    'What do we celebrate on July 4th?',
    'Independence Day',
    'July 4th celebrates the adoption of the Declaration of Independence in 1776.',
    ['Memorial Day', 'Thanksgiving', 'Presidents Day'],
  ),
  q(
    9,
    'How many amendments does the Constitution have?',
    'Twenty-seven (27)',
    'The Constitution has 27 amendments. The first ten are called the Bill of Rights.',
    ['Ten (10)', 'Fifty (50)', 'Twenty-one (21)'],
  ),
  q(
    10,
    'What is the name of the national anthem?',
    'The Star-Spangled Banner',
    'Francis Scott Key wrote The Star-Spangled Banner during the War of 1812.',
    ['America the Beautiful', 'God Bless America', 'This Land Is Your Land'],
  ),
];
