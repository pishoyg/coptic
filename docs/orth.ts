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
  // Index by UTF-16 code unit, not code point: the match offsets that consume
  // this mapping (see xooxle's `Match.translate` and `highlight`) all come from
  // `String.matchAll`, `String.length`, and `String.substring`, which are
  // UTF-16 based. Iterating by code point (`Array.from`) would make the mapping
  // fall behind by one slot per astral character (e.g. U+1018E), so a match
  // past such a character would read an out-of-range, `undefined` translation
  // and collapse to zero width.
  //
  // Testing a single code unit against `DIACRITIC_RE` (rather than
  // NFD-decomposing and stripping, as `cleanDiacritics` does) is only correct
  // when no diacritic is an astral combining mark: an astral mark's two
  // surrogate halves would each fail the `\p{Mark}` test and be kept, desyncing
  // this mapping from `cleanDiacritics`. That precondition is not universal —
  // astral combining marks exist (e.g. U+1D165) — so the Xooxle index builder
  // rejects them (see `_diacritic_free_text` in `xooxle/xooxle.py`).
  for (let i = 0; i < text.length; i++) {
    if (!text.charAt(i).match(DIACRITIC_RE)) {
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
