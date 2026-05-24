/**
 * Package help defines Crum's Help Panel.
 *
 * TODO: (#203) Many of the shortcuts defined here may be relevant for other
 * modules, and should be moved to a shared package.
 */

import * as help from '../help.js';
import * as browser from '../browser.js';
import * as high from './highlight.js';
import * as dial from './dialect.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as xoox from '../xooxle.js';
import * as dev from '../dev.js';
import * as cls from './cls.js';
import * as head from '../header.js';
import * as id from './id.js';
import * as mode from './mode.js';

/**
 *
 * @param highlighter
 * @param devHighlighter
 * @returns
 */
// eslint-disable-next-line max-lines-per-function
export function makeHelpPanel(
  highlighter: high.Highlighter,
  devHighlighter: dev.Highlighter
): help.Help {
  const panel = new help.Help();

  const dialectHighlighting: Record<dial.DialectKey, help.Shortcut[]> =
    Object.values(dial.DIALECTS).reduce(
      (acc, dialect: dial.Dialect) => {
        acc[dialect.key] = [highlighter.shortcut(dialect)];
        return acc;
      },
      {} as Record<dial.DialectKey, help.Shortcut[]>
    );

  const control = {
    r: [
      // Reset is delivered as `head.EVENT.RESET`; each consumer
      // (highlighters, scan zoomer/draggers) decides whether to act
      // based on its own active-view predicate, so on the lexicon page
      // only the active dictionary is reset.
      new help.Shortcut(
        'Reset',
        ['lexicon', 'note', 'index', 'index_index'],
        (): void => {
          head.dispatch(head.EVENT.RESET);
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
        browser.open.bind(null, head.reports(), true)
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
        `Open the <a href="${browser.getLinkHref('search')!}" target="_blank">search page</a>`,
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
          const el: HTMLElement | undefined = browser.findNextElement(
            // NOTE: It's important to click on the element that actually opens
            // the needed pages. Check Xooxle and Crum structure for which
            // element that is.
            css.disjunction(xoox.CLS.VIEW, cls.SISTER_VIEW),
            'cur'
          );
          // If the element has an anchor, click that. Otherwise, the element
          // itself may hold an event listener that responds to clicks, so we
          // just try clicking the element directly.
          (el?.querySelector('a') ?? el)?.click();
        }
      ),
    ],
    z: [
      new help.Shortcut(
        `Yank the key of the word currently being viewed <span class="${cls.DEV_MODE_NOTE}">(dev mode)</span>`,
        ['lexicon', 'note', 'index'],
        (): void => {
          const text: string | undefined = browser
            .findNextElement(
              `.${xoox.CLS.KEY}, .${cls.SISTER_KEY}, .${cls.DRV_KEY}`,
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
    y: [
      new help.Shortcut('Yank (copy) the word key', ['note'], () => {
        browser.yank(browser.stem(window.location.pathname));
      }),
    ],
    u: [
      new help.Shortcut(
        'Copy the URL, encoding the fragment appropriately.',
        ['note', 'lexicon'],
        () => {
          browser.yank(browser.urlWithFragment());
        }
      ),
    ],
  };

  const search = {
    w: [
      new help.Shortcut('Toggle full-word search', ['lexicon'], () => {
        browser.click(id.FULL_WORD_CHECKBOX);
      }),
    ],
    s: [
      new help.Shortcut('Toggle case-sensitive search', ['lexicon'], () => {
        browser.click(id.CASE_SENSITIVE_CHECKBOX);
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
    m: [
      new help.Shortcut('Toggle Marcion search', ['lexicon'], () => {
        browser.click(id.MARCION_CHECKBOX);
      }),
    ],
  };

  const moveTo = {
    1: [
      new help.Shortcut(
        'ⲡⲓⲖⲉⲝⲓⲕⲟⲛ',
        ['lexicon'],
        mode.set.bind(null, mode.DIGITAL)
      ),
    ],
    2: [new help.Shortcut('Crum', ['lexicon'], mode.set.bind(null, mode.BOOK))],
    3: [
      new help.Shortcut('داود', ['lexicon'], mode.set.bind(null, mode.DAWOUD)),
    ],
    C: [
      new help.Shortcut('Crum', ['lexicon'], () => {
        browser.scroll(id.title(id.CRUM));
      }),
    ],
    K: [
      new help.Shortcut(
        `<a href="${paths.KELLIA}" target="_blank" rel="noopener,noreferrer"><strong>K</strong>ELLIA</a>`,
        ['lexicon'],
        () => {
          browser.scroll(id.title(id.KELLIA));
        }
      ),
    ],
    T: [
      new help.Shortcut('Andreas', ['lexicon'], () => {
        browser.scroll(id.title(id.ANDREAS));
      }),
    ],
    n: [
      new help.Shortcut('Next word', ['lexicon'], () => {
        browser.scrollToNextElement(css.disjunction(xoox.CLS.VIEW), 'next');
      }),
      new help.Shortcut('Next word', ['note'], browser.openNextLink),
    ],
    p: [
      new help.Shortcut('Previous word', ['lexicon'], () => {
        browser.scrollToNextElement(css.disjunction(xoox.CLS.VIEW), 'prev');
      }),
      new help.Shortcut('Previous word', ['note'], browser.openPrevLink),
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
    g: [
      new help.Shortcut(
        'Header',
        ['lexicon', 'note', 'index', 'index_index'],
        () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
        browser.click(id.collapse(id.CRUM));
      }),
    ],
    k: [
      new help.Shortcut(
        `<a href="${paths.KELLIA}" target="_blank" rel="noopener,noreferrer"><strong>K</strong>ELLIA</a>`,
        ['lexicon'],
        () => {
          browser.click(id.collapse(id.KELLIA));
        }
      ),
    ],
    t: [
      new help.Shortcut('Andreas', ['lexicon'], () => {
        browser.click(id.collapse(id.ANDREAS));
      }),
    ],
  };

  const sections: help.Section[] = [
    new help.Section('Dialect Highlighting', dialectHighlighting),
    new help.Section('Control', control),
    new help.Section('Search', search),
    new help.Section('Move To', moveTo),
    new help.Section('Collapse', collapse),
  ];

  sections.forEach(panel.addSection.bind(panel));
  return panel;
}
