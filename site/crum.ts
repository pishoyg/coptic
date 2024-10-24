// TODO: (#276) The help panel logic is duplicated between this and
// flashcards/constants/a_coptic_dictionary/script.ts. Figure out a way to use a
// common source. In the meantime, manually keep them in sync.
// BEGIN duplicated code.
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
}

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
    document.addEventListener('click', (event: MouseEvent) => { this.handleClick(event); } );

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
// TODO: (#276) The help panel logic is duplicated between this and
// flashcards/constants/a_coptic_dictionary/script.ts. Figure out a way to use a
// common source. In the meantime, manually keep them in sync.
// END duplicated code.

const sheet = window.document.styleSheets[0]!;

const HOME = 'http://remnqymi.com/';
const EMAIL = 'mailto:remnqymi@gmail.com';

const spellingRuleIndex = sheet.cssRules.length;
const undialectedRuleIndex = sheet.cssRules.length + 1;
const punctuationRuleIndex = sheet.cssRules.length + 2;

function addOrReplaceRule(index: number, rule: string) {
  if (index < sheet.cssRules.length) {
    sheet.deleteRule(index);
  }
  sheet.insertRule(rule, index);
}

function updateDialectCSS(active: string[] | null) {
  const query: string = active?.map((d) => `.${d}`).join(',') ?? '';

  addOrReplaceRule(
    spellingRuleIndex,
    query
      ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: 0.3;}`
      : `.spelling, .dialect {opacity: ${String(active === null ? 1.0 : 0.3)};}`);
  addOrReplaceRule(
    undialectedRuleIndex,
    `.spelling:not(.S,.Sa,.Sf,.A,.sA,.B,.F,.Fb,.O,.NH,.Ak,.M,.L,.P,.V,.W,.U) { opacity: ${String(active === null || query !== '' ? 1.0 : 0.3)}; }`);
  addOrReplaceRule(
    punctuationRuleIndex,
    `.dialect-parenthesis, .dialect-comma, .spelling-comma, .type { opacity: ${String(active === null ? 1.0 : 0.3)}; }`);
}

const dialectCheckboxes = document.querySelectorAll<HTMLInputElement>(
  '.dialect-checkbox');

// When we first load the page, 'd' dictates the set of active dialects and
// hence highlighting. We load 'd' from the local storage, and we update the
// boxes to match this set. Then we update the CSS.
window.addEventListener('pageshow', (): void => {
  const d = localStorage.getItem('d');
  const active: string[] | null =
    d === null ? null : d === '' ? [] : d.split(',');
  Array.from(dialectCheckboxes).forEach((box) => {
    box.checked = active?.includes(box.name) ?? false;
  });
  updateDialectCSS(active);
});

// When we click a checkbox, it is the boxes that dictate the set of active
// dialects and highlighting. So we use the boxes to update 'd', and then
// update highlighting.
dialectCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('click', () => {
    const active = Array.from(dialectCheckboxes)
      .filter((box) => box.checked)
      .map((box) => box.name);
    localStorage.setItem('d', active.join(','));
    updateDialectCSS(active);
  });
});

function reset(event: Event) {
  localStorage.removeItem('d');
  dialectCheckboxes.forEach((box) => { box.checked = false; });
  updateDialectCSS(null);

  // Prevent clicking the button from submitting the form, thus resetting
  // everything!
  event.preventDefault();
}

document.getElementById('reset')!.addEventListener('click', reset);
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

// dialectSingleChar is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
const dialectSingleChar: Record<string, string> = {
  'N': 'NH',
  'a': 'Sa',
  'f': 'Sf',
  's': 'sA',
  'b': 'Fb',
  'k': 'Ak',
};

const panel = new HelpPanel(
  [
    new Section('Commands', {
      r: 'Reset highlighting',
      d: 'Developer mode',
      e: 'Email <a class="contact" href="mailto:remnqymi@gmail.com">remnqymi@gmail.com</a>',
      h: 'Go to homepage',
      '?': 'Toggle help panel',
    }),
    new Section('Dialect Highlighting', {
      B: 'Bohairic',
      S: 'Sahidic',
      A: 'Akhmimic',
      F: 'Fayyumic',
      O: 'Old Coptic',
      N: 'NH: <strong>N</strong>ag Hammadi',
      a: 'Sa: Sahidic with <strong>A</strong>khmimic tendency',
      f: 'Sf: Sahidic with <strong>F</strong>ayyumic tendency',
      s: 'sA: <strong>s</strong>ubAkhmimic (Lycopolitan)',
      b: 'Fb: Fayyumic with <strong>B</strong>ohairic tendency',
      k: 'Ak: Old Coptic',
      M: 'Mesokemic',
      L: 'Lycopolitan (subAkhmimic)',
      P: 'Proto-Theban',
      V: 'South Fayyumic Greek',
      W: 'Crypto-Mesokemic Greek',
      U: 'Greek (usage <strong>u</strong>nclear)',
    }),
    new Section('Search', {
      w: 'Toggle full word search',
      x: 'Toggle regex search',
      '/': 'Focus search box',
    }),
    new Section('Scrol To', {
      'C': 'Crum',
      'K': 'KELLIA',
      'T': 'copticsi<strong>t</strong>e',
    }),
    new Section('Collapse', {
      'c': 'Crum',
      'l': 'KELLIA',
      't': 'copticsi<strong>t</strong>e',
    }),
  ],
);

document.addEventListener('keyup', (e: KeyboardEvent) => {
  switch (e.key) {

  // Commands:
  case 'r':
    reset(e);
    break;
  case 'd':
    localStorage.setItem('dev', localStorage.getItem('dev') === 'true' ? 'false' : 'true');
    break;
  case 'e':
    window.open(EMAIL, '_self');
    break;
  case 'h':
    window.open(HOME, '_self');
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
    click(`checkbox-${dialectSingleChar[e.key] ?? e.key}`);
    break;

    // Scrolling:
  case 'C':
    scroll('crum-title');
    break;
  case 'K':
    scroll('kellia-title');
    break;
  case 'T':
    scroll('copticsite-title');
    break;

  case 'c':
    click('crum-title');
    break;
  case 'l':
    click('kellia-title');
    break;
  case 't':
    click('copticsite-title');
    break;
  }
});

function scroll(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function click(id: string): void {
  (document.getElementById(id)! as HTMLInputElement).click();
}

function focus(id: string): void {
  document.getElementById(id)?.focus();
}
