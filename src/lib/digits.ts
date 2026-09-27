/**
 * Digit handling that works beyond ASCII. `\D`-style filters silently discard
 * digits typed on Arabic, Hindi, Thai, etc. keyboards; this maps any Unicode
 * decimal digit to its ASCII equivalent instead.
 */

/**
 * Zero code point of each decimal-digit block for scripts the app can
 * plausibly receive from its 48 supported languages. Unicode guarantees each
 * block's digits are contiguous 0–9 from its zero.
 */
const DIGIT_ZEROS = [
  0x0030, // ASCII 0
  0x0660, // Arabic-Indic ٠
  0x06f0, // Extended Arabic-Indic (Persian/Urdu) ۰
  0x0966, // Devanagari ०
  0x0a66, // Gurmukhi ੦
  0x0ae6, // Gujarati ૦
  0x0be6, // Tamil ௦
  0x0d66, // Malayalam ൦
  0x0e50, // Thai ๐
  0x17e0, // Khmer ០
  0xff10, // Fullwidth ０ (CJK keyboards)
];

/**
 * Keep only decimal digits from `text`, converted to ASCII 0-9. Everything
 * else (letters, separators, unknown-script digits) is dropped - the same
 * contract as the old `replace(/\D/g, '')`, minus the ASCII-only bias.
 */
export function normalizeDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    for (const zero of DIGIT_ZEROS) {
      if (cp >= zero && cp <= zero + 9) {
        out += String(cp - zero);
        break;
      }
    }
  }
  return out;
}
