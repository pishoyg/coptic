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

const DIACRITIC_RE = /\p{M}/gu;

/**
 * Check if the given character is a diacritic.
 * We have the word "one" in the function name in order to make it explicit that
 * it's the caller's responsibility to handle strings consisting of multiple
 * characters.
 * @param char - String to test.
 * @returns True if the string contains exactly one character, and that
 * character is a diacritic. False otherwise.
 */
export function isOneDiacritic(char?: string): boolean {
  return !!char && char.length === 1 && DIACRITIC_RE.test(char);
}

/**
 * @param text - Text to be cleaned.
 * @returns - The text, with diacritics removed.
 */
export function cleanDiacritics(text: string): string {
  return normalize(text).replaceAll(DIACRITIC_RE, '');
}

// CHROME_WORD_CHARS is a list of characters that are considered word characters
// in Chrome.
// See https://github.com/pishoyg/coptic/issues/286 for context.
const CHROME_WORD_CHARS: Set<string> = new Set<string>(["'"]);

/**
 *
 * @param char
 * @returns
 */
export function isWordChar(char?: string): boolean {
  return !!char && /\p{L}|\p{N}/u.test(char);
}

/**
 *
 * @param char
 * @returns
 * See https://github.com/pishoyg/coptic/issues/286 for context.
 */
export function isWordCharInChrome(char?: string): boolean {
  return isWordChar(char) || (!!char && CHROME_WORD_CHARS.has(char));
}
