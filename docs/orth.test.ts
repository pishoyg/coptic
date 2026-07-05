import * as orth from './orth';

/* eslint-disable no-magic-numbers */
describe('translation', () => {
  test('maps a diacritic-free BMP string by the identity', () => {
    // Every character occupies one code unit and one slot, plus the trailing
    // length sentinel.
    expect(orth.translation('ⲉⲩϫⲕⲱ')).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('indexes by UTF-16 code unit across an astral character', () => {
    // U+1018E is astral: two UTF-16 code units, one code point. Both halves
    // must occupy a slot so later offsets stay aligned with the UTF-16 offsets
    // that xooxle's highlighter uses. Iterating by code point would drop a slot
    // here and collapse a following match to zero width. See #760.
    expect(orth.translation('\u{1018E}ⲉ')).toEqual([0, 1, 2, 3]);
  });

  test('drops combining marks while keeping neighbours aligned', () => {
    // 'e' + U+0301 (combining acute) + 'x': the mark at index 1 is skipped, so
    // the clean-space index 1 ('x') maps to code unit 2.
    expect(orth.translation('éx')).toEqual([0, 2, 3]);
  });

  test('handles an empty string', () => {
    expect(orth.translation('')).toEqual([0]);
  });
});
/* eslint-enable no-magic-numbers */
