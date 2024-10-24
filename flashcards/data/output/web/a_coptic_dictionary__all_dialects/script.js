'use strict';
window.addEventListener('load', () => {
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.
// NOTE: The use of classes as constants starting with CLS_ is a remnant of an
// old restriction that was introduced to support class obfuscation. The
// restriction has been lifted, and the enforcing pre-commit has been removed.
// Whether or not to retain this convention can be decided later.
  const CLS_CRUM_PAGE = 'crum-page';
  const CLS_CRUM_PAGE_EXTERNAL = 'crum-page-external';
  const CLS_DAWOUD_PAGE_EXTERNAL = 'dawoud-page-external';
  const CLS_DAWOUD_PAGE_IMG = 'dawoud-page-img';
  const CLS_CRUM_PAGE_IMG = 'crum-page-img';
  const CLS_EXPLANATORY = 'explanatory';
  const CLS_COPTIC = 'coptic';
  const CLS_GREEK = 'greek';
  const CLS_DAWOUD_PAGE = 'dawoud-page';
  const CLS_DRV_KEY = 'drv-key';
  const CLS_EXPLANATORY_KEY = 'explanatory-key';
  const CLS_DIALECT = 'dialect';
  const CLS_DEV = 'dev';
  const CLS_DEVELOPER = 'developer';
  const CLS_RESET = 'reset';
  const CLS_HEAVY = 'heavy';
  const CLS_HOVER_LINK = 'hover-link';
  const CLS_ITALIC = 'italic';
  const CLS_LIGHT = 'light';
  const CLS_LINK = 'link';
  const CLS_SMALL = 'small';
  const CLS_VERY_LIGHT = 'very-light';
  const CLS_DIALECT_PARENTHESIS = 'dialect-parenthesis';
  const CLS_DIALECT_COMMA = 'dialect-comma';
  const CLS_SPELLING_COMMA = 'spelling-comma';
  const CLS_TYPE = 'type';
  const CLS_SPELLING = 'spelling';
  const CLS_SISTER_KEY = 'sister-key';
  const CLS_NAG_HAMMADI = 'nag-hammadi';
  const HOME = 'http://remnqymi.com/';
  const EMAIL = 'mailto:remnqymi@gmail.com';
  const LOOKUP_URL_PREFIX = 'https://remnqymi.com/crum/?query=';
  const DAWOUD_OFFSET = 16;
  const CLS_S = 'S';
  const CLS_Sa = 'Sa';
  const CLS_Sf = 'Sf';
  const CLS_A = 'A';
  const CLS_sA = 'sA';
  const CLS_B = 'B';
  const CLS_F = 'F';
  const CLS_Fb = 'Fb';
  const CLS_O = 'O';
  const CLS_NH = 'NH';
  const DIALECTS = [
    CLS_S,
    CLS_Sa,
    CLS_Sf,
    CLS_A,
    CLS_sA,
    CLS_B,
    CLS_F,
    CLS_Fb,
    CLS_O,
    CLS_NH,
  ];
  function get_url_or_local(param, default_value = null) {
    return (new URLSearchParams(window.location.search).get(param) ??
        localStorage.getItem(param)
        ?? default_value);
  }
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
  function set_url_and_local(param, value) {
    localStorage.setItem(param, value);
    const url = new URL(window.location.href);
    url.searchParams.set(param, value);
    url.search = decodeURIComponent(url.search);
    window.history.replaceState('', '', url.toString());
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
  function chopColumn(pageNumber) {
    const lastChar = pageNumber.slice(pageNumber.length - 1);
    if (lastChar === 'a' || lastChar === 'b') {
      pageNumber = pageNumber.slice(0, -1);
    }
    return pageNumber;
  }
  // Handle CLS_CRUM_PAGE class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE), (el) => {
    el.classList.add(CLS_LINK);
    const pageNumber = el.innerHTML;
    moveElement(el, 'a', { href: `#crum${chopColumn(pageNumber)}` });
  });
  // Handle CLS_CRUM_PAGE_EXTERNAL class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE_EXTERNAL), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`);
    };
  });
  // Handle CLS_DAWOUD_PAGE_EXTERNAL class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE_EXTERNAL), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open(`https://remnqymi.com/dawoud/${(+el.innerHTML + DAWOUD_OFFSET).toString()}.jpg`);
    };
  });
  // Handle CLS_DAWOUD_PAGE_IMG class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE_IMG), (el) => {
  // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open(`https://remnqymi.com/dawoud/${(+el.getAttribute('alt') + DAWOUD_OFFSET).toString()}.jpg`);
    };
  });
  // Handle CLS_CRUM_PAGE_IMG class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE_IMG), (el) => {
  // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`);
    };
  });
  // Handle CLS_EXPLANATORY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_EXPLANATORY), (el) => {
  // TODO: (#202) Eliminate the dependency on the HTML structure.
    const img = el.children[0];
    const alt = img.getAttribute('alt');
    if (!alt.startsWith('http')) {
      return;
    }
    img.classList.add(CLS_LINK);
    img.onclick = () => {
      window_open(alt);
    };
  });
  // Handle CLS_COPTIC class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_COPTIC), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    el.onclick = () => {
      window_open(LOOKUP_URL_PREFIX + el.innerHTML);
    };
  });
  // Handle CLS_GREEK class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_GREEK), (el) => {
    el.classList.add(CLS_LINK);
    el.classList.add(CLS_LIGHT);
    el.onclick = () => {
      window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
    };
  });
  // Handle CLS_DAWOUD_PAGE class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE), (el) => {
    el.classList.add(CLS_LINK);
    moveElement(el, 'a', { href: `#dawoud${chopColumn(el.innerHTML)}` });
  });
  // Handle CLS_DRV_KEY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DRV_KEY), (el) => {
    el.classList.add(CLS_SMALL, CLS_LIGHT, CLS_ITALIC, CLS_HOVER_LINK);
    moveElement(el, 'a', { href: `#drv${el.innerHTML}` });
  });
  // Handle CLS_EXPLANATORY_KEY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_EXPLANATORY_KEY), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    moveElement(el, 'a', { href: `#explanatory${el.innerHTML}` });
  });
  // Handle CLS_SISTER_KEY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_SISTER_KEY), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    moveElement(el, 'a', { href: `#sister${el.innerHTML}` });
  });
  // Handle CLS_DIALECT class.
  function getActiveDialectClassesInCurrentPage() {
    const d = get_url_or_local('d');
    return d === null
      ? null
      : d === ''
        ? new Set()
        : new Set(d.split(',').map((d) => d));
  }
  /* Update the display based on the value of the `d` parameter.
 */
  function dialect(toggle) {
    if (toggle) {
      const cur = get_url_or_local('d');
      const dd = new Set(cur ? cur.split(',') : []);
      if (dd.has(toggle)) {
        dd.delete(toggle);
      }
      else {
        dd.add(toggle);
      }
      set_url_and_local('d', Array.from(dd).join(','));
    }
    const active = getActiveDialectClassesInCurrentPage();
    function dialected(el) {
      return DIALECTS.some((d) => el.classList.contains(d));
    }
    document
      .querySelectorAll([CLS_DIALECT_PARENTHESIS, CLS_DIALECT_COMMA, CLS_SPELLING_COMMA, CLS_TYPE]
        .map((cls) => '.' + cls)
        .join(','))
      .forEach((el) => {
        if (active === null) {
          el.classList.remove(CLS_VERY_LIGHT);
        }
        else {
          el.classList.add(CLS_VERY_LIGHT);
        }
      });
    document
      .querySelectorAll(`.${CLS_DIALECT},.${CLS_SPELLING}`)
      .forEach((el) => {
        if (!dialected(el)) {
          return;
        }
        if (active === null) {
          el.classList.remove(CLS_VERY_LIGHT);
          el.classList.remove(CLS_HEAVY);
          return;
        }
        if (Array.from(active).some((d) => el.classList.contains(d))) {
          el.classList.remove(CLS_VERY_LIGHT);
          el.classList.add(CLS_HEAVY);
        }
        else {
          el.classList.remove(CLS_HEAVY);
          el.classList.add(CLS_VERY_LIGHT);
        }
      });
  }
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DIALECT), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    el.onclick = () => {
      dialect(el.innerHTML);
    };
  });
  dialect();
  function devState() {
    return get_url_or_local('dev');
  }
  function dev(toggle = false) {
    if (toggle) {
      localStorage.setItem('dev', devState() === 'true' ? 'false' : 'true');
    }
    const state = devState();
    document
      .querySelectorAll(`.${CLS_DEV},.${CLS_NAG_HAMMADI}`)
      .forEach((el) => {
        if (state === 'true') {
          el.removeAttribute('hidden');
        }
        else {
          el.setAttribute('hidden', '');
        }
      });
  }
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DEVELOPER), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      dev();
    };
  });
  dev();
  // Handle CLS_RESET class.
  function reset() {
    localStorage.clear();
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    window.history.replaceState('', '', url.toString());
    window.location.reload();
  }
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_RESET), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = reset;
  });
  function getLinkHrefByRel(rel) {
    const linkElement = document.querySelector(`link[rel="${rel}"]`);
    return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
  }
  function scroll(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
  // TODO: (#276) The help panel logic is duplicated between this and
  // site/crum.ts. Figure out a way to use a common source. In the meantime,
  // manually keep them in sync.
  // BEGIN duplicated code.
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
  // TODO: (#276) The help panel logic is duplicated between this and
  // site/crum.ts. Figure out a way to use a common source. In the meantime,
  // manually keep them in sync.
  // END duplicated code.
  const helpPanel = new HelpPanel([new Section('Commands', {
    r: 'Reset highlighting',
    n: 'Go to next word',
    p: 'Go to previous word',
    h: 'Go to homepage',
    e: 'Email <a class="contact" href="mailto:remnqymi@gmail.com">remnqymi@gmail.com</a>',
    d: 'Developer mode',
    '?': 'Toggle help panel',
  }), new Section('Dialect Highlighting', {
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
  }), new Section('Scroll To', {
    C: 'Crum pages',
    D: 'Dawoud pages',
    l: 'Related words',
    m: 'Meaning',
    t: 'Type',
    i: 'Images',
    w: 'Words',
    W: 'Words',
    v: 'Derivations table',
    u: 'Header (up)',
    c: 'Dictionary page list',
  })]);
  // NOTE: It's important for this mapping to be in sync with the help panel.
  document.addEventListener('keyup', (e) => {
    switch (e.key) {
    // Commands:
    case 'r':
      reset();
      break;
    case 'd':
      dev(true);
      break;
    case 'h':
      window_open(HOME, false);
      break;
    case 'n':
      window_open(getLinkHrefByRel('next'), false);
      break;
    case 'p':
      window_open(getLinkHrefByRel('prev'), false);
      break;
    case 'e':
      window_open(EMAIL, false);
      break;
    case '?':
      helpPanel.togglePanel();
      break;
    case 'Escape':
      helpPanel.togglePanel(false);
      break;
    // Dialects:
    case 'B':
    case 'S':
    case 'A':
    case 'F':
    case 'O':
      dialect(e.key);
      break;
    case 'N':
      dialect('NH');
      break;
    case 'a':
      dialect('Sa');
      break;
    case 'f':
      dialect('Sf');
      break;
    case 's':
      dialect('sA');
      break;
    case 'b':
      dialect('Fb');
      break;
    // Scrolling:
    case 'C':
      scroll('crum');
      break;
    case 'D':
      scroll('dawoud');
      break;
    case 'l':
      scroll('sisters');
      break;
    case 'm':
      scroll('meaning');
      break;
    case 't':
      scroll('root-type');
      break;
    case 'i':
      scroll('images');
      break;
    case 'W':
      scroll('marcion');
      break;
    case 'w':
      scroll('pretty');
      break;
    case 'v':
      scroll('derivations');
      break;
    case 'u':
      scroll('header');
      break;
    case 'c':
      scroll('dictionary');
      break;
    }
  });
});
