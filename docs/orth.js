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
