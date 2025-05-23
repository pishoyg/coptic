import * as iam from './iam.js';

// NOTE: You should append '/' when using a path.

export const HOME = iam.amI('anki') ? 'http://remnqymi.com' : '';

export const LEXICON = `${HOME}/crum`;
export const DAWOUD = `${HOME}/dawoud`;
export const BIBLE = `${HOME}/bible`;

export const LOOKUP_URL_PREFIX = `${LEXICON}?query=`;
