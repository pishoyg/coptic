/** Package coptic defines Coptic linguistic entities. */

import * as logger from './logger.js';

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

export const DIACRITICS: Set<string> = new Set<string>([
  '\u0300', // COMBINING GRAVE ACCENT — Rare; used in editorial contexts or to mark intonation. ⲁ̀
  '\u0301', // COMBINING ACUTE ACCENT — Rare; sometimes used in scholarly editions for emphasis or stress. ⲁ́
  '\u0302', // COMBINING CIRCUMFLEX ACCENT — Used in Sahidic Coptic over vowels for certain pronunciations or editorial marks. ⲁ̂
  '\u0304', // COMBINING MACRON — General horizontal bar above; may appear in modern editorial texts, for single letters or short lines. ⲁ̄
  '\u0305', // COMBINING OVERLINE — Essential in Coptic; used to mark nomina sacra, abbreviations, and numerals. Often preferred for this over conjoining macrons. ⲁ̅
  '\u0306', // COMBINING BREVE — Occasionally used in phonetic or editorial transcriptions. ⲁ̆
  '\u0307', // COMBINING DOT ABOVE — Rare; editorial/phonetic use. ⲁ̇
  '\u0308', // COMBINING DIAERESIS — Occasionally used to disambiguate vowel combinations. ⲁ̈
  '\u0311', // COMBINING INVERTED BREVE — Can appear as a curved circumflex or alternative joining mark. ⲁ̑
  '\u0323', // COMBINING DOT BELOW — Rare; editorial/phonetic use. ⲁ̣
  '\u032E', // COMBINING BREVE BELOW — Rare; editorial/phonetic use. ⲁ̮
  '\u0331', // COMBINING MACRON BELOW — Rarely used; seen in phonetic or editorial annotations. ⲁ̱
  '\u0342', // COMBINING GREEK PERISPOMENI — Found in Greek-influenced Coptic manuscripts; indicates pitch/accent. ⲁ͂
  '\u0345', // COMBINING GREEK YPOGEGRAMMENI — Rare; may appear in Greek-derived texts in mixed manuscripts. ⲁͅ
  '\u035E', // COMBINING CHARACTER-JOINING OVERSTROKE — Used for a character-joining overstroke. ⲁ͡
  '\u0361', // COMBINING DOUBLE INVERTED BREVE — Can be used for joining two letters with a wide inverted breve. ⲁ͡
  '\uFE24', // COMBINING MACRON LEFT HALF — Editorial use; not standard in Coptic but may appear in digital editions for joining strokes. ⲁ︤
  '\uFE25', // COMBINING MACRON RIGHT HALF — Editorial use; not standard in Coptic but may appear in digital editions for joining strokes. ⲁ︥
  '\uFE26', // COMBINING CONJOINING MACRON — Used in specialized digital transcription to span multiple letters. ⲁ︦
  '\u2CEF', // COPTIC COMBINING NI ABOVE — Essential Coptic-specific combining mark for abbreviations. ⲁ⳯
]);

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
  readonly word: string;
  /**
   *
   * @param word
   */
  constructor(word: string) {
    this.word = word.toLowerCase();
    logger.ensure(!!this.word, 'constructing a word with the empty string!');
    logger.ensure(
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
  static isCoptic(word: string): boolean {
    return Array.from(word).every((c) => c in Word.MAPPING);
  }

  /**
   *
   * @param other
   * @returns
   */
  leq(other: Word): boolean {
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
