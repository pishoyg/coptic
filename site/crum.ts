'use strict';
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

// NOTE: This file is used in both Crum's Xooxle search page, as well as the
// pages belonging to individual notes. We use the `XOOXLE` global variable to
// distinguish the two. In the Xooxle page, `XOOXLE` is defined and set to
// `true`.
declare let XOOXLE: boolean;
function xooxle(): boolean {
  return typeof XOOXLE !== 'undefined' && XOOXLE;
}

const HOME = 'http://remnqymi.com/';
const EMAIL = 'mailto:remnqymi@gmail.com';
const LOOKUP_URL_PREFIX = 'https://remnqymi.com/crum/?query=';
const DAWOUD_OFFSET = 16;

const DIALECTS: readonly string[] = [
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
  el: HTMLElement,
  tag: string,
  attrs: Record<string, string>,
): void {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att: Attr): void => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]: [string, string]): void => {
    copy.setAttribute(key, value);
  });
  el.parentNode?.replaceChild(copy, el);
}

function chopColumn(pageNumber: string): string {
  const lastChar = pageNumber.slice(pageNumber.length - 1);
  if (lastChar === 'a' || lastChar === 'b') {
    pageNumber = pageNumber.slice(0, -1);
  }
  return pageNumber;
}

// Handle 'crum-page' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('crum-page'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    const pageNumber: string = el.innerHTML;
    moveElement(el, 'a', { href: `#crum${chopColumn(pageNumber)}` });
  },
);

// Handle 'crum-page-external' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('crum-page-external'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    el.onclick = (): void => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`,
      );
    };
  },
);

// Handle 'dawoud-page-external' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('dawoud-page-external'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    el.onclick = (): void => {
      window_open(
        `https://remnqymi.com/dawoud/${(
          +el.innerHTML + DAWOUD_OFFSET
        ).toString()}.jpg`,
      );
    };
  },
);

// Handle 'dawoud-page-img' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('dawoud-page-img'),
  (el: HTMLElement): void => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0]! as HTMLElement;
    el.classList.add('link');
    el.onclick = (): void => {
      window_open(
        `https://remnqymi.com/dawoud/${(
          +el.getAttribute('alt')! + DAWOUD_OFFSET
        ).toString()}.jpg`,
      );
    };
  },
);

// Handle 'crum-page-img' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('crum-page-img'),
  (el: HTMLElement): void => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0]! as HTMLElement;
    el.classList.add('link');
    el.onclick = (): void => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute(
          'alt',
        )!}`,
      );
    };
  },
);

// Handle 'explanatory' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('explanatory'),
  (el: HTMLElement): void => {
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
  },
);

// Handle 'coptic' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('coptic'),
  (el: HTMLElement): void => {
    el.classList.add('hover-link');
    el.onclick = (): void => {
      window_open(LOOKUP_URL_PREFIX + el.innerHTML);
    };
  },
);

// Handle 'greek' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('greek'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    el.classList.add('light');
    el.onclick = (): void => {
      window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
    };
  },
);

// Handle 'dawoud-page' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('dawoud-page'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    moveElement(el, 'a', { href: `#dawoud${chopColumn(el.innerHTML)}` });
  },
);

// Handle 'drv-key' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('drv-key'),
  (el: HTMLElement): void => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    moveElement(el, 'a', { href: `#drv${el.innerHTML}` });
  },
);

// Handle 'explanatory-key' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('explanatory-key'),
  (el: HTMLElement): void => {
    el.classList.add('hover-link');
    moveElement(el, 'a', { href: `#explanatory${el.innerHTML}` });
  },
);

// Handle 'sister-key' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('sister-key'),
  (el: HTMLElement): void => {
    el.classList.add('hover-link');
    moveElement(el, 'a', { href: `#sister${el.innerHTML}` });
  },
);

// Handle 'dialect' class.
function activeDialects(): string[] | null {
  const d = localStorage.getItem('d');
  if (d === null) {
    return null;
  }
  if (d === '') {
    return [];
  }
  return d.split(',');
}

function dialect(toggle: string): void {
  const dd = new Set(activeDialects());
  if (dd.has(toggle)) {
    dd.delete(toggle);
  } else {
    dd.add(toggle);
  }
  localStorage.setItem('d', Array.from(dd).join(','));
  updateDialectCSS();
}

Array.prototype.forEach.call(
  document.getElementsByClassName('dialect'),
  (el: HTMLElement) => {
    el.classList.add('hover-link');
    el.onclick = () => {
      dialect(el.innerHTML);
    };
  },
);

// Handle 'developer' and 'dev' classes.
function dev(): void {
  localStorage.setItem('dev', localStorage.getItem('dev') === 'true' ? 'false' : 'true');
}

Array.prototype.forEach.call(
  document.getElementsByClassName('developer'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    el.onclick = dev;
  },
);

// Handle 'reset' class.
function reset(event: Event): void {
  localStorage.clear();
  dialectCheckboxes.forEach((box) => { box.checked = false; });
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  window.history.replaceState('', '', url.toString());
  window.location.reload();

  updateDialectCSS();
  updateDevCSS();
  // In case his comes from the reset button in XOOXLE, prevent clicking the
  // button from submitting the form, thus resetting everything!
  event.preventDefault();
}

// NOTE: The `reset` class is only used in the notes pages.
Array.prototype.forEach.call(
  document.getElementsByClassName('reset'),
  (el: HTMLElement): void => {
    el.classList.add('link');
    el.onclick = reset;
  },
);

// NOTE: The element with the ID `reset` is only present on the XOOXLE page.
document.getElementById('reset')?.addEventListener('click', reset);

function getLinkHrefByRel(rel: string): string | null {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}

function scroll(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

class Section {
  readonly title: string;
  readonly commands: Record<string, string>;
  public constructor(title: string, commands: Record<string, string>) {
    this.title = title;
    this.commands = commands;
  }

  createSection(): HTMLDivElement {
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

  highlightFirstOccurrence(char: string, str: string): string {
    if (str.includes('<strong>')) {
      // Already highlighted.
      return str;
    }
    const index = str.toLowerCase().indexOf(char.toLowerCase());
    if (index === -1) {
      return str;
    }

    return `${str.slice(0, index)}<strong>${str[index]!}</strong>${str.slice(index + 1)}`;
  }
};

class HelpPanel {

  readonly overlay: HTMLDivElement;
  readonly panel: HTMLDivElement;
  public constructor(sections: Section[]) {
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
    help.onclick = (event: MouseEvent) => {
      this.togglePanel();
      event.stopPropagation();
    };

    // A mouse click outside the panel closes it.
    document.addEventListener('click', (event: MouseEvent) => { this.handleClick(event); });

    this.panel = panel;
    this.overlay = overlay;
  }

  togglePanel(visible?: boolean) {
    const target = visible !== undefined ? (visible ? 'block' : 'none') : (this.panel.style.display === 'block' ? 'none' : 'block');
    this.panel.style.display = target;
    this.overlay.style.display = target;
  }

  handleClick(event: MouseEvent) {
    if (this.panel.style.display === 'block' && !this.panel.contains(event.target as Node)) {
      this.togglePanel(false);
    }
  }
}

const sheet = window.document.styleSheets[0]!;

const spellingRuleIndex = sheet.cssRules.length;
const undialectedRuleIndex = sheet.cssRules.length + 1;
const punctuationRuleIndex = sheet.cssRules.length + 2;
const devRuleIndex = sheet.cssRules.length + 2;

function addOrReplaceRule(index: number, rule: string) {
  if (index < sheet.cssRules.length) {
    sheet.deleteRule(index);
  }
  sheet.insertRule(rule, index);
}

function updateDialectCSS() {
  const active = activeDialects();
  const query: string = active?.map((d) => `.${d}`).join(',') ?? '';

  addOrReplaceRule(
    spellingRuleIndex,
    query
      ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: 0.3;}`
      : `.spelling, .dialect {opacity: ${String(active === null ? 1.0 : 0.3)};}`);
  addOrReplaceRule(
    undialectedRuleIndex,
    `.spelling:not(${DIALECTS.map((d) => `.${d}`).join(',')}) { opacity: ${String(active === null || query !== '' ? 1.0 : 0.3)}; }`);
  addOrReplaceRule(
    punctuationRuleIndex,
    `.dialect-parenthesis, .dialect-comma, .spelling-comma, .type { opacity: ${String(active === null ? 1.0 : 0.3)}; }`);
}

function updateDevCSS() {
  addOrReplaceRule(devRuleIndex, `.dev {display: ${localStorage.getItem('dev') == 'true' ? 'block' : 'none'};}`);
}

const dialectCheckboxes = document.querySelectorAll<HTMLInputElement>(
  '.dialect-checkbox');

// When we first load the page, 'd' dictates the set of active dialects and
// hence highlighting. We load 'd' from the local storage, and we update the
// boxes to match this set. Then we update the CSS.
window.addEventListener('pageshow', (): void => {
  const active: string[] | null = activeDialects();
  Array.from(dialectCheckboxes).forEach((box) => {
    box.checked = active?.includes(box.name) ?? false;
  });
  updateDialectCSS();
  updateDevCSS();
});

// When we click a checkbox, it is the boxes that dictate the set of active
// dialects and highlighting. So we use the boxes to update 'd', and then
// update highlighting.
dialectCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('click', () => {
    localStorage.setItem('d',
      Array.from(dialectCheckboxes)
        .filter((box) => box.checked)
        .map((box) => box.name).join(','));
    updateDialectCSS();
  });
});

// Collapse logic.
Array.prototype.forEach.call(
  document.getElementsByClassName('collapse'),
  (collapse: HTMLElement): void => {
    collapse.addEventListener('click', function() {
      // TODO: Remove the dependency on the HTML structure.
      const collapsible = collapse.nextElementSibling! as HTMLElement;
      collapsible.style.maxHeight = collapsible.style.maxHeight ? '' : collapsible.scrollHeight.toString() + 'px';
    });
    collapse.click();
  });

// DIALECT_SINGLE_CHAR is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
const DIALECT_SINGLE_CHAR: Record<string, string> = {
  'N': 'NH',
  'a': 'Sa',
  'f': 'Sf',
  's': 'sA',
  'b': 'Fb',
  'k': 'Ak',
};

function makeHelpPanel(): HelpPanel {
  const commands: Record<string, string> = {
    r: 'Reset highlighting',
    d: 'Developer mode',
    e: 'Email <a class="contact" href="mailto:remnqymi@gmail.com">remnqymi@gmail.com</a>',
    h: 'Go to homepage',
    '?': 'Toggle help panel',
  };
  if (!xooxle()) {
    commands['n'] = 'Go to next word';
    commands['p'] = 'Go to previous word';
  }

  const sections: Section[] = [
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

  } else {
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

const panel = makeHelpPanel();

document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.key) {

  // Commands:
  case 'r':
    reset(e);
    break;
  case 'd':
    dev();
    updateDevCSS();
    break;
  case 'e':
    window.open(EMAIL, '_self');
    break;
  case 'h':
    window.open(HOME, '_self');
    break;
  case 'n':
    window_open(getLinkHrefByRel('next'), false);
    break;
  case 'p':
    window_open(getLinkHrefByRel('prev'), false);
    break;
  case '?':
    panel.togglePanel();
    break;
  case 'Escape':
    panel.togglePanel(false);
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
    } else {
      dialect(DIALECT_SINGLE_CHAR[e.key] ?? e.key);
    }
    break;

  // Scrolling and collapsing:
  case 'C':
    if (xooxle()) {
      scroll('crum-title');
    } else {
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
    } else {
      scroll('dictionary');
    }
    break;
  case 'l':
    if (xooxle()) {
      click('kellia-title');
    } else {
      scroll('sisters');
    }
    break;
  case 't':
    if (xooxle()) {
      click('copticsite-title');
    } else {
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

function click(id: string): void {
  document.getElementById(id)?.click();
}

function focus(id: string): void {
  document.getElementById(id)?.focus();
}
