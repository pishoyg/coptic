/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as help from '../help.js';
import * as d from './dialect.js';
const SHEET = (() => {
  const style = document.createElement('style');
  document.head.appendChild(style);
  return style.sheet;
})();
const RULE_IDX = 0; // The sheet has a single rule.
/**
 *
 */
export class Highlighter {
  manager;
  checkboxes;
  /**
   * @param manager
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  constructor(manager, checkboxes) {
    this.manager = manager;
    this.checkboxes = checkboxes;
    this.addEventListeners();
    this.update();
  }
  /**
   * Update dialect display.
   */
  update() {
    const active = this.manager.active();
    // Set checkboxes.
    this.checkboxes.forEach((c) => {
      c.checked = !!active?.includes(c.name);
    });
    // Delete the old rule.
    if (RULE_IDX < SHEET.cssRules.length) {
      SHEET.deleteRule(RULE_IDX);
    }
    const inactive = d.DIALECTS.filter(
      (dialect) => !active?.includes(dialect.name)
    ).map((dialect) => dialect.name);
    if (inactive.length === 0 || inactive.length === d.DIALECTS.length) {
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
   *
   * @param dialect
   */
  toggle(dialect) {
    this.manager.toggle(dialect);
    this.update();
  }
  /**
   * Register event listeners.
   */
  addEventListeners() {
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('click', this.toggle.bind(this, checkbox.name));
    });
  }
  /**
   *
   */
  reset() {
    this.manager.reset();
    this.update();
  }
  /**
   * Build a keyboard shortcut that toggles this dialect.
   *
   * @param dialect
   * @returns
   */
  shortcut(dialect) {
    const span = document.createElement('span');
    span.append(...dialect.anchoredName());
    return new help.Shortcut(
      span,
      ['bible', 'chapter'],
      this.toggle.bind(this, dialect.code)
    );
  }
}
