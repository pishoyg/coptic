/** Package dialect defines Bible dialects. */
import * as d from '../dialect.js';
import * as cls from './cls.js';
/**
 *
 */
export class Dialect extends d.Dialect {
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
  new Dialect('Bohairic', d.Article.BOHAIRIC, 'B'),
  new Dialect('Sahidic', d.Article.SAHIDIC, 'S'),
  new Dialect('English', d.Article.ENGLISH, 'E'),
  new Dialect('Greek', d.Article.GREEK, 'G'),
  new Dialect('Fayyumic', d.Article.FAYYUMIC, 'F'),
  new Dialect('Akhmimic', d.Article.AKHMIMIC, 'A'),
  new Dialect('OldBohairic', d.Article.OLD_COPTIC, 'O'),
  new Dialect('Mesokemic', d.Article.MESOKEMIC, 'M'),
  new Dialect('DialectP', d.Article.PROTO_THEBAN, 'P'),
  new Dialect('Lycopolitan', d.Article.LYCOPOLITAN, 'L'),
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
export class Manager extends d.Manager {
  /**
   *
   */
  constructor() {
    super('bd');
  }
}
