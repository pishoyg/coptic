/** Package paths defines path constants. */

import * as iam from './iam.js';

// remnqymi.com ownables:
const SITE_URL = iam.amI('card') ? 'http://remnqymi.com' : '';
export const HOME = `${SITE_URL}/`;
export const LEXICON = `${SITE_URL}/crum`;
export const BIBLE = `${SITE_URL}/bible`;

/**
 * Lexicon URL contract.
 *
 * Owned by `paths.ts` (rather than by `crum/mode.ts` / `crum/query.ts`)
 * so that the URL shape is defined in the same module that constructs
 * the URLs, and so a shared utility never has to import from a
 * lexicon-specific module. `crum/mode.ts` and `crum/query.ts` consume
 * these values (and re-export `Mode` for convenience).
 */
export const QUERY_PARAM = 'query';
export const MODE_PARAM = 'mode';

export type Mode = 'digital' | 'book' | 'dawoud';
export const DIGITAL: Mode = 'digital';
export const BOOK: Mode = 'book';
export const DAWOUD: Mode = 'dawoud';

/**
 *
 * @param key
 * @param drvKey
 * @returns
 */
export function crum(key: string, drvKey?: string): string {
  const url = `${LEXICON}/${key}.html`;
  if (drvKey) {
    return `${url}#drv${drvKey}`;
  }
  return url;
}

/**
 *
 * @param page
 * @returns
 */
export function dawoudScan(page: string): string {
  return lexiconLookup(page, DAWOUD);
}

/**
 * Build a lexicon URL with an optional initial mode.
 *
 * @param q - Search query.
 * @param m - Optional initial mode. When omitted, the lexicon opens in
 * its default mode.
 * @returns The full lexicon URL.
 */
export function lexiconLookup(q: string, m?: Mode): string {
  // String concatenation is slightly cheaper than building a URL object and
  // serializing it.
  // We intentionally avoid encoding the URL parameters so the constructed links
  // will be prettier. Encoding is, as of the time of writing, not required in
  // any of our use cases.
  const url = `${LEXICON}?${QUERY_PARAM}=${q}`;
  if (!m) {
    return url;
  }
  return `${url}&${MODE_PARAM}=${m}`;
}

/**
 *
 * @param book
 * @param chapter
 * @param verse
 * @returns
 */
export function bible(book: string, chapter?: string, verse?: string): string {
  // Some chapters are called A, C, D, or F. But we always use lower case for
  // those.
  chapter = chapter?.toLowerCase();
  if (!chapter) {
    // This is a book URL.
    return `${BIBLE}?book=${book}`;
  }
  const chapterURL = `${BIBLE}/${book}_${chapter}.html`;
  if (verse) {
    return `${chapterURL}#v${verse}`;
  }
  return chapterURL;
}

// Other pages that we own:
export const REPORTS =
  'https://docs.google.com/forms/d/e/1FAIpQLSeNVAjxtJcAR7i6AwBI3SFlzRWC5DQ09G6LfbySbZGvZCdpIg/viewform?usp=pp_url';
export const REPORTS_PAGE_PARAM = 'entry.1382006920';

// Pages that we don't own:
export const KELLIA = 'https://kellia.uni-goettingen.de/';

/**
 *
 * @param key
 * @returns
 */
export function copticDictionaryOnline(key: string): string {
  return `https://coptic-dictionary.org/entry.cgi?tla=${key}`;
}

/* NAG_HAMMADI_OVERRIDE defines URLs for codex leaves that are hard to find
 * using the custom query defined below.
 */
const NAG_HAMMADI_OVERRIDE: Record<string, string> = {
  'I:flyleaf recto':
    'https://ccdl.claremont.edu/digital/collection/nha/id/2159',
  'I:flyleaf verso':
    'https://ccdl.claremont.edu/digital/collection/nha/id/2136',
};

/**
 *
 * @param codex
 * @param leaf
 * @returns
 */
export function nagHammadiPapyrus(codex: string, leaf: string): string {
  return (
    NAG_HAMMADI_OVERRIDE[`${codex}:${leaf}`] ??
    `https://ccdl.claremont.edu/digital/collection/nha/search/searchterm/Codex ${codex.toUpperCase()}, papyrus ${leaf}`
  );
}

/**
 *
 * @param word
 * @returns
 */
export function greekLookup(word: string): string {
  return `https://logeion.uchicago.edu/${word}`;
}

// TODO: (#673) Stop linking the external bibliography.
export const CRUM_ABBREVIATIONS =
  'https://www.coptist.com/2025/07/30/digitised-bibliography-crum/';

export const CRUM_GSPREAD_URL =
  'https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg';
export const CRUM_ROOTS_URL = `${CRUM_GSPREAD_URL}/edit?gid=1575616379`;
export const CRUM_DERIVATIONS_URL = `${CRUM_GSPREAD_URL}/edit?gid=698638592`;

/**
 *
 * @param worksheetUrl
 * @param rowNum
 * @returns
 */
export function rowUrl(worksheetUrl: string, rowNum: number | string): string {
  const url: URL = new URL(worksheetUrl);
  url.searchParams.set('range', `${rowNum}:${rowNum}`);
  return url.toString();
}

/**
 *
 * @param page
 * @returns
 */
export function crumScan(page: string): string {
  return lexiconLookup(page, BOOK);
}
