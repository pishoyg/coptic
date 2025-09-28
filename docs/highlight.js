/**
 * Package highlight defines basic highlighting.
 */
import * as ccls from './cls.js';
import * as head from './header.js';
/**
 * CSSStyler updates the style of elements using a CSS sheet rule.
 */
export class CSSStyler {
  rule;
  style = document.createElement('style');
  // We have a single rule, so the index is always zero.
  ruleIdx = 0;
  /**
   * @param rule - A factory that builds the CSS rule whenever an update is
   * needed, or undefined if the styling is currently disabled.
   */
  constructor(rule) {
    this.rule = rule;
    // Add the style element to the document.
    document.head.appendChild(this.style);
  }
  /**
   * @returns
   */
  get sheet() {
    return this.style.sheet;
  }
  /**
   *
   */
  update() {
    // Delete the old rule.
    if (this.ruleIdx < this.sheet.cssRules.length) {
      this.sheet.deleteRule(this.ruleIdx);
    }
    const rule = this.rule();
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
export class ElementStyler {
  operations;
  /**
   *
   * @param operations - A factory that returns a list of [query, modify] pairs
   * that represent operations to be performed on page elements to update their
   * styling. For each pair, the modifier will be applied to all the elements
   * retrieved by the query.
   */
  constructor(operations) {
    this.operations = operations;
  }
  /**
   *
   */
  update() {
    this.operations().forEach(([query, modify]) => {
      document.querySelectorAll(query).forEach(modify);
    });
  }
}
/**
 * Highlighter wraps a styler, invoking the styler's update methods in response
 * to page events.
 */
export class Highlighter {
  styler;
  /**
   * Update style.
   */
  update() {
    this.styler.update();
  }
  /**
   * @param styler
   */
  constructor(styler) {
    // NOTE: We defer the execution of initialization logic, instead of directly
    // calling it in the constructor, in order to ensure that the constructor of
    // child class have finished execution and that the object is fully
    // initialized with all the fields needed for the methods to execute.
    // This is necessary because child classes may have overridden the
    // initialization logic with logic that uses fields that get populated by
    // their constructors.
    this.styler = styler;
    // Update display once when the page loads.
    setTimeout(this.update.bind(this), 0);
    // Add event listeners.
    setTimeout(this.addEventListeners.bind(this), 0);
  }
  /**
   * addEventListeners defines event listeners shared by all highlighters.
   */
  addEventListeners() {
    // If the user switches to a different tab and then back to the current
    // tab, it's possible that they have changing the highlighting settings
    // through the other tab. We therefore need to update the highlighting.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.update();
      }
    });
    // A click on the reset element resets all display.
    // TODO: (#179) Use a global reset event type.
    document.querySelectorAll(`.${head.CLS.RESET}`).forEach((el) => {
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
export class DialectHighlighter extends Highlighter {
  manager;
  checkboxes;
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
  constructor(styler, manager, checkboxes) {
    super(styler);
    this.manager = manager;
    this.checkboxes = checkboxes;
  }
  /**
   * Update display.
   */
  update() {
    super.update(); // Update element styling.
    // Also update the checkboxes.
    // For the checkbox that triggered the update, its `checked` state should be
    // up-to-date, and it doesn't need updating. However, there could be
    // multiple checkboxes for the same dialect. In that case, clicking on one
    // of them should update all.
    // It's also possible that the update didn't originate from a checkbox at
    // all (e.g. from a shortcut). We should still update the checkboxes in this
    // case to reflect the new highlighting.
    const active = this.manager.active();
    this.checkboxes.forEach((checkbox) => {
      checkbox.checked = !!active?.includes(checkbox.name);
    });
  }
  /**
   * Register event listeners.
   */
  addEventListeners() {
    // Register all standard listeners.
    super.addEventListeners();
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('click', this.toggle.bind(this, checkbox.name));
    });
  }
  /**
   * Reset all dialect selection, and update display.
   */
  reset() {
    this.manager.reset(); // Reset dialect highlighting.
    this.update(); // Update display.
  }
  /**
   * Toggle the state of the given dialect, and update display.
   *
   * @param dialect - A dialect code.
   */
  toggle(dialect) {
    this.manager.toggle(dialect);
    this.update();
  }
}
