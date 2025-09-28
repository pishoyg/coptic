/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as help from '../help.js';
import * as css from '../css.js';
import * as dial from './dialect.js';
import * as high from '../highlight.js';
/**
 *
 */
export class Highlighter extends high.DialectHighlighter {
  /**
   * @param manager
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  constructor(manager, checkboxes) {
    super(new high.CSSStyler(() => this.rule()), manager, checkboxes);
  }
  /**
   * @returns
   */
  rule() {
    const active = this.manager.active();
    const inactive = dial.DIALECTS.filter(
      (dialect) => !active?.includes(dialect.name)
    ).map((dialect) => dialect.name);
    if (inactive.length === 0 || inactive.length === dial.DIALECTS.length) {
      // Dialects are all off or all on. Again, nothing to do!
      // Notice that this check is based on the list of dialects available on
      // this page, rather than on the list of all dialects.
      return undefined;
    }
    return `${css.classQuery(...inactive)} { display: none; }`;
  }
  /**
   * Build keyboard shortcuts to toggle dialects.
   * @returns
   */
  shortcuts() {
    return dial.DIALECTS.map((dialect) => {
      const span = document.createElement('span');
      span.append(...dialect.anchoredName());
      return new help.Shortcut(
        span,
        ['bible', 'chapter'],
        this.toggle.bind(this, dialect.code)
      );
    });
  }
}
