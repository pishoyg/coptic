/** Package dialect defines Crum dialects. */
import * as css from '../css.js';
import * as d from '../dialect.js';

type SingleCharDialect =
  | 'S'
  | 'A'
  | 'L'
  | 'B'
  | 'F'
  | 'O'
  | 'M'
  | 'P'
  | 'V'
  | 'W'
  | 'U';
type DoubleCharDialect = 'Sa' | 'Sf' | 'Fb' | 'NH';
export type DIALECT = SingleCharDialect | DoubleCharDialect;

const DEFAULT: DIALECT[] = ['B'];

/**
 * For dialects that have a single-character code, we use the code as a keyboard
 * shortcut key. For the double-character dialect codes, we use an abbreviation,
 * which we define below.
 */
type DoubleCharDialectAbbrev = 'N' | 'a' | 'f' | 'b';

/**
 * DIALECT_KEY is a single-character dialect key. They are less recognizable and
 * less suited for use in UI, but useful in situations where you must have a
 * single-character dialect encoding.
 */
export type DialectKey = SingleCharDialect | DoubleCharDialectAbbrev;

// TODO: (#452) Add an entry for Andreas.
type DICTIONARY = 'KELLIA' | 'Crum' | 'copticsite';

/**
 */
export class Dialect extends d.Dialect<DIALECT, string, DialectKey> {
  /**
   * @param code - Recognizable, UI-friendly, dialect code.
   * @param name - Full dialect name.
   * @param dictionaries - List of dictionaries where this dialect is used.
   * @param article - URL to an article about that dialect.
   * @param key - Single-character dialect key.
   * NOTE: You should provide a dialect key if the dialect has a
   * double-character code. If it's single-character, the code can be used as a
   * key.
   */
  constructor(
    code: DIALECT,
    name: string,
    readonly dictionaries: DICTIONARY[],
    article?: d.Article,
    key?: DoubleCharDialectAbbrev
  ) {
    super(code, name, article, key);
  }

  /**
   * @returns - The name of the dialect, potentially containing anchors to
   * articles about the dialect.
   * - If an article is available for this dialect, we link it directly.
   * - Otherwise, this may be a composite dialect name (containing one or more
   *   dialect names within it), in which case we try to retrieve dialect
   *   articles from other dialects and link them.
   */
  override *anchoredName(): Generator<string | HTMLElement> {
    if (this.article) {
      yield* super.anchoredName();
      return;
    }

    const words: string[] = this.name.split(' ');
    // If this word is the name of a dialect, return its anchored name.
    // Otherwise, return the word as plain text.
    for (const [index, word] of words.entries()) {
      yield* Object.values(DIALECTS)
        .find((dialect: Dialect): boolean => dialect.name === word)
        ?.anchoredName() ?? [word];
      if (index < words.length - 1) {
        yield ' ';
      }
    }
  }
}

// NOTE: The entries of this record should be ordered according to the desired
// order of appearance in the UI.
export const DIALECTS: Record<DIALECT, Dialect> = {
  // S, A, L, B, and F, are the standard set of sigla of five major dialects of
  // Coptic. Along with O, they are used in both Crum and KELLIA.
  // B is the only one used in Andreas and copticsite.
  // Border dialects are only used in Crum.
  S: new Dialect('S', 'Sahidic', ['Crum', 'KELLIA'], d.Article.SAHIDIC),
  Sa: new Dialect(
    'Sa',
    'Sahidic with Akhmimic tendency',
    ['Crum'],
    undefined,
    'a'
  ),
  Sf: new Dialect(
    'Sf',
    'Sahidic with Fayyumic tendency',
    ['Crum'],
    undefined,
    'f'
  ),
  A: new Dialect('A', 'Akhmimic', ['Crum', 'KELLIA'], d.Article.AKHMIMIC),
  L: new Dialect('L', 'Lycopolitan', ['Crum', 'KELLIA'], d.Article.LYCOPOLITAN),
  B: new Dialect(
    'B',
    'Bohairic',
    ['Crum', 'KELLIA', 'copticsite'],
    d.Article.BOHAIRIC
  ),
  F: new Dialect('F', 'Fayyumic', ['Crum', 'KELLIA'], d.Article.FAYYUMIC),
  Fb: new Dialect(
    'Fb',
    'Fayyumic with Bohairic tendency',
    ['Crum'],
    undefined,
    'b'
  ),
  O: new Dialect('O', 'Old Coptic', ['Crum', 'KELLIA'], d.Article.OLD_COPTIC),

  // NH is only found in Marcion (part of Crum).
  NH: new Dialect('NH', 'Nag Hammadi', ['Crum'], d.Article.NAG_HAMMADI, 'N'),

  // The following dialects are only found in KELLIA (TLA).
  // M is a major Coptic dialect that is regrettably unrepresented in Crum. He
  // preceded its discovery.
  M: new Dialect('M', 'Mesokemic', ['KELLIA'], d.Article.MESOKEMIC),
  P: new Dialect('P', 'Proto-Theban', ['KELLIA'], d.Article.PROTO_THEBAN),
  V: new Dialect('V', 'South Fayyumic Greek', ['KELLIA'], d.Article.DIALECTS),
  W: new Dialect('W', 'Crypto-Mesokemic Greek', ['KELLIA'], d.Article.DIALECTS),

  // Greek (usage unclear) is only used in KELLIA (TLA).
  U: new Dialect('U', 'Greek (usage unclear)', ['KELLIA']),
} as const;

export const ANY_DIALECT_QUERY: string = css.classQuery(
  ...Object.keys(DIALECTS)
);

/**
 *
 */
export class Manager extends d.Manager<DIALECT> {
  /**
   *
   */
  constructor() {
    // Our local-storage variable used to store active Crum dialects is called
    // 'd'.
    super('d');
  }
  /**
   * Set the list of active dialects to a given default, if dialects are not
   * already configured.
   *
   * @returns Whether defaults have been set.
   */
  setToDefaultIfUnset(): boolean {
    if (this.active() !== undefined) {
      // Dialects have already been configured.
      return false;
    }
    this.setActive(DEFAULT);
    return true;
  }
}
