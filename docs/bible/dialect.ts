/** Package dialect defines Bible dialects. */
import * as dial from '../dialect.js';
import * as css from '../css.js';

export type DIALECT =
  | 'Bohairic'
  | 'Sahidic'
  | 'Fayyumic'
  | 'Akhmimic'
  | 'Lycopolitan'
  | 'Mesokemic'
  | 'DialectP'
  | 'OldBohairic'
  | 'English'
  | 'Greek';

export type Code = 'B' | 'S' | 'F' | 'A' | 'L' | 'M' | 'P' | 'O' | 'E' | 'G';

/**
 *
 */
export class Dialect extends dial.Dialect<Code, DIALECT, Code> {
  /**
   *
   * @param code
   * @param name
   * @param article
   */
  public constructor(code: Code, name: DIALECT, article: dial.Article) {
    super(code, name, article, code);
  }
}

const ALL_DIALECTS: Dialect[] = [
  new Dialect('B', 'Bohairic', dial.Article.BOHAIRIC),
  new Dialect('S', 'Sahidic', dial.Article.SAHIDIC),
  new Dialect('F', 'Fayyumic', dial.Article.FAYYUMIC),
  new Dialect('A', 'Akhmimic', dial.Article.AKHMIMIC),
  new Dialect('L', 'Lycopolitan', dial.Article.LYCOPOLITAN),
  new Dialect('M', 'Mesokemic', dial.Article.MESOKEMIC),
  new Dialect('P', 'DialectP', dial.Article.PROTO_THEBAN),
  new Dialect('O', 'OldBohairic', dial.Article.OLD_COPTIC),
  new Dialect('E', 'English', dial.Article.ENGLISH),
  new Dialect('G', 'Greek', dial.Article.GREEK),
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
export class Manager extends dial.Manager<Code> {
  /**
   *
   */
  public constructor() {
    super('bd');
  }
}
