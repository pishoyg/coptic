import * as css from '../css.js';
import * as iam from '../iam.js';
import * as help from '../help.js';
// D is the name of the local-storage variable storing the list of active
// dialects. This is the source of truth for dialect highlighting. Updating
// dialect highlighting should happen by updating this local storage variable.
const D = 'd';
const DEFAULT = ['B'];
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
    const highlightedCode = help.highlightFirstOccurrence(this.key, this.code);
    let highlightedName = this.name;
    if (this.article) {
      highlightedName = `<a href="${this.article}" target="_blank" rel="noopener,noreferrer">${highlightedName}</a>`;
    }
    const description = `
    <table>
    <tr>
      <td class="dialect-code">(${highlightedCode})</td>
      <td class="dialect-name">${highlightedName}</td>
      ${iam.amI('lexicon') ? `<td class="dialect-dictionaries">(${this.dictionaries.join(', ')})</td>` : ''}
    </tr>
    </table>`;
    // Crum dialects are available on several Crum page identities.
    // Non-Crum dialects are only used in Lexicon.
    const availability = this.dictionaries.includes('Crum')
      ? ['lexicon', 'note', 'index']
      : ['lexicon'];
    return new help.Shortcut(
      description,
      availability,
      highlighter.toggleDialect.bind(highlighter, this.code)
    );
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
export const ANY_DIALECT_QUERY = css.classQuery(Object.keys(DIALECTS));
/**
 * @returns The list of active dialects, undefined if dialect highlighting
 * is currently unused.
 */
export function active() {
  const d = localStorage.getItem(D);
  // NOTE: ''.split(',') returns [''], which is not what we want!
  return d ? d.split(',') : undefined;
}
/**
 * @param dialects
 */
export function setActive(dialects) {
  localStorage.setItem(D, Array.from(dialects).join(','));
}
/**
 */
export function reset() {
  setActive([]);
}
/**
 * @param dialect
 */
export function toggle(dialect) {
  const a = new Set(active());
  if (a.has(dialect)) {
    a.delete(dialect);
  } else {
    a.add(dialect);
  }
  setActive(Array.from(a));
}
/**
 * Set the list of active dialects to a given default, if dialects are not
 * already configured.
 * NOTE: The local storage variable distinguishes between the two following
 * values:
 * - null: Dialect highlighting have never been configured.
 * - the empty string: Dialect highlighting was previously configured, and is
 *   now disabled (so all dialects are on).
 * We only use the default value in the former case.
 */
function setDefault() {
  if (localStorage.getItem(D) !== null) {
    // Dialects have already been configured.
    return;
  }
  setActive(DEFAULT);
}
setDefault();
