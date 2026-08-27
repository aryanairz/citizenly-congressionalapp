/**
 * Finds user-visible English string literals in the app that are NOT routed
 * through t() / tCount().
 *
 * Uses the TypeScript AST rather than grep, so it can tell a button label from
 * an icon name, a dialog body from a style value, and skip anything already
 * wrapped in a translation call.
 *
 * Reports only — it does not rewrite code and does not translate anything.
 *
 *   node scripts/audit-untranslated-ui.js
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'audit');
const OUT_FILE = path.join(OUT_DIR, 'untranslated-ui.md');

/** Props whose value is rendered to, or read out to, a person. */
const VISIBLE_PROPS = new Set([
  'label', 'title', 'subtitle', 'description', 'placeholder', 'text',
  'accessibilityLabel', 'accessibilityHint', 'submitLabel', 'nextLabel',
  'trailingLabel', 'badge', 'correctAnswer', 'explanation', 'error',
  'serverError', 'overline',
]);

/** Props that look texty but are identifiers, config, or styling. */
const IGNORED_PROPS = new Set([
  'icon', 'name', 'key', 'testID', 'style', 'variant', 'color', 'surface',
  'keyboardType', 'autoComplete', 'autoCapitalize', 'accessibilityRole',
  'returnKeyType', 'placeholderTextColor', 'selectionColor', 'href',
  'pathname', 'mode', 'topic', 'id', 'source', 'contentContainerStyle',
  'keyboardShouldPersistTaps', 'keyboardDismissMode', 'behavior', 'edges',
  'labelColor', 'active', 'size', 'visual', 'letter',
]);

/** Directories that never ship user-facing copy. */
const SKIP_DIRS = new Set(['__tests__', 'data']);

/** Setter names whose string argument is shown to the user. */
const ERROR_SETTERS = /^set(\w*Error|\w*Message|Feedback|Status)$/;

// ---------------------------------------------------------------------------

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkFiles(path.join(dir, entry.name), out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** True when the node sits inside a t(...) or tCount(...) call already. */
function insideTranslationCall(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isCallExpression(cur) && ts.isIdentifier(cur.expression)) {
      if (cur.expression.text === 't' || cur.expression.text === 'tCount') return true;
    }
    cur = cur.parent;
  }
  return false;
}

/** Strings that are not prose: identifiers, single symbols, pure punctuation. */
function isProse(text) {
  const s = text.trim();
  if (s.length < 2) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(s) && !s.includes(' ')) return false; // camelCase id
  if (/^[a-z-]+$/.test(s) && !s.includes(' ')) return false;           // kebab id
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false;                     // color
  return /[A-Za-z]{2,}/.test(s);
}

/** camelCase key proposal derived from the copy and its screen. */
function proposeKey(area, text, taken) {
  const words = text
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[^A-Za-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (words.length === 0) words.push('text');
  const body = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
  let key = area + body[0].toUpperCase() + body.slice(1);
  let n = 2;
  const base = key;
  while (taken.has(key)) key = `${base}${n++}`;
  taken.add(key);
  return key;
}

/** Screen/component name -> short key prefix, matching ui-strings.ts style. */
function areaFor(file) {
  const base = path.basename(file).replace(/\.tsx?$/, '');
  const map = {
    index: 'welcome', 'sign-up': 'signUp', 'log-in': 'logIn',
    dashboard: 'dash', 'select-topic': 'topic', 'study-list': 'study',
    flashcards: 'cards', quiz: 'quiz', 'review-mistakes': 'review',
    'mock-interview': 'interview', profile: 'profile',
    'edit-location': 'location', language: 'onbLang', exemption: 'onbRule',
    state: 'onbState', button: 'ui', input: 'ui', card: 'ui',
    'state-district-picker': 'statePicker', 'language-picker': 'langPicker',
    'bottom-nav': 'nav', 'quiz-ui': 'quiz', 'screen-header': 'ui',
    'pin-input': 'ui', 'option-row': 'ui', 'step-dots': 'ui',
  };
  return map[base] || base.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------

function run() {
  const files = walkFiles(SRC);
  const findings = [];
  const taken = new Set();

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const area = areaFor(file);

    const record = (node, text, context) => {
      const flat = text.replace(/\s+/g, ' ').trim();
      if (!isProse(flat)) return;
      if (insideTranslationCall(node)) return;
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      findings.push({ file: rel, line: line + 1, text: flat, context, area });
    };

    const visit = (node) => {
      // 1. Text rendered directly in JSX
      if (ts.isJsxText(node) && node.text.trim().length > 0) {
        record(node, node.text, 'JSX text');
      }

      // 2. String or template values on user-visible props
      if (ts.isJsxAttribute(node) && node.name && ts.isIdentifier(node.name)) {
        const prop = node.name.text;
        if (VISIBLE_PROPS.has(prop) && !IGNORED_PROPS.has(prop) && node.initializer) {
          const init = node.initializer;
          if (ts.isStringLiteral(init)) {
            record(init, init.text, `prop ${prop}`);
          } else if (ts.isJsxExpression(init) && init.expression) {
            const e = init.expression;
            if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
              record(e, e.text, `prop ${prop}`);
            } else if (ts.isTemplateExpression(e)) {
              const raw = e.getText(sf).slice(1, -1);
              record(e, raw, `prop ${prop} (template)`);
            }
          }
        }
      }

      // 3. Alert.alert('title', 'body', ...)
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.expression.getText(sf) === 'Alert' &&
        node.expression.name.text === 'alert'
      ) {
        node.arguments.forEach((arg, i) => {
          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
            record(arg, arg.text, i === 0 ? 'dialog title' : 'dialog body');
          } else if (ts.isTemplateExpression(arg)) {
            record(arg, arg.getText(sf).slice(1, -1), i === 0 ? 'dialog title' : 'dialog body');
          }
        });
      }

      // 4. window.alert('...')
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(sf) === 'window.alert' &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          record(arg, arg.text, 'web alert');
        }
      }

      // 5. setError('...') / setServerError('...') and friends
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ERROR_SETTERS.test(node.expression.text) &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          record(arg, arg.text, 'validation / error copy');
        } else if (ts.isTemplateExpression(arg)) {
          record(arg, arg.getText(sf).slice(1, -1), 'validation / error copy (template)');
        }
      }

      // 6. String literals in an object literal's user-visible fields
      //    (mode lists, option tables, sentence banks)
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        VISIBLE_PROPS.has(node.name.text)
      ) {
        const init = node.initializer;
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          record(init, init.text, `object field ${node.name.text}`);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sf);
  }

  // De-duplicate identical copy appearing in the same file
  const seen = new Set();
  const unique = findings.filter((f) => {
    const k = `${f.file}::${f.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  unique.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const f of unique) f.key = proposeKey(f.area, f.text, taken);

  // ---- group by file ------------------------------------------------------
  const byFile = new Map();
  for (const f of unique) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  const fileRows = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

  const byContext = {};
  for (const f of unique) byContext[f.context] = (byContext[f.context] || 0) + 1;

  // ---- markdown -----------------------------------------------------------
  const md = [];
  md.push('# Untranslated UI copy');
  md.push('');
  md.push('Generated by `scripts/audit-untranslated-ui.js`. **Report only — no code was changed and nothing was translated.**');
  md.push('');
  md.push(`Scanned ${files.length} source files under \`src/\` (excluding tests and \`src/data/\`) using the TypeScript AST. A string is reported when it is user-visible **and** not already routed through \`t()\` or \`tCount()\`.`);
  md.push('');
  md.push(`## Total: ${unique.length} untranslated strings`);
  md.push('');
  md.push('### By kind');
  md.push('');
  md.push('| Kind | Count |');
  md.push('|---|--:|');
  for (const [k, v] of Object.entries(byContext).sort((a, b) => b[1] - a[1])) {
    md.push(`| ${k} | ${v} |`);
  }
  md.push('');
  md.push('### By file');
  md.push('');
  md.push('| File | Strings |');
  md.push('|---|--:|');
  for (const [file, list] of fileRows) md.push(`| \`${file}\` | ${list.length} |`);
  md.push('');
  md.push('---');
  md.push('');
  md.push('## Detail');
  md.push('');
  md.push('Proposed keys follow the existing `ui-strings.ts` convention: camelCase, prefixed by screen area. They are suggestions — rename freely before wiring.');
  md.push('');

  for (const [file, list] of fileRows) {
    md.push(`### \`${file}\``);
    md.push('');
    md.push('| Line | Kind | Proposed key | String |');
    md.push('|--:|---|---|---|');
    for (const f of list) {
      const safe = f.text.replace(/\|/g, '\\|');
      const shown = safe.length > 96 ? `${safe.slice(0, 95)}…` : safe;
      md.push(`| ${f.line} | ${f.context} | \`${f.key}\` | ${shown} |`);
    }
    md.push('');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, md.join('\n'));

  // ---- console ------------------------------------------------------------
  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  console.log('');
  console.log(`Files scanned            : ${files.length}`);
  console.log(`Untranslated strings     : ${unique.length}`);
  console.log('');
  console.log(pad('FILE', 44) + padL('STRINGS', 9));
  console.log('-'.repeat(53));
  for (const [file, list] of fileRows) console.log(pad(file, 44) + padL(list.length, 9));
  console.log('-'.repeat(53));
  console.log(pad('TOTAL', 44) + padL(unique.length, 9));
  console.log('');
  console.log('By kind:');
  for (const [k, v] of Object.entries(byContext).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + pad(k, 34) + padL(v, 5));
  }
  console.log('');
  console.log(`Report : ${path.relative(ROOT, OUT_FILE)}`);
}

run();
