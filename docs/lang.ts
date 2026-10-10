/** Package lang defines linguistic entities for the languages we deal with. */

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
 *
 * The constructor expects a nonempty word spelled only in `CHARS`, in either
 * normalization form (NFC or NFD), since index words arrive as typed in the
 * index, and queries arrive decomposed by `restrict`. It need not handle any
 * other character (including the capital form of a letter that `CHARS` only
 * admits in small form), which may corrupt the sort.
 */
export interface WordType {
  new (word: string): Word;
  /**
   * CHARS matches a single character that a word may contain, once decomposed
   * (NFD). Queries are stripped of all other characters (see `restrict`), and
   * index words may contain no others (verified in development only, see
   * `scan.Index`). A type may admit a character only to ignore it when
   * sorting, such as the parentheses around a gloss in Dawoud.
   */
  // Word types implement CHARS as a static readonly member, which the naming
  // convention requires to be UPPER_CASE, unlike interface members.
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  readonly CHARS: RegExp;
}

/**
 * @param text - Text to restrict.
 * @param chars - Matches a single character.
 * @returns The characters of the text, decomposed (NFD) into base letters and
 * diacritics, that match `chars`. The case is preserved, so a capital letter
 * is dropped unless `chars` admits it.
 */
export function restrict(text: string, chars: RegExp): string {
  return Array.from(text.normalize('NFD'))
    .filter((c: string): boolean => chars.test(c))
    .join('');
}

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
 * Keyed is a word that sorts by a key, derived from the word by
 * language-specific normalization. Two words compare by their keys, using
 * the plain `<=` operator. A run of spaces in the key is a single word
 * boundary, and spaces at either end are ignored.
 */
export abstract class Keyed implements Word {
  private readonly key: string;

  /**
   * @param word - The string representation of the word.
   * @param key - Derives the sort key from the word, which is spelled only in
   * the characters of its type, in either normalization form (see
   * `WordType`). The key may drop or fold some of those characters (e.g.
   * turn punctuation into spaces), and need not handle any others.
   */
  protected constructor(
    public readonly word: string,
    key: (word: string) => string
  ) {
    this.key = key(word).replaceAll(/ +/gu, ' ').trim();
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
  /* CHARS matches a small Coptic letter. */
  public static readonly CHARS = /[ⲁⲃⲅⲇⲉⲋⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣϥⳉϧϩϫϭϯ]/u;

  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(word, (w: string): string =>
      Array.from(w, (c: string): string | undefined => COPTIC_MAPPING[c]).join(
        ''
      )
    );
  }
}
