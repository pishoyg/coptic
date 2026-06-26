/** Package orth defines orthography logic. */
import * as browser from './browser.js';

/**
 * Use NFD normalization to split characters into their base character and
 * separate diacritical marks.
 * @param text - Text to be normalized.
 * @returns NFD-normalized text
 */
export function normalize(text: string): string {
  return text.normalize('NFD');
}

const DIACRITIC_RE = /\p{Mark}/gu;

/**
 * @param text - Text to be cleaned.
 * @returns - The text, with diacritics removed.
 */
export function cleanDiacritics(text: string): string {
  return normalize(text).replaceAll(DIACRITIC_RE, '');
}

export type Translation = number[];

/** Build an index mapping of the diacritic-free version of the given text.
 *
 * Let `clean` be the diacritic-free version of the given text. Build a mapping
 * of positions in `clean` to positions in `text` such that:
 * text[mapping[i]] == clean[i]
 *
 * @param text - Text that potentially contains diacritics.
 * @returns - An array of numbers mapping positions of the diacritic-free
 * version of the text to positions in the text.
 */
export function translation(text: string): Translation {
  const mapping: number[] = [];
  for (const [i, c] of Array.from(text).entries()) {
    if (!c.match(DIACRITIC_RE)) {
      mapping.push(i);
    }
  }
  mapping.push(text.length);
  return mapping;
}

/**
 *
 * @param tran
 * @returns
 */
export function idempotent(tran: Translation): boolean {
  return tran.at(-1) === tran.length - 1;
}

// SAFARI_FRAGMENT_WORD_CHARS is a list of otherwise non-word characters that
// are considered word characters for fragment purposes by Safari. See #286 for
// context.
const SAFARI_FRAGMENT_WORD_CHARS: Set<string> = new Set<string>(["'"]);

/**
 *
 * @param char
 * @returns
 */
export function isWordChar(char?: string): boolean {
  return (
    !!char &&
    /[\p{Letter}\p{Number}\p{Mark}\p{Connector_Punctuation}]/u.test(char)
  );
}

/**
 *
 * @param char
 * @returns
 * See #286 for context.
 */
export function isWordCharForFragments(char: string): boolean {
  return (
    isWordChar(char) ||
    (SAFARI_FRAGMENT_WORD_CHARS.has(char) && browser.safari())
  );
}

/**
 * A "spacing diacritic" is a presentation form that renders a diacritic as a
 * standalone glyph \u2014 for example U+FE76 ARABIC FATHA ISOLATED FORM, whose
 * compatibility decomposition is <space> + U+064E (combining fatha). Unlike a
 * combining mark, it has letter category (Lo) rather than Mark, so it survives
 * `cleanDiacritics` (which strips only combining marks).
 *
 * @param char
 * @returns Whether `char` is a spacing clone of a combining mark.
 */
export function isSpacingDiacritic(char: string): boolean {
  return !/\p{Mark}/u.test(char) && /\p{Mark}/u.test(char.normalize('NFKD'));
}
