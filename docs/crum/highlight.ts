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
  /**
   * DIALECT_CODE is the class of the cell, in a dialect shortcut description,
   * bearing the dialect code.
   */
  DIALECT_CODE = 'dialect-code',
  /**
   * DIALECT_CODE is the class of the cell, in a dialect shortcut description,
   * bearing the dialect name.
   */
  DIALECT_NAME = 'dialect-name',
  /**
   * DIALECT_CODE is the class of the cell, in a dialect shortcut description,
   * bearing the list of dictionaries that this dialect belongs to.
   */
  DIALECT_DICTIONARIES = 'dialect-dictionaries',
}

/**
 * DevHighlighter is a highlighter that controls Crum's developer-mode elements.
 */
export class DevHighlighter extends dev.Highlighter {
  /**
   * @returns A query selecting all developer-mode-only elements.
   */
  protected override query(): string {
    return `.${dev.CLS.DEV}, .${cls.NAG_HAMMADI}, .${cls.SENSES}, .${cls.QUALITY}, .${cls.DRV_KEY}`;
  }
}

type Opacity = '1.0' | '0.3';
const BRIGHT: Opacity = '1.0';
const DIM: Opacity = '0.3';
/**
 * Set the opacity of the given element to the given value.
 * @param opacity
 * @param el
 */
function setOpacity(opacity: Opacity, el: HTMLElement): void {
  el.style.opacity = opacity;
}

/**
 * Crum's dialect highlighter.
 */
export class Highlighter extends high.DialectHighlighter<dial.DIALECT> {
  /**
   * @param manager - A dialect manager controlling the state of Crum's
   * dialects.
   * @param checkboxes - List of checkboxes that control dialect
   * highlighting. Each box must bear a name equal to the dialect code that it
   * represents.
   * Checking a checkbox should update the dialect highlighting. Updating
   * dialect highlighting in some other way should also update the checking of
   * the checkboxes.
   */
  public constructor(manager: dial.Manager, checkboxes: HTMLInputElement[]) {
    super(
      // CSS styler, which is our preferable styler, doesn't work on Anki. For
      // some reason! We therefore opt for an element styler.
      iam.amI('anki')
        ? new high.ElementStyler(() => Array.from(this.updates()))
        : new high.CSSStyler(() => this.rule()),
      manager,
      checkboxes
    );
  }

  /**
   * @returns - A CSS rule setting the style of the page elements, based on
   * selected dialects. If no dialect-based styling is desired, return
   * undefined.
   */
  private rule(): string | undefined {
    const query: string | undefined = this.query();
    if (!query) {
      return undefined;
    }
    return `${query} { opacity: ${DIM}}`;
  }

  /**
   * @returns
   */
  private *updates(): Generator<[string, (el: HTMLElement) => void]> {
    // Brighten all elements. This is necessary to undo all previous style
    // changes.
    yield [`.${cls.WORD} > *`, setOpacity.bind(null, BRIGHT)];
    const query: string | undefined = this.query();
    if (!query) {
      return;
    }
    // Dim selected elements.
    yield [query, setOpacity.bind(null, DIM)];
  }

  /**
   * @returns A query for all elements that need to be dimmed, based on the
   * current dialect selection.
   * If dialect selection is currently disabled, return undefined.
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
  public override reset(): void {
    super.reset();
    // TODO: (#203) Move to a separate highlighter.
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
   * @returns - A list of dialect shortcuts.
   * TODO: (#203) Either use in a standardized manner, or delete this method.
   * It's currently unused.
   */
  public override shortcuts(): help.Shortcut[] {
    return Object.values(dial.DIALECTS).map(this.shortcut.bind(this));
  }

  /**
   * Build a keyboard shortcut that toggles the given dialect.
   * TODO: (#203) Restructure the help panel pipeline in such a way that this
   * method can become private.
   *
   * @param dialect
   * @returns
   */
  public shortcut(dialect: dial.Dialect): help.Shortcut {
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
    const availability: iam.Identity[] = dialect.dictionaries.includes('Crum')
      ? ['lexicon', 'note', 'index']
      : ['lexicon'];
    return new help.Shortcut(
      table,
      availability,
      this.toggle.bind(this, dialect.code)
    );
  }
}
