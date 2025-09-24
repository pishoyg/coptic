/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as d from './dialect.js';
import * as cls from './cls.js';

const STYLE: HTMLStyleElement = document.createElement('style');
document.head.appendChild(STYLE);
const SHEET: CSSStyleSheet = STYLE.sheet!;
const RULE_IDX: number = SHEET.cssRules.length;

// DIALECTS bears the dialects present in this page.
// Each page has a subset of the dialects. For highlighting purposes, only this
// subset is of interest.
// Any verse should contain all the languages in this page.
const DIALECTS: d.DIALECT[] = Array.from(
  document
    .querySelector(`.${cls.VERSE}`)!
    .querySelectorAll<HTMLTableCellElement>(`.${cls.LANGUAGE}`)
).map(
  (td: HTMLTableCellElement): d.DIALECT =>
    d.DIALECTS.find((dialect: d.DIALECT) => td.classList.contains(dialect))!
);

const CHECKBOXES: HTMLInputElement[] = DIALECTS.map(
  (dialect: d.DIALECT): HTMLInputElement => {
    const box: HTMLInputElement = document.createElement('input');
    box.type = 'checkbox';
    box.name = dialect;
    return box;
  }
);

/**
 * Update dialect display.
 */
export function update(): void {
  const active: d.DIALECT[] | undefined = d.manager.active();
  // Set checkboxes.
  CHECKBOXES.forEach((c: HTMLInputElement): void => {
    c.checked = !!active?.includes(c.name as d.DIALECT);
  });

  // Delete the old rule.
  if (RULE_IDX < SHEET.cssRules.length) {
    SHEET.deleteRule(RULE_IDX);
  }

  const inactive: d.DIALECT[] = DIALECTS.filter(
    (dialect: d.DIALECT) => !active?.includes(dialect)
  );
  if (inactive.length === 0 || inactive.length === DIALECTS.length) {
    // Dialects are all off or all on. Again, nothing to do!
    return;
  }

  SHEET.insertRule(
    `${css.classQuery(...inactive)} { display: none; }`,
    RULE_IDX
  );
}

/**
 * Register event listeners.
 */
export function addEventListeners(): void {
  // A click on a checkbox triggers a dialect display update.
  CHECKBOXES.forEach((checkbox: HTMLInputElement): void => {
    checkbox.addEventListener('click', () => {
      d.manager.toggle(checkbox.name as d.DIALECT);
      update();
    });
  });
}

/**
 * @returns
 */
export function form(): HTMLElement {
  // TODO: (#179) Use a tray on small screens, but feel free to spell out the
  // checkboxes on a larger screen.
  const div: HTMLDivElement = document.createElement('div');
  div.append(
    ...CHECKBOXES.map((box: HTMLInputElement): HTMLLabelElement => {
      const label: HTMLLabelElement = document.createElement('label');
      label.append(box, box.name);
      return label;
    })
  );
  div.classList.add(cls.CHECKBOXES);
  return div;
}
