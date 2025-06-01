import * as css from '../css.js';

// D is the name of the local-storage variable storing the list of active
// dialects. This is the source of truth for dialect highlighting. Updating
// dialect highlighting should happen by updating this local storage variable.
const D = 'd';

type DICTIONARY = 'KELLIA' | 'Crum' | 'copticsite';

/**
 */
export class Dialect {
  /**
   * @param name - Human-readable dialect name.
   * @param article - URL to an article about that dialect (or "" for none).
   * @param dictionaries
   */
  constructor(
    readonly name: string,
    readonly article = '',
    readonly dictionaries: DICTIONARY[]
  ) {}
}

const DIALECT_SINGLE_CHAR_VALUES = {
  // The following is the standard set of sigla of five major dialects of
  // Coptic, along with Old Coptic. They are used in both the Crum and KELLIA
  // dictionaries. Additionally, B (Bohairic) is used in copticsite.
  S: new Dialect(
    'Sahidic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2',
    ['Crum', 'KELLIA']
  ),
  A: new Dialect(
    'Akhmimic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1',
    ['Crum', 'KELLIA']
  ),
  L: new Dialect(
    'Lycopolitan',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1',
    ['Crum', 'KELLIA']
  ),
  B: new Dialect(
    'Bohairic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2',
    ['Crum', 'KELLIA', 'copticsite']
  ),
  F: new Dialect(
    'Fayyumic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2',
    ['Crum', 'KELLIA']
  ),
  O: new Dialect(
    'Old Coptic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2',
    ['Crum', 'KELLIA']
  ),

  // The following dialects are only found in KELLIA (TLA).
  M: new Dialect(
    'Mesokemic',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2',
    ['KELLIA']
  ),
  P: new Dialect(
    'Proto-Theban',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1',
    ['KELLIA']
  ),
  V: new Dialect(
    'South Fayyumic Greek',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
    ['KELLIA']
  ),
  W: new Dialect(
    'Crypto-Mesokemic Greek',
    'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
    ['KELLIA']
  ),

  U: new Dialect('Greek (usage unclear)', '', ['KELLIA']),
} as const;

type DIALECT_SINGLE_CHAR = keyof typeof DIALECT_SINGLE_CHAR_VALUES;

const DIALECT_DOUBLE_CHAR_VALUES = {
  // The following three dialects (or sub-dialects) are only found in Crum.
  Sa: new Dialect('Sahidic with Akhmimic tendency', '', ['Crum']),
  Sf: new Dialect('Sahidic with Fayyumic tendency', '', ['Crum']),
  Fb: new Dialect('Fayyumic with Bohairic tendency', '', ['Crum']),

  // The following dialect is only found in Marcion (part of Crum).
  // TODO: (#0) It's not exactly accurate to describe this as part of Crum.
  // Consider updating the description, somehow.
  NH: new Dialect(
    'Nag Hammadi',
    'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2',
    ['Crum']
  ),
} as const;

type DIALECT_DOUBLE_CHAR = keyof typeof DIALECT_DOUBLE_CHAR_VALUES;

/**
 * DIALECT represents a dialect code. They could be single-character or
 * double-character, and they are recognizable by our users and suitable for use
 * in UI.
 */
export type DIALECT = DIALECT_SINGLE_CHAR | DIALECT_DOUBLE_CHAR;

const DIALECT_MAP: Record<DIALECT, Dialect> = {
  ...DIALECT_SINGLE_CHAR_VALUES,
  ...DIALECT_DOUBLE_CHAR_VALUES,
} as const;

/**
 * Given a dialect code, return the dialect object.
 *
 * @param dialect
 * @returns
 */
export function byCode(dialect: DIALECT): Dialect {
  return DIALECT_MAP[dialect];
}

const DIALECTS: DIALECT[] = Object.keys(DIALECT_MAP) as DIALECT[];

export const ANY_DIALECT_QUERY: string = css.classQuery(DIALECTS);

/**
 * For dialects that have a single-character code, we use the code as a keyboard
 * shortcut key. For the double-character dialect codes, we use an abbreviation,
 * which we define below.
 */
type DIALECT_ABBREV = 'N' | 'a' | 'f' | 'b';

/**
 * DIALECT_KEY is a single-character dialect key. They are less recognizable and
 * less suited for use in UI, but useful in situations where you must have a
 * single-character dialect encoding.
 */
export type DIALECT_KEY = DIALECT_SINGLE_CHAR | DIALECT_ABBREV;

/**
 * For all dialects with a double-character key, KEY_TO_CODE maps the
 * single-character dialect key to the double-character dialect code.
 *
 * For single-character dialects, the key is identical to the code.
 */
const KEY_TO_CODE: Record<DIALECT_ABBREV, DIALECT_DOUBLE_CHAR> = {
  N: 'NH',
  a: 'Sa',
  f: 'Sf',
  b: 'Fb',
} as const;

const isAbbrev = (key: DIALECT_KEY): key is DIALECT_ABBREV =>
  key in KEY_TO_CODE;

/**
 * Given a dialect key, return the dialect code.
 *
 * @param key - Dialect key.
 * @returns - Dialect code.
 */
export function code(key: DIALECT_KEY): DIALECT {
  return isAbbrev(key) ? KEY_TO_CODE[key] : key;
}

/**
 * @param key
 * @returns
 */
export function byKey(key: DIALECT_KEY): Dialect {
  return byCode(code(key));
}

/**
 * @returns The list of active dialects, undefined if dialect highlighting
 * is currently unused.
 */
export function active(): DIALECT[] | undefined {
  const d = localStorage.getItem(D);
  // NOTE: ''.split(',') returns [''], which is not what we want!
  return d ? (d.split(',') as DIALECT[]) : undefined;
}

/**
 * @param dialects
 */
export function setActive(dialects: DIALECT[]) {
  if (dialects.length) {
    localStorage.setItem(D, Array.from(dialects).join(','));
  } else {
    localStorage.removeItem(D);
  }
}

/**
 * @param dialect
 */
export function toggle(dialect: DIALECT) {
  const a = new Set<DIALECT>(active());

  if (a.has(dialect)) {
    a.delete(dialect);
  } else {
    a.add(dialect);
  }

  setActive(Array.from(a));
}
