/**
 * Package help defines Crum's Help Panel.
 *
 * TODO: (#203) Many of the shortcuts defined here may be relevant for other
 * modules, and should be moved to a shared package.
 */

import * as help from '../help.js';
import * as browser from '../browser.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as xooxle from '../xooxle.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as header from '../header.js';

/**
 *
 * @param highlighter
 * @returns
 */
// eslint-disable-next-line max-lines-per-function
export function makeHelpPanel(highlighter: highlight.Highlighter): help.Help {
  const panel = new help.Help();

  const dialectHighlighting: Record<d.DialectKey, help.Shortcut[]> =
    Object.values(d.DIALECTS).reduce(
      (acc, dialect: d.Dialect) => {
        acc[dialect.key] = [dialect.shortcut(highlighter)];
        return acc;
      },
      {} as Record<d.DialectKey, help.Shortcut[]>
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
      // TODO: (#203) This shortcut seems to reload the page without actually
      // opening the reports page!!
      // Clicking the button works, though. So it's likely about the R, rather
      // than the URL.
      new help.Shortcut(
        'File a Report',
        ['lexicon', 'note', 'index', 'index_index'],
        header.reports
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
          let el: HTMLElement | undefined = browser.findNextElement(
            css.classQuery(xooxle.CLS.VIEW, cls.SISTER_VIEW),
            'cur'
          );
          // If the element has an anchor, click that. Otherwise, the element
          // itself may hold an event listener that responds to clicks, so we
          // just try clicking the element directly.
          el = el?.querySelector('a') ?? el;
          el?.click();
        }
      ),
    ],
    z: [
      new help.Shortcut(
        `Yank the key of the word currently being viewed <span class="${cls.DEV_MODE_NOTE}">(dev mode)</span>`,
        ['lexicon', 'note', 'index'],
        () => {
          browser.yank(
            browser.findNextElement(
              `.${xooxle.CLS.VIEW} .${dev.CLS.DEV}, .${cls.SISTER_KEY}, .${cls.DRV_KEY}`,
              'cur'
            )!.innerText
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
            css.classQuery(xooxle.CLS.VIEW, cls.SISTER_VIEW, cls.DRV_KEY),
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
            css.classQuery(xooxle.CLS.VIEW, cls.SISTER_VIEW, cls.DRV_KEY),
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
    K: [
      new help.Shortcut(
        `<a href="${paths.KELLIA}" target="_blank" rel="noopener,noreferrer"><strong>K</strong>ELLIA</a>`,
        ['lexicon'],
        () => {
          browser.scroll('kellia-title');
        }
      ),
    ],
    T: [
      new help.Shortcut(
        `<a href="${paths.COPTICSITE}" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>`,
        ['lexicon'],
        () => {
          browser.scroll('copticsite-title');
        }
      ),
    ],
    I: [
      new help.Shortcut('Wiki', ['lexicon'], () => {
        browser.scroll('wiki-title');
      }),
    ],
    D: [
      new help.Shortcut('Dawoud pages', ['note'], () => {
        browser.scroll('dawoud');
      }),
    ],
    k: [
      new help.Shortcut('Crum text', ['note'], () => {
        browser.scroll('wiki');
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
    k: [
      new help.Shortcut(
        `<a href="${paths.KELLIA}" target="_blank" rel="noopener,noreferrer"><strong>K</strong>ELLIA</a>`,
        ['lexicon'],
        () => {
          browser.click('kellia-title');
        }
      ),
    ],
    t: [
      new help.Shortcut(
        `<a href="${paths.COPTICSITE}" target="_blank" rel="noopener,noreferrer">copticsi<strong>t</strong>e</a>`,
        ['lexicon'],
        () => {
          browser.click('copticsite-title');
        }
      ),
    ],
    i: [
      new help.Shortcut('Wiki', ['lexicon'], () => {
        browser.click('wiki-title');
      }),
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
