/** Package orth defines orthography logic. */

/**
 * @param text
 * @returns
 */
export function normalize(text: string): string {
  return text.normalize('NFD');
}

/**
 */
export class Orthographer {
  /**
   * @param diacritics
   */
  constructor(private readonly diacritics: Set<string>) {}

  /**
   * @param char
   * @returns
   */
  isDiacritic(char?: string): boolean {
    return !!char && this.diacritics.has(char);
  }

  /**
   * @param text
   * @returns
   */
  cleanDiacritics(text: string): string {
    return Array.from(text)
      .filter((c) => !this.isDiacritic(c))
      .join('');
  }
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
 */
export function isWordCharInChrome(char?: string): boolean {
  return isWordChar(char) || (!!char && CHROME_WORD_CHARS.has(char));
}
