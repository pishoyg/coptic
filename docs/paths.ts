/** Package paths defines path constants. */

import * as iam from './iam.js';

// remnqymi.com ownables:
export const URL = iam.amI('anki') ? 'http://remnqymi.com' : '';
export const HOME = `${URL}/`;
export const LEXICON = `${URL}/crum`;
export const DAWOUD = `${URL}/dawoud`;
export const BIBLE = `${URL}/bible`;
export const LOOKUP_URL_PREFIX = `${LEXICON}?query=`;
export const CRUM_PAGE_KEY_FMT = `${LEXICON}/{KEY}.html`;

// Other pages that we own:
export const REPORTS =
  'https://docs.google.com/forms/d/e/1FAIpQLSeNVAjxtJcAR7i6AwBI3SFlzRWC5DQ09G6LfbySbZGvZCdpIg/viewform?usp=pp_url';
export const REPORTS_PAGE_PARAM = 'entry.1382006920';

// Pages that we don't own:
export const KELLIA = 'https://kellia.uni-goettingen.de/';
export const CDO_LOOKUP_KEY_FMT =
  'https://coptic-dictionary.org/entry.cgi?tla={KEY}';
export const GREEK_DICT_PREFIX = 'https://logeion.uchicago.edu/';
export const CRUM_ABBREVIATIONS =
  'https://coptic.wiki/crum/?section=list_of_abbreviations';
export const CRUM_SCAN_PREFIX =
  'https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=';
export const COPTICSITE = 'http://copticsite.com/';
