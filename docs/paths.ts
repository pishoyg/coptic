/** Package paths defines path constants. */

import * as iam from './iam.js';

// remnqymi.com ownables:
const SITE_URL = iam.amI('card') ? 'http://remnqymi.com' : '';
export const HOME = `${SITE_URL}/`;
export const LEXICON = `${SITE_URL}/crum`;
export const DAWOUD = `${SITE_URL}/dawoud`;
export const BIBLE = `${SITE_URL}/bible`;

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
  return `${DAWOUD}?page=${page}`;
}

/**
 *
 * @param query
 * @returns
 */
export function lexiconLookup(query: string): string {
  return `${LEXICON}?query=${query}`;
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
  // TODO: (#460): Use the in-house scan.
  return `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${page}`;
}
