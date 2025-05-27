// TODO: We desire to implement highlighting for the Bible as well. Move shared
// functionality to an external package, and keep Lexicon-specific logic in this
// file.
import * as utils from '../utils.js';
import * as iam from '../iam.js';

const DIALECTS = [
  // The following dialects are found in Crum (and potentially others).
  'S',
  'Sa',
  'Sf',
  'A',
  'L',
  'B',
  'F',
  'Fb',
  'O',
  // The following dialects are only found in Marcion (part of Crum).
  'NH',
  // The following dialects are only found in TLA / KELLIA.
  'M',
  'P',
  'V',
  'W',
  'U',
];

export const ANY_DIALECT_QUERY = utils.classQuery(DIALECTS);

// DIALECT_SINGLE_CHAR is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
export const DIALECT_SINGLE_CHAR: Record<string, string> = {
  N: 'NH',
  a: 'Sa',
  f: 'Sf',
  b: 'Fb',
};

/**
 *
 */
export class Highlighter {
  // Sheets are problematic on Anki, for some reason! We update the elements
  // individually instead!
  // d is the name of the local-storage variable storing the list of active
  // dialects.
  private readonly d = 'd';
  // dev is the name of the local-storage variable storing the developer-mode
  // status.
  private readonly dev = 'dev';

  private readonly sheet: CSSStyleSheet | null;
  private readonly dialectRuleIndex: number;
  private readonly devRuleIndex: number;
  private readonly noDevRuleIndex: number;

  private static readonly BRIGHT = '1.0';
  private static readonly DIM = '0.3';
  /**
   *
   * @param anki
   * @param checkboxes
   */
  constructor(
    private readonly anki: boolean,
    private readonly checkboxes: HTMLInputElement[]
  ) {
    this.sheet = this.anki ? null : window.document.styleSheets[0]!;
    const length = this.sheet?.cssRules.length ?? 0;
    this.dialectRuleIndex = length;
    this.devRuleIndex = length + 1;
    this.noDevRuleIndex = length + 2;

    this.addListeners();
  }

  /**
   *
   */
  update(): void {
    this.updateDialects();
    this.updateDev();
  }

  /**
   *
   */
  updateDialects(): void {
    // We have three sources of dialect highlighting:
    // - Lexicon checkboxes
    // - .dialect elements in the HTML
    // - Keyboard shortcuts
    // Two of them (the elements and the checkboxes) require styling updates,
    // though the styling updates for the .dialect elements are included in the
    // style sheet.
    // This method should guarantee that, regardless of the source of the
    // change, all elements update accordingly.
    const active = this.activeDialects();

    if (!active) {
      // No dialect highlighting whatsoever.
      this.updateSheetOrElements(this.dialectRuleIndex, '.word *', '', (el) => {
        el.style.opacity = Highlighter.BRIGHT;
      });
      this.checkboxes.forEach((c) => {
        c.checked = false;
      });
      return;
    }

    // Some dialects are on, some are off.
    // Dim all children of `word` elements, with the exception of:
    // - Active dialects.
    // - Undialected spellings.
    const query = `.word > :not(${utils.classQuery(active)},.spelling:not(${ANY_DIALECT_QUERY}))`;
    const style = `opacity: ${Highlighter.DIM};`;
    this.updateSheetOrElements(
      this.dialectRuleIndex,
      query,
      style,
      (el) => {
        el.style.opacity = Highlighter.DIM;
      },
      '.word *',
      (el) => {
        el.style.opacity = Highlighter.BRIGHT;
      }
    );

    this.checkboxes.forEach((checkbox) => {
      checkbox.checked = active.includes(checkbox.name);
    });
  }

  /**
   *
   */
  updateDev(): void {
    const display =
      localStorage.getItem(this.dev) === 'true' ? 'block' : 'none';
    const noDisplay = display === 'block' ? 'none' : 'block';
    this.updateSheetOrElements(
      this.devRuleIndex,
      '.dev, .nag-hammadi, .senses',
      `display: ${display};`,
      (el: HTMLElement) => {
        el.style.display = display;
      }
    );
    this.updateSheetOrElements(
      this.noDevRuleIndex,
      '.no-dev',
      `display: ${noDisplay};`,
      (el: HTMLElement) => {
        el.style.display = noDisplay;
      }
    );
  }

  /**
   *
   * @param index
   * @param rule
   */
  private addOrReplaceRule(index: number, rule: string) {
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

  // If we're in Anki, we update the elements directly.
  // Otherwise, we update the CSS rules.
  // NOTE: If you're updating the sheet, then it's guaranteed that the update
  // will erase the effects of previous calls to this function.
  // However, if you're updating elements, that's not guaranteed. If this is the
  // case, you should pass a `reset_func` that resets the elements to the
  // default style.
  /**
   *
   * @param rule_index
   * @param query
   * @param style
   * @param func
   * @param reset_query
   * @param reset_func
   */
  private updateSheetOrElements(
    rule_index: number,
    query: string,
    style: string,
    func: (el: HTMLElement) => void,
    reset_query?: string,
    reset_func?: (el: HTMLElement) => void
  ): void {
    if (this.anki) {
      if (reset_query && reset_func) {
        document.querySelectorAll<HTMLElement>(reset_query).forEach(reset_func);
      }
      document.querySelectorAll<HTMLElement>(query).forEach(func);
      return;
    }

    this.addOrReplaceRule(rule_index, `${query} { ${style} }`);
  }

  /**
   */
  private addListeners() {
    this.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('click', () => {
        this.toggleDialect(checkbox.name);
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // If the user switches to a different tab and then back to the current
        // tab, it's possible that they have changing the highlighting settings
        // through the other tab. We therefore need to update the highlighting.
        this.update();
      }
    });

    document
      .querySelectorAll<HTMLElement>('.reset')
      .forEach((el: HTMLElement): void => {
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
   */
  reset(): void {
    // The local storage is the source of truth for some highlighting variables.
    // Clearing it results restores a pristine display.
    localStorage.clear();
    this.update();

    const url = new URL(window.location.href);
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
   *
   * @returns
   */
  activeDialects(): string[] | null {
    const d = localStorage.getItem(this.d);
    // NOTE: ''.split(',') returns [''], which is not what we want!
    return d ? d.split(',') : null;
  }

  /**
   *
   * @param dialect
   */
  toggleDialect(dialect: string): void {
    const active = new Set(this.activeDialects());

    if (active.has(dialect)) {
      active.delete(dialect);
    } else {
      active.add(dialect);
    }

    if (active.size) {
      localStorage.setItem(this.d, Array.from(active).join(','));
    } else {
      localStorage.removeItem(this.d);
    }

    this.updateDialects();
  }

  /**
   *
   */
  toggleDev(): void {
    localStorage.setItem(
      this.dev,
      localStorage.getItem(this.dev) === 'true' ? 'false' : 'true'
    );

    this.updateDev();
  }
}
