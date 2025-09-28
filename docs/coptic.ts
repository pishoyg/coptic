/** Package coptic defines Coptic linguistic entities. */

import * as log from './logger.js';

// Coptic exists in the Unicode in two blocks:
//   https://en.wikipedia.org/wiki/Coptic_(Unicode_block)
//   https://en.wikipedia.org/wiki/Greek_and_Coptic
// Thus, to list the letters, we need to iterate over the two ranges separately.
// There is also one letter, added later, that has its own range — the Akhmimic
// Khei.
const COPTIC_LETTERS: [string, string][] = [
  // Capital letters have a higher unicode value, and they immediately
  // precede their small counterpart.
  // Thus, to cover the full range of the alphabet, pair[0] should be a
  // capital letter, and pair[1] should be a small letter.
  ['Ⲁ', 'ⲱ'],
  ['Ⳉ', 'ⳉ'],
  ['Ϣ', 'ϯ'],
];

/**
 * Word represents a Coptic word that is lexicographically comparable to
 * another.
 * The two unicode blocks for the language are swapped (the lexicographically
 * smaller range have higher Unicode values!) We hack around it using this
 * wrapper, to allow you to conveniently compare words lexicographically.
 */
export class Word {
  private static readonly MAPPING: Record<string, string> = Word.buildMapping();
  private readonly mapped: string;
  public readonly word: string;
  /**
   *
   * @param word
   */
  public constructor(word: string) {
    this.word = word.toLowerCase();
    log.ensure(!!this.word, 'constructing a word with the empty string!');
    log.ensure(
      Array.from(word).every((c) => c in Word.MAPPING),
      word,
      'contains character that are not in the mapping!'
    );
    this.mapped = Word.map(this.word);
  }

  /**
   *
   * @param word
   * @returns True if all characters are Coptic, false otherwise. If word is the
   * empty string, return true.
   */
  public static isCoptic(word: string): boolean {
    return Array.from(word).every((c) => c in Word.MAPPING);
  }

  /**
   *
   * @param other
   * @returns
   */
  public leq(other: Word): boolean {
    return this.mapped <= other.mapped;
  }

  /**
   *
   * @param word
   * @returns
   */
  private static map(word: string): string {
    return Array.from(word)
      .map((a) => Word.MAPPING[a] ?? a)
      .join();
  }

  /**
   *
   * @returns
   */
  private static buildMapping(): Record<string, string> {
    return COPTIC_LETTERS.map((range) => Word.between(range[0], range[1]))
      .flat()
      .reduce<Record<string, string>>((acc, letter, index) => {
        acc[letter] = String.fromCharCode('a'.charCodeAt(0) + index);
        return acc;
      }, {});
  }

  /**
   *
   * @param a
   * @param b
   * @returns
   */
  private static between(a: string, b: string): string[] {
    const arr: string[] = [];
    for (
      let char = a;
      char <= b;
      char = String.fromCharCode(char.charCodeAt(0) + 1)
    ) {
      arr.push(char);
    }
    return arr;
  }
}

/**
 * @param word
 * @returns
 */
export function isCoptic(word: string): boolean {
  return Word.isCoptic(word);
}
