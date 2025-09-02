/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 *
 * TODO: (#179) We desire to implement highlighting for the Bible as well. Move
 * shared functionality to an external package, and keep Lexicon-specific logic
 * in this file.
 */
import * as css from '../css.js';
import * as iam from '../iam.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as header from '../header.js';
import * as d from './dialect.js';
/**
 * NOTE: We used to implement highlighting by updating CSS rules. This didn't
 * work on Anki, so we maintained two separate highlighting control methods:
 * 1. Updating CSS rules on web.
 * 2. Updating elements directly on Anki.
 * We have recently opted for maintaining the latter only, for the following
 * reasons:
 * - To simplify the logic.
 * - To avoid browser CSS rule conflicts. (When two CSS rules are conflicting,
 *   browsers get to choose which one to respect. But when we update element
 *   display directly, we guarantee that our updates will be reflected.)
 */
export class Highlighter {
  dialectCheckboxes;
  static BRIGHT = '1.0';
  static DIM = '0.3';
  /**
   *
   * @param dialectCheckboxes - List of checkboxes that control dialect
   * highlighting. Each box must bear a name equal to the dialect code that it
   * represents.
   * Checking a checkbox should update the dialect highlighting. Updating
   * dialect highlighting in some other way should also update the checking of
   * the checkboxes.
   */
  constructor(dialectCheckboxes) {
    this.dialectCheckboxes = dialectCheckboxes;
    this.addEventListeners();
    // Update display once upon loading.
    this.update();
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
    const active = d.active();
    if (!active?.length) {
      css.setOpacity(`.${cls.WORD} *`, Highlighter.BRIGHT);
      this.dialectCheckboxes.forEach((c) => {
        c.checked = false;
      });
      return;
    }
    css.setOpacity(`.${cls.WORD} *`, Highlighter.BRIGHT);
    css.setOpacity(
      `.${cls.WORD} > :not(${css.classQuery(...active)}, .${cls.SPELLING}:not(${d.ANY_DIALECT_QUERY}))`,
      Highlighter.DIM
    );
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
    css.setDisplay(
      `.${dev.CLS.DEV}, .${cls.NAG_HAMMADI}, .${cls.SENSES}, .${cls.QUALITY}`,
      display
    );
    css.setDisplay(`.${dev.CLS.NO_DEV}`, noDisplay);
  }
  /**
   * Register event listeners.
   */
  addEventListeners() {
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
    document.querySelectorAll(`.${header.CLS.RESET}`).forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', this.reset.bind(this));
    });
  }
  /**
   * Reset display, and remove the URL fragment if present.
   */
  reset() {
    dev.reset();
    d.reset();
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
