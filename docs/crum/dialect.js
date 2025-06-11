/** Package dialect defines Crum dialects. */
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as help from '../help.js';
// D is the name of the local-storage variable storing the list of active
// dialects. This is the source of truth for dialect highlighting. Updating
// dialect highlighting should happen by updating this local storage variable.
const D = 'd';
const SEPARATOR = ',';
const DEFAULT = ['B'];
var CLS;
(function (CLS) {
  CLS['DIALECT_CODE'] = 'dialect-code';
  CLS['DIALECT_NAME'] = 'dialect-name';
  CLS['DIALECT_DICTIONARIES'] = 'dialect-dictionaries';
})(CLS || (CLS = {}));
/**
 */
export class Dialect {
  code;
  name;
  article;
  dictionaries;
  key;
  /**
   * @param code - Recognizable, UI-friendly, dialect code.
   * @param name - Full dialect name.
   * @param article - URL to an article about that dialect (or "" for none).
   * @param dictionaries - List of dictionaries where this dialect is used.
   * @param key - Single-character dialect key.
   * NOTE: You should provide a dialect key if the dialect has a
   * double-character code. If it's single-character, the code can be used as a
   * key.
   */
  constructor(code, name, article = '', dictionaries, key) {
    this.code = code;
    this.name = name;
    this.article = article;
    this.dictionaries = dictionaries;
    this.key = key ?? code;
  }
  /**
   * Build a keyboard shortcut that toggles this dialect.
   *
   * @param highlighter
   * @returns
   */
  shortcut(highlighter) {
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    // Create the first <td> (dialect code)
    const tdCode = document.createElement('td');
    tdCode.classList.add(CLS.DIALECT_CODE);
    tdCode.textContent = `(${this.code})`;
    tr.appendChild(tdCode);
    // Create the second <td> (dialect name)
    const tdName = document.createElement('td');
    tdName.classList.add(CLS.DIALECT_NAME);
    tdName.replaceChildren(...this.anchoredName());
    tr.appendChild(tdName);
    // Conditionally add the third <td> (dictionaries)
    if (iam.amI('lexicon')) {
      const tdDictionaries = document.createElement('td');
      tdDictionaries.classList.add(CLS.DIALECT_DICTIONARIES);
      tdDictionaries.textContent = `(${this.dictionaries.join(', ')})`;
      tr.appendChild(tdDictionaries);
    }
    // Append the <tr> to the <table>
    table.appendChild(tr);
    // Crum dialects are available on several Crum page identities.
    // Non-Crum dialects are only used in Lexicon.
    const availability = this.dictionaries.includes('Crum')
      ? ['lexicon', 'note', 'index']
      : ['lexicon'];
    return new help.Shortcut(
      table,
      availability,
      highlighter.toggleDialect.bind(highlighter, this.code)
    );
  }
  /**
   * @returns - The name of the dialect, potentially containing anchors to
   * articles about the dialect.
   * - If an article is available for this dialect, we link it directly.
   * - Otherwise, this may be a composite dialect name (containing one or more
   *   dialect names within it), in which case we try to retrieve dialect
   *   articles from other dialects and link them.
   */
  anchoredName() {
    if (this.article) {
      const a = document.createElement('a');
      a.href = this.article;
      a.target = '_blank';
      a.textContent = this.name;
      return [a];
    }
    const words = this.name.split(' ');
    return words
      .map(
        (word) =>
          // If this word is the name of a dialect, return its anchored name.
          // Otherwise, return the word as plain text.
          Object.values(DIALECTS)
            .find((d) => d.name === word)
            ?.anchoredName() ?? [word]
      )
      .flatMap(
        // Re-insert spaces between words.
        (item, index) => (index < words.length - 1 ? [...item, ' '] : item)
      );
  }
  /**
   * @returns An HTML element, whose text content has the following format:
   *   (code) Dialect Name
   * The name bears anchors, if present.
   */
  title() {
    const title = document.createElement('span');
    title.replaceChildren('(', this.code, ')', ' ', ...this.anchoredName());
    return title;
  }
}
export const DIALECTS = {
  // The following is the standard set of sigla of five major dialects of
  // Coptic, along with Old Coptic. They are used in both the Crum and KELLIA
  // dictionaries. Additionally, B (Bohairic) is used in copticsite.
  S: new Dialect(
    'S',
    'Sahidic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2',
    ['Crum', 'KELLIA']
  ),
  A: new Dialect(
    'A',
    'Akhmimic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1',
    ['Crum', 'KELLIA']
  ),
  L: new Dialect(
    'L',
    'Lycopolitan',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1',
    ['Crum', 'KELLIA']
  ),
  B: new Dialect(
    'B',
    'Bohairic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2',
    ['Crum', 'KELLIA', 'copticsite']
  ),
  F: new Dialect(
    'F',
    'Fayyumic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2',
    ['Crum', 'KELLIA']
  ),
  O: new Dialect(
    'O',
    'Old Coptic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2',
    ['Crum', 'KELLIA']
  ),
  // The following dialects are only found in KELLIA (TLA).
  M: new Dialect(
    'M',
    'Mesokemic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2',
    ['KELLIA']
  ),
  P: new Dialect(
    'P',
    'Proto-Theban',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1',
    ['KELLIA']
  ),
  V: new Dialect(
    'V',
    'South Fayyumic Greek',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
    ['KELLIA']
  ),
  W: new Dialect(
    'W',
    'Crypto-Mesokemic Greek',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
    ['KELLIA']
  ),
  U: new Dialect('U', 'Greek (usage unclear)', '', ['KELLIA']),
  // The following three dialects (or sub-dialects) are only found in Crum.
  Sa: new Dialect('Sa', 'Sahidic with Akhmimic tendency', '', ['Crum'], 'a'),
  Sf: new Dialect('Sf', 'Sahidic with Fayyumic tendency', '', ['Crum'], 'f'),
  Fb: new Dialect('Fb', 'Fayyumic with Bohairic tendency', '', ['Crum'], 'b'),
  // The following dialect is only found in Marcion (part of Crum).
  // TODO: (#0) It's not exactly accurate to describe this as part of Crum.
  // Consider updating the description, somehow.
  NH: new Dialect(
    'NH',
    'Nag Hammadi',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2',
    ['Crum'],
    'N'
  ),
};
export const ANY_DIALECT_QUERY = css.classQuery(...Object.keys(DIALECTS));
/**
 * @returns The list of active dialects.
 * If dialect highlighting has never been configured, return undefined.
 * If previously selected dialects have been deselected, return the empty array.
 *
 * NOTE: The local storage variable distinguishes between the two following
 * values:
 * - null: Dialect highlighting has never been configured. This results in
 *   a response of `undefined`.
 * - the empty string: Dialect highlighting was previously configured, and now
 *   all dialects are disabled. This results in a response of an empty array.
 * We only use the default value in the former case.
 */
export function active() {
  const d = localStorage.getItem(D);
  if (d === null) {
    // Dialect highlighting has never been configured.
    return undefined;
  }
  if (d === '') {
    // Dialect highlighting was previously configured, and now all dialects are
    // disabled.
    // NOTE: We return the empty array directly, instead of attempting to split
    // the empty string, because ''.split(SEPARATOR) = [''].
    return [];
  }
  return d.split(SEPARATOR);
}
/**
 * @param dialects - Set current list of active dialects.
 */
export function setActive(dialects) {
  localStorage.setItem(D, dialects.join(SEPARATOR));
}
/**
 * Set the list of active dialects to [].
 * NOTE: We intentionally use the empty list, instead of deleting the local
 * storage variable, in order to distinguish between the cases when:
 * 1. Dialect highlighting was previously used and then reset.
 * 2. Dialect highlighting was never used.
 */
export function reset() {
  setActive([]);
}
/**
 * @param dialect - Dialect to toggle.
 */
export function toggle(dialect) {
  const act = new Set(active());
  if (act.has(dialect)) {
    act.delete(dialect);
  } else {
    act.add(dialect);
  }
  setActive(Array.from(act));
}
/**
 * Set the list of active dialects to a given default, if dialects are not
 * already configured.
 *
 * @returns Whether defaults have been set.
 */
export function setToDefaultIfUnset() {
  if (localStorage.getItem(D) !== null) {
    // Dialects have already been configured.
    return false;
  }
  setActive(DEFAULT);
  return true;
}
