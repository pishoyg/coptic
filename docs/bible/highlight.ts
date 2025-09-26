/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as help from '../help.js';
import * as d from './dialect.js';

const SHEET: CSSStyleSheet = ((): CSSStyleSheet => {
  const style: HTMLStyleElement = document.createElement('style');
  document.head.appendChild(style);
  return style.sheet!;
})();
const RULE_IDX = 0; // The sheet has a single rule.

/**
 *
 */
export class Highlighter {
  /**
   * @param manager
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  constructor(
    private readonly manager: d.Manager,
    private readonly checkboxes: HTMLInputElement[]
  ) {
    this.addEventListeners();
    this.update();
  }

  /**
   * Update dialect display.
   */
  update(): void {
    const active: d.DIALECT[] | undefined = this.manager.active();
    // Set checkboxes.
    this.checkboxes.forEach((c: HTMLInputElement): void => {
      c.checked = !!active?.includes(c.name as d.DIALECT);
    });

    // Delete the old rule.
    if (RULE_IDX < SHEET.cssRules.length) {
      SHEET.deleteRule(RULE_IDX);
    }

    const inactive: d.DIALECT[] = d.DIALECTS.filter(
      (dialect: d.Dialect): boolean => !active?.includes(dialect.name)
    ).map((dialect: d.Dialect): d.DIALECT => dialect.name);
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
  toggle(dialect: d.DIALECT): void {
    this.manager.toggle(dialect);
    this.update();
  }

  /**
   * Register event listeners.
   */
  addEventListeners(): void {
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox: HTMLInputElement): void => {
      checkbox.addEventListener(
        'click',
        this.toggle.bind(this, checkbox.name as d.DIALECT)
      );
    });
  }

  /**
   *
   */
  reset(): void {
    this.manager.reset();
    this.update();
  }

  /**
   * Build a keyboard shortcut that toggles this dialect.
   *
   * @param dialect
   * @returns
   */
  shortcut(dialect: d.Dialect): help.Shortcut {
    const span: HTMLSpanElement = document.createElement('span');
    span.append(...dialect.anchoredName());
    return new help.Shortcut(
      span,
      ['bible', 'chapter'],
      this.toggle.bind(this, dialect.code)
    );
  }
}
