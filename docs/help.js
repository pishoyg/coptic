/** Package help defines logic for a help panel. */
import * as iam from './iam.js';
import * as cls from './cls.js';
import * as log from './logger.js';
const TITLE = 'Keyboard Shortcuts';
var CLS;
(function (CLS) {
  CLS['OVERLAY_BACKGROUND'] = 'overlay-background';
  CLS['INFO_PANEL'] = 'info-panel';
  CLS['CLOSE_BTN'] = 'close-btn';
})(CLS || (CLS = {}));
var ID;
(function (ID) {
  ID['HELP'] = 'help';
  ID['FOOTER'] = 'footer';
})(ID || (ID = {}));
/**
 * CODE_TO_KEY maps a keyboard event code to the event key.
 *
 * Our event listeners rely on event keys rather than codes. If the user
 * switches the layout from English to Coptic or some other language, the event
 * keys won't be understood by our listeners. However, the event codes are the
 * same across languages.
 *
 * The map allows us to infer the equivalent English key of a given keyboard
 * event, thus allowing us to translate the keyboard event (in a foreign
 * language) to an event that our listeners can actually consume.
 */
const CODE_TO_KEY = {
  // Letters
  KeyA: 'a',
  KeyB: 'b',
  KeyC: 'c',
  KeyD: 'd',
  KeyE: 'e',
  KeyF: 'f',
  KeyG: 'g',
  KeyH: 'h',
  KeyI: 'i',
  KeyJ: 'j',
  KeyK: 'k',
  KeyL: 'l',
  KeyM: 'm',
  KeyN: 'n',
  KeyO: 'o',
  KeyP: 'p',
  KeyQ: 'q',
  KeyR: 'r',
  KeyS: 's',
  KeyT: 't',
  KeyU: 'u',
  KeyV: 'v',
  KeyW: 'w',
  KeyX: 'x',
  KeyY: 'y',
  KeyZ: 'z',
  // Numbers
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Digit0: '0',
  // Punctuation & Symbols
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
};
/**
 * SHIFT_MAP gives the key of a given keyboard event code, when the shift key is
 * pressed. For codes absent from this map, the key may simply be retrievable by
 * uppercasing the key from CODE_TO_KEY.
 */
const SHIFT_MAP = {
  // Special characters when Shift is pressed
  Digit1: '!',
  Digit2: '@',
  Digit3: '#',
  Digit4: '$',
  Digit5: '%',
  Digit6: '^',
  Digit7: '&',
  Digit8: '*',
  Digit9: '(',
  Digit0: ')',
  Minus: '_',
  Equal: '+',
  BracketLeft: '{',
  BracketRight: '}',
  Backslash: '|',
  Semicolon: ':',
  Quote: '"',
  Comma: '<',
  Period: '>',
  Slash: '?',
};
/**
 * Bolden the given text, for the purposes of the help panel.
 *
 * To make it easier for users to memorize keyboard shortcuts, the shortcut
 * description boldens the character that inspired the key. For example, if `B`
 * toggles `Bohairic`, then the description of the shortcut should show the word
 * as `*B*ohairic` with the `B` boldened, to make it obvious why the key `B` was
 * selected for this shortcut.
 *
 * @param char
 * @returns A plain HTML string representing a highlighted version of the given
 * string.
 */
export function highlight(char) {
  return `<strong>${char}</strong>`;
}
/**
 * Highlight the first occurrence of the given character in the given string.
 * @param char - Character to search for.
 * @param str - An HTML string, potentially containing tags.
 * @returns - A copy of the string, with the first occurrence of the given
 * character wrapped in a <strong> tag.
 * If the string looks like it has other HTML tags, we return the original
 * string without modifying it.
 */
export function highlightFirstOccurrence(char, str) {
  if (str.includes('<')) {
    // This might already have an HTML tag, so we don't risk highlighting it to
    // avoid breaking something.
    return str;
  }
  const index = str.toLowerCase().indexOf(char.toLowerCase());
  if (index === -1) {
    return str;
  }
  return `${str.slice(0, index)}${highlight(str[index])}${str.slice(index + 1)}`;
}
/**
 *
 */
export class Shortcut {
  description;
  identities;
  action;
  /**
   *
   * @param description - Description of what this shortcut does.
   * @param identities - List of page identities where this shortcut is
   * available.
   * @param action - Action that this shortcut performs.
   */
  constructor(description, identities, action) {
    this.description = description;
    this.identities = identities;
    this.action = action;
  }
  /**
   *
   * @returns Whether this shortcut is available on this page.
   */
  available() {
    return this.identities.some(iam.amI);
  }
  /**
   * Try to process the given event.
   * @param event
   * @returns True if the event is successfully consumed, false otherwise.
   */
  consume(event) {
    if (!this.available()) {
      return false;
    }
    // Actions throw an exception if they cannot consume the event.
    try {
      this.action(event);
      return true;
    } catch {
      return false;
    }
  }
  /**
   *
   * @param key
   * @returns
   */
  keyCell(key) {
    const cell = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = key;
    cell.appendChild(code);
    // TODO: (#241) Move the styling to CSS.
    cell.style.width = '10%';
    cell.style.border = '1px solid black';
    cell.style.padding = '8px';
    return cell;
  }
  /**
   * @param key
   * @returns
   */
  descriptionCell(key) {
    const cell = document.createElement('td');
    if (typeof this.description === 'string') {
      cell.innerHTML = highlightFirstOccurrence(key, this.description);
    } else {
      cell.append(this.description);
    }
    // TODO: (#241) Move the styling to CSS.
    cell.style.width = '90%';
    cell.style.border = '1px solid black';
    cell.style.padding = '8px';
    return cell;
  }
  /**
   * Build a row in the help panel representing this shortcut.
   * @param key - The key activating this shortcut.
   * @returns - An HTML table row element, to be displayed in the help panel,
   * showing what this shortcut does and how to invoke it.
   */
  row(key) {
    const row = document.createElement('tr');
    row.append(this.keyCell(key), this.descriptionCell(key));
    return row;
  }
  /**
   *
   * @returns
   */
  textDescription() {
    return typeof this.description === 'string'
      ? this.description.replace(/<.*?>/g, '')
      : this.description.textContent;
  }
}
/**
 * Section represents a group of related shortcuts into a separate section in
 * the help panel.
 */
export class Section {
  title;
  shortcuts;
  /**
   *
   * @param title
   * @param shortcuts - A record mapping a key to a list of shortcuts invoked by
   * this key.
   * Notice that, although we allow a single event to be triggered in response
   * to a key, we allow multiple shortcuts to exist per key, because some of
   * those shortcuts may not be available on this page.
   */
  constructor(title, shortcuts) {
    this.title = title;
    this.shortcuts = shortcuts;
  }
  /**
   *
   * @returns
   */
  html() {
    const div = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = this.title;
    div.appendChild(title);
    const table = document.createElement('table');
    // TODO: (#241) Move the styling to CSS.
    table.style.width = '100%'; // Make the table take 100% of the container width
    table.style.borderCollapse = 'collapse'; // Optional: to collapse the borders
    // Append a row for each visible shortcut.
    table.append(
      ...Object.entries(this.shortcuts).flatMap(([key, shortcuts]) =>
        shortcuts.filter((s) => s.available()).map((s) => s.row(key))
      )
    );
    div.appendChild(table);
    return div;
  }
  /**
   * Check whether any of the shortcuts in this section satisfies the given
   * predicate.
   * @param predicate
   * @returns
   */
  some(predicate) {
    return Object.values(this.shortcuts).some((shortcuts) =>
      shortcuts.some(predicate)
    );
  }
  /**
   *
   * @returns Whether this section has any shortcuts that are available in the
   * current page.
   */
  available() {
    return this.some((s) => s.available());
  }
  /**
   * Attempt to consume the given event.
   * @param event
   * @returns True if consumption succeeds, false otherwise.
   */
  consume(event) {
    return !!this.shortcuts[event.key]?.some((s) => s.consume(event));
  }
  /**
   *
   * @param key
   * @returns A list of shortcuts that consume this key.
   */
  consumers(key) {
    return this.shortcuts[key]?.filter((s) => s.available()) ?? [];
  }
  /**
   * Get all keys available in this section, regardless of whether they have
   * available shortcuts.
   * @returns
   */
  keys() {
    return Object.keys(this.shortcuts);
  }
}
/**
 *
 */
export class Help {
  sections = [];
  overlay;
  panel;
  /**
   * @returns
   */
  static getOrCreateFooter() {
    let footer = document.querySelector('footer');
    if (footer) {
      return footer;
    }
    footer = document.createElement('footer');
    footer.id = ID.FOOTER;
    return footer;
  }
  /**
   */
  constructor() {
    // Create the overlay background.
    this.overlay = document.createElement('div');
    this.overlay.classList.add(CLS.OVERLAY_BACKGROUND);
    document.body.append(this.overlay);
    // Create the panel.
    this.panel = document.createElement('div');
    this.panel.classList.add(CLS.INFO_PANEL);
    document.body.append(this.panel);
    // Add the panel title.
    const h2 = document.createElement('h2');
    h2.textContent = TITLE;
    this.panel.append(h2);
    // Add the panel close button.
    const closeButton = document.createElement('button');
    closeButton.classList.add(CLS.CLOSE_BTN);
    closeButton.textContent = '×';
    this.panel.append(closeButton);
    const help =
      document.getElementById(ID.HELP) ??
      (() => {
        const span = document.createElement('span');
        span.classList.add(cls.LINK);
        span.textContent = 'help';
        Help.getOrCreateFooter().append(span);
        return span;
      })();
    this.addEventListeners(help, closeButton);
    this.hide(); // Hidden by default.
  }
  /**
   * @param s
   */
  addSection(s) {
    if (!s.available()) {
      // This section has no available shortcuts on this page.
      return;
    }
    // Store the shortcuts.
    this.sections.push(s);
    // Add the section to the help panel.
    this.panel.appendChild(s.html());
    // Verify the new section doesn't introduce any duplicates.
    this.verifyNoDuplicates();
  }
  /**
   * Attempt to consume the given event.
   * @param event
   * @returns True if consumption succeeds, false otherwise.
   */
  consumeAux(event) {
    return this.sections.some((s) => s.consume(event));
  }
  /**
   * @param event
   * @returns Whether the event has been consumed by any of our listeners.
   */
  consume(event) {
    // Attempt to consume the event with the key as is.
    if (this.consumeAux(event)) {
      return true;
    }
    // If this event is not consumable by any of our sections, it may be
    // possible that the user has switched the keyboard layout. In this case, we
    // try to respond based on the key location on the keyboard.
    // We do this by overriding the event key to what it would've been had the
    // user pressed it with the English keyboard layout.
    // While the event key will be layout-based, the event code is
    // layout-agnostic. So we can use the code to infer the key.
    let key = CODE_TO_KEY[event.code];
    if (!key) {
      // We can't find the key corresponding to the event.
      return false;
    }
    if (event.shiftKey) {
      // The shift key was pressed.
      key = SHIFT_MAP[event.code] ?? key.toUpperCase();
    }
    // Override the event's key property.
    Object.defineProperty(event, 'key', { value: key });
    // Attempt to consume the event again, with the new key.
    return this.consumeAux(event);
  }
  /**
   *
   * @param visibility
   */
  setVisibility(visibility) {
    this.panel.style.display = visibility;
    this.overlay.style.display = visibility;
  }
  /**
   * Hide the panel.
   */
  hide() {
    this.setVisibility('none');
  }
  /**
   * Toggle the panel visibility.
   */
  toggle() {
    this.setVisibility(this.panel.style.display === 'block' ? 'none' : 'block');
  }
  /**
   * Verify that each key triggers a single shortcut!
   */
  verifyNoDuplicates() {
    // Get all keys that have events registered to them.
    const keys = new Set(this.sections.flatMap((s) => s.keys()));
    keys.forEach((key) => {
      // Get all shortcuts that could consume this key.
      const consumers = this.sections.flatMap((s) => s.consumers(key));
      log.ensure(
        consumers.length <= 1,
        key,
        'is consumable by multiple shortcuts:',
        ...consumers.flatMap((s, index) =>
          index === consumers.length - 1
            ? [s.textDescription()]
            : [s.textDescription(), ',']
        )
      );
    });
  }
  /**
   * Add event listeners for the help panel.
   * @param help - Help button.
   * @param closeButton - Close button.
   */
  addEventListeners(help, closeButton) {
    // Clicking on the close button hides the panel.
    closeButton.addEventListener('click', this.hide.bind(this));
    // Clicking the help button toggles the panel display.
    help.addEventListener('click', this.toggle.bind(this));
    // A mouse click outside the panel closes it.
    document.addEventListener('click', (event) => {
      if (this.panel.contains(event.target)) {
        // The click happens inside the panel. Do nothing.
        return;
      }
      this.hide();
    });
    // Clicking a keyboard shortcut triggers the associated action.
    // NOTE: We intentionally use the `keydown` event rather than the `keyup`
    // event, so that a long press would trigger a shortcut command repeatedly.
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        // If the user is holding down a modifier key, we don't want to do
        // anything.
        return;
      }
      if (e.key === 'Escape') {
        // A click on the Escape key hides the panel.
        this.hide();
        return;
      }
      if (this.consume(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
}
