'use strict';

// NOTE: While this file is used for both Crum and Xooxle, make sure that only
// the Crum-specific Xooxle content lives here, and that any generic Xooxle
// logic (applicable for other instances of Xooxle) live in the shared Xooxle
// files.

// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

const dialectCheckboxes = Array.from(
  document.querySelectorAll<HTMLInputElement>('.dialect-checkbox')
);

// XOOXLE (which should be defined externally) is used to distinguish whether we
// are running on Xooxle or not.
declare const XOOXLE: boolean;
function xooxle(): boolean {
  return typeof XOOXLE !== 'undefined' && XOOXLE;
}

// NOTE (which should be defined externally) is used to distinguish whether we
// are running on a note.
declare const NOTE: boolean;
function note(): boolean {
  return typeof NOTE !== 'undefined' && NOTE;
}

// ANKI (which should be defined externally) is used to distinguish whether we
// are running on Anki or not.
declare const ANKI: boolean;
function anki(): boolean {
  return typeof ANKI !== 'undefined' && ANKI;
}

// INDEX (which should be defined externally) is used to distinguish
// whether we are running on an index page or not.
declare const INDEX: boolean;
function index(): boolean {
  return typeof INDEX !== 'undefined' && INDEX;
}

// INDEX_INDEX (which should be defined externally) is used to distinguish
// whether we are running on an index index page or not.
declare const INDEX_INDEX: boolean;
function index_index(): boolean {
  return typeof INDEX_INDEX !== 'undefined' && INDEX_INDEX;
}

const HOME = 'http://remnqymi.com';
function home(): string {
  return `${anki() ? HOME : ''}/`;
}
// NOTE: The following assumes that the code is getting executed from a page
// directly under `crum/`.
function crum(): string {
  return anki() ? `${HOME}/crum/` : './';
}
function dawoud(): string {
  return `${home()}dawoud/`;
}

const LOOKUP_URL_PREFIX = `${crum()}?query=`;

const EMAIL = 'remnqymi@gmail.com';
const EMAIL_LINK = `mailto:${EMAIL}`;

enum DIALECT_ARTICLE {
  // NO_ARTICLE indicates the absence of an article.
  NO_ARTICLE = '',
  // DIALECTS is a generic article about dialects.
  DIALECTS = 'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
  Sahidic = 'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2',
  Akhmimic = 'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1',
  subAkhmimic_Lycopolitan = 'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1',
  Bohairic = 'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2',
  Fayyumic = 'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2',
  OldCoptic = 'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2',
  NagHammadi = 'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2',
  Mesokemic = 'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2',
  ProtoTheban = 'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1',
}

const DAWOUD_OFFSET = 16;
// TODO: This is not just QWERTY. Rename the constant.
// TODO: Abandon event keys. Rely solely on event codes.
const QWERTY_MAP: Record<string, string> = {
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

const SHIFT_MAP: Record<string, string> = {
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

const DIALECTS = [
  // The following dialects are found in Crum.
  'S',
  'Sa',
  'Sf',
  'A',
  'sA',
  'B',
  'F',
  'Fb',
  'O',
  // The following dialects are only found in Marcion.
  'NH',
  // The following dialects are only found in TLA / KELLIA.
  'Ak',
  'M',
  'L',
  'P',
  'V',
  'W',
  'U',
];

// SYNC_DIALECTS is a list of lists of dialects that should be synchronized with
// each other.
const SYNC_DIALECTS = [
  ['O', 'Ak'], // Old Coptic is O in Crum, and Ak (for Altkoptisch) in KELLIA.
  ['sA', 'L'], // Lycopolitan is sA (for subAkhmimic) in Crum, and L in KELLIA.
];

// DIALECT_SINGLE_CHAR is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
const DIALECT_SINGLE_CHAR: Record<string, string> = {
  N: 'NH',
  a: 'Sa',
  f: 'Sf',
  s: 'sA',
  b: 'Fb',
  k: 'Ak',
};

function classQuery(classes: string[]): string {
  return classes.map((c) => `.${c}`).join(', ');
}

class Highlighter {
  // Sheets are problematic on Anki, for some reason! We update the elements
  // individually instead!
  private readonly anki: boolean;
  private readonly sheet: CSSStyleSheet | null;
  private readonly dialectRuleIndex: number;
  private readonly devRuleIndex: number;

  private static readonly BRIGHT = '1.0';
  private static readonly DIM = '0.3';

  constructor() {
    // NOTE: Reading CSS rules often fails locally due to CORS. This is why we
    // use the `try` block here. In case it fails, we fall back to Anki mode,
    // which doesn't need to read the CSS.
    // This failure, however, is not expected to be encountered if you're
    // reading locally through a server. It only fails when you open the HTML
    // file in the browser directly.
    try {
      this.anki = anki();
      this.sheet = this.anki ? null : window.document.styleSheets[0]!;
      this.dialectRuleIndex = this.sheet?.cssRules.length ?? 0;
      this.devRuleIndex = this.dialectRuleIndex + 1;
    } catch {
      this.anki = true;
      this.sheet = null;
      this.dialectRuleIndex = 0;
      this.devRuleIndex = 0;
    }
  }

  update(): void {
    this.updateDialects();
    this.updateDev();
  }

  updateDialects(): void {
    const active = activeDialects();

    if (active === null) {
      // No dialect highlighting whatsoever.
      this.updateSheetOrElements(this.dialectRuleIndex, '.word *', '', (el) => {
        el.style.opacity = Highlighter.BRIGHT;
      });
      return;
    }

    if (active.length === 0) {
      // All dialects are off.
      this.updateSheetOrElements(
        this.dialectRuleIndex,
        '.word *',
        `opacity: ${Highlighter.DIM};`,
        (el) => {
          el.style.opacity = Highlighter.DIM;
        }
      );
      return;
    }

    // Some dialects are on, some are off.
    // Dim all children of `word` elements, with the exception of:
    // - Active dialects.
    // - Undialected spellings.
    const query = `.word > :not(${classQuery(active)},.spelling:not(${classQuery(DIALECTS)}))`;
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
  }

  updateDev(): void {
    const display = localStorage.getItem('dev') === 'true' ? 'block' : 'none';
    this.updateSheetOrElements(
      this.devRuleIndex,
      '.dev, .nag-hammadi, .senses, .categories',
      `display: ${display};`,
      (el: HTMLElement) => {
        el.style.display = display;
      }
    );
  }

  private addOrReplaceRule(index: number, rule: string) {
    if (index < this.sheet!.cssRules.length) {
      this.sheet!.deleteRule(index);
    }
    this.sheet!.insertRule(rule, index);
  }

  // If we're in Anki, we update the elements directly.
  // Otherwise, we update the CSS rules.
  // NOTE: If you're updating the sheet, then it's guaranteed that the update
  // will erase the effects of previous calls to this function.
  // However, if you're updating elements, that's not guaranteed. If this is the
  // case, you should pass a `reset_func` that resets the elements to the
  // default style.
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
}
// TODO: This is a bad place to define a global variable.
const highlighter = new Highlighter();

function window_open(url: string | null, external = true): void {
  if (!url) {
    return;
  }
  if (external) {
    window.open(url, '_blank', 'noopener,noreferrer')!.focus();
    return;
  }
  window.open(url, '_self');
}

function moveElement(
  el: Element,
  tag: string,
  attrs: Record<string, string>
): void {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att: Attr): void => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]: [string, string]): void => {
    copy.setAttribute(key, value);
  });
  el.parentNode!.replaceChild(copy, el);
}

function makeSpanLinkToAnchor(el: Element, target: string): void {
  if (el.tagName !== 'SPAN') {
    console.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
}

function chopColumn(pageNumber: string): string {
  const lastChar = pageNumber.slice(pageNumber.length - 1);
  if (lastChar === 'a' || lastChar === 'b') {
    pageNumber = pageNumber.slice(0, -1);
  }
  return pageNumber;
}

// Handle 'dialect' class.
function activeDialects(): string[] | null {
  const d = localStorage.getItem('d');
  // NOTE: ''.split(',') returns [''], which is not what we want!
  // The empty string requires special handling.
  return d === '' ? [] : (d?.split(',') ?? null);
}

// syncDialects returns the list of dialects that should be synced with the
// given dialect. This includes the given dialect itself.
function syncDialects(dialect: string): string[] {
  return SYNC_DIALECTS.find((list) => list.includes(dialect)) ?? [dialect];
}

function toggleDialect(toggle: string): void {
  const active = new Set(activeDialects());
  const has = active.has(toggle);
  for (const dialect of syncDialects(toggle)) {
    if (has) {
      active.delete(dialect);
    } else {
      active.add(dialect);
    }
  }
  localStorage.setItem('d', Array.from(active).join(','));
}

// Handle 'developer' and 'dev' classes.
function toggleDev(): void {
  localStorage.setItem(
    'dev',
    localStorage.getItem('dev') === 'true' ? 'false' : 'true'
  );
}

// Handle 'reset' class.
function reset(
  dialectCheckboxes: HTMLInputElement[],
  highlighter: Highlighter
): void {
  dialectCheckboxes.forEach((box) => {
    box.checked = false;
  });
  // The local storage is the source of truth for some highlighting variables.
  // Clearing it results restores a pristine display.
  localStorage.clear();
  highlighter.update();

  const url = new URL(window.location.href);
  // NOTE: We only reload when we actually detect an anchor (hash) or text
  // fragment in order to minimize disruption. Reloading the page causes a
  // small jitter.
  // NOTE: `url.hash` doesn't include text fragments (expressed by `#:~:text=`),
  // which is why we need to use `performance.getEntriesByType('navigation')`.
  // However, the latter doesn't always work, for some reason. In our
  // experience, it can retrieve the text fragment once, but if you reset and
  // then add a text fragment manually, it doesn't recognize it! This is not a
  // huge issue right now, so we aren't prioritizing fixing it!
  // NOTE: Attempting to reload the page on Ankidroid opens a the browser at a
  // 127.0.0.0 port! We avoid reloading on all Anki platforms!
  // NOTE: In Xooxle, there is no hash-based highlighting, so we don't need to
  // reload the page.
  // Additionally, the presence of the Google Programmable Search Engine
  // widget results in the presence of a pseudo-hash in the URL, which would
  // cause the page to unnecessarily reload.
  if (xooxle()) {
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
  if (anki()) {
    return;
  }
  window.location.reload();
}

function getLinkHrefByRel(rel: string): string | null {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}

function scroll(id: string): void {
  document.getElementById(id)!.scrollIntoView({ behavior: 'smooth' });
}

function height(elem: HTMLElement): number {
  return elem.getBoundingClientRect().top + window.scrollY;
}

function findNextElement(
  query: string,
  target: 'next' | 'prev' | 'cur'
): HTMLElement | undefined {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(query));
  elements.sort((a, b) =>
    target == 'prev' ? height(b) - height(a) : height(a) - height(b)
  );
  const currentScrollY = window.scrollY;
  return elements.find((element) =>
    target === 'prev'
      ? height(element) < currentScrollY - 10
      : target === 'next'
        ? height(element) > currentScrollY + 10
        : height(element) >= currentScrollY - 1
  );
}

function scrollToNextElement(
  query: string,
  target: 'next' | 'prev' | 'cur'
): void {
  const elem = findNextElement(query, target);
  if (!elem) {
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Section represents a group of related shortcuts.
class Section {
  constructor(
    private readonly title: string,
    private readonly shortcuts: Record<string, Shortcut[]>
  ) {}

  createSection(): HTMLDivElement {
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

  visible(): boolean {
    return Object.values(this.shortcuts).some((shortcuts: Shortcut[]) => {
      return shortcuts.some((s: Shortcut) => s.visible());
    });
  }

  executable(): boolean {
    return Object.values(this.shortcuts).some((shortcuts: Shortcut[]) => {
      return shortcuts.some((s: Shortcut) => s.executable());
    });
  }

  consume(event: KeyboardEvent): boolean {
    return (
      (this.executable() &&
        this.shortcuts[event.key]?.some((s) => s.consume(event))) ??
      false
    );
  }

  canConsume(key: string): Shortcut[] {
    if (!this.executable()) {
      return [];
    }
    return this.shortcuts[key]?.filter((s) => s.executable()) ?? [];
  }

  shortcutsRecord(): Record<string, Shortcut[]> {
    return this.shortcuts;
  }
}

function highlightFirstOccurrence(char: string, str: string): string {
  if (str.includes('<')) {
    // This might already have an HTML tag, so we don't risk highlighting it to
    // avoid breaking something.
    return str;
  }
  const index = str.toLowerCase().indexOf(char.toLowerCase());
  if (index === -1) {
    return str;
  }

  return `${str.slice(0, index)}<strong>${str[index]!}</strong>${str.slice(index + 1)}`;
}

class HelpPanel {
  private readonly sections: Section[];
  private readonly overlay: HTMLDivElement;
  private readonly panel: HTMLDivElement;

  constructor(sections: Section[]) {
    this.sections = sections.filter((s) => s.executable());
    // Create overlay background.
    const overlay = document.createElement('div');
    overlay.className = 'overlay-background';
    overlay.style.display = 'none'; // Hidden by default.
    document.body.appendChild(overlay);

    // Create info panel.
    const panel = document.createElement('div');
    panel.className = 'info-panel';
    panel.style.display = 'none'; // Hidden by default.

    const h2 = document.createElement('h2');
    h2.textContent = 'Keyboard Shortcuts';
    panel.appendChild(h2);

    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.innerHTML = '&times;'; // HTML entity for '×'.
    closeButton.onclick = () => {
      this.togglePanel();
    };
    panel.appendChild(closeButton);

    this.sections
      .filter((s) => s.visible())
      .forEach((s) => {
        panel.appendChild(s.createSection());
      });

    document.body.appendChild(panel);

    // Create help button, if it doesn't already exist.
    const help: HTMLElement =
      document.getElementById('help') ??
      ((): HTMLElement => {
        const footer: HTMLElement =
          document.getElementsByTagName('footer')[0] ??
          (() => {
            const footer = document.createElement('footer');
            footer.id = 'footer';
            footer.classList.add('footer');
            return footer;
          })();
        const help = document.createElement('span');
        help.classList.add('link');
        help.innerHTML = '<center>help</center>';
        footer.appendChild(help);
        document.body.appendChild(footer);
        return help;
      })();

    help.onclick = (event: MouseEvent) => {
      this.togglePanel();
      event.stopPropagation();
    };

    // A mouse click outside the panel closes it.
    document.addEventListener('click', (event: MouseEvent) => {
      this.handleClick(event);
    });

    this.panel = panel;
    this.overlay = overlay;

    this.validate();
  }

  consumeAux(event: KeyboardEvent): boolean {
    return this.sections.some((s) => s.consume(event));
  }
  consume(event: KeyboardEvent): boolean {
    if (this.consumeAux(event)) {
      return true;
    }
    // If this event is not consumable by any of our sections, it may be
    // possible that the user has switched the layout. In this case, we try
    // to respond based on the key location on the keyboard.
    let key = QWERTY_MAP[event.code];
    if (!key) {
      return false;
    }
    if (event.shiftKey) {
      key = SHIFT_MAP[event.code] ?? key.toUpperCase();
    }
    Object.defineProperty(event, 'key', { value: key });
    return this.consumeAux(event);
  }

  togglePanel(visible?: boolean) {
    const target =
      visible !== undefined
        ? visible
          ? 'block'
          : 'none'
        : this.panel.style.display === 'block'
          ? 'none'
          : 'block';
    this.panel.style.display = target;
    this.overlay.style.display = target;
  }

  handleClick(event: MouseEvent) {
    if (
      this.panel.style.display === 'block' &&
      !this.panel.contains(event.target as Node)
    ) {
      this.togglePanel(false);
    }
  }

  validate() {
    // Validate that no key can trigger two shortcuts!
    const keys = this.sections
      .map((s) => s.shortcutsRecord())
      .map((record) => Object.keys(record))
      .flat();
    keys.forEach((key) => {
      const canConsume = this.sections.map((s) => s.canConsume(key)).flat();
      if (canConsume.length <= 1) {
        return;
      }
      console.error(
        `${key} is consumable by multiple shortcuts: ${canConsume.map((s) => s.textDescription()).join(', ')}`
      );
    });
  }
}

class Shortcut {
  constructor(
    private readonly description: string,
    private readonly available: (() => boolean)[],
    private readonly action: (event: KeyboardEvent) => void,
    private readonly show = true
  ) {}

  executable(): boolean {
    return this.available.some((f) => f());
  }

  visible(): boolean {
    return this.executable() && this.show;
  }

  consume(event: KeyboardEvent): boolean {
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

  row(key: string): HTMLTableRowElement {
    // TODO: Move the styling to CSS.
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
    valueCell.innerHTML = highlightFirstOccurrence(key, this.description);
    valueCell.style.width = '90%';
    valueCell.style.border = '1px solid black';
    valueCell.style.padding = '8px';

    // Append cells to the row
    row.appendChild(keyCell);
    row.appendChild(valueCell);

    return row;
  }

  textDescription() {
    return this.description.replace(/<[^>]*>/g, '');
  }
}

function makeDialectShortcut(
  key: string,
  name: string,
  code: string,
  dictionaries: string[],
  link: DIALECT_ARTICLE
): Shortcut {
  code = highlightFirstOccurrence(key, code);
  name = highlightFirstOccurrence(key, name);
  if (link != DIALECT_ARTICLE.NO_ARTICLE) {
    name = `<a href="${link}" target="_blank" rel="noopener,noreferrer">${name}</a>`;
  }

  const description = `
<table>
<tr>
  <td class="dialect-code">(${code})</td>
  <td class="dialect-name">${name}</td>
  ${xooxle() ? `<td class="dialect-dictionaries">(${dictionaries.join(', ')})</td>` : ''}
</tr>
</table>`;

  // All dialects are available in Xooxle. Only Crum dialects area available on
  // notes.
  const availability = dictionaries.includes('Crum')
    ? [xooxle, note, index]
    : [xooxle];
  return new Shortcut(description, availability, (e: KeyboardEvent) => {
    const dialectCode = DIALECT_SINGLE_CHAR[e.key] ?? e.key;
    if (xooxle()) {
      click(`checkbox-${dialectCode}`);
    } else {
      toggleDialect(dialectCode);
      highlighter.updateDialects();
    }
  });
}

// We disable the help panel on Anki for the following reasons:
// - There is no keyboard on mobile.
// - Many of the shortcuts simply don't work, for some reason.
// - Anki on macOS (and possibly on other platforms) has its own shortcuts,
//   which conflict with ours!
// - Elements created by the panel logic (such as the `help` footer) were
//   found to be duplicated on some Anki platforms!
const panel: HelpPanel | null = anki() ? null : makeHelpPanel();

function makeHelpPanel(): HelpPanel {
  // NOTE: Some (minor) dialects are missing articles. If you find a reference
  // that explains what those dialects are, that would be great.
  const dialectHighlighting = {
    S: [
      makeDialectShortcut(
        'S',
        'Sahidic',
        'S',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Sahidic
      ),
    ],
    a: [
      makeDialectShortcut(
        'a',
        'Sahidic with <strong>A</strong>khmimic tendency',
        'Sa',
        ['Crum'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
    f: [
      makeDialectShortcut(
        'f',
        'Sahidic with <strong>F</strong>ayyumic tendency',
        'Sf',
        ['Crum'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
    A: [
      makeDialectShortcut(
        'A',
        'Akhmimic',
        'A',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Akhmimic
      ),
    ],
    s: [
      makeDialectShortcut(
        's',
        'subAkhmimic',
        'sA',
        ['Crum'],
        DIALECT_ARTICLE.subAkhmimic_Lycopolitan
      ),
    ],
    B: [
      makeDialectShortcut(
        'B',
        'Bohairic',
        'B',
        ['Crum', 'KELLIA', 'copticsite'],
        DIALECT_ARTICLE.Bohairic
      ),
    ],
    F: [
      makeDialectShortcut(
        'F',
        'Fayyumic',
        'F',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Fayyumic
      ),
    ],
    b: [
      makeDialectShortcut(
        'b',
        'Fayyumic with <strong>B</strong>ohairic tendency',
        'Fb',
        ['Crum'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
    O: [
      makeDialectShortcut(
        'O',
        'Old Coptic',
        'O',
        ['Crum'],
        DIALECT_ARTICLE.OldCoptic
      ),
    ],
    N: [
      makeDialectShortcut(
        'N',
        'Nag Hammadi',
        'NH',
        ['Crum (Marcion)'],
        DIALECT_ARTICLE.NagHammadi
      ),
    ],
    k: [
      makeDialectShortcut(
        'k',
        'Old Coptic',
        'Ak',
        ['KELLIA'],
        DIALECT_ARTICLE.OldCoptic
      ),
    ],
    M: [
      makeDialectShortcut(
        'M',
        'Mesokemic',
        'M',
        ['KELLIA'],
        DIALECT_ARTICLE.Mesokemic
      ),
    ],
    L: [
      makeDialectShortcut(
        'L',
        'Lycopolitan',
        'L',
        ['KELLIA'],
        DIALECT_ARTICLE.subAkhmimic_Lycopolitan
      ),
    ],
    P: [
      makeDialectShortcut(
        'P',
        'Proto-Theban',
        'P',
        ['KELLIA'],
        DIALECT_ARTICLE.ProtoTheban
      ),
    ],
    V: [
      makeDialectShortcut(
        'V',
        'South Fayyumic Greek',
        'V',
        ['KELLIA'],
        DIALECT_ARTICLE.DIALECTS
      ),
    ],
    W: [
      makeDialectShortcut(
        'W',
        'Crypto-Mesokemic Greek',
        'W',
        ['KELLIA'],
        DIALECT_ARTICLE.DIALECTS
      ),
    ],
    U: [
      makeDialectShortcut(
        'U',
        'Greek (usage <strong>u</strong>nclear)',
        'U',
        ['KELLIA'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
  };

  const control = {
    r: [
      new Shortcut(
        'Reset highlighting',
        [xooxle, note, index, index_index],
        () => {
          reset(dialectCheckboxes, highlighter);
        }
      ),
    ],
    d: [
      new Shortcut('Developer mode', [xooxle, note, index, index_index], () => {
        toggleDev();
        highlighter.updateDev();
      }),
    ],
    R: [
      new Shortcut(
        `<strong>R</strong>eports / Contact <a class="contact" href="${EMAIL_LINK}">${EMAIL}</a>`,
        [xooxle, note, index, index_index],
        () => {
          window_open(EMAIL_LINK);
        }
      ),
    ],
    H: [
      new Shortcut(
        `Open <a href="${home()}" target="_blank"><strong>h</strong>omepage</a>`,
        [xooxle, note, index, index_index],
        () => {
          window_open(home());
        }
      ),
    ],
    X: [
      new Shortcut(
        `Open the <a href="${crum()}" target="_blank">dictionary search page</a>`,
        [xooxle, note, index, index_index],
        () => {
          window_open(crum());
        }
      ),
    ],
    '?': [
      new Shortcut(
        'Toggle help panel',
        [xooxle, note, index, index_index],
        () => {
          panel!.togglePanel();
        }
      ),
    ],
    Escape: [
      new Shortcut(
        'Toggle help panel',
        [xooxle, note, index, index_index],
        () => {
          panel!.togglePanel(false);
        },
        false
      ),
    ],
    o: [
      new Shortcut(
        'Open the word currently being viewed',
        [xooxle, note, index],
        () => {
          findNextElement('.view, .sister-view', 'cur')
            ?.querySelector('a')
            ?.click();
        }
      ),
    ],
    l: [
      new Shortcut('Go to next word', [note], () => {
        window_open(getLinkHrefByRel('next'), false);
      }),
    ],
    h: [
      new Shortcut('Go to previous word', [note], () => {
        window_open(getLinkHrefByRel('prev'), false);
      }),
    ],
    y: [
      new Shortcut('Yank (copy) the word key', [note], () => {
        void navigator.clipboard.writeText(
          window.location.pathname.split('/').pop()!.replace('.html', '')
        );
      }),
    ],
  };

  const search = {
    w: [
      new Shortcut('Toggle full-word search', [xooxle], () => {
        click('fullWordCheckbox');
      }),
    ],
    x: [
      new Shortcut('Toggle regex search', [xooxle], () => {
        click('regexCheckbox');
      }),
    ],
    '/': [
      new Shortcut('Focus on the search box', [xooxle], () => {
        focus('searchBox');
      }),
    ],
    ';': [
      new Shortcut('Focus on the Crum Google search box', [xooxle], () => {
        document.querySelector<HTMLElement>('#google input')!.focus();
      }),
    ],
  };

  const scrollTo = {
    n: [
      new Shortcut('Next word in the list', [xooxle, note, index], () => {
        scrollToNextElement('.view, .sister-view', 'next');
      }),
    ],
    p: [
      new Shortcut('Previous word in the list', [xooxle, note, index], () => {
        scrollToNextElement('.view, .sister-view', 'prev');
      }),
    ],
    C: [
      new Shortcut('Crum', [xooxle], () => {
        scroll('crum-title');
      }),
      new Shortcut('Crum pages', [note], () => {
        scroll('crum');
      }),
    ],
    E: [
      new Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        [xooxle],
        () => {
          scroll('kellia-title');
        }
      ),
    ],
    T: [
      new Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        [xooxle],
        () => {
          scroll('copticsite-title');
        }
      ),
    ],
    D: [
      new Shortcut('Dawoud pages', [note], () => {
        scroll('dawoud');
      }),
    ],
    w: [
      new Shortcut('Related words', [note], () => {
        scroll('sisters');
      }),
    ],
    m: [
      new Shortcut('Meaning', [note], () => {
        scroll('meaning');
      }),
    ],
    e: [
      new Shortcut('S<strong>e</strong>ns<strong>e</strong>s', [note], () => {
        scroll('senses');
      }),
    ],
    t: [
      new Shortcut('Type', [note], () => {
        scroll('root-type');
      }),
    ],
    j: [
      new Shortcut('Categories', [note], () => {
        scroll('categories');
      }),
    ],
    i: [
      new Shortcut('Images', [note], () => {
        scroll('images');
      }),
    ],
    q: [
      new Shortcut('Words', [note], () => {
        scroll('pretty');
      }),
    ],
    Q: [
      new Shortcut('Words', [note], () => {
        scroll('marcion');
      }),
    ],
    v: [
      new Shortcut('Derivations table', [note], () => {
        scroll('derivations');
      }),
    ],
    c: [
      new Shortcut('Dictionary page list', [note], () => {
        scroll('dictionary');
      }),
    ],
    g: [
      new Shortcut('Header', [xooxle, note, index, index_index], () => {
        scroll('header');
      }),
    ],
    G: [
      new Shortcut('Footer', [xooxle, note, index, index_index], () => {
        scroll('footer');
      }),
    ],
  };

  const collapse = {
    c: [
      new Shortcut('Crum', [xooxle], () => {
        click('crum-title');
      }),
    ],
    e: [
      new Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        [xooxle],
        () => {
          click('kellia-title');
        }
      ),
    ],
    t: [
      new Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        [xooxle],
        () => {
          click('copticsite-title');
        }
      ),
    ],
  };

  const sections: Section[] = [
    new Section('Dialect Highlighting', dialectHighlighting),
    new Section('Control', control),
    new Section('Search', search),
    new Section('Scroll To', scrollTo),
    new Section('Collapse', collapse),
  ];

  return new HelpPanel(sections);
}

function click(id: string): void {
  document.getElementById(id)!.click();
}

function focus(id: string): void {
  document.getElementById(id)!.focus();
}

function handleNonXooxleOnlyElements() {
  // Handle 'categories' class.
  document
    .querySelectorAll<HTMLElement>('.categories')
    .forEach((elem: HTMLElement) => {
      const linked = elem.innerHTML
        .trim()
        .split(',')
        .map((s) => s.trim())
        .map(
          (s) =>
            `<a class="hover-link" href="${crum()}${s}.html" target="_blank">${s}</a>`
        )
        .join(', ');
      elem.innerHTML = linked;
    });

  // Handle 'root-type' class.
  document
    .querySelectorAll<HTMLElement>('.root-type')
    .forEach((elem: HTMLElement) => {
      const type: string | undefined =
        elem.getElementsByTagName('b')[0]?.innerHTML;
      if (!type) {
        console.error('Unable to infer the root type for element!', elem);
        return;
      }
      const linked = `(<a class="hover-link" href="${crum()}${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
      elem.innerHTML = linked;
    });

  // Handle 'crum-page' class.
  document
    .querySelectorAll<HTMLElement>('.crum-page')
    .forEach((el: HTMLElement): void => {
      const pageNumber: string = el.innerHTML;
      el.classList.add('link');
      makeSpanLinkToAnchor(el, `#crum${chopColumn(pageNumber)}`);
    });

  // Handle 'crum-page-external' class.
  document
    .querySelectorAll<HTMLElement>('.crum-page-external')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = (): void => {
        window_open(
          `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`
        );
      };
    });

  // Handle 'dawoud-page-external' class.
  document
    .querySelectorAll<HTMLElement>('.dawoud-page-external')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = (): void => {
        window_open(
          `${dawoud()}?page=${(+el.innerHTML + DAWOUD_OFFSET).toString()}`
        );
      };
    });

  // Handle 'dawoud-page-img' class.
  document
    .querySelectorAll<HTMLElement>('.dawoud-page-img')
    .forEach((el: HTMLElement): void => {
      // TODO: (#202) Eliminate the dependency on the HTML structure.
      el = el.children[0]! as HTMLElement;
      el.classList.add('link');
      el.onclick = (): void => {
        window_open(
          `${dawoud()}?page=${(+el.getAttribute('alt')! + DAWOUD_OFFSET).toString()}`
        );
      };
    });

  // Handle 'crum-page-img' class.
  document
    .querySelectorAll<HTMLElement>('.crum-page-img')
    .forEach((el: HTMLElement): void => {
      // TODO: (#202) Eliminate the dependency on the HTML structure.
      el = el.children[0]! as HTMLElement;
      el.classList.add('link');
      el.onclick = (): void => {
        window_open(
          `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute(
            'alt'
          )!}`
        );
      };
    });

  // Handle 'explanatory' class.
  document
    .querySelectorAll<HTMLElement>('.explanatory')
    .forEach((el: HTMLElement): void => {
      // TODO: (#202) Eliminate the dependency on the HTML structure.
      const img = el.children[0]! as HTMLElement;
      const alt = img.getAttribute('alt')!;
      if (!alt.startsWith('http')) {
        return;
      }
      img.classList.add('link');
      img.onclick = (): void => {
        window_open(alt);
      };
    });

  // Handle 'coptic' class.
  document
    .querySelectorAll<HTMLElement>('.coptic')
    .forEach((el: HTMLElement): void => {
      el.classList.add('hover-link');
      el.onclick = (): void => {
        window_open(LOOKUP_URL_PREFIX + el.innerHTML);
      };
    });

  // Handle 'greek' class.
  document
    .querySelectorAll<HTMLElement>('.greek')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link', 'light');
      el.onclick = (): void => {
        window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
      };
    });

  // Handle 'dawoud-page' class.
  document
    .querySelectorAll<HTMLElement>('.dawoud-page')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      makeSpanLinkToAnchor(el, `#dawoud${chopColumn(el.innerHTML)}`);
    });

  // Handle 'drv-key' class.
  document
    .querySelectorAll<HTMLElement>('.drv-key')
    .forEach((el: HTMLElement): void => {
      el.classList.add('small', 'light', 'italic', 'hover-link');
      makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
    });

  // Handle 'explanatory-key' class.
  document
    .querySelectorAll<HTMLElement>('.explanatory-key')
    .forEach((el: HTMLElement): void => {
      el.classList.add('hover-link');
      makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
    });

  // Handle 'sister-key' class.
  document
    .querySelectorAll<HTMLElement>('.sister-key')
    .forEach((el: HTMLElement): void => {
      el.classList.add('hover-link');
      makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
    });

  // Handle 'sister-view' class.
  document
    .querySelectorAll<HTMLElement>('.sisters-table, .index-table')
    .forEach((table: Element): void => {
      let counter = 1;
      Array.from(table.getElementsByTagName('tr')).forEach(
        (el: HTMLElement) => {
          const td = el.querySelector('.sister-view');
          if (!td) {
            console.error(
              'A raw in the sisters table does not have a "sister-view" element!'
            );
            return;
          }
          td.innerHTML =
            `<span class="sister-index">${counter.toString()}. </span>` +
            td.innerHTML;
          counter += 1;
        }
      );
    });

  document
    .querySelectorAll<HTMLElement>('.dialect')
    .forEach((el: HTMLElement) => {
      el.classList.add('hover-link');
      el.onclick = () => {
        toggleDialect(el.innerHTML);
        highlighter.updateDialects();
      };
    });

  document
    .querySelectorAll<HTMLElement>('.developer')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = () => {
        toggleDev();
        highlighter.updateDev();
      };
    });

  if (anki()) {
    document
      .querySelectorAll<HTMLElement>('.navigate')
      .forEach((e: HTMLElement) => {
        if (e.tagName !== 'A' || !e.hasAttribute('href')) {
          console.error(
            'This "navigate" element is not an <a> tag with an "href" property!',
            e
          );
          return;
        }
        e.setAttribute('href', `${crum()}${e.getAttribute('href')!}`);
      });
  }

  // NOTE: The `reset` class is only used in the notes pages.
  document
    .querySelectorAll<HTMLElement>('.reset')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = () => {
        reset(dialectCheckboxes, highlighter);
      };
    });
}

function initGoogleSearchBox(): void {
  const googleSearchBox =
    document.querySelector<HTMLInputElement>('#google input')!;

  // Prevent search query typing from triggering a shortcut command.
  googleSearchBox.addEventListener('keydown', (e: KeyboardEvent) => {
    e.stopPropagation();
  });
  googleSearchBox.placeholder =
    'Search A Coptic Dictionary, W. E. Crum, using Ⲅⲟⲟⲅⲗⲉ';
  googleSearchBox.ariaPlaceholder =
    'Search A Coptic Dictionary, W. E. Crum, using Ⲅⲟⲟⲅⲗⲉ';
}

function handleXooxleOnlyElements() {
  // NOTE: The element with the ID `reset` is only present on the XOOXLE page.
  document
    .getElementById('reset')
    ?.addEventListener('click', (event: Event) => {
      reset(dialectCheckboxes, highlighter);
      // On Xooxle, clicking the button would normally submit the form and
      // reset everything (including the search box and the option checkboxes).
      // So prevent the event from propagating further.
      event.preventDefault();
    });

  // Collapse logic.
  document
    .querySelectorAll<HTMLElement>('.collapse')
    .forEach((collapse: HTMLElement): void => {
      collapse.addEventListener('click', function () {
        // TODO: Remove the dependency on the HTML structure.
        const collapsible = collapse.nextElementSibling! as HTMLElement;
        collapsible.style.maxHeight = collapsible.style.maxHeight
          ? ''
          : collapsible.scrollHeight.toString() + 'px';
      });
      collapse.click();
    });

  const active: string[] | null = activeDialects();

  dialectCheckboxes.forEach((checkbox) => {
    // When we first load the page, 'd' dictates the set of active dialects and
    // hence highlighting. We load 'd' from the local storage, and we update the
    // boxes to match this set.
    checkbox.checked = active?.includes(checkbox.name) ?? false;

    checkbox.addEventListener('click', () => {
      syncDialects(checkbox.name).forEach((d) => {
        const checkboxToSync = document.getElementById(
          `checkbox-${d}`
        ) as HTMLInputElement;
        checkboxToSync.checked = checkbox.checked;
      });
      localStorage.setItem(
        'd',
        dialectCheckboxes
          .filter((box) => box.checked)
          .map((box) => box.name)
          .join(',')
      );
      highlighter.updateDialects();
    });
  });

  // NOTE: We have to do this when the page is fully loaded to guarantee that
  // the Google search box has already been loaded by the Google-provided
  // script. The correct way to do this is to wrap this in a `load` event
  // handler.
  window.addEventListener('load', initGoogleSearchBox);
}

function handleCommonElements() {
  highlighter.update();

  // NOTE: We intentionally use the `keydown` event rather than the `keyup`
  // event, so that a long press would trigger a shortcut command repeatedly.
  // This is helpful for some of the commands.
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      // If the user is holding down a modifier key, we don't want to do
      // anything.
      return;
    }

    if (panel?.consume(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

function main() {
  if (xooxle()) {
    handleXooxleOnlyElements();
  } else {
    handleNonXooxleOnlyElements();
  }

  handleCommonElements();
}

main();
