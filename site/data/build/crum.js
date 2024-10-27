'use strict';
function xooxle() {
  return typeof XOOXLE !== 'undefined' && XOOXLE;
}
function anki() {
  return typeof ANKI !== 'undefined' && ANKI;
}
const HOME = 'http://remnqymi.com';
const SEARCH = `${HOME}/crum`;
const LOOKUP_URL_PREFIX = `${SEARCH}/?query=`;
const EMAIL = 'remnqymi@gmail.com';
const EMAIL_LINK = `mailto:${EMAIL}`;
const DAWOUD_OFFSET = 16;
const DIALECTS = [
  // Crum dialects.
  'S',
  'Sa',
  'Sf',
  'A',
  'sA',
  'B',
  'F',
  'Fb',
  'O',
  'NH',
  // KELLIA-only dialects.
  'Ak',
  'M',
  'L',
  'P',
  'V',
  'W',
  'U',
];
// DIALECT_SINGLE_CHAR is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
const DIALECT_SINGLE_CHAR = {
  'N': 'NH',
  'a': 'Sa',
  'f': 'Sf',
  's': 'sA',
  'b': 'Fb',
  'k': 'Ak',
};
class Highlighter {
  constructor() {
    // Reading CSS rules often fails locally due to CORS.
    try {
      this.anki = anki();
      this.sheet = this.anki ? null : window.document.styleSheets[0];
      this.spellingRuleIndex = this.sheet?.cssRules.length ?? 0;
      this.undialectedRuleIndex = (this.sheet?.cssRules.length ?? 0) + 1;
      this.punctuationRuleIndex = (this.sheet?.cssRules.length ?? 0) + 2;
      this.devRuleIndex = (this.sheet?.cssRules.length ?? 0) + 3;
    }
    catch {
      this.anki = true;
      this.sheet = null;
      this.spellingRuleIndex = 0;
      this.undialectedRuleIndex = 0;
      this.punctuationRuleIndex = 0;
      this.devRuleIndex = 0;
    }
  }
  update() {
    this.updateDialects();
    this.updateDev();
  }
  updateDialects() {
    const active = activeDialects();
    if (this.anki) {
      this.updateDialectsNoSheet(active);
      return;
    }
    const query = active?.map((d) => `.${d}`).join(',') ?? '';
    this.addOrReplaceRule(this.spellingRuleIndex, query
      ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: ${Highlighter.DIM};}`
      : `.spelling, .dialect {opacity: ${String(active === null ? Highlighter.BRIGHT : Highlighter.DIM)};}`);
    this.addOrReplaceRule(this.undialectedRuleIndex, `.spelling:not(${DIALECTS.map((d) => `.${d}`).join(',')}) { opacity: ${String(active === null || query ? Highlighter.BRIGHT : Highlighter.DIM)}; }`);
    this.addOrReplaceRule(this.punctuationRuleIndex, `.dialect-parenthesis, .dialect-comma, .spelling-comma, .type { opacity: ${String(active === null ? Highlighter.BRIGHT : Highlighter.DIM)}; }`);
  }
  updateDev() {
    const display = localStorage.getItem('dev') === 'true' ? 'block' : 'none';
    if (this.anki) {
      this.updateDevNoSheet(display);
      return;
    }
    this.addOrReplaceRule(this.devRuleIndex, `.dev, .nag-hammadi {display: ${display};}`);
  }
  updateDialectsNoSheet(active) {
    if (active === null) {
      // Highlighting is off. Show everything.
      document.querySelectorAll('.spelling, .dialect, .dialect-parenthesis, .dialect-comma, .spelling-comma, .type').forEach((el) => {
        el.style.opacity = Highlighter.BRIGHT;
      });
      return;
    }
    // Update spelling highlighting.
    document.querySelectorAll('.spelling, .dialect').forEach((el) => {
      let opacity = Highlighter.DIM;
      if (active.some((d) => el.classList.contains(d))) {
        opacity = Highlighter.BRIGHT;
      }
      else if (active.length > 1 &&
                !DIALECTS.some((d) => el.classList.contains(d))) {
        // If the element has no dialects, it should be shown provided that at
        // least one dialect is active.
        opacity = Highlighter.BRIGHT;
      }
      el.style.opacity = opacity;
    });
    // Update punctuation highlighting.
    document.querySelectorAll('.dialect-parenthesis, .dialect-comma, .spelling-comma, .type').forEach((el) => {
      el.style.opacity = Highlighter.DIM;
    });
  }
  updateDevNoSheet(display) {
    document.querySelectorAll('.dev, .nag-hammadi').forEach((el) => {
      el.style.display = display;
    });
  }
  addOrReplaceRule(index, rule) {
    if (index < this.sheet.cssRules.length) {
      this.sheet.deleteRule(index);
    }
    this.sheet.insertRule(rule, index);
  }
}
Highlighter.BRIGHT = '1.0';
Highlighter.DIM = '0.3';
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
  el.parentNode?.replaceChild(copy, el);
}
function makeLink(el, target) {
  moveElement(el, 'a', { 'href': target });
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
  return d === '' ? [] : d?.split(',') ?? null;
}
function toggleDialect(toggle) {
  const dd = new Set(activeDialects());
  if (dd.has(toggle)) {
    dd.delete(toggle);
  }
  else {
    dd.add(toggle);
  }
  localStorage.setItem('d', Array.from(dd).join(','));
}
// Handle 'developer' and 'dev' classes.
function toggleDev() {
  localStorage.setItem('dev', localStorage.getItem('dev') === 'true' ? 'false' : 'true');
}
// Handle 'reset' class.
function reset(dialectCheckboxes, highlighter, event) {
  dialectCheckboxes.forEach((box) => { box.checked = false; });
  const url = new URL(window.location.href);
  // NOTE: `url.hash` doesn't include text fragments (expressed by `#:~:text=`),
  // which is why we need to use `performance.getEntriesByType('navigation')`.
  // However, the latter doesn't always work, for some reason. In our
  // experience, it can retrieve the text fragment once, but if you reset and
  // then add a text fragment manually, it doesn't recognize it! This is not a
  // huge issue right now, so we aren't prioritizing fixing it!
  if (url.hash || performance.getEntriesByType('navigation')[0]?.name.includes('#')) {
    url.hash = '';
    window.history.replaceState('', '', url.toString());
    // Reload to get rid of the highlighting caused by the hash, if any.
    // This fails on some Anki platforms!
    try {
      window.location.reload();
    }
    catch { /* Do nothing. */ }
  }
  localStorage.clear();
  highlighter.update();
  if (xooxle()) {
    // In case this event comes from the reset button in XOOXLE, prevent
    // clicking the button from submitting the form, thus resetting everything!
    event.preventDefault();
  }
}
function getLinkHrefByRel(rel) {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}
function scroll(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
class Section {
  constructor(title, commands) {
    this.title = title;
    this.commands = commands;
  }
  createSection() {
    const div = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = this.title;
    div.appendChild(title);
    const table = document.createElement('table');
    // Add styles to ensure the left column is 10% of the width
    table.style.width = '100%'; // Make the table take 100% of the container width
    table.style.borderCollapse = 'collapse'; // Optional: to collapse the borders
    // Iterate over the entries in the record
    Object.entries(this.commands).forEach(([key, value]) => {
      // Create a row for each entry
      const row = document.createElement('tr');
      // Create a cell for the key (left column)
      const keyCell = document.createElement('td');
      const code = document.createElement('code');
      code.textContent = key;
      keyCell.appendChild(code);
      keyCell.style.width = '10%'; // Set the width of the left column to 10%
      keyCell.style.border = '1px solid black'; // Optional: Add a border for visibility
      keyCell.style.padding = '8px'; // Optional: Add padding
      // Create a cell for the value (right column)
      const valueCell = document.createElement('td');
      valueCell.innerHTML = this.highlightFirstOccurrence(key, value);
      valueCell.style.width = '90%'; // Set the width of the right column to 90%
      valueCell.style.border = '1px solid black'; // Optional: Add a border for visibility
      valueCell.style.padding = '8px'; // Optional: Add padding
      // Append cells to the row
      row.appendChild(keyCell);
      row.appendChild(valueCell);
      // Append the row to the table
      table.appendChild(row);
    });
    div.appendChild(table);
    return div;
  }
  highlightFirstOccurrence(char, str) {
    if (str.includes('<strong>')) {
      // Already highlighted.
      return str;
    }
    const index = str.toLowerCase().indexOf(char.toLowerCase());
    if (index === -1) {
      return str;
    }
    return `${str.slice(0, index)}<strong>${str[index]}</strong>${str.slice(index + 1)}`;
  }
}
;
class HelpPanel {
  constructor(sections) {
    // Create overlay background.
    const overlay = document.createElement('div');
    overlay.className = 'overlay-background';
    overlay.style.display = 'none'; // Hidden by default.
    document.body.appendChild(overlay);
    // Create info panel.
    const panel = document.createElement('div');
    panel.className = 'info-panel';
    panel.style.display = 'none'; // Hidden by default.
    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.innerHTML = '&times;'; // HTML entity for '×'.
    closeButton.onclick = () => { this.togglePanel(); };
    panel.appendChild(closeButton);
    sections.forEach((s) => { panel.appendChild(s.createSection()); });
    document.body.appendChild(panel);
    // Create help button.
    const footer = document.createElement('footer');
    const help = document.createElement('span');
    help.classList.add('link');
    help.innerHTML = '<center>help</center>';
    footer.appendChild(help);
    document.body.appendChild(footer);
    help.onclick = (event) => {
      this.togglePanel();
      event.stopPropagation();
    };
    // A mouse click outside the panel closes it.
    document.addEventListener('click', (event) => { this.handleClick(event); });
    this.panel = panel;
    this.overlay = overlay;
  }
  togglePanel(visible) {
    const target = visible !== undefined ? (visible ? 'block' : 'none') : (this.panel.style.display === 'block' ? 'none' : 'block');
    this.panel.style.display = target;
    this.overlay.style.display = target;
  }
  handleClick(event) {
    if (this.panel.style.display === 'block' && !this.panel.contains(event.target)) {
      this.togglePanel(false);
    }
  }
}
function makeHelpPanel() {
  // NOTE: This constructs the help panel. It's important for the content to
  // remain consistent with the commands that the page responds to.
  const commands = {
    r: 'Reset highlighting',
    d: 'Developer mode',
    e: `Email <a class="contact" href="${EMAIL_LINK}">${EMAIL}</a>`,
    h: 'Open homepage',
    X: 'Open the dictionary search page',
    '?': 'Toggle help panel',
  };
  if (!xooxle()) {
    commands['y'] = 'Yank (copy) the word key';
    commands['n'] = 'Go to next word';
    commands['p'] = 'Go to previous word';
  }
  const sections = [
    new Section('Commands', commands),
    new Section('Dialect Highlighting', {
      S: 'Sahidic',
      a: 'Sa: Sahidic with <strong>A</strong>khmimic tendency',
      f: 'Sf: Sahidic with <strong>F</strong>ayyumic tendency',
      A: 'Akhmimic',
      s: 'sA: <strong>s</strong>ubAkhmimic (Lycopolitan)',
      B: 'Bohairic',
      F: 'Fayyumic',
      b: 'Fb: Fayyumic with <strong>B</strong>ohairic tendency',
      O: 'Old Coptic',
      N: 'NH: <strong>N</strong>ag Hammadi',
      k: 'Ak: Old Coptic',
      M: 'Mesokemic',
      L: 'Lycopolitan (subAkhmimic)',
      P: 'Proto-Theban',
      V: 'South Fayyumic Greek',
      W: 'Crypto-Mesokemic Greek',
      U: 'Greek (usage <strong>u</strong>nclear)',
    }),
  ];
  if (xooxle()) {
    sections.push(new Section('Search', {
      w: 'Toggle full word search',
      x: 'Toggle regex search',
      '/': 'Focus search box',
    }));
    sections.push(new Section('Scrol To', {
      'C': 'Crum',
      'K': 'KELLIA',
      'T': 'copticsi<strong>t</strong>e',
    }));
    sections.push(new Section('Collapse', {
      'c': 'Crum',
      'l': 'KELLIA',
      't': 'copticsi<strong>t</strong>e',
    }));
  }
  else {
    sections.push(new Section('Scroll To', {
      C: 'Crum pages',
      D: 'Dawoud pages',
      l: 'Related words',
      m: 'Meaning',
      t: 'Type',
      i: 'Images',
      y: 'Words',
      Y: 'Words',
      v: 'Derivations table',
      u: 'Header (up)',
      c: 'Dictionary page list',
    }));
  }
  return new HelpPanel(sections);
}
function click(id) {
  document.getElementById(id)?.click();
}
function focus(id) {
  document.getElementById(id)?.focus();
}
function main() {
  const highlighter = new Highlighter();
  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic (such as the `help` footer) were
  //   found to be duplicated on some Anki platforms!
  const panel = anki() ? null : makeHelpPanel();
  const dialectCheckboxes = document.querySelectorAll('.dialect-checkbox');
  // Handle 'crum-page' class.
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page'), (el) => {
    const pageNumber = el.innerHTML;
    el.classList.add('link');
    makeLink(el, `#crum${chopColumn(pageNumber)}`);
  });
  // Handle 'crum-page-external' class.
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page-external'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`);
    };
  });
  // Handle 'dawoud-page-external' class.
  Array.prototype.forEach.call(document.getElementsByClassName('dawoud-page-external'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      window_open(`${HOME}/dawoud/${(+el.innerHTML + DAWOUD_OFFSET).toString()}.jpg`);
    };
  });
  // Handle 'dawoud-page-img' class.
  Array.prototype.forEach.call(document.getElementsByClassName('dawoud-page-img'), (el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add('link');
    el.onclick = () => {
      window_open(`${HOME}/dawoud/${(+el.getAttribute('alt') + DAWOUD_OFFSET).toString()}.jpg`);
    };
  });
  // Handle 'crum-page-img' class.
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page-img'), (el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add('link');
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`);
    };
  });
  // Handle 'explanatory' class.
  Array.prototype.forEach.call(document.getElementsByClassName('explanatory'), (el) => {
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
  // Handle 'coptic' class.
  Array.prototype.forEach.call(document.getElementsByClassName('coptic'), (el) => {
    el.classList.add('hover-link');
    el.onclick = () => {
      window_open(LOOKUP_URL_PREFIX + el.innerHTML);
    };
  });
  // Handle 'greek' class.
  Array.prototype.forEach.call(document.getElementsByClassName('greek'), (el) => {
    el.classList.add('link');
    el.classList.add('light');
    el.onclick = () => {
      window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
    };
  });
  // Handle 'dawoud-page' class.
  Array.prototype.forEach.call(document.getElementsByClassName('dawoud-page'), (el) => {
    el.classList.add('link');
    makeLink(el, `#dawoud${chopColumn(el.innerHTML)}`);
  });
  // Handle 'drv-key' class.
  Array.prototype.forEach.call(document.getElementsByClassName('drv-key'), (el) => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    makeLink(el, `#drv${el.innerHTML}`);
  });
  // Handle 'explanatory-key' class.
  Array.prototype.forEach.call(document.getElementsByClassName('explanatory-key'), (el) => {
    el.classList.add('hover-link');
    makeLink(el, `#explanatory${el.innerHTML}`);
  });
  // Handle 'sister-key' class.
  Array.prototype.forEach.call(document.getElementsByClassName('sister-key'), (el) => {
    el.classList.add('hover-link');
    makeLink(el, `#sister${el.innerHTML}`);
  });
  Array.prototype.forEach.call(document.getElementsByClassName('dialect'), (el) => {
    el.classList.add('hover-link');
    el.onclick = () => {
      toggleDialect(el.innerHTML);
      highlighter.updateDialects();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('developer'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      toggleDev();
      highlighter.updateDev();
    };
  });
  // NOTE: The `reset` class is only used in the notes pages.
  Array.prototype.forEach.call(document.getElementsByClassName('reset'), (el) => {
    el.classList.add('link');
    el.onclick = (event) => {
      reset(dialectCheckboxes, highlighter, event);
    };
  });
  // NOTE: The element with the ID `reset` is only present on the XOOXLE page.
  document.getElementById('reset')?.addEventListener('click', (event) => {
    reset(dialectCheckboxes, highlighter, event);
  });
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
  // When we click a checkbox, it is the boxes that dictate the set of active
  // dialects and highlighting. So we use the boxes to update 'd', and then
  // update highlighting.
  dialectCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      localStorage.setItem('d', Array.from(dialectCheckboxes)
        .filter((box) => box.checked)
        .map((box) => box.name).join(','));
      highlighter.updateDialects();
    });
  });
  // Collapse logic.
  Array.prototype.forEach.call(document.getElementsByClassName('collapse'), (collapse) => {
    collapse.addEventListener('click', function () {
      // TODO: Remove the dependency on the HTML structure.
      const collapsible = collapse.nextElementSibling;
      collapsible.style.maxHeight = collapsible.style.maxHeight ? '' : collapsible.scrollHeight.toString() + 'px';
    });
    collapse.click();
  });
  // NOTE: This is where we define all our command shortcuts. It's important for
  // the content to remain in sync with the help panel.
  document.addEventListener('keyup', (e) => {
    if (anki()) {
      // The help panel and keyboard shortcuts are disabled on Anki!
      return;
    }
    switch (e.key) {
    // Commands:
    case 'r':
      reset(dialectCheckboxes, highlighter, e);
      break;
    case 'd':
      toggleDev();
      highlighter.updateDev();
      break;
    case 'e':
      window_open(EMAIL_LINK);
      break;
    case 'h':
      window_open(HOME);
      break;
    case 'X':
      window_open(SEARCH);
      break;
    case 'n':
      window_open(getLinkHrefByRel('next'), false);
      break;
    case 'p':
      window_open(getLinkHrefByRel('prev'), false);
      break;
    case 'y':
      if (!xooxle()) {
        void navigator.clipboard.writeText(window.location.pathname.split('/').pop().replace('.html', ''));
      }
      break;
    case '?':
      panel?.togglePanel();
      break;
    case 'Escape':
      panel?.togglePanel(false);
      break;
      // Search panel:
    case '/':
      focus('searchBox');
      break;
    case 'w':
      click('fullWordCheckbox');
      break;
    case 'x':
      click('regexCheckbox');
      break;
      // Dialects:
    case 'B':
    case 'S':
    case 'A':
    case 'F':
    case 'O':
    case 'N':
    case 'a':
    case 'f':
    case 's':
    case 'b':
    case 'k':
    case 'M':
    case 'L':
    case 'P':
    case 'V':
    case 'W':
    case 'U':
      if (xooxle()) {
        click(`checkbox-${DIALECT_SINGLE_CHAR[e.key] ?? e.key}`);
      }
      else {
        toggleDialect(DIALECT_SINGLE_CHAR[e.key] ?? e.key);
        highlighter.updateDialects();
      }
      break;
      // Scrolling and collapsing:
    case 'C':
      if (xooxle()) {
        scroll('crum-title');
      }
      else {
        scroll('crum');
      }
      break;
    case 'K':
      scroll('kellia-title');
      break;
    case 'T':
      scroll('copticsite-title');
      break;
    case 'c':
      if (xooxle()) {
        click('crum-title');
      }
      else {
        scroll('dictionary');
      }
      break;
    case 'l':
      if (xooxle()) {
        click('kellia-title');
      }
      else {
        scroll('sisters');
      }
      break;
    case 't':
      if (xooxle()) {
        click('copticsite-title');
      }
      else {
        scroll('root-type');
      }
      break;
    case 'D':
      scroll('dawoud');
      break;
    case 'm':
      scroll('meaning');
      break;
    case 'i':
      scroll('images');
      break;
    case 'Q':
      scroll('marcion');
      break;
    case 'q':
      scroll('pretty');
      break;
    case 'v':
      scroll('derivations');
      break;
    case 'u':
      scroll('header');
      break;
    }
  });
}
main();
