/** Package dialect defines Crum dialects. */
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as help from '../help.js';
import * as str from '../str.js';
import * as dialecter from '../dialect.js';
const DEFAULT = ['B'];
export var CLS;
(function (CLS) {
  CLS['DIALECT_CODE'] = 'dialect-code';
  CLS['DIALECT_NAME'] = 'dialect-name';
  CLS['DIALECT_DICTIONARIES'] = 'dialect-dictionaries';
  CLS['BORDER_DIALECT_LETTER'] = 'border-dialect-letter';
  CLS['SIGLUM'] = 'siglum';
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
    tdCode.append(this.siglum());
    tr.appendChild(tdCode);
    // Create the second <td> (dialect name)
    const tdName = document.createElement('td');
    tdName.classList.add(CLS.DIALECT_NAME);
    tdName.append(...this.anchoredName());
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
   * @returns
   */
  checkbox() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = this.code;
    return checkbox;
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
      const a = document.createElement('a');
      a.href = this.article;
      a.target = '_blank';
      a.textContent = this.name;
      yield a;
      return;
    }
    const words = this.name.split(' ');
    // If this word is the name of a dialect, return its anchored name.
    // Otherwise, return the word as plain text.
    for (const [index, word] of words.entries()) {
      yield* Object.values(DIALECTS)
        .find((d) => d.name === word)
        ?.anchoredName() ?? [word];
      if (index < words.length - 1) {
        yield ' ';
      }
    }
  }
  /**
   * @returns An HTML element, whose text content has the following format:
   *   (code) Dialect Name
   * The name bears anchors, if present.
   */
  title() {
    return ['(', this.siglum(), ') ', ...this.anchoredName()];
  }
  /**
   * @returns An element containing a prettified dialect code.
   */
  siglum() {
    const siglum = document.createElement('span');
    siglum.classList.add(CLS.SIGLUM);
    const first = this.code[0],
      second = this.code[1];
    if (
      this.code.length === 2 &&
      first &&
      second &&
      str.isUpper(first) &&
      str.isLower(second)
    ) {
      // This is a border dialect siglum.
      const sup = document.createElement('sup');
      sup.classList.add(CLS.BORDER_DIALECT_LETTER);
      sup.textContent = second;
      siglum.append(first, sup);
      return siglum;
    }
    // This is a major dialect siglum.
    siglum.append(this.code);
    return siglum;
  }
}
// NOTE: The keys of this record should be ordered according to the desired
// order of appearance in the UI.
export const DIALECTS = {
  // S, A, L, B, and F, are the standard set of sigla of five major dialects of
  // Coptic. Along with O, they are used in both Crum and KELLIA.
  // B is the only one used in Andreas and copticsite.
  // Border dialects are only used in Crum.
  S: new Dialect(
    'S',
    'Sahidic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2',
    ['Crum', 'KELLIA']
  ),
  Sa: new Dialect('Sa', 'Sahidic with Akhmimic tendency', '', ['Crum'], 'a'),
  Sf: new Dialect('Sf', 'Sahidic with Fayyumic tendency', '', ['Crum'], 'f'),
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
  Fb: new Dialect('Fb', 'Fayyumic with Bohairic tendency', '', ['Crum'], 'b'),
  O: new Dialect(
    'O',
    'Old Coptic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2',
    ['Crum', 'KELLIA']
  ),
  // NH is only found in Marcion (part of Crum).
  NH: new Dialect(
    'NH',
    'Nag Hammadi',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2',
    ['Crum'],
    'N'
  ),
  // The following dialects are only found in KELLIA (TLA).
  // M is a major Coptic dialect that is regrettably unrepresented in Crum. He
  // preceded its discovery.
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
  // Greek (usage unclear) is only used in KELLIA (TLA).
  U: new Dialect('U', 'Greek (usage unclear)', '', ['KELLIA']),
};
export const ANY_DIALECT_QUERY = css.classQuery(...Object.keys(DIALECTS));
// Our local-storage variable used to store active Crum dialects is called 'd'.
export const manager = new dialecter.Manager('d');
/**
 * Set the list of active dialects to a given default, if dialects are not
 * already configured.
 *
 * @returns Whether defaults have been set.
 */
export function setToDefaultIfUnset() {
  if (manager.active() !== undefined) {
    // Dialects have already been configured.
    return false;
  }
  manager.setActive(DEFAULT);
  return true;
}
