/** Package dialect defines Crum dialects. */
import * as css from '../css.js';
import * as d from '../dialect.js';
const DEFAULT = ['B'];
/**
 */
export class Dialect extends d.Dialect {
  dictionaries;
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
  constructor(code, name, dictionaries, article, key) {
    super(code, name, article, key);
    this.dictionaries = dictionaries;
  }
  /**
   * @returns - The name of the dialect, potentially containing anchors to
   * articles about the dialect.
   * - If an article is available for this dialect, we link it directly.
   * - Otherwise, this may be a composite dialect name (containing one or more
   *   dialect names within it), in which case we try to retrieve dialect
   *   articles from other dialects and link them.
   */
  *anchoredName() {
    if (this.article) {
      yield* super.anchoredName();
      return;
    }
    const words = this.name.split(' ');
    // If this word is the name of a dialect, return its anchored name.
    // Otherwise, return the word as plain text.
    for (const [index, word] of words.entries()) {
      yield* Object.values(DIALECTS)
        .find((dialect) => dialect.name === word)
        ?.anchoredName() ?? [word];
      if (index < words.length - 1) {
        yield ' ';
      }
    }
  }
}
// NOTE: The entries of this record should be ordered according to the desired
// order of appearance in the UI.
export const DIALECTS = {
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
};
export const ANY_DIALECT_QUERY = css.classQuery(...Object.keys(DIALECTS));
/**
 *
 */
export class Manager extends d.Manager {
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
  setToDefaultIfUnset() {
    if (this.active() !== undefined) {
      // Dialects have already been configured.
      return false;
    }
    this.setActive(DEFAULT);
    return true;
  }
}
