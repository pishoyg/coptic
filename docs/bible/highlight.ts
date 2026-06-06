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
export class Highlighter extends high.DialectHighlighter<dial.Code> {
  /**
   * @param manager
   * @param checkboxes - The full list of checkboxes. Each checkbox should have
   * a name representing a dialect. An n-to-1 mapping (multiple boxes per
   * dialect) is permitted.
   */
  public constructor(
    protected override readonly manager: dial.Manager,
    checkboxes: HTMLInputElement[]
  ) {
    super(new high.CSSStyler(() => this.rule()), manager, checkboxes);
  }

  /**
   * @returns
   */
  private rule(): string | undefined {
    const inactive: dial.Code[] | undefined = this.manager.inactive();

    if (!inactive?.length) {
      return undefined;
    }

    return `${css.disjunction(...inactive)} { display: none; }`;
  }

  /**
   * Build keyboard shortcuts to toggle dialects.
   * @returns
   */
  public override shortcuts(): help.Shortcut[] {
    return dial.DIALECTS.map((dialect: dial.Dialect): help.Shortcut => {
      const span: HTMLSpanElement = document.createElement('span');
      span.append(...dialect.anchoredName());
      return new help.Shortcut(span, ['bible', 'chapter'], () => {
        this.toggle(dialect.code);
      });
    });
  }
}
