/** Package orth defines orthography logic. */

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

// FRAGMENT_WORD_CHARS are otherwise non-word characters that we treat as word
// characters for fragment purposes.
// Unicode word segmentation (https://unicode.org/reports/tr29/#WB6) lets
// these join adjacent characters into one word: `108,21`, `3.14`, `bkr·t`,
// and `don't` are each a single word, so a text fragment can't start or end
// inside them. Browsers differ in how they apply these rules to letters (only
// Safari joins `don't`; see #286), but treating these characters as word
// characters unconditionally only ever widens a fragment to a boundary that
// every browser recognizes.
//
// These are the MidLetter, MidNum, MidNumLet, and Single_Quote classes from
// UAX #29.
// NOTE: Several look identical to more common characters (e.g. U+037E GREEK
// QUESTION MARK and the semicolon), so we write them as escapes.
const FRAGMENT_WORD_CHARS: Set<string> = new Set<string>(
  // MidLetter:
  ':\u00B7\u0387\u055F\u05F4\u2027\uFE13\uFE55\uFF1A' +
    // MidNum:
    ',;\u037E\u0589\u060C\u060D\u066C\u07F8\u2044' +
    '\uFE10\uFE14\uFE50\uFE54\uFF0C\uFF1B' +
    // MidNumLet:
    '.\u2018\u2019\u2024\uFE52\uFF07\uFF0E' +
    // Single_Quote:
    "'"
);

/**
 * @param char
 * @returns Whether `char` is part of a word, as far as text fragments are
 * concerned.
 */
export function isWordCharForFragments(char: string): boolean {
  return isWordChar(char) || FRAGMENT_WORD_CHARS.has(char);
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
