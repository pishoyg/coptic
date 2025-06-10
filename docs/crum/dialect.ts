/** Package dialect defines Crum dialects. */
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as help from '../help.js';
import * as highlight from './highlight.js';

// D is the name of the local-storage variable storing the list of active
// dialects. This is the source of truth for dialect highlighting. Updating
// dialect highlighting should happen by updating this local storage variable.
const D = 'd';
const SEPARATOR = ',';

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

enum CLS {
  DIALECT_CODE = 'dialect-code',
  DIALECT_NAME = 'dialect-name',
  DIALECT_DICTIONARIES = 'dialect-dictionaries',
}

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

type DICTIONARY = 'KELLIA' | 'Crum' | 'copticsite';

/**
 */
export class Dialect {
  readonly key: DialectKey;

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
  constructor(
    readonly code: DIALECT,
    readonly name: string,
    readonly article = '',
    readonly dictionaries: DICTIONARY[],
    key?: DoubleCharDialectAbbrev
  ) {
    this.key = key ?? (code as SingleCharDialect);
  }

  /**
   * Build a keyboard shortcut that toggles this dialect.
   *
   * @param highlighter
   * @returns
   */
  shortcut(highlighter: highlight.Highlighter): help.Shortcut {
    const highlightedCode: string = help.highlightFirstOccurrence(
      this.key,
      this.code
    );

    let highlightedName: string = this.name;
    if (this.article) {
      highlightedName = `<a href="${this.article}" target="_blank" rel="noopener,noreferrer">${highlightedName}</a>`;
    }

    const description = `
    <table>
    <tr>
      <td class="${CLS.DIALECT_CODE}">(${highlightedCode})</td>
      <td class="${CLS.DIALECT_NAME}">${highlightedName}</td>
      ${iam.amI('lexicon') ? `<td class="${CLS.DIALECT_DICTIONARIES}">(${this.dictionaries.join(', ')})</td>` : ''}
    </tr>
    </table>`;

    // Crum dialects are available on several Crum page identities.
    // Non-Crum dialects are only used in Lexicon.
    const availability: iam.Where[] = this.dictionaries.includes('Crum')
      ? ['lexicon', 'note', 'index']
      : ['lexicon'];
    return new help.Shortcut(
      description,
      availability,
      highlighter.toggleDialect.bind(highlighter, this.code)
    );
  }
}

export const DIALECTS: Record<DIALECT, Dialect> = {
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
} as const;

export const ANY_DIALECT_QUERY: string = css.classQuery(
  ...Object.keys(DIALECTS)
);

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
export function active(): DIALECT[] | undefined {
  const d: string | null = localStorage.getItem(D);
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
  return d.split(SEPARATOR) as DIALECT[];
}

/**
 * @param dialects - Set current list of active dialects.
 */
export function setActive(dialects: DIALECT[]): void {
  localStorage.setItem(D, dialects.join(SEPARATOR));
}

/**
 * Set the list of active dialects to [].
 * NOTE: We intentionally use the empty list, instead of deleting the local
 * storage variable, in order to distinguish between the cases when:
 * 1. Dialect highlighting was previously used and then reset.
 * 2. Dialect highlighting was never used.
 */
export function reset(): void {
  setActive([]);
}

/**
 * @param dialect - Dialect to toggle.
 */
export function toggle(dialect: DIALECT): void {
  const act: Set<DIALECT> = new Set<DIALECT>(active());

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
 */
function setToDefaultIfUnset(): void {
  if (localStorage.getItem(D) !== null) {
    // Dialects have already been configured.
    return;
  }
  setActive(DEFAULT);
}

// Use default in all pages where this package is imported.
setToDefaultIfUnset();
