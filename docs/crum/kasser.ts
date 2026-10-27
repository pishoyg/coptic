import * as html from '../html.js';
import * as paths from '../paths.js';
import * as id from './id.js';
import * as randy from './randy.js';

const COMPLEMENTS_FOREWORD_PAGE = 'v';
const COMPLEMENTS_INTRODUCTION_PAGE = 'vii';
const COMPLEMENTS_ABBREVIATIONS_PAGE = '117';
const MORPHOLOGIQUES_INTRODUCTION_PAGE = '19';
const MORPHOLOGIQUES_ABBREVIATIONS_PAGE = '23';

/**
 * Handle all Wiki elements.
 * @param root
 * @param full
 */
export function handle(root: HTMLElement, full = true): void {
  handleComplements(
    root.querySelector<HTMLElement>(`#${id.COMPLEMENTS}`),
    full
  );
  handleMorphologiques(
    root.querySelector<HTMLElement>(`#${id.MORPHOLOGIQUES}`),
    full
  );
}

/**
 *
 * @param complements
 * @param full
 */
export function handleComplements(
  complements: HTMLElement | null,
  full = true
): void {
  if (!complements) {
    return;
  }
  if (!full) {
    return;
  }
  randy.addFinePrint(
    complements,
    'Voir l’',
    html.anchor(paths.ifao(COMPLEMENTS_FOREWORD_PAGE), 'avant-propos'),
    ', l’',
    html.anchor(paths.ifao(COMPLEMENTS_INTRODUCTION_PAGE), 'introduction'),
    ' et les ',
    html.anchor(
      paths.ifao(COMPLEMENTS_ABBREVIATIONS_PAGE),
      'sigles et abréviations'
    ),
    '.'
  );
}

/**
 *
 * @param morphologiques
 * @param full
 */
export function handleMorphologiques(
  morphologiques: HTMLElement | null,
  full = true
): void {
  if (!morphologiques) {
    return;
  }
  if (!full) {
    return;
  }
  randy.addFinePrint(
    morphologiques,
    'Voir l’',
    html.anchor(
      paths.ifao(MORPHOLOGIQUES_INTRODUCTION_PAGE, 'morphologiques'),
      'introduction'
    ),
    ' et les ',
    html.anchor(
      paths.ifao(MORPHOLOGIQUES_ABBREVIATIONS_PAGE, 'morphologiques'),
      'sigles et abréviations'
    ),
    '.'
  );
}
