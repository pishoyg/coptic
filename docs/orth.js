/** Package orth defines orthography logic. */
/**
 * @param text
 * @returns
 */
export function normalize(text) {
  return text.normalize('NFD');
}
/**
 */
export class Orthographer {
  diacritics;
  /**
   * @param diacritics
   */
  constructor(diacritics) {
    this.diacritics = diacritics;
  }
  /**
   * @param char
   * @returns
   */
  isDiacritic(char) {
    return !!char && this.diacritics.has(char);
  }
  /**
   * @param text
   * @returns
   */
  cleanDiacritics(text) {
    return Array.from(text)
      .filter((c) => !this.isDiacritic(c))
      .join('');
  }
}
// CHROME_WORD_CHARS is a list of characters that are considered word characters
// in Chrome.
// See https://github.com/pishoyg/coptic/issues/286 for context.
const CHROME_WORD_CHARS = new Set(["'"]);
/**
 *
 * @param char
 * @returns
 */
export function isWordChar(char) {
  return !!char && /\p{L}|\p{N}/u.test(char);
}
/**
 *
 * @param char
 * @returns
 */
export function isWordCharInChrome(char) {
  return isWordChar(char) || (!!char && CHROME_WORD_CHARS.has(char));
}
