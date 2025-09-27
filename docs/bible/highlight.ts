/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as help from '../help.js';
import * as d from './dialect.js';
import * as highlight from '../highlight.js';

/**
 *
 */
export class Highlighter extends highlight.DialectHighlighter<d.DIALECT> {
  /**
   * @param manager
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  constructor(manager: d.Manager, checkboxes: HTMLInputElement[]) {
    super(
      new highlight.CSSStyler(manager.rule.bind(manager)),
      manager,
      checkboxes
    );
    this.update();
    this.addEventListeners();
  }

  /**
   * Build keyboard shortcuts to toggle dialects.
   * @returns
   */
  override shortcuts(): help.Shortcut[] {
    return d.DIALECTS.map((dialect: d.Dialect): help.Shortcut => {
      const span: HTMLSpanElement = document.createElement('span');
      span.append(...dialect.anchoredName());
      return new help.Shortcut(
        span,
        ['bible', 'chapter'],
        this.toggle.bind(this, dialect.code)
      );
    });
  }
}
