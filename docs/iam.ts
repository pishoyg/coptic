export type Where =
  | 'UNKNOWN'
  | 'note'
  | 'anki'
  | 'lexicon'
  | 'index'
  | 'index_index';

declare const NOTE: boolean;
declare const ANKI: boolean;
declare const INDEX: boolean;
declare const INDEX_INDEX: boolean;

/**
 * @returns
 */
export function where(): Where {
  if (typeof ANKI !== 'undefined') {
    return 'anki';
  }
  if (document.body.classList.contains('lexicon')) {
    return 'lexicon';
  }
  if (typeof NOTE !== 'undefined') {
    return 'note';
  }
  if (typeof INDEX !== 'undefined') {
    return 'index';
  }
  if (typeof INDEX_INDEX !== 'undefined') {
    return 'index_index';
  }
  return 'UNKNOWN';
}

/**
 * @param w
 * @returns
 */
export function amI(w: Where): boolean {
  return where() === w;
}
