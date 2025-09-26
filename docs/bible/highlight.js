/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as d from './dialect.js';
import * as cls from './cls.js';
const SHEET = (() => {
  const style = document.createElement('style');
  document.head.appendChild(style);
  return style.sheet;
})();
const RULE_IDX = 0; // The sheet has a single rule.
// DIALECTS bears the dialects present in this page.
// Each page has a subset of the dialects. For highlighting purposes, only this
// subset is of interest.
// Any verse should contain all the languages in this page.
const DIALECTS = Array.from(
  document.querySelector(`.${cls.VERSE}`).querySelectorAll(`.${cls.LANGUAGE}`)
).map((td) => d.DIALECTS.find((dialect) => td.classList.contains(dialect)));
/**
 * @returns One set of checkboxes for all dialects in the page.
 */
export function buildCheckboxes() {
  return DIALECTS.map((dialect) => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.name = dialect;
    return box;
  });
}
/**
 * @param checkboxes
 * @returns
 */
export function buildLabels(checkboxes) {
  return checkboxes.map((box) => {
    const label = document.createElement('label');
    label.append(box, box.name);
    return label;
  });
}
/**
 *
 */
export class Highlighter {
  checkboxes;
  /**
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  constructor(checkboxes) {
    this.checkboxes = checkboxes;
    this.addEventListeners();
    this.update();
  }
  /**
   * Update dialect display.
   */
  update() {
    const active = d.manager.active();
    // Set checkboxes.
    this.checkboxes.forEach((c) => {
      c.checked = !!active?.includes(c.name);
    });
    // Delete the old rule.
    if (RULE_IDX < SHEET.cssRules.length) {
      SHEET.deleteRule(RULE_IDX);
    }
    const inactive = DIALECTS.filter((dialect) => !active?.includes(dialect));
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
  addEventListeners() {
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('click', () => {
        d.manager.toggle(checkbox.name);
        this.update();
      });
    });
  }
  /**
   *
   */
  reset() {
    d.manager.reset();
    this.update();
  }
}
