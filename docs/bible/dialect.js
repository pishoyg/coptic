/** Package dialect defines Bible dialects. */
import * as dial from '../dialect.js';
import * as cls from './cls.js';
/**
 *
 */
export class Dialect extends dial.Dialect {
  /**
   *
   * @param name
   * @param article
   * @param code
   */
  constructor(name, article, code) {
    super(name, name, article, code);
  }
}
const ALL_DIALECTS = [
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
// Any verse should contain all the languages in this page.
export const DIALECTS = Array.from(
  document.querySelector(`.${cls.VERSE}`).querySelectorAll(`.${cls.LANGUAGE}`)
).map((td) =>
  ALL_DIALECTS.find((dialect) => td.classList.contains(dialect.name))
);
/**
 *
 */
export class Manager extends dial.Manager {
  /**
   *
   */
  constructor() {
    super('bd');
  }
}
