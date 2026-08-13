/** Package dialect defines Crum dialects. */
import * as css from '../css.js';
import * as dial from '../dialect.js';

type SingleCharDialect =
  'S' | 'A' | 'L' | 'B' | 'F' | 'O' | 'M' | 'P' | 'V' | 'W' | 'U';
type DoubleCharDialect = 'Sa' | 'Sf' | 'Fb' | 'NH';
export type DIALECT = SingleCharDialect | DoubleCharDialect;

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

type DICTIONARY = 'KELLIA' | 'Crum' | 'andreas';

/**
 */
export class Dialect extends dial.Dialect<DIALECT, string, DialectKey> {
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
  public constructor(
    code: DIALECT,
    name: string,
    public readonly dictionaries: DICTIONARY[],
    article?: dial.Article,
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
  public override *anchoredName(): Generator<string | HTMLElement> {
    if (this.article) {
      yield* super.anchoredName();
      return;
    }

    // For each word in the name, if it's the name of a dialect, return its
    // anchored name. Otherwise, return the word as plain text.
    for (const token of this.name.match(/(\w+|[^\w]+)/g)!) {
      yield* Object.values(DIALECTS)
        .find((dialect: Dialect): boolean => dialect.name === token)
        ?.anchoredName() ?? [token];
    }
  }
}

// NOTE: The entries of this record should be ordered according to the desired
// order of appearance in the UI.
export const DIALECTS: Record<DIALECT, Dialect> = {
  // S, A, L, B, and F, are the standard set of sigla of five major dialects of
  // Coptic. Along with O, they are used in both Crum and KELLIA.
  // B is the only one used in Andreas.
  // Border dialects are only used in Crum.
  S: new Dialect('S', 'Sahidic', ['Crum', 'KELLIA'], dial.Article.SAHIDIC),
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
  A: new Dialect('A', 'Akhmimic', ['Crum', 'KELLIA'], dial.Article.AKHMIMIC),
  L: new Dialect(
    'L',
    'Lycopolitan',
    ['Crum', 'KELLIA'],
    dial.Article.LYCOPOLITAN
  ),
  B: new Dialect(
    'B',
    'Bohairic',
    ['Crum', 'KELLIA', 'andreas'],
    dial.Article.BOHAIRIC
  ),
  F: new Dialect('F', 'Fayyumic', ['Crum', 'KELLIA'], dial.Article.FAYYUMIC),
  Fb: new Dialect(
    'Fb',
    'Fayyumic with Bohairic tendency',
    ['Crum'],
    undefined,
    'b'
  ),
  O: new Dialect(
    'O',
    'Old Coptic',
    ['Crum', 'KELLIA'],
    dial.Article.OLD_COPTIC
  ),

  // NH is only found in Marcion (part of Crum).
  NH: new Dialect('NH', 'Nag Hammadi', ['Crum'], dial.Article.NAG_HAMMADI, 'N'),

  // The following dialects are only found in KELLIA (TLA).
  // M is a major Coptic dialect that is regrettably unrepresented in Crum. He
  // preceded its discovery.
  M: new Dialect('M', 'Mesokemic', ['KELLIA'], dial.Article.MESOKEMIC),
  P: new Dialect('P', 'Proto-Theban', ['KELLIA'], dial.Article.PROTO_THEBAN),
  V: new Dialect(
    'V',
    'South Fayyumic Greek',
    ['KELLIA'],
    dial.Article.DIALECTS
  ),
  W: new Dialect(
    'W',
    'Crypto-Mesokemic Greek',
    ['KELLIA'],
    dial.Article.DIALECTS
  ),

  // Greek (usage unclear) is only used in KELLIA (TLA).
  U: new Dialect('U', 'Greek (usage unclear)', ['KELLIA']),
} as const;

/* NON_STANDARD includes non-standard dialects that show in the text. They don't
 * have all the functionality that a standard dialect has.
 * Use them carefully, and only if you're confident that you won't use any
 * unsupported functionality.
 */
export const NON_STANDARD: Record<string, Dialect> = {
  Of: new Dialect('Of' as DIALECT, 'Old Coptic with Fayyumic tendency', []),
  Saf: new Dialect(
    'Saf' as DIALECT,
    'Sahidic with Akhmimic and Fayyumic tendency',
    []
  ),
  Sb: new Dialect('Sb' as DIALECT, 'Sahidic with Bohairic tendency', []),
  Bf: new Dialect('Bf' as DIALECT, 'Bohairic with Fayyumic tendency', []),
  // Lycopolitan is a major dialect, albeit with a both a standard and a
  // non-standard siglum.
  A2: new Dialect('A2' as DIALECT, 'Subakhmimic (Lycopolitan)', []),
};

export const ANY_DIALECT_QUERY: string = css.disjunction(
  ...Object.keys(DIALECTS)
);

/**
 *
 */
export class Manager extends dial.Manager<DIALECT> {
  /**
   *
   */
  public constructor() {
    // Our local-storage variable used to store active Crum dialects is called
    // 'd'.
    super('d');
  }
}
