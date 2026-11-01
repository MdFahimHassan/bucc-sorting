/**
 * Student ID normalisation. Used by BOTH scripts/build-data.ts and the browser,
 * so a key produced at build time always matches what a student types.
 *
 * Rules: NFKC (folds full-width digits), map Bengali and Arabic-Indic digits to ASCII
 * (students may type on a Bangla keyboard), strip whitespace, dashes and underscores, lowercase.
 */
const DIGIT_BLOCKS: readonly number[] = [
  0x09e6, // Bengali
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic
];

export function normalizeId(raw: string): string {
  let s = raw.normalize('NFKC');
  s = s.replace(/[٠-٩۰-۹০-৯]/g, (ch) => {
    const code = ch.charCodeAt(0);
    for (const base of DIGIT_BLOCKS) {
      if (code >= base && code <= base + 9) return String(code - base);
    }
    return ch;
  });
  // Dashes: hyphen-minus, en/em dash, minus sign, non-breaking hyphen.
  s = s.replace(/[\s ​-‍﻿_\-‐-―−]/g, '');
  return s.toLowerCase();
}
