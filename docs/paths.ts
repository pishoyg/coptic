/** Package paths defines path constants. */

import * as iam from './iam.js';

// remnqymi.com ownables:
export const URL = iam.amI('anki') ? 'http://remnqymi.com' : '';
export const HOME = `${URL}/`;
export const LEXICON = `${URL}/crum`;
export const DAWOUD = `${URL}/dawoud`;
export const BIBLE = `${URL}/bible`;

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

/**
 *
 * @param codex
 * @param leaf
 * @returns
 */
export function nagHammadiPapyrus(codex: string, leaf: string): string {
  return `https://ccdl.claremont.edu/digital/collection/nha/search/searchterm/Codex ${codex.toUpperCase()}, papyrus ${leaf}`;
}

/**
 *
 * @param word
 * @returns
 * TODO: (#50) Revisit the Greek dictionary used.
 */
export function greekLookup(word: string): string {
  return `https://logeion.uchicago.edu/${word}`;
}

export const CRUM_ABBREVIATIONS =
  'https://www.coptist.com/2025/07/30/digitised-bibliography-crum/';

/**
 *
 * @param page
 * @returns
 */
export function crumScan(page: string): string {
  // TODO: (#460): Use the in-house scan.
  return `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${page}`;
}
