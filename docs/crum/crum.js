'use strict';
// NOTE: While this file is used for both Crum and Xooxle, make sure that only
// the Crum-specific Xooxle content lives here, and that any generic Xooxle
// logic (applicable for other instances of Xooxle) live in the shared Xooxle
// files.
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.
const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const GREEK_LOOKUP_URL_PREFIX = 'https://logeion.uchicago.edu/';
const dialectCheckboxes = Array.from(
  document.querySelectorAll('.dialect-checkbox')
);
function xooxle() {
  return typeof XOOXLE !== 'undefined' && XOOXLE;
}
function note() {
  return typeof NOTE !== 'undefined' && NOTE;
}
function anki() {
  return typeof ANKI !== 'undefined' && ANKI;
}
function index() {
  return typeof INDEX !== 'undefined' && INDEX;
}
function index_index() {
  return typeof INDEX_INDEX !== 'undefined' && INDEX_INDEX;
}
const HOME = 'http://remnqymi.com';
function home() {
  return `${anki() ? HOME : ''}/`;
}
// NOTE: The following assumes that the code is getting executed from a page
// directly under `crum/`.
function crum() {
  return anki() ? `${HOME}/crum/` : './';
}
function dawoud() {
  return `${home()}dawoud/`;
}
const LOOKUP_URL_PREFIX = `${crum()}?query=`;
const EMAIL = 'remnqymi@gmail.com';
const EMAIL_LINK = `mailto:${EMAIL}`;
var DIALECT_ARTICLE;
(function (DIALECT_ARTICLE) {
  // NO_ARTICLE indicates the absence of an article.
  DIALECT_ARTICLE['NO_ARTICLE'] = '';
  // DIALECTS is a generic article about dialects.
  DIALECT_ARTICLE['DIALECTS'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6';
  DIALECT_ARTICLE['Sahidic'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2';
  DIALECT_ARTICLE['Akhmimic'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1';
  DIALECT_ARTICLE['subAkhmimic_Lycopolitan'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1';
  DIALECT_ARTICLE['Bohairic'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2';
  DIALECT_ARTICLE['Fayyumic'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2';
  DIALECT_ARTICLE['OldCoptic'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2';
  DIALECT_ARTICLE['NagHammadi'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2';
  DIALECT_ARTICLE['Mesokemic'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2';
  DIALECT_ARTICLE['ProtoTheban'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1';
})(DIALECT_ARTICLE || (DIALECT_ARTICLE = {}));
const DAWOUD_OFFSET = 16;
// TODO: This is not just QWERTY. Rename the constant.
// TODO: Abandon event keys. Rely solely on event codes.
const QWERTY_MAP = {
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
// SYNC_DIALECTS stores dialects that should be synchronized with each other.
const SYNC_DIALECTS = [
  ['Ak', 'O'], // Old Coptic is O in Crum, and Ak (for Altkoptisch) in KELLIA.
  ['sA', 'L'], // Lycopolitan is sA (for subAkhmimic) in Crum, and L in KELLIA.
];
// DIALECT_SINGLE_CHAR is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
const DIALECT_SINGLE_CHAR = {
  N: 'NH',
  a: 'Sa',
  f: 'Sf',
  s: 'sA',
  b: 'Fb',
  k: 'Ak',
};
function classQuery(classes) {
  return classes.map((c) => `.${c}`).join(', ');
}
class Highlighter {
  // Sheets are problematic on Anki, for some reason! We update the elements
  // individually instead!
  anki;
  sheet;
  dialectRuleIndex;
  devRuleIndex;
  noDevRuleIndex;
  static BRIGHT = '1.0';
  static DIM = '0.3';
  constructor() {
    // NOTE: Reading CSS rules often fails locally due to CORS. This is why we
    // use the `try` block here. In case it fails, we fall back to Anki mode,
    // which doesn't need to read the CSS.
    // This failure, however, is not expected to be encountered if you're
    // reading locally through a server. It only fails when you open the HTML
    // file in the browser directly.
    try {
      this.anki = anki();
      this.sheet = this.anki ? null : window.document.styleSheets[0];
      const length = this.sheet?.cssRules.length ?? 0;
      this.dialectRuleIndex = length;
      this.devRuleIndex = length + 1;
      this.noDevRuleIndex = length + 2;
    } catch {
      this.anki = true;
      this.sheet = null;
      this.dialectRuleIndex = 0;
      this.devRuleIndex = 0;
      this.noDevRuleIndex = 0;
    }
  }
  update() {
    this.updateDialects();
    this.updateDev();
  }
  updateDialects() {
    // We have three sources of dialect highlighting:
    // - Lexicon checkboxes
    // - .dialect elements in the HTML
    // - Keyboard shortcuts
    // Two of them (the elements and the checkboxes) require styling updates,
    // though the styling updates for the .dialect elements are included in the
    // style sheet.
    // This method should guarantee that, regardless of the source of the
    // change, all elements update accordingly.
    const active = activeDialects();
    if (!active) {
      // No dialect highlighting whatsoever.
      this.updateSheetOrElements(this.dialectRuleIndex, '.word *', '', (el) => {
        el.style.opacity = Highlighter.BRIGHT;
      });
      dialectCheckboxes.forEach((c) => {
        c.checked = false;
      });
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
    dialectCheckboxes.forEach((checkbox) => {
      checkbox.checked = active.includes(checkbox.name);
    });
  }
  updateDev() {
    const display = localStorage.getItem('dev') === 'true' ? 'block' : 'none';
    const noDisplay = display === 'block' ? 'none' : 'block';
    this.updateSheetOrElements(
      this.devRuleIndex,
      '.dev, .nag-hammadi, .senses',
      `display: ${display};`,
      (el) => {
        el.style.display = display;
      }
    );
    this.updateSheetOrElements(
      this.noDevRuleIndex,
      '.no-dev',
      `display: ${noDisplay};`,
      (el) => {
        el.style.display = noDisplay;
      }
    );
  }
  addOrReplaceRule(index, rule) {
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
    this.addOrReplaceRule(rule_index, `${query} { ${style} }`);
  }
}
// TODO: This is a bad place to define a global variable.
const highlighter = new Highlighter();
function window_open(url, external = true) {
  if (!url) {
    return;
  }
  if (external) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  window.open(url, '_self');
}
function moveElement(el, tag, attrs) {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att) => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]) => {
    copy.setAttribute(key, value);
  });
  el.parentNode.replaceChild(copy, el);
}
function makeSpanLinkToAnchor(el, target) {
  if (el.tagName !== 'SPAN') {
    console.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
}
function chopColumn(pageNumber) {
  const lastChar = pageNumber.slice(pageNumber.length - 1);
  if (lastChar === 'a' || lastChar === 'b') {
    pageNumber = pageNumber.slice(0, -1);
  }
  return pageNumber;
}
// Handle 'dialect' class.
function activeDialects() {
  const d = localStorage.getItem('d');
  // NOTE: ''.split(',') returns [''], which is not what we want!
  // The empty string requires special handling.
  return d === '' ? [] : (d?.split(',') ?? null);
}
function toggleDialect(toggle) {
  const active = new Set(activeDialects());
  const has = active.has(toggle);
  const dialects = SYNC_DIALECTS.find((list) => list.includes(toggle)) ?? [
    toggle,
  ];
  for (const dialect of dialects) {
    if (has) {
      active.delete(dialect);
    } else {
      active.add(dialect);
    }
  }
  if (active.size) {
    localStorage.setItem('d', Array.from(active).join(','));
  } else {
    localStorage.removeItem('d');
  }
}
// Handle 'developer' and 'dev' classes.
function toggleDev() {
  localStorage.setItem(
    'dev',
    localStorage.getItem('dev') === 'true' ? 'false' : 'true'
  );
}
// Handle 'reset' class.
function reset(dialectCheckboxes, highlighter) {
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
function getLinkHrefByRel(rel) {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}
function scroll(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}
function height(elem) {
  return elem.getBoundingClientRect().top + window.scrollY;
}
function findNextElement(query, target) {
  const elements = Array.from(document.querySelectorAll(query));
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
function scrollToNextElement(query, target) {
  const elem = findNextElement(query, target);
  if (!elem) {
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Section represents a group of related shortcuts.
class Section {
  title;
  shortcuts;
  constructor(title, shortcuts) {
    this.title = title;
    this.shortcuts = shortcuts;
  }
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
  visible() {
    return Object.values(this.shortcuts).some((shortcuts) => {
      return shortcuts.some((s) => s.visible());
    });
  }
  executable() {
    return Object.values(this.shortcuts).some((shortcuts) => {
      return shortcuts.some((s) => s.executable());
    });
  }
  consume(event) {
    return (
      (this.executable() &&
        this.shortcuts[event.key]?.some((s) => s.consume(event))) ??
      false
    );
  }
  canConsume(key) {
    if (!this.executable()) {
      return [];
    }
    return this.shortcuts[key]?.filter((s) => s.executable()) ?? [];
  }
  shortcutsRecord() {
    return this.shortcuts;
  }
}
function highlightFirstOccurrence(char, str) {
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
class HelpPanel {
  sections;
  overlay;
  panel;
  constructor(sections) {
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
    const help =
      document.getElementById('help') ??
      (() => {
        const footer =
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
    help.onclick = (event) => {
      this.togglePanel();
      event.stopPropagation();
    };
    // A mouse click outside the panel closes it.
    document.addEventListener('click', (event) => {
      this.handleClick(event);
    });
    this.panel = panel;
    this.overlay = overlay;
    this.validate();
  }
  consumeAux(event) {
    return this.sections.some((s) => s.consume(event));
  }
  consume(event) {
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
  togglePanel(visible) {
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
  handleClick(event) {
    if (
      this.panel.style.display === 'block' &&
      !this.panel.contains(event.target)
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
  description;
  available;
  action;
  show;
  constructor(description, available, action, show = true) {
    this.description = description;
    this.available = available;
    this.action = action;
    this.show = show;
  }
  executable() {
    return this.available.some((f) => f());
  }
  visible() {
    return this.executable() && this.show;
  }
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
  row(key) {
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
function makeDialectShortcut(key, name, code, dictionaries, link) {
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
  return new Shortcut(description, availability, (e) => {
    const dialectCode = DIALECT_SINGLE_CHAR[e.key] ?? e.key;
    toggleDialect(dialectCode);
    highlighter.updateDialects();
  });
}
// We disable the help panel on Anki for the following reasons:
// - There is no keyboard on mobile.
// - Many of the shortcuts simply don't work, for some reason.
// - Anki on macOS (and possibly on other platforms) has its own shortcuts,
//   which conflict with ours!
// - Elements created by the panel logic (such as the `help` footer) were
//   found to be duplicated on some Anki platforms!
const panel = anki() ? null : makeHelpPanel();
function makeHelpPanel() {
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
          panel.togglePanel();
        }
      ),
    ],
    Escape: [
      new Shortcut(
        'Toggle help panel',
        [xooxle, note, index, index_index],
        () => {
          panel.togglePanel(false);
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
          window.location.pathname.split('/').pop().replace('.html', '')
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
  const sections = [
    new Section('Dialect Highlighting', dialectHighlighting),
    new Section('Control', control),
    new Section('Search', search),
    new Section('Scroll To', scrollTo),
    new Section('Collapse', collapse),
  ];
  return new HelpPanel(sections);
}
function click(id) {
  document.getElementById(id).click();
}
function focus(id) {
  document.getElementById(id).focus();
}
function linkifyText(
  root,
  regex,
  url,
  classes,
  direct_parent_excluded_classes = []
) {
  const admit = (node) => {
    if (!node.nodeValue) {
      // The node has no text!
      return false;
    }
    if (!regex.test(node.nodeValue)) {
      // This text node doesn't match the regex.
      return false;
    }
    const parent = node.parentElement;
    if (!parent) {
      // We can't examine the parent tag name or classes for exclusions.
      // Accept the node.
      return true;
    }
    if (parent.tagName == 'a') {
      // The parent is already a link!
      return false;
    }
    if (
      direct_parent_excluded_classes.some((cls) =>
        parent.classList.contains(cls)
      )
    ) {
      // This parent is explicitly excluded.
      return false;
    }
    return true;
  };
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node) =>
      admit(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  );
  // We must store the replacements in a list because we can't mutate the DOM
  // while walking.
  const replacements = [];
  for (let node; (node = walker.nextNode()); ) {
    if (!node.nodeValue) {
      continue;
    }
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const text = node.nodeValue;
    regex.lastIndex = 0;
    for (let match; (match = regex.exec(text)) !== null; ) {
      const query = match[0];
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
      const link = document.createElement('span');
      link.classList.add(...classes);
      link.onclick = () => {
        window_open(url + query);
      };
      link.textContent = query;
      fragment.appendChild(link);
      lastIndex = match.index + query.length;
    }
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    replacements.push([node, fragment]);
  }
  replacements.forEach(([node, fragment]) => {
    node.replaceWith(fragment);
  });
}
function handleCopticLookups(root = document.body) {
  linkifyText(
    root,
    COPTIC_RE,
    LOOKUP_URL_PREFIX,
    ['hover-link'],
    ['type', 'title']
  );
}
function handleGreekLookups(root = document.body) {
  linkifyText(root, GREEK_RE, GREEK_LOOKUP_URL_PREFIX, ['link', 'light']);
}
function handleNonXooxleOnlyElements() {
  // Handle 'categories' class.
  document.querySelectorAll('.categories').forEach((elem) => {
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
  document.querySelectorAll('.root-type').forEach((elem) => {
    const type = elem.getElementsByTagName('b')[0]?.innerHTML;
    if (!type) {
      console.error('Unable to infer the root type for element!', elem);
      return;
    }
    const linked = `(<a class="hover-link" href="${crum()}${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
    elem.innerHTML = linked;
  });
  // Handle 'crum-page' class.
  document.querySelectorAll('.crum-page').forEach((el) => {
    const pageNumber = el.innerHTML;
    el.classList.add('link');
    makeSpanLinkToAnchor(el, `#crum${chopColumn(pageNumber)}`);
  });
  // Handle 'crum-page-external' class.
  document.querySelectorAll('.crum-page-external').forEach((el) => {
    el.classList.add('link');
    el.onclick = () => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`
      );
    };
  });
  // Handle 'dawoud-page-external' class.
  document.querySelectorAll('.dawoud-page-external').forEach((el) => {
    el.classList.add('link');
    el.onclick = () => {
      window_open(
        `${dawoud()}?page=${(+el.innerHTML + DAWOUD_OFFSET).toString()}`
      );
    };
  });
  // Handle 'dawoud-page-img' class.
  document.querySelectorAll('.dawoud-page-img').forEach((el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add('link');
    el.onclick = () => {
      window_open(
        `${dawoud()}?page=${(+el.getAttribute('alt') + DAWOUD_OFFSET).toString()}`
      );
    };
  });
  // Handle 'crum-page-img' class.
  document.querySelectorAll('.crum-page-img').forEach((el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add('link');
    el.onclick = () => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`
      );
    };
  });
  // Handle 'explanatory' class.
  document.querySelectorAll('.explanatory').forEach((el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    const img = el.children[0];
    const alt = img.getAttribute('alt');
    if (!alt.startsWith('http')) {
      return;
    }
    img.classList.add('link');
    img.onclick = () => {
      window_open(alt);
    };
  });
  // Handle 'dawoud-page' class.
  document.querySelectorAll('.dawoud-page').forEach((el) => {
    el.classList.add('link');
    makeSpanLinkToAnchor(el, `#dawoud${chopColumn(el.innerHTML)}`);
  });
  // Handle 'drv-key' class.
  document.querySelectorAll('.drv-key').forEach((el) => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
  });
  // Handle 'explanatory-key' class.
  document.querySelectorAll('.explanatory-key').forEach((el) => {
    el.classList.add('hover-link');
    makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
  });
  // Handle 'sister-key' class.
  document.querySelectorAll('.sister-key').forEach((el) => {
    el.classList.add('hover-link');
    makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
  // Handle 'sister-view' class.
  document.querySelectorAll('.sisters-table, .index-table').forEach((table) => {
    let counter = 1;
    Array.from(table.getElementsByTagName('tr')).forEach((el) => {
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
    });
  });
  document.querySelectorAll('.dialect').forEach((el) => {
    el.classList.add('hover-link');
    el.onclick = () => {
      toggleDialect(el.innerHTML);
      highlighter.updateDialects();
    };
  });
  document.querySelectorAll('.developer').forEach((el) => {
    el.classList.add('link');
    el.onclick = () => {
      toggleDev();
      highlighter.updateDev();
    };
  });
  if (anki()) {
    document.querySelectorAll('.navigate').forEach((e) => {
      if (e.tagName !== 'A' || !e.hasAttribute('href')) {
        console.error(
          'This "navigate" element is not an <a> tag with an "href" property!',
          e
        );
        return;
      }
      e.setAttribute('href', `${crum()}${e.getAttribute('href')}`);
    });
  }
  handleCopticLookups();
  handleGreekLookups();
}
function handleXooxleOnlyElements() {
  dialectCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('click', () => {
      toggleDialect(checkbox.name);
      highlighter.updateDialects();
    });
  });
}
function handleCommonElements() {
  highlighter.update();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // If the user switches to a different tab and then back to the current
      // tab, it's possible that they have changing the highlighting settings
      // through the other tab. We therefore need to update the highlighting.
      highlighter.update();
    }
  });
  // NOTE: We intentionally use the `keydown` event rather than the `keyup`
  // event, so that a long press would trigger a shortcut command repeatedly.
  // This is helpful for some of the commands.
  document.addEventListener('keydown', (e) => {
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
  document.querySelectorAll('.reset').forEach((el) => {
    el.classList.add('link');
    el.onclick = (event) => {
      reset(dialectCheckboxes, highlighter);
      // On Xooxle, clicking the button would normally submit the form and
      // reset everything (including the search box and the option
      // checkboxes). So prevent the event from propagating further.
      event.preventDefault();
    };
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
