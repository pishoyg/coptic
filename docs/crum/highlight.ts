/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as dial from './dialect.js';
import * as ddial from '../dialect.js';
import * as browser from '../browser.js';
import * as help from '../help.js';
import * as high from '../highlight.js';

export enum CLS {
  DIALECT_CODE = 'dialect-code',
  DIALECT_NAME = 'dialect-name',
  DIALECT_DICTIONARIES = 'dialect-dictionaries',
}

/**
 *
 */
export class DevHighlighter extends dev.Highlighter {
  /**
   * @returns
   */
  override query(): string {
    return `.${dev.CLS.DEV}, .${cls.NAG_HAMMADI}, .${cls.SENSES}, .${cls.QUALITY}, .${cls.DRV_KEY}`;
  }

  /**
   *
   */
  constructor() {
    super();
    this.addEventListeners();
    this.update();
  }
}

/**
 */
export class Highlighter extends high.DialectHighlighter<dial.DIALECT> {
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
  constructor(manager: dial.Manager, checkboxes: HTMLInputElement[]) {
    let styler: high.Styler;

    if (iam.amI('anki')) {
      styler = new high.ElementStyler(
        () => this.query(),
        (el: HTMLElement): void => {
          el.style.opacity = Highlighter.DIM;
        },
        () => `.${cls.WORD} *`,
        (el: HTMLElement): void => {
          el.style.opacity = Highlighter.BRIGHT;
        }
      );
    } else {
      styler = new high.CSSStyler(() => this.rule());
    }

    super(styler, manager, checkboxes);
    this.addEventListeners();
    this.update();
  }

  /**
   * @returns
   */
  private rule(): string | undefined {
    const query: string | undefined = this.query();
    if (!query) {
      return undefined;
    }
    return `${query} { opacity: ${Highlighter.DIM}}`;
  }

  /**
   * @returns
   */
  private query(): string | undefined {
    const active: dial.DIALECT[] | undefined = this.manager.active();
    if (!active?.length) {
      return undefined;
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
    return `.${cls.WORD} > :not(${css.classQuery(...active)}, .${cls.SPELLING}:not(${dial.ANY_DIALECT_QUERY}), .${cls.DIALECT}), .${cls.WORD} > .${cls.DIALECT}:not(${css.classQuery(...active)}) .${ddial.CLS.SIGLUM}`;
  }

  /**
   * Reset display, and remove the URL fragment if present.
   */
  override reset(): void {
    super.reset();
    // Remove the URL fragment.
    if (iam.amI('lexicon') || iam.amI('anki')) {
      // Attempting to reload the page on Ankidroid opens a the browser at a
      // 127.0.0.0 port! We avoid reloading on all Anki platforms!
      // In Xooxle, there is no hash-based highlighting, so we don't need to
      // reload the page.
      return;
    }
    browser.removeFragment();
  }

  /**
   * @returns
   */
  override shortcuts(): help.Shortcut[] {
    return Object.values(dial.DIALECTS).map(this.shortcut.bind(this));
  }

  /**
   * Build a keyboard shortcut that toggles the given dialect.
   * TODO: (#179) Make this method private.
   * @param dialect
   * @returns
   */
  shortcut(dialect: dial.Dialect): help.Shortcut {
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
