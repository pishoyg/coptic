/**
 * Package highlight defines basic highlighting.
 */
import * as ccls from './cls.js';
import * as header from './header.js';
import * as d from './dialect.js';
import * as help from './help.js';

/**
 *
 */
export interface Styler {
  update(): void;
}

/**
 *
 */
export class CSSStyler implements Styler {
  private readonly style: HTMLStyleElement = document.createElement('style');
  private readonly ruleIdx = 0; // We have a single rule.
  /**
   *
   * @param rule
   */
  constructor(private readonly rule: () => string | undefined) {
    document.head.appendChild(this.style);
  }

  /**
   * @returns
   */
  private get sheet(): CSSStyleSheet {
    return this.style.sheet!;
  }

  /**
   *
   */
  update(): void {
    if (this.ruleIdx < this.sheet.cssRules.length) {
      this.sheet.deleteRule(this.ruleIdx);
    }
    const rule: string | undefined = this.rule();
    if (!rule) {
      return;
    }
    this.sheet.insertRule(rule, this.ruleIdx);
  }
}

/**
 *
 */
export class ElementStyler implements Styler {
  /**
   *
   * @param query
   * @param modify
   * @param allQuery
   * @param restore
   */
  constructor(
    private readonly query: () => string | undefined,
    private readonly modify: (el: HTMLElement) => void,
    private readonly allQuery?: () => string,
    private readonly restore?: (el: HTMLElement) => void
  ) {}

  /**
   *
   * @param query
   * @param modify
   */
  private static forEach(
    query: string,
    modify: (el: HTMLElement) => void
  ): void {
    document.querySelectorAll<HTMLElement>(query).forEach(modify);
  }

  /**
   *
   */
  update(): void {
    if (this.allQuery && this.restore) {
      ElementStyler.forEach(this.allQuery(), this.restore);
    }
    const query: string | undefined = this.query();
    if (!query) {
      return;
    }
    ElementStyler.forEach(query, this.modify);
  }
}

/**
 *
 */
export abstract class Highlighter {
  abstract reset(): void;

  /**
   *
   */
  update(): void {
    this.styler.update();
  }

  /**
   * @param styler
   */
  constructor(private readonly styler: Styler) {}

  /**
   *
   */
  addEventListeners(): void {
    // Switching tabs triggers a display update. This is because it's possible
    // that, while we were on the second tab, we updated the display. This
    // listener ensures that, when we are back to the first tab, the display
    // changes applied in the second tab will also be made here.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // If the user switches to a different tab and then back to the current
        // tab, it's possible that they have changing the highlighting settings
        // through the other tab. We therefore need to update the highlighting.
        this.update();
      }
    });

    // A click on the reset element resets all display.
    document
      .querySelectorAll<HTMLElement>(`.${header.CLS.RESET}`)
      .forEach((el: HTMLElement): void => {
        el.classList.add(ccls.LINK);
        el.addEventListener('click', this.reset.bind(this));
      });
  }
}

/**
 */
export abstract class DialectHighlighter<C extends string> extends Highlighter {
  abstract shortcuts(): help.Shortcut[];

  /**
   *
   * @param styler
   * @param manager
   * @param checkboxes - List of checkboxes that control dialect
   * highlighting. Each box must bear a name equal to the dialect code that it
   * represents.
   * Checking a checkbox should update the dialect highlighting. Updating
   * dialect highlighting in some other way should also update the checking of
   * the checkboxes.
   */
  constructor(
    styler: Styler,
    protected readonly manager: d.Manager<C>,
    private readonly checkboxes: HTMLInputElement[]
  ) {
    super(styler);
  }

  /**
   *
   */
  override update(): void {
    super.update();
    const active: C[] | undefined = this.manager.active();
    this.checkboxes.forEach((checkbox: HTMLInputElement): void => {
      checkbox.checked = !!active?.includes(checkbox.name as C);
    });
  }

  /**
   * Register event listeners.
   */
  override addEventListeners(): void {
    super.addEventListeners();
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox: HTMLInputElement): void => {
      checkbox.addEventListener(
        'click',
        this.toggle.bind(this, checkbox.name as C)
      );
    });
  }

  /**
   * Reset display, and remove the URL fragment if present.
   */
  override reset(): void {
    this.manager.reset();
    this.update();
  }

  /**
   * Toggle the highlighting of the given dialect.
   *
   * @param dialect - A dialect code.
   */
  toggle(dialect: C): void {
    this.manager.toggle(dialect);
    this.update();
  }
}
