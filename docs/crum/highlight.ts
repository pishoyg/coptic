/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 *
 * TODO: (#179) We intend to implement highlighting for the Bible as well. Move
 * shared functionality to an external package, and keep Lexicon-specific logic
 * in this file.
 */
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as header from '../header.js';
import * as logger from '../logger.js';
import * as d from './dialect.js';
import * as dd from '../dialect.js';
import * as browser from '../browser.js';
import * as help from '../help.js';

// On Anki, style sheets are problematic, for some reason! So we resort to
// updating individual elements in the page instead!
const ANKI: boolean = iam.amI('anki');
const STYLE: HTMLStyleElement | null = ANKI
  ? null
  : document.createElement('style');
if (STYLE) {
  document.head.appendChild(STYLE);
}

export enum CLS {
  DIALECT_CODE = 'dialect-code',
  DIALECT_NAME = 'dialect-name',
  DIALECT_DICTIONARIES = 'dialect-dictionaries',
}

/**
 */
export class Highlighter {
  private readonly dialectRuleIndex: number;
  private readonly devRuleIndex: number;

  private static readonly BRIGHT = '1.0';
  private static readonly DIM = '0.3';

  /**
   *
   * @param manager
   * @param checkboxes - List of checkboxes that control dialect
   * highlighting. Each box must bear a name equal to the dialect code that it
   * represents.
   * Checking a checkbox should update the dialect highlighting. Updating
   * dialect highlighting in some other way should also update the checking of
   * the checkboxes.
   */
  constructor(
    private readonly manager: d.Manager,
    private readonly checkboxes: HTMLInputElement[]
  ) {
    let length: number = STYLE?.sheet?.cssRules.length ?? 0;
    this.dialectRuleIndex = length++;
    this.devRuleIndex = length++;

    this.addEventListeners();

    // Update display once upon loading.
    this.update();
  }

  /**
   * Update dialects and developer-mode display.
   */
  update(): void {
    this.updateDialects();
    this.updateDev();
  }

  /**
   * Update dialect display.
   */
  updateDialects(): void {
    // We have three sources of dialect highlighting:
    // 1. Lexicon checkboxes
    // 2. .dialect elements in the HTML
    // 3. Keyboard shortcuts
    // NOTE: Make sure that checkboxes are updated whenever dialect highlighting
    // changes, regardless of the source of the change.
    const active: d.DIALECT[] | undefined = this.manager.active();

    if (!active?.length) {
      // No dialect highlighting whatsoever.
      // All dialects are visible.
      this.updateSheetOrElements(
        this.dialectRuleIndex,
        `.${cls.WORD} *`,
        '',
        (el) => {
          el.style.opacity = Highlighter.BRIGHT;
        }
      );
      // None of the checkboxes should be checked.
      this.checkboxes.forEach((c) => {
        c.checked = false;
      });
      return;
    }

    // Some dialects are on, some are off.
    // We do this through a CSS query that consists of two subqueries:
    // 1. Dim all children of `word` elements, with the exception of:
    //   - Any element with the class of an active dialect.
    //   - Spellings that have no dialect classes whatsoever. We have no way to
    //     know whether they belong to one of the active dialects, so we just
    //     keep them on.
    //   - Dialect codes contain tooltips as children. We don't want to dim the
    //     tooltips, so we give those special handling in the second subquery.
    // 2. For dialect codes of inactive dialects, dim only the sigla.
    //    This keeps the tooltips bright.
    const query = `.${cls.WORD} > :not(${css.classQuery(...active)}, .${cls.SPELLING}:not(${d.ANY_DIALECT_QUERY}), .${cls.DIALECT}), .${cls.WORD} > .${cls.DIALECT}:not(${css.classQuery(...active)}) .${dd.CLS.SIGLUM}`;
    const style = `opacity: ${Highlighter.DIM};`;
    this.updateSheetOrElements(
      this.dialectRuleIndex,
      query,
      style,
      (el) => {
        el.style.opacity = Highlighter.DIM;
      },
      `.${cls.WORD} *`,
      (el) => {
        el.style.opacity = Highlighter.BRIGHT;
      }
    );

    // Active dialects should have their checkboxes checked.
    this.checkboxes.forEach((checkbox) => {
      checkbox.checked = active.includes(checkbox.name as d.DIALECT);
    });
  }

  /**
   * Update developer-mode display.
   */
  updateDev(): void {
    type Visibility = 'block' | 'none';

    const display: Visibility = dev.get() ? 'block' : 'none';

    this.updateSheetOrElements(
      this.devRuleIndex,
      `.${dev.CLS.DEV}, .${cls.NAG_HAMMADI}, .${cls.SENSES}, .${cls.QUALITY}, .${cls.DRV_KEY}`,
      `display: ${display};`,
      (el: HTMLElement) => {
        el.style.display = display;
      }
    );
  }

  /**
   * Add or update the CSS rule at the given index.
   * @param index - Index of the rule.
   * @param rule - New rule.
   */
  private upsertRule(index: number, rule: string): void {
    if (!STYLE?.sheet) {
      logger.error(
        'Attempting to update sheet rules when the sheet is not set!'
      );
      return;
    }
    if (index < STYLE.sheet.cssRules.length) {
      STYLE.sheet.deleteRule(index);
    }
    STYLE.sheet.insertRule(rule, index);
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
   * @param ruleIndex - Index of the CSS rule to replace, if we were to update
   * a CSS rule.
   * @param query - Query that returns all affected elements.
   * @param style - CSS style that should be applied to the set of elements
   * returned by the query.
   *
   * @param func - A function that updates the style of the affected elements.
   * This is an alternative to the 'style' parameter, used only if we can't
   * update CSS rules.
   * @param resetQuery - A query that returns all elements potentially affected
   * by previous display updates.
   * @param resetFunc - A function that resets the display of all elements
   * potentially affected by previous display updates.
   */
  private updateSheetOrElements(
    ruleIndex: number,
    query: string,
    style: string,
    func: (el: HTMLElement) => void,
    resetQuery?: string,
    resetFunc?: (el: HTMLElement) => void
  ): void {
    if (ANKI) {
      if (resetQuery && resetFunc) {
        document.querySelectorAll<HTMLElement>(resetQuery).forEach(resetFunc);
      }
      document.querySelectorAll<HTMLElement>(query).forEach(func);
      return;
    }

    this.upsertRule(ruleIndex, `${query} { ${style} }`);
  }

  /**
   * Register event listeners.
   */
  private addEventListeners(): void {
    // A click on a checkbox triggers a dialect display update.
    this.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('click', () => {
        this.toggle(checkbox.name as d.DIALECT);
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
    document
      .querySelectorAll<HTMLElement>(`.${header.CLS.RESET}`)
      .forEach((el: HTMLElement): void => {
        el.classList.add(ccls.LINK);
        el.addEventListener('click', this.reset.bind(this));
      });
  }

  /**
   * Reset display, and remove the URL fragment if present.
   */
  reset(): void {
    dev.reset();
    this.manager.reset();
    this.update();

    // Remove the URL fragment.
    if (iam.amI('lexicon') || ANKI) {
      // Attempting to reload the page on Ankidroid opens a the browser at a
      // 127.0.0.0 port! We avoid reloading on all Anki platforms!
      // In Xooxle, there is no hash-based highlighting, so we don't need to
      // reload the page.
      return;
    }
    browser.removeFragment();
  }

  /**
   * Toggle the highlighting of the given dialect.
   *
   * @param dialect - A dialect code.
   */
  toggle(dialect: d.DIALECT): void {
    this.manager.toggle(dialect);
    this.updateDialects();
  }

  /**
   * Toggle developer mode, and update display.
   */
  toggleDev(): void {
    dev.toggle();
    this.updateDev();
  }

  /**
   * Build a keyboard shortcut that toggles the given dialect.
   *
   * @param dialect
   * @returns
   */
  shortcut(dialect: d.Dialect): help.Shortcut {
    const table = document.createElement('table');
    const tr = document.createElement('tr');

    // Create the first <td> (dialect code)
    const tdCode = document.createElement('td');
    tdCode.classList.add(CLS.DIALECT_CODE);
    tdCode.append(dialect.siglum());
    tr.appendChild(tdCode);

    // Create the second <td> (dialect name)
    const tdName = document.createElement('td');
    tdName.classList.add(CLS.DIALECT_NAME);
    tdName.append(...dialect.anchoredName());
    tr.appendChild(tdName);

    // Conditionally add the third <td> (dictionaries)
    if (iam.amI('lexicon')) {
      const tdDictionaries = document.createElement('td');
      tdDictionaries.classList.add(CLS.DIALECT_DICTIONARIES);
      tdDictionaries.textContent = `(${dialect.dictionaries.join(', ')})`;
      tr.appendChild(tdDictionaries);
    }

    // Append the <tr> to the <table>
    table.appendChild(tr);

    // Crum dialects are available on several Crum page identities.
    // Non-Crum dialects are only used in Lexicon.
    const availability: iam.Where[] = dialect.dictionaries.includes('Crum')
      ? ['lexicon', 'note', 'index']
      : ['lexicon'];
    return new help.Shortcut(
      table,
      availability,
      this.toggle.bind(this, dialect.code)
    );
  }
}
