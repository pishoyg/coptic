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
