/**
 * Audits the bundled question bank for English leaking through a translation.
 *
 * The existing Jest test proves every field is a non-empty string in all 48
 * languages. That is NOT the same as "translated" - a field can be a perfect
 * copy of the English and still pass. This script looks for the four shapes
 * that untranslated content actually takes:
 *
 *   A  identical to the English string
 *   B  majority-ASCII in a language that does not use the Latin alphabet
 *   C  wildly shorter or longer than the English (truncation / placeholder)
 *   D  English function words sitting as standalone tokens in a non-Latin string
 *
 * Reports only. It never rewrites content - machine-translating a civics answer
 * for someone's citizenship test would be worse than leaving the leak visible.
 *
 *   node scripts/audit-language-leaks.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUESTIONS = path.join(ROOT, 'src', 'data', 'questions.json');
const OUT_DIR = path.join(ROOT, 'audit');
const OUT_FILE = path.join(OUT_DIR, 'language-leaks.md');

// ---------------------------------------------------------------------------
// Language metadata
// ---------------------------------------------------------------------------

/** Languages whose writing system is not the Latin alphabet. */
const NON_LATIN = {
  ar: 'Arabic', he: 'Hebrew', ru: 'Cyrillic', uk: 'Cyrillic', bg: 'Cyrillic',
  sr: 'Cyrillic', el: 'Greek', hi: 'Devanagari', gu: 'Gujarati',
  ml: 'Malayalam', ta: 'Tamil', th: 'Thai', km: 'Khmer', zh: 'Han',
  zht: 'Han', ja: 'Japanese', ko: 'Hangul',
};

/**
 * Scripts that are far denser than English - a "too short" length ratio is
 * expected here and means nothing, so C is not reported for them.
 */
const DENSE_SCRIPTS = new Set(['zh', 'zht', 'ja', 'ko', 'th', 'km']);

const LANG_NAMES = {
  en: 'English', es: 'Spanish', zh: 'Chinese (Simplified)', tl: 'Tagalog',
  vi: 'Vietnamese', pl: 'Polish', fr: 'French', ko: 'Korean', ru: 'Russian',
  hi: 'Hindi', pt: 'Portuguese (Brazil)', de: 'German', it: 'Italian',
  gu: 'Gujarati', uk: 'Ukrainian', el: 'Greek', hmn: 'Hmong', ml: 'Malayalam',
  ro: 'Romanian', nl: 'Dutch', sr: 'Serbian', bs: 'Bosnian', hr: 'Croatian',
  bg: 'Bulgarian', cs: 'Czech', hu: 'Hungarian', sk: 'Slovak', sl: 'Slovenian',
  ja: 'Japanese', th: 'Thai', km: 'Khmer', zht: 'Chinese (Traditional)',
  tr: 'Turkish', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian',
  ptpt: 'Portuguese (Portugal)', ca: 'Catalan', ta: 'Tamil',
  ht: 'Haitian Creole', ar: 'Arabic', he: 'Hebrew', sq: 'Albanian',
  id: 'Indonesian', sv: 'Swedish', no: 'Norwegian', da: 'Danish', fi: 'Finnish',
};

// ---------------------------------------------------------------------------
// Heuristics
// ---------------------------------------------------------------------------

/** Strings that are only digits, punctuation or whitespace can't be translated. */
const NUMERIC_ONLY = /^[^\p{L}]*$/u;

/**
 * Distinguishing a proper noun from an untranslated string, without a
 * hand-curated list: count how many of the 47 languages leave the value
 * byte-identical.
 *
 * "Joe Biden" is unchanged in ~30 languages because it is a name. "Capitalism"
 * is unchanged in exactly one, because exactly one translator skipped it. The
 * cross-language frequency IS the signal, and unlike a curated list it cannot
 * silently miss a name nobody thought of.
 */
const TIER_CERTAIN = 4;   // identical in <= 4 languages -> near-certain leak
const TIER_PROBABLE = 14; // 5..14 -> probable leak or genuinely untranslatable term
                          // 15+   -> proper noun, informational only

/** English function/content words that should never survive into a non-Latin string. */
const ENGLISH_TOKENS = [
  'the', 'and', 'which', 'what', 'who', 'president', 'government', 'is', 'are',
  'of', 'for', 'name', 'one', 'two', 'three', 'state', 'states', 'united',
  'law', 'rights', 'people', 'war', 'court', 'congress', 'senator', 'freedom',
];
const ENGLISH_TOKEN_RE = new RegExp(`\\b(${ENGLISH_TOKENS.join('|')})\\b`, 'gi');

/**
 * Removes deliberate English that a good translation is *supposed* to contain:
 *
 *   - parenthetical glosses - "Повеља о правима (Bill of Rights)"
 *   - quoted source text    - 'Устав САД почиње речима „We the People”'
 *
 * Both are correct practice for legal terms and constitutional quotations, and
 * counting them as leaks buries the real ones.
 *
 * Capitalized Latin words are dropped too. Many languages - Khmer, Thai,
 * Japanese among them - routinely leave Western proper nouns in Latin script,
 * so "សមរភូមិ Gettysburg" is correct Khmer, not a leak. What that leaves is
 * lowercase Latin prose, which in a non-Latin script really is English that
 * never got replaced.
 */
function stripDeliberateEnglish(text) {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[„“"«»‟][^„“"«»‟]*[”“"«»‟]/g, ' ')
    // Proper nouns, including multi-word names whose connectors are lowercase
    // ("Statue of Liberty", "America the Beautiful"): a chain of capitalized
    // Latin tokens joined by of/the/and/for.
    .replace(
      /\b[A-Z][A-Za-z'’.-]*(?:[,]?\s+(?:of|the|and|for)\s+[A-Z][A-Za-z'’.-]*|\s+[A-Z][A-Za-z'’.-]*)*/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Share of letters that are plain ASCII a–z. */
function asciiLetterRatio(text) {
  const letters = text.match(/\p{L}/gu) || [];
  if (letters.length === 0) return 0;
  const ascii = letters.filter((c) => /[A-Za-z]/.test(c)).length;
  return ascii / letters.length;
}

/**
 * First pass: for every English value, which languages leave it byte-identical.
 * Returns a Map of value -> Set of language codes.
 */
function buildIdenticalIndex(questions, langs) {
  const index = new Map();
  for (const q of questions) {
    for (const field of fieldsOf(q)) {
      const en = field.value.en;
      if (typeof en !== 'string' || !en) continue;
      for (const lang of langs) {
        if (field.value[lang] === en) {
          if (!index.has(en)) index.set(en, new Set());
          index.get(en).add(lang);
        }
      }
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

function fieldsOf(question) {
  const out = [{ label: 'prompt', value: question.question }];
  question.options.forEach((opt, i) => out.push({ label: `option${i + 1}`, value: opt }));
  out.push({ label: 'explanation', value: question.explanation });
  return out;
}

function truncate(text, max = 72) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function run() {
  const questions = JSON.parse(fs.readFileSync(QUESTIONS, 'utf8'));
  const langs = Object.keys(questions[0].question).filter((l) => l !== 'en');
  const identicalIndex = buildIdenticalIndex(questions, langs);

  /** lang -> array of findings */
  const findings = {};
  for (const lang of langs) findings[lang] = [];

  /** Values judged to be proper nouns, collected for the informational appendix. */
  const properNouns = new Map();

  for (const q of questions) {
    for (const field of fieldsOf(q)) {
      const en = field.value.en;
      if (typeof en !== 'string' || en.length === 0) continue;

      for (const lang of langs) {
        const value = field.value[lang];
        if (typeof value !== 'string' || value.length === 0) {
          findings[lang].push({
            kind: 'MISSING', q: q.id, field: field.label, en, value: '',
            note: 'field is empty or absent',
          });
          continue;
        }

        const nonLatin = Boolean(NON_LATIN[lang]);

        // --- A: identical to English -------------------------------------
        if (value === en) {
          const shared = identicalIndex.get(en)?.size ?? 1;
          if (NUMERIC_ONLY.test(en)) {
            // digits/punctuation only - nothing to translate
          } else if (shared > TIER_PROBABLE) {
            // Unchanged in most languages: a name, not a missed translation.
            if (!properNouns.has(en)) properNouns.set(en, shared);
          } else {
            findings[lang].push({
              kind: shared <= TIER_CERTAIN ? 'IDENTICAL' : 'IDENTICAL_MAYBE',
              q: q.id, field: field.label, en, value, shared,
              note: `identical to English; unchanged in ${shared} of ${langs.length} languages`,
            });
            continue; // strongest signal - don't double-count this field
          }
        }

        // Glosses and quotations are deliberate; judge the prose around them.
        const prose = nonLatin ? stripDeliberateEnglish(value) : value;

        // --- B: majority-ASCII in a non-Latin script ----------------------
        if (nonLatin && prose.length > 0) {
          const ratio = asciiLetterRatio(prose);
          const sharedHere = identicalIndex.get(value)?.size ?? 0;
          if (ratio > 0.5 && sharedHere <= TIER_PROBABLE) {
            findings[lang].push({
              kind: 'ASCII_IN_NON_LATIN', q: q.id, field: field.label, en, value,
              note: `${Math.round(ratio * 100)}% of letters are ASCII outside quotes/parens (script: ${NON_LATIN[lang]})`,
            });
            continue;
          }
        }

        // --- D: English tokens inside a non-Latin string ------------------
        if (nonLatin && prose.length > 0) {
          ENGLISH_TOKEN_RE.lastIndex = 0;
          const hits = prose.match(ENGLISH_TOKEN_RE);
          if (hits) {
            const unique = [...new Set(hits.map((h) => h.toLowerCase()))];
            findings[lang].push({
              kind: 'ENGLISH_TOKENS', q: q.id, field: field.label, en, value,
              note: `English tokens outside quotes/parens: ${unique.join(', ')}`,
            });
            continue;
          }
        }

        // --- C: length ratio ---------------------------------------------
        if (!DENSE_SCRIPTS.has(lang)) {
          const ratio = value.length / en.length;
          if (ratio < 0.4 || ratio > 2.5) {
            findings[lang].push({
              kind: 'LENGTH', q: q.id, field: field.label, en, value,
              note: `${Math.round(ratio * 100)}% of English length`,
            });
          }
        }
      }
    }
  }

  // ---- summary -----------------------------------------------------------
  const rows = langs
    .map((lang) => {
      const list = findings[lang];
      const by = (k) => list.filter((f) => f.kind === k).length;
      const identical = by('IDENTICAL');
      const identicalMaybe = by('IDENTICAL_MAYBE');
      const ascii = by('ASCII_IN_NON_LATIN');
      const tokens = by('ENGLISH_TOKENS');
      return {
        lang,
        name: LANG_NAMES[lang] || lang,
        script: NON_LATIN[lang] ? NON_LATIN[lang] : 'Latin',
        total: list.length,
        identical,
        identicalMaybe,
        ascii,
        tokens,
        length: by('LENGTH'),
        missing: by('MISSING'),
        /** Findings that are high-confidence English leaks, excluding the noisy LENGTH check. */
        hard: by('MISSING') + identical + ascii + tokens,
      };
    })
    .sort((a, b) => b.hard - a.hard || b.total - a.total);

  const totalFields = questions.length * 6;

  // ---- markdown ----------------------------------------------------------
  const md = [];
  md.push('# Language leak audit - bundled question bank');
  md.push('');
  md.push(`Generated by \`scripts/audit-language-leaks.js\`. **Report only - nothing was translated or rewritten.**`);
  md.push('');
  md.push(`Source: \`src/data/questions.json\` - ${questions.length} questions × ${langs.length + 1} languages × 6 fields (prompt, 4 options, explanation) = **${(totalFields * (langs.length + 1)).toLocaleString()}** strings, of which **${(totalFields * langs.length).toLocaleString()}** are translations.`);
  md.push('');
  md.push('## What each category means');
  md.push('');
  md.push('| Category | Meaning | Confidence |');
  md.push('|---|---|---|');
  md.push(`| \`IDENTICAL\` | Byte-identical to English, and unchanged in **${TIER_CERTAIN} or fewer** of the ${langs.length} languages | **High** - near-certain leak |`);
  md.push(`| \`IDENTICAL_MAYBE\` | Byte-identical, unchanged in ${TIER_CERTAIN + 1}–${TIER_PROBABLE} languages | Medium - leak, or a term that genuinely doesn't translate |`);
  md.push('| `ASCII_IN_NON_LATIN` | Over half the letters are ASCII in a non-Latin-script language | **High** |');
  md.push('| `ENGLISH_TOKENS` | English function words as standalone tokens inside a non-Latin string | **High** |');
  md.push('| `LENGTH` | Under 40% or over 250% of the English length | Low - rough truncation detector, many false positives |');
  md.push('| `MISSING` | Field absent or empty | **Critical** |');
  md.push('');
  md.push('### How proper nouns are separated from leaks');
  md.push('');
  md.push(`Rather than a hand-curated name list (which silently misses whatever nobody thought of), this counts **how many of the ${langs.length} languages leave a value byte-identical**. "Joe Biden" is unchanged in ~30 languages because it is a name; "Capitalism" is unchanged in exactly one, because one translator skipped it. A value unchanged in more than ${TIER_PROBABLE} languages is treated as a proper noun and listed in the appendix instead of counted as a leak.`);
  md.push('');
  md.push('`LENGTH` is not reported for Chinese, Japanese, Korean, Thai or Khmer, where a much shorter string is normal.');
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push('Sorted by **hard leaks** - the high-confidence categories only (missing + identical + ascii + english-tokens). The `LENGTH` column is shown but excluded from that ranking because it is noisy.');
  md.push('');
  md.push('| Language | Code | Script | Hard leaks | Identical | Maybe | ASCII | Eng. tokens | Length | Missing |');
  md.push('|---|---|---|--:|--:|--:|--:|--:|--:|--:|');
  for (const r of rows) {
    md.push(
      `| ${r.name} | \`${r.lang}\` | ${r.script} | **${r.hard}** | ${r.identical} | ${r.identicalMaybe} | ${r.ascii} | ${r.tokens} | ${r.length} | ${r.missing} |`,
    );
  }
  md.push('');

  const grand = rows.reduce(
    (acc, r) => {
      acc.total += r.total; acc.hard += r.hard; acc.identical += r.identical;
      acc.identicalMaybe += r.identicalMaybe; acc.ascii += r.ascii;
      acc.tokens += r.tokens; acc.length += r.length; acc.missing += r.missing;
      return acc;
    },
    { total: 0, hard: 0, identical: 0, identicalMaybe: 0, ascii: 0, tokens: 0, length: 0, missing: 0 },
  );
  md.push(`**Totals** - ${grand.hard} hard leaks (${grand.missing} missing, ${grand.identical} identical, ${grand.ascii} ascii-in-non-latin, ${grand.tokens} english-tokens), plus ${grand.identicalMaybe} medium-confidence and ${grand.length} length findings. ${grand.total} findings overall.`);
  md.push('');
  md.push('---');
  md.push('');
  md.push('## Detail by language');
  md.push('');

  for (const r of rows) {
    md.push(`### ${r.name} (\`${r.lang}\`) - ${r.hard} hard, ${r.total} total`);
    md.push('');
    if (r.total === 0) {
      md.push('_No leaks detected._');
      md.push('');
      continue;
    }
    const list = findings[r.lang];
    const order = ['MISSING', 'IDENTICAL', 'ASCII_IN_NON_LATIN', 'ENGLISH_TOKENS', 'IDENTICAL_MAYBE', 'LENGTH'];
    list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.q.localeCompare(b.q));
    md.push('| Question | Field | Category | English | Value | Note |');
    md.push('|---|---|---|---|---|---|');
    for (const f of list) {
      md.push(
        `| \`${f.q}\` | ${f.field} | \`${f.kind}\` | ${truncate(f.en, 56).replace(/\|/g, '\\|')} | ${truncate(f.value, 56).replace(/\|/g, '\\|')} | ${f.note} |`,
      );
    }
    md.push('');
  }

  // ---- proper-noun appendix ---------------------------------------------
  md.push('---');
  md.push('');
  md.push('## Appendix - treated as proper nouns');
  md.push('');
  md.push(`These ${properNouns.size} values are byte-identical to English in more than ${TIER_PROBABLE} languages, so they are counted as names rather than leaks. Listed for review: if any of these *should* be translated, lower \`TIER_PROBABLE\` in the script.`);
  md.push('');
  md.push('| Value | Languages leaving it unchanged |');
  md.push('|---|--:|');
  for (const [value, count] of [...properNouns.entries()].sort((a, b) => b[1] - a[1])) {
    md.push(`| ${truncate(value, 70).replace(/\|/g, '\\|')} | ${count} |`);
  }
  md.push('');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, md.join('\n'));

  // ---- console -----------------------------------------------------------
  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  console.log('');
  console.log(pad('LANGUAGE', 24) + pad('CODE', 6) + pad('SCRIPT', 12) + padL('HARD', 6) + padL('IDENT', 7) + padL('MAYBE', 7) + padL('ASCII', 7) + padL('TOKENS', 8) + padL('LEN', 6) + padL('MISS', 6));
  console.log('-'.repeat(89));
  for (const r of rows) {
    if (r.hard === 0 && r.total === 0) continue;
    console.log(
      pad(r.name, 24) + pad(r.lang, 6) + pad(r.script, 12) +
      padL(r.hard, 6) + padL(r.identical, 7) + padL(r.identicalMaybe, 7) +
      padL(r.ascii, 7) + padL(r.tokens, 8) + padL(r.length, 6) + padL(r.missing, 6),
    );
  }
  console.log('-'.repeat(89));
  console.log(
    pad('TOTAL', 24) + pad('', 6) + pad('', 12) +
    padL(grand.hard, 6) + padL(grand.identical, 7) + padL(grand.identicalMaybe, 7) +
    padL(grand.ascii, 7) + padL(grand.tokens, 8) + padL(grand.length, 6) + padL(grand.missing, 6),
  );
  console.log('');
  console.log(`Translated strings checked : ${(totalFields * langs.length).toLocaleString()}`);
  console.log(`Hard leaks                 : ${grand.hard}  (${((grand.hard / (totalFields * langs.length)) * 100).toFixed(3)}% of all translated strings)`);
  console.log(`Values treated as names    : ${properNouns.size}`);
  console.log(`Report                     : ${path.relative(ROOT, OUT_FILE)}`);
}

run();
