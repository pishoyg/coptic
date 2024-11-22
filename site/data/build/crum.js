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
  'K',
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
function classQuery(classes) {
  return classes.map(c => `.${c}`).join(', ');
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
    }
    catch {
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
      this.updateSheetOrElements(this.dialectRuleIndex, '.word *', '', (el) => { el.style.opacity = Highlighter.BRIGHT; });
      return;
    }
    if (active.length === 0) {
      // All dialects are off.
      this.updateSheetOrElements(this.dialectRuleIndex, '.word *', `opacity: ${Highlighter.DIM};`, (el) => { el.style.opacity = Highlighter.DIM; });
      return;
    }
    // Some dialects are on, some are off.
    // Dim all children of `word` elements, with the exception of:
    // - Active dialects.
    // - Undialected spellings.
    const query = `.word > :not(${classQuery(active)},.spelling:not(${classQuery(DIALECTS)}))`;
    const style = `opacity: ${Highlighter.DIM};`;
    this.updateSheetOrElements(this.dialectRuleIndex, query, style, (el) => { el.style.opacity = Highlighter.DIM; }, '.word *', (el) => { el.style.opacity = Highlighter.BRIGHT; });
  }
  updateDev() {
    const display = localStorage.getItem('dev') === 'true' ? 'block' : 'none';
    this.updateSheetOrElements(this.devRuleIndex, '.dev, .nag-hammadi', `display: ${display};`, (el) => {
      el.style.display = display;
    });
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
  updateSheetOrElements(rule_index, query, style, func, reset_query, reset_func) {
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
function reset(dialectCheckboxes, highlighter) {
  dialectCheckboxes.forEach((box) => { box.checked = false; });
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
  if (!url.hash && !performance.getEntriesByType('navigation')[0]?.name.includes('#')) {
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
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
function height(elem) {
  return elem.getBoundingClientRect().top + window.scrollY;
}
function findNextElement(className, target) {
  const elements = Array.from(document.getElementsByClassName(className));
  elements.sort((a, b) => target == 'prev'
    ? height(b) - height(a)
    : height(a) - height(b));
  const currentScrollY = window.scrollY;
  return elements.find((element) => target === 'prev'
    ? height(element) < currentScrollY - 10
    : target === 'next'
      ? height(element) > currentScrollY + 10
      : height(element) >= currentScrollY - 1);
}
function scrollToNextElement(className, target) {
  const elem = findNextElement(className, target);
  if (!elem) {
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
class Section {
  constructor(title, commands) {
    this.title = title;
    this.commands = commands;
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
      valueCell.innerHTML = highlightFirstOccurrence(key, value);
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
}
;
function highlightFirstOccurrence(char, str) {
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
    const h2 = document.createElement('h2');
    h2.textContent = 'Keyboard Shortcuts';
    panel.appendChild(h2);
    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.innerHTML = '&times;'; // HTML entity for '×'.
    closeButton.onclick = () => { this.togglePanel(); };
    panel.appendChild(closeButton);
    sections.forEach((s) => { panel.appendChild(s.createSection()); });
    document.body.appendChild(panel);
    // Create help button, if it doesn't already exist.
    const help = document.getElementById('help') ?? (() => {
      const footer = document.getElementsByTagName('footer')[0]
                ?? document.createElement('footer');
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
function makeDialectDescription(key, name, code, dictionaries, link) {
  code = highlightFirstOccurrence(key, code);
  name = highlightFirstOccurrence(key, name);
  if (link) {
    name = `<a href="${link}" target="_blank" rel="noopener,noreferrer">${name}</a>`;
  }
  return `
<table>
  <tr>
    <td class="dialect-code">(${code})</td>
    <td class="dialect-name">${name}</td>
    <td class="dialect-dictionaries">(${dictionaries.join(', ')})</td>
  </tr>
</table>`;
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
  if (xooxle()) {
    commands['o'] = 'Open the current result';
  }
  else {
    commands['n'] = 'Go to next word';
    commands['p'] = 'Go to previous word';
    commands['y'] = 'Yank (copy) the word key';
  }
  const sections = [
    new Section('Dialect Highlighting', {
      S: makeDialectDescription('S', 'Sahidic', 'S', ['Crum', 'KELLIA']),
      a: makeDialectDescription('a', 'Sahidic with <strong>A</strong>khmimic tendency', 'Sa', ['Crum']),
      f: makeDialectDescription('f', 'Sahidic with <strong>F</strong>ayyumic tendency', 'Sf', ['Crum']),
      A: makeDialectDescription('A', 'Akhmimic', 'A', ['Crum', 'KELLIA'], 'https://drive.google.com/file/d/1-8NnctwGRuELh5vUyg8Q6cLvC18QFQ_7/view?usp=sharing'),
      s: makeDialectDescription('s', 'subAkhmimic', 'sA', ['Crum'], 'https://drive.google.com/file/d/1-DlCHvLq4BW9D-Na9l5tSTMMAqk5RyS7/view?usp=sharing'),
      B: makeDialectDescription('B', 'Bohairic', 'B', ['Crum', 'KELLIA', 'copticsite']),
      F: makeDialectDescription('F', 'Fayyumic', 'F', ['Crum', 'KELLIA'], 'https://drive.google.com/file/d/1-7irhAMOrhIUuOZO4L0PS70WN362-8qM/view?usp=sharing'),
      b: makeDialectDescription('b', 'Fayyumic with <strong>B</strong>ohairic tendency', 'Fb', ['Crum']),
      O: makeDialectDescription('O', 'Old Coptic', 'O', ['Crum']),
      N: makeDialectDescription('N', 'Nag Hammadi', 'NH', ['Crum (Marcion)']),
      k: makeDialectDescription('k', 'Old Coptic', 'Ak', ['KELLIA']),
      M: makeDialectDescription('M', 'Mesokemic', 'M', ['KELLIA'], 'https://drive.google.com/file/d/1-8oyA_aogjiAL6pt2L7DvqsTgrZHoVD8/view?usp=sharing'),
      L: makeDialectDescription('L', 'Lycopolitan', 'L', ['KELLIA'], 'https://drive.google.com/file/d/1-DlCHvLq4BW9D-Na9l5tSTMMAqk5RyS7/view?usp=sharing'),
      P: makeDialectDescription('P', 'Proto-Theban', 'P', ['KELLIA'], 'https://drive.google.com/file/d/1-8mMgSvtM9JMzQAvM9HEOotxYUOBo1Bc/view?usp=sharing'),
      V: makeDialectDescription('V', 'South Fayyumic Greek', 'V', ['KELLIA']),
      W: makeDialectDescription('W', 'Crypto-Mesokemic Greek', 'W', ['KELLIA']),
      U: makeDialectDescription('U', 'Greek (usage <strong>u</strong>nclear)', 'U', ['KELLIA']),
      // TODO: (#279) What is this dialect called?
      // It's from TLA (e.g. https://coptic-dictionary.org/entry.cgi?tla=C2537).
      K: makeDialectDescription('K', '', 'K', ['KELLIA']),
    }),
    new Section('Control', commands),
  ];
  if (xooxle()) {
    sections.push(new Section('Search', {
      w: 'Toggle full word search',
      x: 'Toggle regex search',
      '/': 'Focus search box',
      ';': 'Focus the Crum Google search box',
    }));
    sections.push(new Section('Scroll To', {
      n: 'Next search result',
      p: 'Previous search result',
      C: 'Crum',
      Z: '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">KELLIA</a>',
      T: '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
    }));
    sections.push(new Section('Collapse', {
      c: 'Crum',
      z: '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">KELLIA</a>',
      t: '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
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
    el.onclick = () => {
      reset(dialectCheckboxes, highlighter);
    };
  });
  // NOTE: The element with the ID `reset` is only present on the XOOXLE page.
  document.getElementById('reset')?.addEventListener('click', (event) => {
    reset(dialectCheckboxes, highlighter);
    // On Xooxle, clicking the button would normally submit the form and
    // reset everything (including the search box and the option checkboxes).
    // So prevent the event from propagating further.
    event.preventDefault();
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
  // TODO: (#280) Combine the help panel and `keydown` listener code.
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
    let consumed = true;
    switch (e.key) {
    // Commands:
    case 'r':
      reset(dialectCheckboxes, highlighter);
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
      if (xooxle()) {
        scrollToNextElement('view', 'next');
      }
      else {
        window_open(getLinkHrefByRel('next'), false);
      }
      break;
    case 'p':
      if (xooxle()) {
        scrollToNextElement('view', 'prev');
      }
      else {
        window_open(getLinkHrefByRel('prev'), false);
      }
      break;
    case 'y':
      if (!xooxle()) {
        void navigator.clipboard.writeText(window.location.pathname.split('/').pop().replace('.html', ''));
      }
      break;
    case 'o':
      if (xooxle()) {
        findNextElement('view', 'cur')?.querySelector('a')?.click();
      }
      break;
    case '?':
      panel?.togglePanel();
      break;
    case 'Escape':
      panel?.togglePanel(false);
      break;
    case '/':
      focus('searchBox');
      break;
    case ';':
      document.querySelector('#google input').focus();
      break;
    case 'w':
      click('fullWordCheckbox');
      break;
    case 'x':
      click('regexCheckbox');
      break;
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
    case 'K':
      if (xooxle()) {
        click(`checkbox-${DIALECT_SINGLE_CHAR[e.key] ?? e.key}`);
      }
      else {
        toggleDialect(DIALECT_SINGLE_CHAR[e.key] ?? e.key);
        highlighter.updateDialects();
      }
      break;
    case 'C':
      if (xooxle()) {
        scroll('crum-title');
      }
      else {
        scroll('crum');
      }
      break;
    case 'Z':
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
    case 'z':
      click('kellia-title');
      break;
    case 'l':
      scroll('sisters');
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
    default:
      consumed = false;
    }
    if (consumed) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  if (xooxle()) {
    // We have to do this when the page is fully loaded to guarantee that the
    // Google search box has already been loaded by the Google-provided script.
    const googleSearchBox = document.querySelector('#google input');
    // Prevent search query typing from triggering a shortcut command.
    googleSearchBox.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
    googleSearchBox.placeholder = 'Search A Coptic Dictionary, W. E. Crum, using Ⲅⲟⲟⲅⲗⲉ';
    googleSearchBox.ariaPlaceholder = 'Search A Coptic Dictionary, W. E. Crum, using Ⲅⲟⲟⲅⲗⲉ';
  }
}
main();
