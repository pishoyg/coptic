/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as d from './dialect.js';
import * as cls from './cls.js';

const SHEET: CSSStyleSheet = ((): CSSStyleSheet => {
  const style: HTMLStyleElement = document.createElement('style');
  document.head.appendChild(style);
  return style.sheet!;
})();
const RULE_IDX = 0; // The sheet has a single rule.

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

/**
 * @returns One set of checkboxes for all dialects in the page.
 */
export function buildCheckboxes(): HTMLInputElement[] {
  return DIALECTS.map((dialect: d.DIALECT): HTMLInputElement => {
    const box: HTMLInputElement = document.createElement('input');
    box.type = 'checkbox';
    box.name = dialect;
    return box;
  });
}

/**
 * @param checkboxes
 * @returns
 */
export function buildLabels(
  checkboxes: HTMLInputElement[]
): HTMLLabelElement[] {
  return checkboxes.map((box: HTMLInputElement): HTMLLabelElement => {
    const label: HTMLLabelElement = document.createElement('label');
    label.append(box, box.name);
    return label;
  });
}

/**
 *
 */
export class Highlighter {
  /**
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  constructor(private readonly checkboxes: HTMLInputElement[]) {
    this.addEventListeners();
    this.update();
  }
  /**
   * Update dialect display.
   */
  update(): void {
    const active: d.DIALECT[] | undefined = d.manager.active();
    // Set checkboxes.
    this.checkboxes.forEach((c: HTMLInputElement): void => {
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
      // Notice that this check is based on the list of dialects available on
      // this page, rather than on the list of all dialects.
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
  addEventListeners(): void {
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox: HTMLInputElement): void => {
      checkbox.addEventListener('click', () => {
        d.manager.toggle(checkbox.name as d.DIALECT);
        this.update();
      });
    });
  }

  /**
   *
   */
  reset(): void {
    d.manager.reset();
    this.update();
  }
}
