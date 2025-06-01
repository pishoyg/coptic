// TODO: (#179) We desire to implement highlighting for the Bible as well. Move
// shared functionality to an external package, and keep Lexicon-specific logic
// in this file.
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as dev from '../dev.js';
import * as d from './dialect.js';
var CLS;
(function (CLS) {
  CLS['reset'] = 'reset';
  CLS['word'] = 'word';
  CLS['spelling'] = 'spelling';
  CLS['dev'] = 'dev';
  CLS['nag_hammadi'] = 'nag-hammadi';
  CLS['senses'] = 'senses';
  CLS['no_dev'] = 'no-dev';
})(CLS || (CLS = {}));
/**
 *
 */
export class Highlighter {
  anki;
  dialectCheckboxes;
  // Sheets are problematic on Anki, for some reason! We update the elements
  // individually instead!
  sheet;
  dialectRuleIndex;
  devRuleIndex;
  noDevRuleIndex;
  static BRIGHT = '1.0';
  static DIM = '0.3';
  /**
   *
   * @param anki - Whether we are running on Anki.
   * @param dialectCheckboxes - List of checkboxes that control dialect
   * highlighting. Each box must bear a name equal to the dialect code that it
   * represents.
   * Checking a checkbox should update the dialect highlighting. Updating
   * dialect highlighting in some other way should also update the checking of
   * the checkboxes.
   */
  constructor(anki, dialectCheckboxes) {
    this.anki = anki;
    this.dialectCheckboxes = dialectCheckboxes;
    this.sheet = this.anki ? undefined : window.document.styleSheets[0];
    const length = this.sheet?.cssRules.length ?? 0;
    this.dialectRuleIndex = length;
    this.devRuleIndex = length + 1;
    this.noDevRuleIndex = length + 2;
    this.addListeners();
  }
  /**
   * Update dialects and developer-mode display.
   */
  update() {
    this.updateDialects();
    this.updateDev();
  }
  /**
   * Update dialect display.
   */
  updateDialects() {
    // We have three sources of dialect highlighting:
    // 1. Lexicon checkboxes
    // 2. .dialect elements in the HTML
    // 3. Keyboard shortcuts
    // NOTE: Make sure that checkboxes are updated whenever dialect highlighting
    // changes, regardless of the source of the change.
    const active = d.active();
    if (!active) {
      // No dialect highlighting whatsoever.
      // All dialects are visible.
      this.updateSheetOrElements(
        this.dialectRuleIndex,
        `.${CLS.word} *`,
        '',
        (el) => {
          el.style.opacity = Highlighter.BRIGHT;
        }
      );
      // None of the checkboxes should be checked.
      this.dialectCheckboxes.forEach((c) => {
        c.checked = false;
      });
      return;
    }
    // Some dialects are on, some are off.
    // Dim all children of `word` elements, with the exception of:
    // - Active dialects.
    // - Undialected spellings.
    const query = `.${CLS.word} > :not(${css.classQuery(active)}, .${CLS.spelling}:not(${d.ANY_DIALECT_QUERY}))`;
    const style = `opacity: ${Highlighter.DIM};`;
    this.updateSheetOrElements(
      this.dialectRuleIndex,
      query,
      style,
      (el) => {
        el.style.opacity = Highlighter.DIM;
      },
      `.${CLS.word} *`,
      (el) => {
        el.style.opacity = Highlighter.BRIGHT;
      }
    );
    // Active dialects should have their checkboxes checked.
    this.dialectCheckboxes.forEach((checkbox) => {
      checkbox.checked = active.includes(checkbox.name);
    });
  }
  /**
   * Update developer-mode display.
   */
  updateDev() {
    const display = dev.get() ? 'block' : 'none';
    const noDisplay = display === 'block' ? 'none' : 'block';
    this.updateSheetOrElements(
      this.devRuleIndex,
      `.${CLS.dev}, .${CLS.nag_hammadi}, .${CLS.senses}`,
      `display: ${display};`,
      (el) => {
        el.style.display = display;
      }
    );
    this.updateSheetOrElements(
      this.noDevRuleIndex,
      `.${CLS.no_dev}`,
      `display: ${noDisplay};`,
      (el) => {
        el.style.display = noDisplay;
      }
    );
  }
  /**
   * Add or update the CSS rule at the given index.
   * @param index - Index of the rule.
   * @param rule - New rule.
   */
  upsertRule(index, rule) {
    if (!this.sheet) {
      console.error(
        'Attempting to update sheet rules when the sheet is not set!'
      );
      return;
    }
    if (index < this.sheet.cssRules.length) {
      this.sheet.deleteRule(index);
    }
    this.sheet.insertRule(rule, index);
  }
  /**
   * If possible, we update the CSS rule and call it a day.
   * If we're in Anki, we can't do that, and we have to resort to updating
   * elements individually. We therefore ask for more parameters to make this
   * possible.
   *
   * NOTE: If you're updating the sheet, then it's guaranteed that the update
   * will erase the effects of all previous updates, simply because the old CSS
   * rule gets deleted, and a new rule is created in its stead.
   * However, if you're updating elements, it's not guaranteed that the new
   * update will erase the effects of previous updates. If this is the case, you
   * should pass a `reset_func` that resets the elements to the default style.
   *
   * @param rule_index - Index of the CSS rule to replace, if we were to update
   * a CSS rule.
   * @param query - Query that returns all affected elements.
   * @param style - CSS style that should be applied to the set of elements
   * returned by the query.
   *
   * @param func - A function that updates the style of the affected elements.
   * This is an alternative to the 'style' parameter, used only if we can't
   * update CSS rules.
   * @param reset_query - A query that returns all elements potentially affected
   * by previous display updates.
   * @param reset_func - A function that resets the display of all elements
   * potentially affected by previous display updates.
   */
  updateSheetOrElements(
    rule_index,
    query,
    style,
    func,
    reset_query,
    reset_func
  ) {
    if (this.anki) {
      if (reset_query && reset_func) {
        document.querySelectorAll(reset_query).forEach(reset_func);
      }
      document.querySelectorAll(query).forEach(func);
      return;
    }
    this.upsertRule(rule_index, `${query} { ${style} }`);
  }
  /**
   * Register event listeners.
   */
  addListeners() {
    // A click on a checkbox triggers a dialect display update.
    this.dialectCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('click', () => {
        this.toggleDialect(checkbox.name);
      });
    });
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
    document.querySelectorAll(`.${CLS.reset}`).forEach((el) => {
      el.classList.add('link');
      el.onclick = (event) => {
        this.reset();
        // On Xooxle, clicking the button would normally submit the form and
        // reset everything (including the search box and the option
        // checkboxes). So prevent the event from propagating further.
        event.preventDefault();
      };
    });
  }
  /**
   * Reset display, and remove the URL fragment if present.
   */
  reset() {
    // The local storage is the source of truth for all highlighting variables.
    // Clearing it results restores a pristine display.
    localStorage.clear();
    this.update();
    // Remove the URL fragment.
    // NOTE: We only reload when we actually detect an anchor (hash) or text
    // fragment in order to minimize disruption. Reloading the page causes a
    // small jitter.
    // NOTE: `url.hash` doesn't include text fragments (`#:~:text=`),
    // which is why we need to use `performance.getEntriesByType('navigation')`.
    // However, the latter doesn't always work, for some reason. In our
    // experience, it can retrieve the text fragment once, but if you reset and
    // then add a text fragment manually, it doesn't recognize it! This is not a
    // huge issue right now, so we aren't prioritizing fixing it!
    // NOTE: Attempting to reload the page on Ankidroid opens a the browser at a
    // 127.0.0.0 port! We avoid reloading on all Anki platforms!
    // NOTE: In Xooxle, there is no hash-based highlighting, so we don't need to
    // reload the page.
    if (iam.amI('lexicon')) {
      return;
    }
    const url = new URL(window.location.href);
    if (
      !url.hash &&
      !performance.getEntriesByType('navigation')[0]?.name.includes('#')
    ) {
      return;
    }
    url.hash = '';
    window.history.replaceState('', '', url.toString());
    // Reload to get rid of the highlighting caused by the hash / fragment,
    // if any.
    if (iam.amI('anki')) {
      return;
    }
    window.location.reload();
  }
  /**
   * Toggle the highlighting of the given dialect.
   *
   * @param dialect - A dialect code.
   */
  toggleDialect(dialect) {
    d.toggle(dialect);
    this.updateDialects();
  }
  /**
   * Toggle developer mode, and update display.
   */
  toggleDev() {
    dev.toggle();
    this.updateDev();
  }
}
