/** Package paths defines path constants. */

import * as iam from './iam.js';

export const URL = iam.amI('anki') ? 'http://remnqymi.com' : '';

export const EMAIL = 'remnqymi@gmail.com';

export const HOME = `${URL}/`;
export const LEXICON = `${URL}/crum`;
export const DAWOUD = `${URL}/dawoud`;
export const BIBLE = `${URL}/bible`;

export const LOOKUP_URL_PREFIX = `${LEXICON}?query=`;
