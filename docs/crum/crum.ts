// NOTE: While this file is used for both Crum and Xooxle, make sure that only
// the Crum-specific Xooxle content lives here, and that any generic Xooxle
// logic (applicable for other instances of Xooxle) live in the shared Xooxle
// files.

// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

import * as help from '../help.js';
import * as iam from '../iam.js';
import * as utils from '../utils.js';
import * as highlight from './highlight.js';

const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const ENGLISH_RE = /[A-Za-z]+/giu;

const GREEK_LOOKUP_URL_PREFIX = 'https://logeion.uchicago.edu/';

const dialectCheckboxes: HTMLInputElement[] = Array.from(
  document.querySelectorAll<HTMLInputElement>('.dialect-checkbox')
);

const HOME = iam.amI('anki') ? 'http://remnqymi.com' : '';
// NOTE: The following assumes that the code is getting executed from a page
// directly under `crum/`.
const LEXICON = iam.amI('anki') ? `${HOME}/crum` : '.';
const ABBREVIATIONS_PAGE =
  'https://coptic.wiki/crum/?section=list_of_abbreviations';
const DAWOUD = `${HOME}/dawoud`;

const LOOKUP_URL_PREFIX = `${LEXICON}?query=`;

const EMAIL = 'remnqymi@gmail.com';
const EMAIL_LINK = `mailto:${EMAIL}`;

enum DIALECT_ARTICLE {
  // NO_ARTICLE indicates the absence of an article.
  NO_ARTICLE = '',
  // DIALECTS is a generic article about dialects.
  DIALECTS = 'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
  Sahidic = 'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2',
  Akhmimic = 'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1',
  // Lycopolitan is called Subakhmimic in Crum, but Lycopolitan is the standard
  // name in academia today.
  Lycopolitan = 'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1',
  Bohairic = 'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2',
  Fayyumic = 'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2',
  OldCoptic = 'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2',
  NagHammadi = 'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2',
  Mesokemic = 'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2',
  ProtoTheban = 'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1',
}

const DIALECTS = [
  // The following dialects are found in Crum.
  'S',
  'Sa',
  'Sf',
  'A',
  'L',
  'B',
  'F',
  'Fb',
  'O',
  // The following dialects are only found in Marcion.
  'NH',
  // The following dialects are only found in TLA / KELLIA.
  'M',
  'P',
  'V',
  'W',
  'U',
];

// DIALECT_SINGLE_CHAR is a mapping for the dialects that have shortcuts other
// than their codes. If the shortcut to toggle a dialect is not the same as its
// code, it should be included in this record.
const DIALECT_SINGLE_CHAR: Record<string, string> = {
  N: 'NH',
  a: 'Sa',
  f: 'Sf',
  b: 'Fb',
};

// TODO: This is a bad place to define a global variable.
const highlighter = new highlight.Highlighter(
  DIALECTS,
  iam.amI('anki'),
  dialectCheckboxes
);

type DICTIONARY = 'KELLIA' | 'Crum' | 'copticsite';

/**
 *
 * @param key
 * @param name
 * @param code
 * @param dictionaries
 * @param link
 *
 * @returns A shortcut object representing the toggle shortcut for this dialect.
 */
function makeDialectShortcut(
  key: string,
  name: string,
  code: string,
  dictionaries: DICTIONARY[],
  link: DIALECT_ARTICLE
): help.Shortcut {
  code = help.highlightFirstOccurrence(key, code);
  name = help.highlightFirstOccurrence(key, name);
  if (link != DIALECT_ARTICLE.NO_ARTICLE) {
    name = `<a href="${link}" target="_blank" rel="noopener,noreferrer">${name}</a>`;
  }

  const description = `
<table>
<tr>
  <td class="dialect-code">(${code})</td>
  <td class="dialect-name">${name}</td>
  ${iam.amI('lexicon') ? `<td class="dialect-dictionaries">(${dictionaries.join(', ')})</td>` : ''}
</tr>
</table>`;

  // All dialects are available in Xooxle. Only Crum dialects area available on
  // notes.
  const availability: iam.Where[] = dictionaries.includes('Crum')
    ? ['lexicon', 'note', 'index']
    : ['lexicon'];
  return new help.Shortcut(description, availability, (e: KeyboardEvent) => {
    const dialectCode = DIALECT_SINGLE_CHAR[e.key] ?? e.key;
    highlighter.toggleDialect(dialectCode);
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
const panel: help.Help | null = iam.amI('anki') ? null : makeHelpPanel();

/**
 *
 * @returns
 */
function makeHelpPanel(): help.Help {
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
    L: [
      makeDialectShortcut(
        'L',
        'Lycopolitan',
        'L',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Lycopolitan
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
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.OldCoptic
      ),
    ],
    N: [
      makeDialectShortcut(
        'N',
        'Nag Hammadi',
        'NH',
        // TODO: This dialect was invented by Marcion, and it's not in Crum.
        ['Crum'],
        DIALECT_ARTICLE.NagHammadi
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
      new help.Shortcut(
        'Reset highlighting',
        ['lexicon', 'note', 'index', 'index_index'],
        highlighter.reset.bind(highlighter)
      ),
    ],
    d: [
      new help.Shortcut(
        'Developer mode',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          highlighter.toggleDev();
          highlighter.updateDev();
        }
      ),
    ],
    R: [
      new help.Shortcut(
        `<strong>R</strong>eports / Contact <a class="contact" href="${EMAIL_LINK}">${EMAIL}</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.window_open(EMAIL_LINK);
        }
      ),
    ],
    H: [
      new help.Shortcut(
        `Open <a href="${HOME}/" target="_blank"><strong>h</strong>omepage</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.window_open(`${HOME}/`);
        }
      ),
    ],
    X: [
      new help.Shortcut(
        `Open the <a href="${LEXICON}" target="_blank">dictionary search page</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.window_open(LEXICON);
        }
      ),
    ],
    '?': [
      new help.Shortcut(
        'Toggle help panel',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          panel?.togglePanel();
        }
      ),
    ],
    Escape: [
      new help.Shortcut(
        'Toggle help panel',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          panel?.togglePanel(false);
        },
        false
      ),
    ],
    o: [
      new help.Shortcut(
        'Open the word currently being viewed',
        ['lexicon', 'note', 'index'],
        () => {
          utils
            .findNextElement('.view, .sister-view', 'cur')
            ?.querySelector('a')
            ?.click();
        }
      ),
    ],
    z: [
      new help.Shortcut(
        'Yank the key of the word currently being viewed <span class="dev-mode-note">(dev mode)</span>',
        ['lexicon', 'note', 'index'],
        () => {
          utils.yank(
            utils.findNextElement('.view .dev, .sister-key, .drv-key', 'cur')!
              .innerHTML
          );
        }
      ),
    ],
    l: [new help.Shortcut('Go to next word', ['note'], utils.openNextLink)],
    h: [new help.Shortcut('Go to previous word', ['note'], utils.openPrevLink)],
    y: [
      new help.Shortcut('Yank (copy) the word key', ['note'], () => {
        utils.yank(utils.stem(window.location.pathname));
      }),
    ],
  };

  const search = {
    w: [
      new help.Shortcut('Toggle full-word search', ['lexicon'], () => {
        click('fullWordCheckbox');
      }),
    ],
    x: [
      new help.Shortcut('Toggle regex search', ['lexicon'], () => {
        click('regexCheckbox');
      }),
    ],
    '/': [
      new help.Shortcut('Focus on the search box', ['lexicon'], () => {
        focus('searchBox');
      }),
    ],
  };

  const scrollTo = {
    n: [
      new help.Shortcut(
        'Next word in the list',
        ['lexicon', 'note', 'index'],
        () => {
          utils.scrollToNextElement('.view, .sister-view', 'next');
        }
      ),
    ],
    p: [
      new help.Shortcut(
        'Previous word in the list',
        ['lexicon', 'note', 'index'],
        () => {
          utils.scrollToNextElement('.view, .sister-view', 'prev');
        }
      ),
    ],
    C: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        utils.scroll('crum-title');
      }),
      new help.Shortcut('Crum pages', ['note'], () => {
        utils.scroll('crum');
      }),
    ],
    E: [
      new help.Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        ['lexicon'],
        () => {
          utils.scroll('kellia-title');
        }
      ),
    ],
    T: [
      new help.Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        ['lexicon'],
        () => {
          utils.scroll('copticsite-title');
        }
      ),
    ],
    D: [
      new help.Shortcut('Dawoud pages', ['note'], () => {
        utils.scroll('dawoud');
      }),
    ],
    w: [
      new help.Shortcut('Related words', ['note'], () => {
        utils.scroll('sisters');
      }),
    ],
    m: [
      new help.Shortcut('Meaning', ['note'], () => {
        utils.scroll('meaning');
      }),
    ],
    e: [
      new help.Shortcut(
        'S<strong>e</strong>ns<strong>e</strong>s',
        ['note'],
        () => {
          utils.scroll('senses');
        }
      ),
    ],
    t: [
      new help.Shortcut('Type', ['note'], () => {
        utils.scroll('root-type');
      }),
    ],
    j: [
      new help.Shortcut('Categories', ['note'], () => {
        utils.scroll('categories');
      }),
    ],
    i: [
      new help.Shortcut('Images', ['note'], () => {
        utils.scroll('images');
      }),
    ],
    q: [
      new help.Shortcut('Words', ['note'], () => {
        utils.scroll('pretty');
      }),
    ],
    Q: [
      new help.Shortcut('Words', ['note'], () => {
        utils.scroll('marcion');
      }),
    ],
    v: [
      new help.Shortcut('Derivations table', ['note'], () => {
        utils.scroll('derivations');
      }),
    ],
    c: [
      new help.Shortcut('Dictionary page list', ['note'], () => {
        utils.scroll('dictionary');
      }),
    ],
    g: [
      new help.Shortcut(
        'Header',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.scroll('header');
        }
      ),
    ],
    G: [
      new help.Shortcut(
        'Footer',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.scroll('footer');
        }
      ),
    ],
  };

  const collapse = {
    c: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        click('crum-title');
      }),
    ],
    e: [
      new help.Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        ['lexicon'],
        () => {
          click('kellia-title');
        }
      ),
    ],
    t: [
      new help.Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        ['lexicon'],
        () => {
          click('copticsite-title');
        }
      ),
    ],
  };

  const sections: help.Section[] = [
    new help.Section('Dialect Highlighting', dialectHighlighting),
    new help.Section('Control', control),
    new help.Section('Search', search),
    new help.Section('Scroll To', scrollTo),
    new help.Section('Collapse', collapse),
  ];

  return new help.Help(sections);
}

/**
 *
 * @param id
 */
function click(id: string): void {
  document.getElementById(id)!.click();
}

/**
 *
 * @param id
 */
function focus(id: string): void {
  document.getElementById(id)!.focus();
}

/**
 *
 * @param root
 * @param regex
 * @param url
 * @param classes
 * @param direct_parent_excluded_classes
 */
function linkifyText(
  root: Node,
  regex: RegExp,
  url: string,
  classes: string[],
  direct_parent_excluded_classes: string[] = []
): void {
  const admit = (node: Node): boolean => {
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
  const replacements: [Text, DocumentFragment][] = [];

  for (let node: Text | null; (node = walker.nextNode() as Text | null); ) {
    if (!node.nodeValue) {
      continue;
    }

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const text: string = node.nodeValue;

    regex.lastIndex = 0;
    for (
      let match: RegExpExecArray | null;
      (match = regex.exec(text)) !== null;

    ) {
      const query: string = match[0];

      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );

      const link = document.createElement('span');
      link.classList.add(...classes);
      link.onclick = (): void => {
        utils.window_open(url + query);
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

  replacements.forEach(([node, fragment]: [Text, DocumentFragment]): void => {
    node.replaceWith(fragment);
  });
}

/**
 *
 * @param root
 */
function handleCopticLookups(root: Node = document.body) {
  linkifyText(
    root,
    COPTIC_RE,
    LOOKUP_URL_PREFIX,
    ['hover-link'],
    ['type', 'title']
  );
}

/**
 *
 * @param root
 */
function handleGreekLookups(root: Node = document.body) {
  linkifyText(root, GREEK_RE, GREEK_LOOKUP_URL_PREFIX, ['link', 'light']);
}

/**
 *
 * @param root
 */
function handleEnglishLookups(root: Node = document.body) {
  linkifyText(root, ENGLISH_RE, LOOKUP_URL_PREFIX, ['hover-link']);
}

/**
 *
 */
function handleNonLexiconElements(): void {
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
            `<a class="hover-link" href="${LEXICON}/${s}.html" target="_blank">${s}</a>`
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
      const linked = `(<a class="hover-link" href="${LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
      elem.innerHTML = linked;
    });

  // Handle 'crum-page' class.
  document
    .querySelectorAll<HTMLElement>('.crum-page')
    .forEach((el: HTMLElement): void => {
      const pageNumber: string = el.innerHTML;
      el.classList.add('link');
      utils.makeSpanLinkToAnchor(el, `#crum${utils.chopColumn(pageNumber)}`);
    });

  // Handle 'crum-page-external' class.
  document
    .querySelectorAll<HTMLElement>('.crum-page-external')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = (): void => {
        utils.window_open(
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
        utils.window_open(`${DAWOUD}?page=${el.innerHTML}`);
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
        utils.window_open(`${DAWOUD}?page=${el.getAttribute('alt')!}`);
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
        utils.window_open(
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
        utils.window_open(alt);
      };
    });

  // Handle 'dawoud-page' class.
  document
    .querySelectorAll<HTMLElement>('.dawoud-page')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      utils.makeSpanLinkToAnchor(
        el,
        `#dawoud${utils.chopColumn(el.innerHTML)}`
      );
    });

  // Handle 'drv-key' class.
  document
    .querySelectorAll<HTMLElement>('.drv-key')
    .forEach((el: HTMLElement): void => {
      el.classList.add('small', 'light', 'italic', 'hover-link');
      utils.makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
    });

  // Handle 'explanatory-key' class.
  document
    .querySelectorAll<HTMLElement>('.explanatory-key')
    .forEach((el: HTMLElement): void => {
      el.classList.add('hover-link');
      utils.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
    });

  // Handle 'sister-key' class.
  document
    .querySelectorAll<HTMLElement>('.sister-key')
    .forEach((el: HTMLElement): void => {
      el.classList.add('hover-link');
      utils.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
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
        highlighter.toggleDialect(el.innerHTML);
        highlighter.updateDialects();
      };
    });

  document
    .querySelectorAll<HTMLElement>('.developer')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = () => {
        highlighter.toggleDev();
        highlighter.updateDev();
      };
    });

  {
    // Add a link to the Crum abbreviations.
    const crumElement = document.getElementById('crum');
    const anchor = document.createElement('a');
    anchor.textContent = 'Abbreviations';
    anchor.href = ABBREVIATIONS_PAGE;
    anchor.classList.add('abbreviations');
    anchor.target = '_blank';
    crumElement?.insertBefore(anchor, crumElement.firstChild);
  }

  if (iam.amI('anki')) {
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
        e.setAttribute('href', `${LEXICON}/${e.getAttribute('href')!}`);
      });
  }

  handleCopticLookups();
  handleGreekLookups();
  document.querySelectorAll('.meaning').forEach((elem) => {
    handleEnglishLookups(elem);
  });
}

/**
 *
 */
function handleCommonElements(): void {
  highlighter.update();
  document
    .querySelectorAll<HTMLElement>('.reset')
    .forEach((el: HTMLElement): void => {
      el.classList.add('link');
      el.onclick = (event) => {
        highlighter.reset();
        // On Xooxle, clicking the button would normally submit the form and
        // reset everything (including the search box and the option
        // checkboxes). So prevent the event from propagating further.
        event.preventDefault();
      };
    });
}

/**
 *
 */
function main(): void {
  if (!iam.amI('lexicon')) {
    handleNonLexiconElements();
  }

  handleCommonElements();
}

main();
