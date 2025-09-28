/**
 * Package highlight defines basic highlighting.
 */
import * as ccls from './cls.js';
import * as head from './header.js';
import * as dial from './dialect.js';
import * as help from './help.js';

/**
 * Styler updates the styling of certain page elements.
 */
export interface Styler {
  update(): void;
}

/**
 * CSSStyler updates the style of elements using a CSS sheet rule.
 */
export class CSSStyler implements Styler {
  private readonly style: HTMLStyleElement = document.createElement('style');
  // We have a single rule, so the index is always zero.
  private readonly ruleIdx = 0;

  /**
   * @param rule - A factory that builds the CSS rule whenever an update is
   * needed, or undefined if the styling is currently disabled.
   */
  public constructor(private readonly rule: () => string | undefined) {
    // Add the style element to the document.
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
  public update(): void {
    // Delete the old rule.
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
 * ElementStyler is a styler controller that queries elements and modifies their
 * style directly.
 */
export class ElementStyler implements Styler {
  /**
   *
   * @param operations - A factory that returns a list of [query, modify] pairs
   * that represent operations to be performed on page elements to update their
   * styling. For each pair, the modifier will be applied to all the elements
   * retrieved by the query.
   */
  public constructor(
    private readonly operations: () => [string, (el: HTMLElement) => void][]
  ) {}

  /**
   *
   */
  public update(): void {
    this.operations().forEach(
      ([query, modify]: [string, (el: HTMLElement) => void]) => {
        document.querySelectorAll<HTMLElement>(query).forEach(modify);
      }
    );
  }
}

/**
 * Highlighter wraps a styler, invoking the styler's update methods in response
 * to page events.
 */
export abstract class Highlighter {
  // TODO: (#203) This should register against a global event type, and should
  // therefore be made protected rather than public.
  public abstract reset(): void;

  /**
   * Update style.
   */
  protected update(): void {
    this.styler.update();
  }

  /**
   * @param styler
   */
  public constructor(private readonly styler: Styler) {
    // NOTE: We defer the execution of initialization logic, instead of directly
    // calling it in the constructor, in order to ensure that the constructor of
    // child class have finished execution and that the object is fully
    // initialized with all the fields needed for the methods to execute.
    // This is necessary because child classes may have overridden the
    // initialization logic with logic that uses fields that get populated by
    // their constructors.

    // Update display once when the page loads.
    setTimeout(this.update.bind(this), 0);
    // Add event listeners.
    setTimeout(this.addEventListeners.bind(this), 0);
  }

  /**
   * addEventListeners defines event listeners shared by all highlighters.
   */
  protected addEventListeners(): void {
    // If the user switches to a different tab and then back to the current
    // tab, it's possible that they have changing the highlighting settings
    // through the other tab. We therefore need to update the highlighting.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.update();
      }
    });

    // A click on the reset element resets all display.
    // TODO: (#203) Use a global reset event type.
    document
      .querySelectorAll<HTMLElement>(`.${head.CLS.RESET}`)
      .forEach((el: HTMLElement): void => {
        el.classList.add(ccls.LINK);
        el.addEventListener('click', this.reset.bind(this));
      });
  }
}

/**
 * DialectHighlighter is a special type of highlighter that controls the
 * state of a set of dialects or languages, where each language could be on or
 * off.
 * @template C - A string type representing dialect codes.
 */
export abstract class DialectHighlighter<C extends string> extends Highlighter {
  public abstract shortcuts(): help.Shortcut[];

  /**
   *
   * @param styler - The styler that controls style of affected elements.
   * @param manager - A dialect manager.
   * @param checkboxes - List of checkboxes that control dialect
   * highlighting. Each box must bear a name equal to the dialect code that it
   * represents.
   * Checking a checkbox should update the dialect highlighting. Updating
   * dialect highlighting in some other way should also update the `checked`
   * property of the associated checkbox(es).
   */
  public constructor(
    styler: Styler,
    protected readonly manager: dial.Manager<C>,
    private readonly checkboxes: HTMLInputElement[]
  ) {
    super(styler);
  }

  /**
   * Update display.
   */
  protected override update(): void {
    super.update(); // Update element styling.
    // Also update the checkboxes.
    // For the checkbox that triggered the update, its `checked` state should be
    // up-to-date, and it doesn't need updating. However, there could be
    // multiple checkboxes for the same dialect. In that case, clicking on one
    // of them should update all.
    // It's also possible that the update didn't originate from a checkbox at
    // all (e.g. from a shortcut). We should still update the checkboxes in this
    // case to reflect the new highlighting.
    const active: C[] | undefined = this.manager.active();
    this.checkboxes.forEach((checkbox: HTMLInputElement): void => {
      checkbox.checked = !!active?.includes(checkbox.name as C);
    });
  }

  /**
   * Register event listeners.
   */
  protected override addEventListeners(): void {
    // Register all standard listeners.
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
   * Reset all dialect selection, and update display.
   */
  public override reset(): void {
    this.manager.reset(); // Reset dialect highlighting.
    this.update(); // Update display.
  }

  /**
   * Toggle the state of the given dialect, and update display.
   *
   * @param dialect - A dialect code.
   */
  public toggle(dialect: C): void {
    this.manager.toggle(dialect);
    this.update();
  }
}
