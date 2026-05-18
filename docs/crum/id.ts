import type * as mode from './mode.js';

// LEXICON IDs:
export const CRUM = 'crum';
export const KELLIA = 'kellia';
export const ANDREAS = 'andreas';

/**
 * In our index, the ID of a title element is obtained by appending '-title' to
 * the ID of the dictionary.
 * @param dict
 * @returns
 */
export function title(dict: string): string {
  return `${dict}-title`;
}

/**
 * @param m - A lexicon mode key.
 * @returns The HTML element ID of that mode's switcher button.
 */
export function modeButton(m: mode.Mode): string {
  return `mode-${m}`;
}

// Title elements are used to collapse dictionaries.
export const collapse = title;

/**
 * In our index, the ID of a collapsible element is obtained by appending
 * '-collapsible' to the ID of the dictionary.
 * @param dict
 * @returns
 */
export function collapsible(dict: string): string {
  return `${dict}-collapsible`;
}

export const SEARCH_BOX = 'search-box';
export const FULL_WORD_CHECKBOX = 'full-word-checkbox';
export const CASE_SENSITIVE_CHECKBOX = 'case-sensitive-checkbox';
export const REGEX_CHECKBOX = 'regex-checkbox';
export const MESSAGE_BOX = 'message';
export const DIALECTS = 'dialects';
export const DIALECTS_BUTTON = 'dialects-button';
// While we have two groups of checkboxes, confusingly enough, the unqualified
// 'checkboxes' ID refers to the ones that show on a list, rather than the
// ones that show in the drop-down menu. The reason this ID was used for those
// boxes is that they preceded the more recent drop-down version.
export const CHECKBOXES = 'checkboxes';
export const MARCION_CHECKBOX = 'marcion-checkbox';
export const WIKI_CHECKBOX = 'wiki-checkbox';
export const REPORTS = 'reports';
export const FORM = 'form';

export const CRUM_SCAN = 'crum-scan';
export const DAWOUD_SCAN = 'dawoud-scan';

export const NEXT = 'next';
export const PREV = 'prev';
export const RESET = 'reset';

// NOTE IDs:
export const CATEGORIES = 'categories';
export const DERIVATIONS = 'derivations';
export const FOOTER = 'footer';
export const IMAGES = 'images';
export const KEY = 'key';
export const MEANING = 'meaning';
export const PRETTY = 'pretty';
export const ROOT_TYPE = 'root-part-of-speech';
export const SENSES = 'senses';
export const SISTERS = 'sisters';
export const WIKI = 'wiki';
