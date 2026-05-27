/** Package dialect defines Bible dialects. */
import * as dial from '../dialect.js';
import * as css from '../css.js';

export type DIALECT =
  | 'Bohairic'
  | 'Sahidic'
  | 'English'
  | 'Greek'
  | 'Fayyumic'
  | 'Akhmimic'
  | 'OldBohairic'
  | 'Mesokemic'
  | 'DialectP'
  | 'Lycopolitan';

type DialectKey = 'B' | 'S' | 'E' | 'G' | 'F' | 'A' | 'O' | 'M' | 'P' | 'L';

/**
 *
 */
export class Dialect extends dial.Dialect<DIALECT, DIALECT, DialectKey> {
  /**
   *
   * @param name
   * @param article
   * @param key
   */
  public constructor(name: DIALECT, article: dial.Article, key: DialectKey) {
    super(name, name, article, key);
  }
}

const ALL_DIALECTS: Dialect[] = [
  new Dialect('Bohairic', dial.Article.BOHAIRIC, 'B'),
  new Dialect('Sahidic', dial.Article.SAHIDIC, 'S'),
  new Dialect('English', dial.Article.ENGLISH, 'E'),
  new Dialect('Greek', dial.Article.GREEK, 'G'),
  new Dialect('Fayyumic', dial.Article.FAYYUMIC, 'F'),
  new Dialect('Akhmimic', dial.Article.AKHMIMIC, 'A'),
  new Dialect('OldBohairic', dial.Article.OLD_COPTIC, 'O'),
  new Dialect('Mesokemic', dial.Article.MESOKEMIC, 'M'),
  new Dialect('DialectP', dial.Article.PROTO_THEBAN, 'P'),
  new Dialect('Lycopolitan', dial.Article.LYCOPOLITAN, 'L'),
];

// DIALECTS bears the dialects present in this page.
// Each page has a subset of the dialects. For highlighting purposes, only this
// subset is of interest.
export const DIALECTS: Dialect[] = ALL_DIALECTS.filter(
  (d: Dialect): boolean => !!document.querySelector(css.c(d.code))
);

/**
 *
 */
export class Manager extends dial.Manager<DIALECT> {
  /**
   *
   */
  public constructor() {
    super('bd');
  }
}
