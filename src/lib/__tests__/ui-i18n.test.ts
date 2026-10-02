/**
 * Plural selection has to survive a runtime with no `Intl.PluralRules`.
 *
 * Hermes on iOS ships without it, so `new Intl.PluralRules(...)` threw
 * "undefined cannot be used as a constructor" during render and took the
 * whole screen down. Every browser has `Intl`, so no amount of testing on
 * web would have caught it; these tests delete the constructor to reproduce
 * the device.
 */

import { t, tCount } from '@/lib/ui-i18n';

describe('t', () => {
  it('returns the string for a key', () => {
    expect(t('getStarted', 'en')).toBeTruthy();
  });

  it('interpolates named vars', () => {
    expect(t('questionXofY', 'en', { current: 3, total: 10 })).toContain('3');
  });

  it('returns a real string for every supported language', () => {
    for (const lang of ['en', 'es', 'ru', 'ar', 'zh', 'hmn', 'ptpt', 'zht'] as const) {
      expect(t('getStarted', lang)).toBeTruthy();
    }
  });
});

describe('tCount falls back per entry', () => {
  it('uses the English forms for a language the entry does not cover', () => {
    // questionsCount only defines `en`, so every other language lands on it.
    expect(tCount('questionsCount', 4, 'ru')).toBe('4 questions');
  });
});

describe('tCount with Intl.PluralRules available', () => {
  it('selects the singular form for one', () => {
    expect(tCount('questionsCount', 1, 'en')).toBe('1 question');
  });

  it('selects the plural form for many', () => {
    expect(tCount('questionsCount', 5, 'en')).toBe('5 questions');
  });

  it('interpolates extra vars alongside count', () => {
    expect(tCount('quizSummary', 10, 'en', { score: 7, total: 10 })).toBe(
      'You answered 7 of 10 questions correctly.',
    );
  });
});

describe('tCount on a runtime without Intl.PluralRules (Hermes on iOS)', () => {
  const realPluralRules = Intl.PluralRules;

  afterEach(() => {
    // @ts-expect-error restoring the global the test removed
    Intl.PluralRules = realPluralRules;
    jest.resetModules();
  });

  /** Re-imports the module with the constructor missing, as Hermes has it. */
  function loadWithoutPluralRules(): typeof import('@/lib/ui-i18n') {
    // @ts-expect-error deleting a global to reproduce the device runtime
    delete Intl.PluralRules;
    let mod: typeof import('@/lib/ui-i18n') | undefined;
    jest.isolateModules(() => {
      mod = require('@/lib/ui-i18n') as typeof import('@/lib/ui-i18n');
    });
    if (!mod) throw new Error('module failed to load');
    return mod;
  }

  it('does not throw', () => {
    const mod = loadWithoutPluralRules();
    expect(() => mod.tCount('questionsCount', 5, 'en')).not.toThrow();
  });

  it('still returns a real sentence rather than a blank or a key', () => {
    const mod = loadWithoutPluralRules();
    expect(mod.tCount('questionsCount', 5, 'en')).toBe('5 questions');
    expect(mod.tCount('questionsCount', 1, 'en')).toBe('1 question');
  });

  it('holds for a language whose plural rules are more complex than English', () => {
    const mod = loadWithoutPluralRules();
    // Russian wants `few` at 2; without ICU it lands on `other`, which is a
    // correct Russian string, just a less precise category than ideal.
    const out = mod.tCount('questionsCount', 2, 'ru');
    expect(typeof out).toBe('string');
    expect(out).toContain('2');
  });

  it('survives every supported language', () => {
    const mod = loadWithoutPluralRules();
    for (const lang of ['en', 'es', 'ru', 'ar', 'zh', 'hmn', 'ptpt', 'zht'] as const) {
      expect(() => mod.tCount('questionsCount', 3, lang)).not.toThrow();
    }
  });
});
