const tokens = require('./src/constants/design-tokens');

const px = (n) => (typeof n === 'number' ? `${n}px` : n);
const mapPx = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, px(v)]));
const kebab = (s) => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

// Build tailwind fontSize tuples (size + lineHeight/letterSpacing/weight) from
// the shared type scale so `text-headline-lg` etc. match Typography exactly.
const fontSize = Object.fromEntries(
  Object.entries(tokens.typography).map(([name, t]) => [
    kebab(name),
    [px(t.size), { lineHeight: px(t.lineHeight), letterSpacing: px(t.letterSpacing), fontWeight: t.weight }],
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: update this if you add source files outside ./src.
  // Design tokens are the single source of truth — edit src/constants/design-tokens.js.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokens.colors,
      spacing: mapPx(tokens.spacing),
      borderRadius: mapPx(tokens.radius),
      minHeight: mapPx(tokens.sizing),
      fontFamily: {
        'dm-regular': [tokens.fontFamily.regular],
        'dm-medium': [tokens.fontFamily.medium],
        'dm-semibold': [tokens.fontFamily.semibold],
        'dm-bold': [tokens.fontFamily.bold],
      },
      fontSize,
    },
  },
  plugins: [],
};
