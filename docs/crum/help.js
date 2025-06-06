/**
 * Package help defines Crum's Help Panel.
 *
 * TODO: (#203) Many of the shortcuts defined here may be relevant for other
 * modules, and should be moved to a shared package.
 */
import * as help from '../help.js';
import * as browser from '../browser.js';
import * as d from './dialect.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
const EMAIL_LINK = `mailto:${paths.EMAIL}`;
/**
 *
 * @param highlighter
 * @returns
 */
export function makeHelpPanel(highlighter) {
  const panel = new help.Help();
  const dialectHighlighting = Object.values(d.DIALECTS).reduce(
    (acc, dialect) => {
      acc[dialect.key] = [dialect.shortcut(highlighter)];
      return acc;
    },
    {}
  );
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
        `<strong>R</strong>eports / Contact <a class="${ccls.CONTACT}" href="${EMAIL_LINK}">${paths.EMAIL}</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.open(EMAIL_LINK);
        }
      ),
    ],
    H: [
      new help.Shortcut(
        `Open <a href="${paths.HOME}" target="_blank"><strong>h</strong>omepage</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.open(paths.HOME);
        }
      ),
    ],
    X: [
      new help.Shortcut(
        `Open the <a href="${paths.LEXICON}" target="_blank">dictionary search page</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.open(paths.LEXICON);
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
          browser
            .findNextElement(
              css.classQuery('view' /* xooxle.CLS.VIEW */, cls.SISTER_VIEW),
              'cur'
            )
            ?.querySelector('a')
            ?.click();
        }
      ),
    ],
    z: [
      new help.Shortcut(
        `Yank the key of the word currently being viewed <span class="${dev.CLS.DEV_MODE_NOTE}">(dev mode)</span>`,
        ['lexicon', 'note', 'index'],
        () => {
          browser.yank(
            browser.findNextElement(
              `.${'view' /* xooxle.CLS.VIEW */} ${dev.CLS.DEV}, .${cls.SISTER_KEY}, .${cls.DRV_KEY}`,
              'cur'
            ).innerHTML
          );
        }
      ),
    ],
    l: [new help.Shortcut('Go to next word', ['note'], browser.openNextLink)],
    h: [
      new help.Shortcut('Go to previous word', ['note'], browser.openPrevLink),
    ],
    y: [
      new help.Shortcut('Yank (copy) the word key', ['note'], () => {
        browser.yank(browser.stem(window.location.pathname));
      }),
    ],
  };
  const search = {
    w: [
      new help.Shortcut('Toggle full-word search', ['lexicon'], () => {
        browser.click('fullWordCheckbox');
      }),
    ],
    x: [
      new help.Shortcut('Toggle regex search', ['lexicon'], () => {
        browser.click('regexCheckbox');
      }),
    ],
    '/': [
      new help.Shortcut('Focus on the search box', ['lexicon'], () => {
        browser.focus('searchBox');
      }),
    ],
  };
  const scrollTo = {
    n: [
      new help.Shortcut(
        'Next word in the list',
        ['lexicon', 'note', 'index'],
        () => {
          browser.scrollToNextElement(
            css.classQuery('view' /* xooxle.CLS.VIEW */, cls.SISTER_VIEW),
            'next'
          );
        }
      ),
    ],
    p: [
      new help.Shortcut(
        'Previous word in the list',
        ['lexicon', 'note', 'index'],
        () => {
          browser.scrollToNextElement(
            css.classQuery('view' /* xooxle.CLS.VIEW */, cls.SISTER_VIEW),
            'prev'
          );
        }
      ),
    ],
    C: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        browser.scroll('crum-title');
      }),
      new help.Shortcut('Crum pages', ['note'], () => {
        browser.scroll('crum');
      }),
    ],
    E: [
      new help.Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        ['lexicon'],
        () => {
          browser.scroll('kellia-title');
        }
      ),
    ],
    T: [
      new help.Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        ['lexicon'],
        () => {
          browser.scroll('copticsite-title');
        }
      ),
    ],
    D: [
      new help.Shortcut('Dawoud pages', ['note'], () => {
        browser.scroll('dawoud');
      }),
    ],
    w: [
      new help.Shortcut('Related words', ['note'], () => {
        browser.scroll('sisters');
      }),
    ],
    m: [
      new help.Shortcut('Meaning', ['note'], () => {
        browser.scroll('meaning');
      }),
    ],
    e: [
      new help.Shortcut(
        'S<strong>e</strong>ns<strong>e</strong>s',
        ['note'],
        () => {
          browser.scroll('senses');
        }
      ),
    ],
    t: [
      new help.Shortcut('Type', ['note'], () => {
        browser.scroll('root-type');
      }),
    ],
    j: [
      new help.Shortcut('Categories', ['note'], () => {
        browser.scroll('categories');
      }),
    ],
    i: [
      new help.Shortcut('Images', ['note'], () => {
        browser.scroll('images');
      }),
    ],
    q: [
      new help.Shortcut('Words', ['note'], () => {
        browser.scroll('pretty');
      }),
    ],
    Q: [
      new help.Shortcut('Words', ['note'], () => {
        browser.scroll('marcion');
      }),
    ],
    v: [
      new help.Shortcut('Derivations table', ['note'], () => {
        browser.scroll('derivations');
      }),
    ],
    c: [
      new help.Shortcut('Dictionary page list', ['note'], () => {
        browser.scroll('dictionary');
      }),
    ],
    g: [
      new help.Shortcut(
        'Header',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.scroll('header');
        }
      ),
    ],
    G: [
      new help.Shortcut(
        'Footer',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.scroll('footer');
        }
      ),
    ],
  };
  const collapse = {
    c: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        browser.click('crum-title');
      }),
    ],
    e: [
      new help.Shortcut(
        '<a href="https://kellia.uni-goettingen.de/" target="_blank" rel="noopener,noreferrer">K<strong>E</strong>LLIA</a>',
        ['lexicon'],
        () => {
          browser.click('kellia-title');
        }
      ),
    ],
    t: [
      new help.Shortcut(
        '<a href="http://copticsite.com/" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>',
        ['lexicon'],
        () => {
          browser.click('copticsite-title');
        }
      ),
    ],
  };
  const sections = [
    new help.Section('Dialect Highlighting', dialectHighlighting),
    new help.Section('Control', control),
    new help.Section('Search', search),
    new help.Section('Scroll To', scrollTo),
    new help.Section('Collapse', collapse),
  ];
  sections.forEach(panel.addSection.bind(panel));
  return panel;
}
