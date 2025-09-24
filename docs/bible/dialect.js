/** Package dialect defines Bible dialects. */
import * as dialect from '../dialect.js';
export const DIALECTS = [
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
export const manager = new dialect.Manager('bd');
