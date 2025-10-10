/**
 * Package help defines Crum's Help Panel.
 *
 * TODO: (#203) Many of the shortcuts defined here may be relevant for other
 * modules, and should be moved to a shared package.
 */
import * as help from '../help.js';
import * as browser from '../browser.js';
import * as dial from './dialect.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as head from '../header.js';
import * as id from './id.js';
/**
 *
 * @param highlighter
 * @param devHighlighter
 * @returns
 */
// eslint-disable-next-line max-lines-per-function
export function makeHelpPanel(highlighter, devHighlighter) {
  const panel = new help.Help();
  const dialectHighlighting = Object.values(dial.DIALECTS).reduce(
    (acc, dialect) => {
      acc[dialect.key] = [highlighter.shortcut(dialect)];
      return acc;
    },
    {}
  );
  const control = {
    r: [
      new help.Shortcut(
        'Reset highlighting',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          highlighter.reset();
          devHighlighter.reset();
        }
      ),
    ],
    d: [
      new help.Shortcut(
        'Developer mode',
        ['lexicon', 'note', 'index', 'index_index'],
        devHighlighter.toggle.bind(devHighlighter)
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
        head.reports
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
        `Open the <a href="${browser.getLinkHref('search')}" target="_blank">search page</a>`,
        ['lexicon', 'note', 'index', 'index_index'],
        browser.openSearchLink
      ),
    ],
    '?': [
      new help.Shortcut(
        'Toggle help panel',
        ['lexicon', 'note', 'index', 'index_index'],
        panel.toggle.bind(panel)
      ),
    ],
    o: [
      new help.Shortcut(
        'Open the word currently being viewed',
        ['lexicon', 'note', 'index'],
        () => {
          let el = browser.findNextElement(
            css.classQuery('view' /* xoox.CLS.VIEW */, cls.SISTER_VIEW),
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
          const text = browser
            .findNextElement(
              `.${'view' /* xoox.CLS.VIEW */} .${dev.CLS.DEV}, .${cls.SISTER_KEY}, .${cls.DRV_KEY}`,
              'cur'
            )
            ?.textContent.trim();
          if (!text) {
            return;
          }
          browser.yank(text);
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
        browser.click(id.FULL_WORD_CHECKBOX);
      }),
    ],
    x: [
      new help.Shortcut('Toggle regex search', ['lexicon'], () => {
        browser.click(id.REGEX_CHECKBOX);
      }),
    ],
    '/': [
      new help.Shortcut('Focus on the search box', ['lexicon'], () => {
        browser.focus(id.SEARCH_BOX);
      }),
    ],
    i: [
      new help.Shortcut('Toggle Wiki search', ['lexicon'], () => {
        browser.click(id.WIKI_CHECKBOX);
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
            css.classQuery(
              'view' /* xoox.CLS.VIEW */,
              cls.SISTER_VIEW,
              cls.DRV_KEY
            ),
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
            css.classQuery(
              'view' /* xoox.CLS.VIEW */,
              cls.SISTER_VIEW,
              cls.DRV_KEY
            ),
            'prev'
          );
        }
      ),
    ],
    C: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        browser.scroll(id.CRUM_TITLE);
      }),
      new help.Shortcut('Crum pages', ['note'], () => {
        browser.scroll(id.CRUM);
      }),
    ],
    K: [
      new help.Shortcut(
        `<a href="${paths.KELLIA}" target="_blank" rel="noopener,noreferrer"><strong>K</strong>ELLIA</a>`,
        ['lexicon'],
        () => {
          browser.scroll(id.KELLIA_TITLE);
        }
      ),
    ],
    T: [
      new help.Shortcut('copticsi<strong>t</strong>e', ['lexicon'], () => {
        browser.scroll(id.COPTICSITE_TITLE);
      }),
    ],
    D: [
      new help.Shortcut('Dawoud pages', ['note'], () => {
        browser.scroll(id.DAWOUD);
      }),
    ],
    k: [
      new help.Shortcut('Crum text', ['note'], () => {
        browser.scroll(id.WIKI);
      }),
    ],
    w: [
      new help.Shortcut('Related words', ['note'], () => {
        browser.scroll(id.SISTERS);
      }),
    ],
    m: [
      new help.Shortcut('Meaning', ['note'], () => {
        browser.scroll(id.MEANING);
      }),
    ],
    e: [
      new help.Shortcut(
        'S<strong>e</strong>ns<strong>e</strong>s',
        ['note'],
        () => {
          browser.scroll(id.SENSES);
        }
      ),
    ],
    t: [
      new help.Shortcut('Type', ['note'], () => {
        browser.scroll(id.ROOT_TYPE);
      }),
    ],
    j: [
      new help.Shortcut('Categories', ['note'], () => {
        browser.scroll(id.CATEGORIES);
      }),
    ],
    i: [
      new help.Shortcut('Images', ['note'], () => {
        browser.scroll(id.IMAGES);
      }),
    ],
    q: [
      new help.Shortcut('Words', ['note'], () => {
        browser.scroll(id.PRETTY);
      }),
    ],
    v: [
      new help.Shortcut('Derivations table', ['note'], () => {
        browser.scroll(id.DERIVATIONS);
      }),
    ],
    c: [
      new help.Shortcut('Dictionary page list', ['note'], () => {
        browser.scroll(id.DICTIONARY);
      }),
    ],
    g: [
      new help.Shortcut(
        'Header',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.scroll(id.HEADER);
        }
      ),
    ],
    G: [
      new help.Shortcut(
        'Footer',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          browser.scroll(id.FOOTER);
        }
      ),
    ],
  };
  const collapse = {
    c: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        browser.click(id.CRUM_TITLE);
      }),
    ],
    k: [
      new help.Shortcut(
        `<a href="${paths.KELLIA}" target="_blank" rel="noopener,noreferrer"><strong>K</strong>ELLIA</a>`,
        ['lexicon'],
        () => {
          browser.click(id.KELLIA_TITLE);
        }
      ),
    ],
    t: [
      new help.Shortcut('copticsi<strong>t</strong>e', ['lexicon'], () => {
        browser.click(id.COPTICSITE_TITLE);
      }),
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
