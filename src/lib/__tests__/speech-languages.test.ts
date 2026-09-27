import { LANGUAGE_CODES } from '@/constants/brand';
import {
  SILENT_LANGUAGES,
  SPEECH_TAGS,
  canSpeak,
  speechTagFor,
} from '@/lib/speech-languages';

describe('speech language support', () => {
  it('hides read-aloud only for languages with no voice anywhere', () => {
    // Hmong, Haitian Creole and Slovenian have no TTS voice on iOS, Android
    // or the web. Offering a button that reads their text in an English
    // accent would be worse than offering nothing.
    expect(canSpeak('hmn')).toBe(false);
    expect(canSpeak('ht')).toBe(false);
    expect(canSpeak('sl')).toBe(false);
  });

  it('offers read-aloud in every other supported language', () => {
    const speakable = LANGUAGE_CODES.filter((code) => canSpeak(code));
    expect(speakable).toHaveLength(LANGUAGE_CODES.length - SILENT_LANGUAGES.size);
    for (const code of ['en', 'es', 'vi', 'zh', 'ar', 'he', 'ko', 'ta', 'km'] as const) {
      expect(canSpeak(code)).toBe(true);
    }
  });

  it('disambiguates the language pairs that share a base code', () => {
    // Getting these wrong reads Traditional Chinese in a Mainland voice, or
    // European Portuguese in a Brazilian one.
    expect(speechTagFor('zh')).toBe('zh-CN');
    expect(speechTagFor('zht')).toBe('zh-TW');
    expect(speechTagFor('pt')).toBe('pt-BR');
    expect(speechTagFor('ptpt')).toBe('pt-PT');
  });

  it('maps Norwegian to Bokmål, which is the code that has a voice', () => {
    expect(speechTagFor('no')).toBe('nb-NO');
  });

  it('passes through codes that are already valid tags', () => {
    expect(speechTagFor('es')).toBe('es');
    expect(speechTagFor('vi')).toBe('vi');
    expect(speechTagFor('ar')).toBe('ar');
  });

  it('only maps codes the app actually supports', () => {
    for (const code of Object.keys(SPEECH_TAGS)) {
      expect(LANGUAGE_CODES).toContain(code);
    }
    for (const code of SILENT_LANGUAGES) {
      expect(LANGUAGE_CODES).toContain(code);
    }
  });

  it('never returns an empty tag', () => {
    for (const code of LANGUAGE_CODES) {
      expect(speechTagFor(code).length).toBeGreaterThan(0);
    }
  });
});
