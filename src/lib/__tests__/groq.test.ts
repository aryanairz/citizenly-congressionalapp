/**
 * The grader decides whether someone passes a practice interview, so the two
 * things that must never happen are a malformed reply becoming a "correct"
 * verdict, and a network failure being silently graded as a wrong answer.
 */

import { GroqError, parseGrade } from '@/lib/groq';

const ANSWERS = ['(the) Constitution', 'the supreme law of the land'];

describe('parseGrade', () => {
  it('reads a well-formed correct verdict', () => {
    const out = parseGrade(
      JSON.stringify({
        correct: true,
        reason: 'You named the Constitution.',
        matched: ['(the) Constitution'],
      }),
      ANSWERS,
    );
    expect(out.correct).toBe(true);
    expect(out.reason).toBe('You named the Constitution.');
    expect(out.matched).toEqual(['(the) Constitution']);
  });

  it('reads a well-formed incorrect verdict', () => {
    const out = parseGrade(
      JSON.stringify({ correct: false, reason: 'That names a different document.', matched: [] }),
      ANSWERS,
    );
    expect(out.correct).toBe(false);
    expect(out.reason).toBe('That names a different document.');
  });

  it('treats a missing correct field as incorrect rather than passing someone', () => {
    const out = parseGrade(JSON.stringify({ reason: 'Hmm.' }), ANSWERS);
    expect(out.correct).toBe(false);
  });

  it('only accepts a real boolean true, not a truthy string', () => {
    expect(parseGrade(JSON.stringify({ correct: 'true' }), ANSWERS).correct).toBe(false);
    expect(parseGrade(JSON.stringify({ correct: 1 }), ANSWERS).correct).toBe(false);
    expect(parseGrade(JSON.stringify({ correct: 'yes' }), ANSWERS).correct).toBe(false);
  });

  it('supplies a reason when the model omits one', () => {
    const wrong = parseGrade(JSON.stringify({ correct: false }), ANSWERS);
    expect(wrong.reason).toContain('(the) Constitution');

    const right = parseGrade(JSON.stringify({ correct: true }), ANSWERS);
    expect(right.reason).toBeTruthy();
  });

  it('supplies a reason when the model sends an empty one', () => {
    const out = parseGrade(JSON.stringify({ correct: true, reason: '   ' }), ANSWERS);
    expect(out.reason.trim()).toBeTruthy();
  });

  it('drops non-string entries from matched', () => {
    const out = parseGrade(
      JSON.stringify({ correct: true, matched: ['ok', 42, null, { a: 1 }] }),
      ANSWERS,
    );
    expect(out.matched).toEqual(['ok']);
  });

  it('tolerates matched being the wrong type entirely', () => {
    expect(parseGrade(JSON.stringify({ correct: true, matched: 'nope' }), ANSWERS).matched).toEqual(
      [],
    );
  });

  it('finds the object inside a code fence', () => {
    const fenced = '```json\n{"correct": true, "reason": "Right."}\n```';
    expect(parseGrade(fenced, ANSWERS).correct).toBe(true);
  });

  it('finds the object inside surrounding prose', () => {
    const chatty = 'Here is my verdict:\n{"correct": false, "reason": "Not quite."}\nHope that helps.';
    const out = parseGrade(chatty, ANSWERS);
    expect(out.correct).toBe(false);
    expect(out.reason).toBe('Not quite.');
  });

  it('is not fooled by a brace inside the reason text', () => {
    const tricky = '{"correct": true, "reason": "You said {the} Constitution."}';
    expect(parseGrade(tricky, ANSWERS).reason).toBe('You said {the} Constitution.');
  });

  it('handles nested objects without stopping at the first close brace', () => {
    const nested = '{"correct": true, "reason": "Right.", "extra": {"a": 1}}';
    expect(parseGrade(nested, ANSWERS).correct).toBe(true);
  });

  it('throws a retryable error on unparseable output', () => {
    expect(() => parseGrade('not json at all', ANSWERS)).toThrow(GroqError);
    try {
      parseGrade('not json at all', ANSWERS);
    } catch (e) {
      expect((e as GroqError).retryable).toBe(true);
    }
  });

  it('throws rather than guessing when the reply is a bare value', () => {
    expect(() => parseGrade('null', ANSWERS)).toThrow(GroqError);
    expect(() => parseGrade('"a string"', ANSWERS)).toThrow(GroqError);
    expect(() => parseGrade('123', ANSWERS)).toThrow(GroqError);
  });

  it('does not fall over when there are no acceptable answers to quote', () => {
    const out = parseGrade(JSON.stringify({ correct: false }), []);
    expect(out.correct).toBe(false);
    expect(out.reason).toBeTruthy();
  });
});

describe('GroqError', () => {
  it('carries whether retrying could help', () => {
    expect(new GroqError('offline', true).retryable).toBe(true);
    expect(new GroqError('bad key', false).retryable).toBe(false);
  });

  it('retries immediately by default when retryable', () => {
    expect(new GroqError('offline', true).retryNow).toBe(true);
  });

  it('can be retryable without being worth retrying straight away', () => {
    // A timeout already spent the whole budget. Retrying makes the applicant
    // wait twice as long to hear the same thing.
    const timedOut = new GroqError('too slow', true, false);
    expect(timedOut.retryable).toBe(true);
    expect(timedOut.retryNow).toBe(false);
  });

  it('never retries something that cannot succeed', () => {
    expect(new GroqError('bad key', false).retryNow).toBe(false);
  });
});
