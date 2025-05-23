import * as help from '../help.js';
import * as utils from '../utils.js';
import * as iam from '../iam.js';
import * as highlight from './highlight.js';
import * as paths from '../paths.js';

const EMAIL = 'remnqymi@gmail.com';
const EMAIL_LINK = `mailto:${EMAIL}`;

type DICTIONARY = 'KELLIA' | 'Crum' | 'copticsite';

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

/**
 *
 * @param highlighter
 * @param key
 * @param name
 * @param code
 * @param dictionaries
 * @param link
 *
 * @returns A shortcut object representing the toggle shortcut for this dialect.
 */
function makeDialectShortcut(
  highlighter: highlight.Highlighter,
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
    const dialectCode = highlight.DIALECT_SINGLE_CHAR[e.key] ?? e.key;
    highlighter.toggleDialect(dialectCode);
  });
}

/**
 *
 * @param highlighter
 * @returns
 */
export function makeHelpPanel(highlighter: highlight.Highlighter): help.Help {
  const panel = new help.Help();
  // NOTE: Some (minor) dialects are missing articles. If you find a reference
  // that explains what those dialects are, that would be great.
  const dialectHighlighting = {
    S: [
      makeDialectShortcut(
        highlighter,
        'S',
        'Sahidic',
        'S',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Sahidic
      ),
    ],
    a: [
      makeDialectShortcut(
        highlighter,
        'a',
        'Sahidic with <strong>A</strong>khmimic tendency',
        'Sa',
        ['Crum'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
    f: [
      makeDialectShortcut(
        highlighter,
        'f',
        'Sahidic with <strong>F</strong>ayyumic tendency',
        'Sf',
        ['Crum'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
    A: [
      makeDialectShortcut(
        highlighter,
        'A',
        'Akhmimic',
        'A',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Akhmimic
      ),
    ],
    L: [
      makeDialectShortcut(
        highlighter,
        'L',
        'Lycopolitan',
        'L',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Lycopolitan
      ),
    ],
    B: [
      makeDialectShortcut(
        highlighter,
        'B',
        'Bohairic',
        'B',
        ['Crum', 'KELLIA', 'copticsite'],
        DIALECT_ARTICLE.Bohairic
      ),
    ],
    F: [
      makeDialectShortcut(
        highlighter,
        'F',
        'Fayyumic',
        'F',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.Fayyumic
      ),
    ],
    b: [
      makeDialectShortcut(
        highlighter,
        'b',
        'Fayyumic with <strong>B</strong>ohairic tendency',
        'Fb',
        ['Crum'],
        DIALECT_ARTICLE.NO_ARTICLE
      ),
    ],
    O: [
      makeDialectShortcut(
        highlighter,
        'O',
        'Old Coptic',
        'O',
        ['Crum', 'KELLIA'],
        DIALECT_ARTICLE.OldCoptic
      ),
    ],
    N: [
      makeDialectShortcut(
        highlighter,
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
        highlighter,
        'M',
        'Mesokemic',
        'M',
        ['KELLIA'],
        DIALECT_ARTICLE.Mesokemic
      ),
    ],
    P: [
      makeDialectShortcut(
        highlighter,
        'P',
        'Proto-Theban',
        'P',
        ['KELLIA'],
        DIALECT_ARTICLE.ProtoTheban
      ),
    ],
    V: [
      makeDialectShortcut(
        highlighter,
        'V',
        'South Fayyumic Greek',
        'V',
        ['KELLIA'],
        DIALECT_ARTICLE.DIALECTS
      ),
    ],
    W: [
      makeDialectShortcut(
        highlighter,
        'W',
        'Crypto-Mesokemic Greek',
        'W',
        ['KELLIA'],
        DIALECT_ARTICLE.DIALECTS
      ),
    ],
    U: [
      makeDialectShortcut(
        highlighter,
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
        highlighter.toggleDev.bind(highlighter)
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
        `Open <a href="${paths.HOME}/" target="_blank"><strong>h</strong>omepage</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.window_open(`${paths.HOME}/`);
        }
      ),
    ],
    X: [
      new help.Shortcut(
        `Open the <a href="${paths.LEXICON}" target="_blank">dictionary search page</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          utils.window_open(paths.LEXICON);
        }
      ),
    ],
    '?': [
      new help.Shortcut(
        'Toggle help panel',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          panel.togglePanel();
        }
      ),
    ],
    Escape: [
      new help.Shortcut(
        'Toggle help panel',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          panel.togglePanel(false);
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
        utils.click('fullWordCheckbox');
      }),
    ],
    x: [
      new help.Shortcut('Toggle regex search', ['lexicon'], () => {
        utils.click('regexCheckbox');
      }),
    ],
    '/': [
      new help.Shortcut('Focus on the search box', ['lexicon'], () => {
        utils.focus('searchBox');
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
        utils.click('crum-title');
      }),
    ],
    e: [
      new help.Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        ['lexicon'],
        () => {
          utils.click('kellia-title');
        }
      ),
    ],
    t: [
      new help.Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        ['lexicon'],
        () => {
          utils.click('copticsite-title');
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

  sections.forEach(panel.addSection.bind(panel));
  return panel;
}
