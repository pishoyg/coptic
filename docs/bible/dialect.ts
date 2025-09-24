/** Package dialect defines Bible dialects. */
import * as dialect from '../dialect.js';

export type DIALECT =
  | 'Bohairic'
  | 'Sahidic'
  | 'English'
  | 'Greek'
  | 'Fayyumic'
  | 'Akhmimic'
  | 'OldBohairic'
  | 'Mesokemic'
  | 'DialectP'
  | 'Lycopolitan';

export const DIALECTS: DIALECT[] = [
  'Bohairic',
  'Sahidic',
  'English',
  'Greek',
  'Fayyumic',
  'Akhmimic',
  'OldBohairic',
  'Mesokemic',
  'DialectP',
  'Lycopolitan',
];

export const manager: dialect.Manager<DIALECT> = new dialect.Manager<DIALECT>(
  'bd'
);
