/** Package help defines logic for a help panel. */
import * as iam from './iam.js';
import * as cls from './cls.js';
import * as logger from './logger.js';
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
 *
 * TODO: (#0) If listeners were to rely on event codes rather than keys, this
 * conversion won't be necessary. Consider abandoning keys in favor of codes.
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
 *
 * @param char
 * @param str
 * @returns
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
  return `${str.slice(0, index)}<strong>${str[index]}</strong>${str.slice(index + 1)}`;
}
/**
 *
 */
export class Shortcut {
  description;
  available;
  action;
  show;
  /**
   *
   * @param description
   * @param available
   * @param action
   * @param show
   */
  constructor(description, available, action, show = true) {
    this.description = description;
    this.available = available;
    this.action = action;
    this.show = show;
  }
  /**
   *
   * @returns
   */
  executable() {
    return this.available.includes(iam.where());
  }
  /**
   *
   * @returns
   */
  visible() {
    return this.executable() && this.show;
  }
  /**
   *
   * @param event
   * @returns
   */
  consume(event) {
    if (!this.executable()) {
      return false;
    }
    // Actions throw an exception if they cannot consume the event.
    try {
      this.action(event);
    } catch {
      return false;
    }
    return true;
  }
  /**
   *
   * @param key
   * @returns
   */
  row(key) {
    // TODO: (#241) Move the styling to CSS.
    const row = document.createElement('tr');
    const keyCell = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = key;
    keyCell.appendChild(code);
    keyCell.style.width = '10%';
    keyCell.style.border = '1px solid black';
    keyCell.style.padding = '8px';
    // Create a cell for the value (right column)
    const valueCell = document.createElement('td');
    if (typeof this.description === 'string') {
      valueCell.innerHTML = highlightFirstOccurrence(key, this.description);
    } else {
      valueCell.append(this.description);
    }
    valueCell.style.width = '90%';
    valueCell.style.border = '1px solid black';
    valueCell.style.padding = '8px';
    // Append cells to the row
    row.appendChild(keyCell);
    row.appendChild(valueCell);
    return row;
  }
  /**
   *
   * @returns
   */
  textDescription() {
    return typeof this.description === 'string'
      ? this.description.replace(/<[^>]*>/g, '')
      : this.description.textContent;
  }
}
/**
 * Section represents a group of related shortcuts.
 */
export class Section {
  title;
  shortcuts;
  /**
   *
   * @param title
   * @param shortcuts
   */
  constructor(title, shortcuts) {
    this.title = title;
    this.shortcuts = shortcuts;
  }
  /**
   *
   * @returns
   */
  createSection() {
    const div = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = this.title;
    div.appendChild(title);
    const table = document.createElement('table');
    // Add styles to ensure the left column is 10% of the width
    table.style.width = '100%'; // Make the table take 100% of the container width
    table.style.borderCollapse = 'collapse'; // Optional: to collapse the borders
    // Iterate over the entries in the record
    Object.entries(this.shortcuts).forEach(([key, shortcuts]) => {
      shortcuts
        .filter((s) => s.visible())
        .forEach((s) => {
          table.appendChild(s.row(key));
        });
    });
    div.appendChild(table);
    return div;
  }
  /**
   *
   * @returns
   */
  visible() {
    return Object.values(this.shortcuts).some((shortcuts) => {
      return shortcuts.some((s) => s.visible());
    });
  }
  /**
   *
   * @returns
   */
  executable() {
    return Object.values(this.shortcuts).some((shortcuts) => {
      return shortcuts.some((s) => s.executable());
    });
  }
  /**
   *
   * @param event
   * @returns
   */
  consume(event) {
    return this.shortcuts[event.key]?.some((s) => s.consume(event)) ?? false;
  }
  /**
   *
   * @param key
   * @returns
   */
  canConsume(key) {
    return this.shortcuts[key]?.filter((s) => s.executable()) ?? [];
  }
  /**
   *
   * @returns
   */
  shortcutsRecord() {
    return this.shortcuts;
  }
}
/**
 *
 */
export class Help {
  sections;
  overlay;
  panel;
  help;
  /**
   */
  constructor() {
    this.sections = [];
    // Create overlay background.
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay-background';
    this.overlay.style.display = 'none'; // Hidden by default.
    document.body.appendChild(this.overlay);
    // Create info panel.
    this.panel = document.createElement('div');
    this.panel.className = 'info-panel';
    this.panel.style.display = 'none'; // Hidden by default.
    const h2 = document.createElement('h2');
    h2.textContent = 'Keyboard Shortcuts';
    this.panel.appendChild(h2);
    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      this.togglePanel();
    });
    this.panel.appendChild(closeButton);
    document.body.appendChild(this.panel);
    // Create help button, if it doesn't already exist.
    this.help =
      document.getElementById('help') ??
      (() => {
        const footer =
          document.querySelector('footer') ??
          (() => {
            const f = document.createElement('footer');
            f.id = 'footer';
            return f;
          })();
        const help = document.createElement('span');
        help.classList.add(cls.LINK);
        help.textContent = 'help';
        footer.appendChild(help);
        document.body.appendChild(footer);
        return help;
      })();
    this.verifyNoDuplicates();
    this.addListeners();
  }
  /**
   * @param s
   */
  addSection(s) {
    if (!s.executable()) {
      return;
    }
    this.sections.push(s);
    if (!s.visible()) {
      return;
    }
    this.panel.appendChild(s.createSection());
  }
  /**
   *
   * @param event
   * @returns
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
    // possible that the user has switched the layout. In this case, we try
    // to respond based on the key location on the keyboard.
    let key = CODE_TO_KEY[event.code];
    if (!key) {
      return false;
    }
    if (event.shiftKey) {
      key = SHIFT_MAP[event.code] ?? key.toUpperCase();
    }
    // Override the event's key property.
    Object.defineProperty(event, 'key', { value: key });
    return this.consumeAux(event);
  }
  /**
   * @param visible - An optional visibility. If not provided, will toggle the
   * current visibility.
   */
  togglePanel(visible) {
    let target;
    if (visible !== undefined) {
      // Use the visibility provided in the parameters.
      target = visible ? 'block' : 'none';
    } else {
      // Toggle the current visibility.
      target = this.panel.style.display === 'block' ? 'none' : 'block';
    }
    this.panel.style.display = target;
    this.overlay.style.display = target;
  }
  /**
   * Verify that each key triggers a single shortcut!
   */
  verifyNoDuplicates() {
    // Get all keys that have events registered to them.
    const keys = this.sections
      .map((s) => s.shortcutsRecord())
      .map((record) => Object.keys(record))
      .flat();
    keys.forEach((key) => {
      const canConsume = this.sections.map((s) => s.canConsume(key)).flat();
      if (canConsume.length > 1) {
        logger.fatal(
          `${key} is consumable by multiple shortcuts: ${canConsume.map((s) => s.textDescription()).join(', ')}`
        );
      }
    });
  }
  /**
   * Add event listeners for the help panel.
   */
  addListeners() {
    // Clicking the help button toggles the panel display.
    this.help.addEventListener('click', (event) => {
      this.togglePanel();
      event.stopPropagation();
    });
    // A mouse click outside the panel closes it.
    document.addEventListener('click', (event) => {
      if (
        this.panel.style.display === 'block' &&
        !this.panel.contains(event.target)
      ) {
        this.togglePanel(false);
      }
    });
    // Clicking a keyboard shortcut triggers the associated action.
    // NOTE: We intentionally use the `keydown` event rather than the `keyup`
    // event, so that a long press would trigger a shortcut command repeatedly.
    // This is helpful for some of the commands.
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        // If the user is holding down a modifier key, we don't want to do
        // anything.
        return;
      }
      if (this.consume(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
}
