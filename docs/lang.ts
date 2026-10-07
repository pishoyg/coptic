/** Package lang defines linguistic entities for the languages we deal with. */

import * as log from './logger.js';
import * as orth from './orth.js';

/** Language enumerates the languages we know how to deal with. */
export enum Language {
  COPTIC = 'coptic',
  GREEK = 'greek',
  ARABIC = 'arabic',
  ENGLISH = 'english',
}

/**
 * Word represents a word that is lexicographically comparable to another word
 * of the same language.
 */
export interface Word {
  /**
   * Lexicographically compare two words.
   * @param other - The word we're comparing to.
   * @returns The truth value of `this <= other`.
   */
  leq(other: Word): boolean;
  /**
   * @returns The string representation of the word.
   */
  get word(): string;
}

/**
 * WordType is the type of a `Word` constructor, which takes as input the
 * string representation of the word.
 */
export type WordType = new (word: string) => Word;

// Coptic letters live in two Unicode blocks, and the alphabetical order doesn't
// follow the code-point order:
//   https://en.wikipedia.org/wiki/Coptic_(Unicode_block)
//   https://en.wikipedia.org/wiki/Greek_and_Coptic
// The ranges below are listed in alphabetical order. The Greek and Coptic
// run is split around the Akhmimic Khei (added later, in the Coptic block),
// which sorts between ϥ and ϧ.
const COPTIC_LETTERS: [string, string][] = [
  // Each capital letter immediately precedes its small counterpart, so a
  // range runs from a capital letter (pair[0]) to a small one (pair[1]).
  ['Ⲁ', 'ⲱ'],
  ['Ϣ', 'ϥ'],
  ['Ⳉ', 'ⳉ'],
  ['Ϧ', 'ϯ'],
];

/**
 * COPTIC_MAPPING maps a Coptic letter to an ASCII-based character, such that
 * the mappings sort in the alphabetical order of the letters.
 */
const COPTIC_MAPPING: Record<string, string> = COPTIC_LETTERS.map(
  ([start, end]: [string, string]): [number, number] => [
    start.charCodeAt(0),
    end.charCodeAt(0),
  ]
)
  .flatMap(([start, end]: [number, number]): string[] =>
    Array.from({ length: end + 1 - start }, (_: unknown, i: number): string =>
      String.fromCharCode(start + i)
    )
  )
  .reduce<Record<string, string>>(
    (
      acc: Record<string, string>,
      letter: string,
      index: number
    ): Record<string, string> => {
      acc[letter] = String.fromCharCode('a'.charCodeAt(0) + index);
      return acc;
    },
    {}
  );

const LETTER = /^\p{L}$/u;

/* SCRIPTS pairs each language (other than Coptic) with its script. */
const SCRIPTS: [Language, RegExp][] = [
  [Language.GREEK, /\p{Script=Greek}/u],
  [Language.ARABIC, /\p{Script=Arabic}/u],
  [Language.ENGLISH, /\p{Script=Latin}/u],
];

/**
 * Detect the language of a character, judging by its base letter (so `ά`
 * is Greek, and a lone diacritic has no language).
 *
 * @param char - A single character.
 * @returns The language of the character, or `undefined` if the character is
 * not a letter of a language that we know.
 */
export function detect(char: string): Language | undefined {
  const base: string = orth.cleanDiacritics(char);
  if (base in COPTIC_MAPPING) {
    return Language.COPTIC;
  }
  if (!LETTER.test(base)) {
    return undefined;
  }
  return SCRIPTS.find(([, script]: [Language, RegExp]): boolean =>
    script.test(base)
  )?.[0];
}

/**
 * @param text - Text to normalize.
 * @returns The letters of the text, lowercased and without diacritics.
 */
function foldLetters(text: string): string {
  return orth.cleanDiacritics(text.toLowerCase()).replaceAll(/\P{L}/gu, '');
}

/**
 * Keyed is a word that sorts by a key, derived from the word by
 * language-specific normalization. Two words compare by their keys, using
 * the plain `<=` operator.
 */
abstract class Keyed implements Word {
  private readonly key: string;

  /**
   * @param word - The string representation of the word.
   * @param key - Derives the sort key from the word.
   */
  protected constructor(
    public readonly word: string,
    key: (word: string) => string
  ) {
    log.ensure(!!word, 'constructing a word with the empty string!');
    this.key = key(word);
  }

  /**
   * @param other - The word we're comparing to.
   * @returns The truth value of `this <= other`.
   */
  public leq(other: Keyed): boolean {
    return this.key <= other.key;
  }
}

/**
 * Coptic represents a Coptic word.
 * The two unicode blocks for the language are swapped (the lexicographically
 * smaller range have higher Unicode values!) We hack around it by mapping the
 * letters to characters that sort correctly.
 */
export class Coptic extends Keyed {
  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(word.toLowerCase(), (w: string): string =>
      Array.from(w)
        .map((c: string): string | undefined => COPTIC_MAPPING[c])
        .join('')
    );
  }
}

/**
 * Greek represents a Greek word. Diacritics are ignored, and the final sigma
 * is identical to the medial one.
 */
export class Greek extends Keyed {
  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(word, (w: string): string => foldLetters(w).replaceAll('ς', 'σ'));
  }
}

/**
 * Arabic represents an Arabic word. Diacritics are ignored, but a hamza
 * seated on a wāw or a yāʾ sorts as a bare hamza, rather than as its seat.
 */
export class Arabic extends Keyed {
  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(word, (w: string): string =>
      // The seated hamzas must be replaced before the diacritics are
      // cleaned, otherwise they decompose into their seats.
      foldLetters(w.normalize('NFC').replaceAll(/[ؤئ]/gu, 'ء'))
        .replaceAll('ـ', '') // Tatweel is a letter, according to Unicode!
        // TODO: (#640) Normalize the following in the index if possible. The
        // generic substitution may be inaccurate.
        .replaceAll('ى', 'ي')
        .replaceAll('ة', 'ه')
    );
  }
}

/**
 * English represents an English word. Case and diacritics are ignored.
 */
export class English extends Keyed {
  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(word, foldLetters);
  }
}
