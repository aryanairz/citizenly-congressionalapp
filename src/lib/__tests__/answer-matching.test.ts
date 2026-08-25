import {
  biasStringsFor,
  contentTokens,
  editDistance,
  feedbackFor,
  matchAnswer,
  normalize,
  type CivicsQuestion,
} from '@/lib/answer-matching';

const q = (partial: Partial<CivicsQuestion> & Pick<CivicsQuestion, 'acceptableAnswers'>): CivicsQuestion => ({
  id: 'test',
  prompt: 'Test question?',
  ...partial,
});

describe('normalize', () => {
  it('lowercases, strips punctuation, expands contractions', () => {
    // "it's" expands to "it is", which is then stripped as a leading hedge —
    // but stopwords like "the" survive normalize (they only drop in
    // contentTokens).
    expect(normalize("It's the Constitution!")).toBe('the constitution');
    expect(normalize("they're citizens")).toBe('they are citizens');
  });

  it('strips leading hedges and disfluencies', () => {
    expect(normalize('I think, um, the Constitution')).toBe('the constitution');
    expect(normalize('maybe freedom of speech')).toBe('freedom of speech');
  });

  it('collapses spelled-out numbers to digits', () => {
    expect(normalize('twenty seven')).toBe('27');
    expect(normalize('one hundred')).toBe('100');
    expect(normalize('four hundred thirty five')).toBe('435');
  });

  it('handles the year idiom', () => {
    expect(normalize('seventeen seventy six')).toBe('1776');
    expect(normalize('nineteen twenty')).toBe('1920');
  });
});

describe('contentTokens', () => {
  it('drops grammatical stopwords', () => {
    expect(contentTokens('the Bill of Rights')).toEqual(['bill', 'rights']);
  });

  it('keeps tokens for an answer made entirely of stopwords', () => {
    expect(contentTokens('It is')).not.toHaveLength(0);
  });
});

describe('editDistance', () => {
  it('measures edits and abandons past max', () => {
    expect(editDistance('constitution', 'constitucion', 2)).toBe(1);
    expect(editDistance('war', 'peace', 1)).toBe(2); // max + 1 (abandoned)
  });
});

describe('matchAnswer', () => {
  const constitution = q({ acceptableAnswers: ['The Constitution'] });

  it('accepts the exact answer', () => {
    const result = matchAnswer('the constitution', constitution);
    expect(result.correct).toBe(true);
    expect(result.matched).toHaveLength(1);
  });

  it('accepts an answer embedded in a longer sentence', () => {
    const result = matchAnswer(
      'um I think it is the Constitution of the United States',
      constitution,
    );
    expect(result.correct).toBe(true);
  });

  it('tolerates transcription noise on long words (never pronunciation)', () => {
    const result = matchAnswer('the constitucion', constitution);
    expect(result.correct).toBe(true);
    expect(result.matched[0]?.exact).toBe(false);
  });

  it('strict mode disables fuzzy matching', () => {
    const result = matchAnswer('the constitucion', constitution, { strict: true });
    expect(result.correct).toBe(false);
  });

  it('reports close near-misses', () => {
    const branches = q({
      acceptableAnswers: ['The Senate and House of Representatives'],
    });
    const result = matchAnswer('the senate', branches);
    expect(result.correct).toBe(false);
    expect(result.close).toBe(false); // 1/3 tokens is below the 0.5 threshold
    const closer = matchAnswer('the senate and the house', branches);
    expect(closer.correct).toBe(false);
    expect(closer.close).toBe(true);
  });

  it('reports empty transcripts distinctly', () => {
    const result = matchAnswer('   ', constitution);
    expect(result.transcriptEmpty).toBe(true);
    expect(result.correct).toBe(false);
  });

  it('negativeTokens block containment confusions', () => {
    const president = q({
      acceptableAnswers: ['The President'],
      negativeTokens: ['vice'],
    });
    expect(matchAnswer('the president', president).correct).toBe(true);
    expect(matchAnswer('the vice president', president).correct).toBe(false);
  });

  it('a single utterance is not double-counted across contained answers', () => {
    const both = q({
      acceptableAnswers: ['The President', 'The Vice President'],
      requiredCount: 2,
    });
    // "vice president" contains "president": subsumption dedup keeps only the
    // longer match, so one utterance can never satisfy requiredCount 2.
    const result = matchAnswer('the vice president', both);
    expect(result.matched).toHaveLength(1);
    expect(result.correct).toBe(false);
  });

  it('requiredCount demands distinct answers', () => {
    const holidays = q({
      acceptableAnswers: ['Thanksgiving', 'Christmas', 'Independence Day'],
      requiredCount: 2,
    });
    expect(matchAnswer('thanksgiving', holidays).correct).toBe(false);
    expect(matchAnswer('thanksgiving and christmas', holidays).correct).toBe(true);
  });

  it('numeric answers match spoken and digit forms', () => {
    const amendments = q({ acceptableAnswers: ['Twenty-seven (27)'] });
    expect(matchAnswer('twenty seven', amendments).correct).toBe(true);
    expect(matchAnswer('27', amendments).correct).toBe(true);
  });
});

describe('biasStringsFor', () => {
  it('includes full answers and their long content words', () => {
    const question = q({
      acceptableAnswers: ['The Star-Spangled Banner'],
    });
    const bias = biasStringsFor(question);
    expect(bias).toContain('The Star-Spangled Banner');
    expect(bias).toContain('star');
    expect(bias).toContain('spangled');
  });

  it('caps the list at the limit', () => {
    const question = q({
      acceptableAnswers: Array.from({ length: 60 }, (_, i) => `Unique Answer ${i}`),
    });
    expect(biasStringsFor(question, 40)).toHaveLength(40);
  });
});

describe('feedbackFor', () => {
  const constitution = q({ acceptableAnswers: ['The Constitution'] });

  it('is kind about silence', () => {
    expect(feedbackFor(matchAnswer('', constitution), constitution)).toBe(
      'No answer was heard. Try again.',
    );
  });

  it('confirms correct answers plainly', () => {
    expect(
      feedbackFor(matchAnswer('the constitution', constitution), constitution),
    ).toBe('Correct.');
  });

  it('shows a full correct answer on a miss', () => {
    expect(
      feedbackFor(matchAnswer('the declaration', constitution), constitution),
    ).toContain('The Constitution');
  });
});
