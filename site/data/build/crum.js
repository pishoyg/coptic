'use strict';
// NOTE: While this file is used for both Crum and Xooxle, make sure that only
// the Crum-specific Xooxle content lives here, and that any generic Xooxle
// logic (applicable for other instances of Xooxle) live in the shared Xooxle
// files.
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.
const dialectCheckboxes = Array.from(
  document.querySelectorAll('.dialect-checkbox')
);
function xooxle() {
  return typeof XOOXLE !== 'undefined' && XOOXLE;
}
// Since we (currently) only run on Crum notes or Xooxle, the fact that we're
// not running on Xooxle implies that we're running on a Crum note.
function note() {
  return !xooxle();
}
function anki() {
  return typeof ANKI !== 'undefined' && ANKI;
}
const HOME = 'http://remnqymi.com';
const SEARCH = `${HOME}/crum`;
const LOOKUP_URL_PREFIX = `${SEARCH}/?query=`;
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
      this.dialectRuleIndex = this.sheet?.cssRules.length ?? 0;
      this.devRuleIndex = this.dialectRuleIndex + 1;
    } catch {
      this.anki = true;
      this.sheet = null;
      this.dialectRuleIndex = 0;
      this.devRuleIndex = 0;
    }
  }
  update() {
    this.updateDialects();
    this.updateDev();
  }
  updateDialects() {
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
  updateDev() {
    const display = localStorage.getItem('dev') === 'true' ? 'block' : 'none';
    this.updateSheetOrElements(
      this.devRuleIndex,
      '.dev, .nag-hammadi',
      `display: ${display};`,
      (el) => {
        el.style.display = display;
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
Highlighter.BRIGHT = '1.0';
Highlighter.DIM = '0.3';
// TODO: This is a bad place to define a global variable.
const highlighter = new Highlighter();
function window_open(url, external = true) {
  if (!url) {
    return;
  }
  if (external) {
    window.open(url, '_blank', 'noopener,noreferrer').focus();
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
function makeLink(el, target) {
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
// syncDialects returns the list of dialects that should be synced with the
// given dialect. This includes the given dialect itself.
function syncDialects(dialect) {
  return SYNC_DIALECTS.find((list) => list.includes(dialect)) ?? [dialect];
}
function toggleDialect(toggle) {
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
function findNextElement(className, target) {
  const elements = Array.from(document.getElementsByClassName(className));
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
function scrollToNextElement(className, target) {
  const elem = findNextElement(className, target);
  if (!elem) {
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Section represents a group of related shortcuts.
class Section {
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
    if (!this.executable()) {
      return false;
    }
    const shortcuts = this.shortcuts[event.key];
    if (!shortcuts) {
      return false;
    }
    return shortcuts.some((s) => s.consume(event));
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
  consume(event) {
    return this.sections.some((s) => s.consume(event));
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
var Where;
(function (Where) {
  Where[(Where['XOOXLE'] = 0)] = 'XOOXLE';
  Where[(Where['NOTE'] = 1)] = 'NOTE';
  Where[(Where['XOOXLE_AND_NOTE'] = 2)] = 'XOOXLE_AND_NOTE';
})(Where || (Where = {}));
class Shortcut {
  constructor(description, availability, action, show = true) {
    this.description = description;
    this.availability = availability;
    this.action = action;
    this.show = show;
  }
  executable() {
    switch (this.availability) {
      case Where.XOOXLE_AND_NOTE:
        return xooxle() || note();
      case Where.XOOXLE:
        return xooxle();
      case Where.NOTE:
        return note();
    }
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
    ? Where.XOOXLE_AND_NOTE
    : Where.XOOXLE;
  return new Shortcut(description, availability, (e) => {
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
      new Shortcut('Reset highlighting', Where.XOOXLE_AND_NOTE, () => {
        reset(dialectCheckboxes, highlighter);
      }),
    ],
    d: [
      new Shortcut('Developer mode', Where.XOOXLE_AND_NOTE, () => {
        toggleDev();
        highlighter.updateDev();
      }),
    ],
    R: [
      new Shortcut(
        `<strong>R</strong>eports / Contact <a class="contact" href="${EMAIL_LINK}">${EMAIL}</a>`,
        Where.XOOXLE_AND_NOTE,
        () => {
          window_open(EMAIL_LINK);
        }
      ),
    ],
    h: [
      new Shortcut(
        `Open <a href="${HOME}" target="_blank"><strong>h</strong>omepage</a>`,
        Where.XOOXLE_AND_NOTE,
        () => {
          window_open(HOME);
        }
      ),
    ],
    X: [
      new Shortcut(
        `Open the <a href="${SEARCH}" target="_blank">dictionary search page</a>`,
        Where.XOOXLE_AND_NOTE,
        () => {
          window_open(SEARCH);
        }
      ),
    ],
    '?': [
      new Shortcut('Toggle help panel', Where.XOOXLE_AND_NOTE, () => {
        panel.togglePanel();
      }),
    ],
    Escape: [
      new Shortcut(
        'Toggle help panel',
        Where.XOOXLE_AND_NOTE,
        () => {
          panel.togglePanel(false);
        },
        false
      ),
    ],
    o: [
      new Shortcut('Open the current result', Where.XOOXLE, () => {
        findNextElement('view', 'cur')?.querySelector('a')?.click();
      }),
    ],
    n: [
      new Shortcut('Go to next word', Where.NOTE, () => {
        window_open(getLinkHrefByRel('next'), false);
      }),
    ],
    p: [
      new Shortcut('Go to previous word', Where.NOTE, () => {
        window_open(getLinkHrefByRel('prev'), false);
      }),
    ],
    y: [
      new Shortcut('Yank (copy) the word key', Where.NOTE, () => {
        void navigator.clipboard.writeText(
          window.location.pathname.split('/').pop().replace('.html', '')
        );
      }),
    ],
  };
  const search = {
    w: [
      new Shortcut('Toggle full-word search', Where.XOOXLE, () => {
        click('fullWordCheckbox');
      }),
    ],
    x: [
      new Shortcut('Toggle regex search', Where.XOOXLE, () => {
        click('regexCheckbox');
      }),
    ],
    '/': [
      new Shortcut('Focus on the search box', Where.XOOXLE, () => {
        focus('searchBox');
      }),
    ],
    ';': [
      new Shortcut('Focus on the Crum Google search box', Where.XOOXLE, () => {
        document.querySelector('#google input').focus();
      }),
    ],
  };
  const scrollTo = {
    n: [
      new Shortcut('Next search result', Where.XOOXLE, () => {
        scrollToNextElement('view', 'next');
      }),
    ],
    p: [
      new Shortcut('Previous search result', Where.XOOXLE, () => {
        scrollToNextElement('view', 'prev');
      }),
    ],
    C: [
      new Shortcut('Crum', Where.XOOXLE, () => {
        scroll('crum-title');
      }),
      new Shortcut('Crum pages', Where.NOTE, () => {
        scroll('crum');
      }),
    ],
    E: [
      new Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        Where.XOOXLE,
        () => {
          scroll('kellia-title');
        }
      ),
    ],
    T: [
      new Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        Where.XOOXLE,
        () => {
          scroll('copticsite-title');
        }
      ),
    ],
    D: [
      new Shortcut('Dawoud pages', Where.NOTE, () => {
        scroll('dawoud');
      }),
    ],
    l: [
      new Shortcut('Related words', Where.NOTE, () => {
        scroll('sisters');
      }),
    ],
    m: [
      new Shortcut('Meaning', Where.NOTE, () => {
        scroll('meaning');
      }),
    ],
    e: [
      new Shortcut(
        'S<strong>e</strong>ns<strong>e</strong>s',
        Where.NOTE,
        () => {
          scroll('senses');
        }
      ),
    ],
    t: [
      new Shortcut('Type', Where.NOTE, () => {
        scroll('root-type');
      }),
    ],
    i: [
      new Shortcut('Images', Where.NOTE, () => {
        scroll('images');
      }),
    ],
    q: [
      new Shortcut('Words', Where.NOTE, () => {
        scroll('pretty');
      }),
    ],
    Q: [
      new Shortcut('Words', Where.NOTE, () => {
        scroll('marcion');
      }),
    ],
    v: [
      new Shortcut('Derivations table', Where.NOTE, () => {
        scroll('derivations');
      }),
    ],
    c: [
      new Shortcut('Dictionary page list', Where.NOTE, () => {
        scroll('dictionary');
      }),
    ],
    g: [
      new Shortcut('Header', Where.XOOXLE_AND_NOTE, () => {
        scroll('header');
      }),
    ],
    G: [
      new Shortcut('Footer', Where.XOOXLE_AND_NOTE, () => {
        scroll('footer');
      }),
    ],
  };
  const collapse = {
    c: [
      new Shortcut('Crum', Where.XOOXLE, () => {
        click('crum-title');
      }),
    ],
    e: [
      new Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        Where.XOOXLE,
        () => {
          click('kellia-title');
        }
      ),
    ],
    t: [
      new Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        Where.XOOXLE,
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
function handleNoteElements() {
  // Handle 'crum-page' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('crum-page'),
    (el) => {
      const pageNumber = el.innerHTML;
      el.classList.add('link');
      makeLink(el, `#crum${chopColumn(pageNumber)}`);
    }
  );
  // Handle 'crum-page-external' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('crum-page-external'),
    (el) => {
      el.classList.add('link');
      el.onclick = () => {
        window_open(
          `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`
        );
      };
    }
  );
  // Handle 'dawoud-page-external' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('dawoud-page-external'),
    (el) => {
      el.classList.add('link');
      el.onclick = () => {
        window_open(
          `${HOME}/dawoud/${(+el.innerHTML + DAWOUD_OFFSET).toString()}.jpg`
        );
      };
    }
  );
  // Handle 'dawoud-page-img' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('dawoud-page-img'),
    (el) => {
      // TODO: (#202) Eliminate the dependency on the HTML structure.
      el = el.children[0];
      el.classList.add('link');
      el.onclick = () => {
        window_open(
          `${HOME}/dawoud/${(+el.getAttribute('alt') + DAWOUD_OFFSET).toString()}.jpg`
        );
      };
    }
  );
  // Handle 'crum-page-img' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('crum-page-img'),
    (el) => {
      // TODO: (#202) Eliminate the dependency on the HTML structure.
      el = el.children[0];
      el.classList.add('link');
      el.onclick = () => {
        window_open(
          `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`
        );
      };
    }
  );
  // Handle 'explanatory' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('explanatory'),
    (el) => {
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
    }
  );
  // Handle 'coptic' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('coptic'),
    (el) => {
      el.classList.add('hover-link');
      el.onclick = () => {
        window_open(LOOKUP_URL_PREFIX + el.innerHTML);
      };
    }
  );
  // Handle 'greek' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('greek'),
    (el) => {
      el.classList.add('link');
      el.classList.add('light');
      el.onclick = () => {
        window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
      };
    }
  );
  // Handle 'dawoud-page' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('dawoud-page'),
    (el) => {
      el.classList.add('link');
      makeLink(el, `#dawoud${chopColumn(el.innerHTML)}`);
    }
  );
  // Handle 'drv-key' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('drv-key'),
    (el) => {
      el.classList.add('small', 'light', 'italic', 'hover-link');
      makeLink(el, `#drv${el.innerHTML}`);
    }
  );
  // Handle 'explanatory-key' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('explanatory-key'),
    (el) => {
      el.classList.add('hover-link');
      makeLink(el, `#explanatory${el.innerHTML}`);
    }
  );
  // Handle 'sister-key' class.
  Array.prototype.forEach.call(
    document.getElementsByClassName('sister-key'),
    (el) => {
      el.classList.add('hover-link');
      makeLink(el, `#sister${el.innerHTML}`);
    }
  );
  Array.prototype.forEach.call(
    document.getElementsByClassName('dialect'),
    (el) => {
      el.classList.add('hover-link');
      el.onclick = () => {
        toggleDialect(el.innerHTML);
        highlighter.updateDialects();
      };
    }
  );
  Array.prototype.forEach.call(
    document.getElementsByClassName('developer'),
    (el) => {
      el.classList.add('link');
      el.onclick = () => {
        toggleDev();
        highlighter.updateDev();
      };
    }
  );
  // NOTE: The `reset` class is only used in the notes pages.
  Array.prototype.forEach.call(
    document.getElementsByClassName('reset'),
    (el) => {
      el.classList.add('link');
      el.onclick = () => {
        reset(dialectCheckboxes, highlighter);
      };
    }
  );
}
function initGoogleSearchBox() {
  const googleSearchBox = document.querySelector('#google input');
  // Prevent search query typing from triggering a shortcut command.
  googleSearchBox.addEventListener('keydown', (e) => {
    e.stopPropagation();
  });
  googleSearchBox.placeholder =
    'Search A Coptic Dictionary, W. E. Crum, using Ⲅⲟⲟⲅⲗⲉ';
  googleSearchBox.ariaPlaceholder =
    'Search A Coptic Dictionary, W. E. Crum, using Ⲅⲟⲟⲅⲗⲉ';
}
function handleXooxleElements() {
  // NOTE: The element with the ID `reset` is only present on the XOOXLE page.
  document.getElementById('reset')?.addEventListener('click', (event) => {
    reset(dialectCheckboxes, highlighter);
    // On Xooxle, clicking the button would normally submit the form and
    // reset everything (including the search box and the option checkboxes).
    // So prevent the event from propagating further.
    event.preventDefault();
  });
  // Collapse logic.
  Array.prototype.forEach.call(
    document.getElementsByClassName('collapse'),
    (collapse) => {
      collapse.addEventListener('click', function () {
        // TODO: Remove the dependency on the HTML structure.
        const collapsible = collapse.nextElementSibling;
        collapsible.style.maxHeight = collapsible.style.maxHeight
          ? ''
          : collapsible.scrollHeight.toString() + 'px';
      });
      collapse.click();
    }
  );
  // When we click a checkbox, it is the boxes that dictate the set of active
  // dialects and highlighting. So we use the boxes to update 'd', and then
  // update highlighting.
  dialectCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('click', () => {
      syncDialects(checkbox.name).forEach((d) => {
        const checkboxToSync = document.getElementById(`checkbox-${d}`);
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
  // When we first load the page, 'd' dictates the set of active dialects and
  // hence highlighting. We load 'd' from the local storage, and we update the
  // boxes to match this set. Then we update the CSS.
  window.addEventListener('pageshow', () => {
    const active = activeDialects();
    Array.from(dialectCheckboxes).forEach((box) => {
      box.checked = active?.includes(box.name) ?? false;
    });
    highlighter.update();
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
    if (anki()) {
      // The help panel and keyboard shortcuts are disabled on Anki!
      return;
    }
    if (panel?.consume(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}
function main() {
  if (note()) {
    handleNoteElements();
  }
  if (xooxle()) {
    handleXooxleElements();
  }
  handleCommonElements();
}
main();
