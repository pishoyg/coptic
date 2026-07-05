/**
 * Package crum defines Crum note handlers.
 */

import * as iam from '../iam.js';

import * as clip from '../clip.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import type * as high from './highlight.js';
import * as dial from './dialect.js';
import * as cls from './cls.js';
import * as id from './id.js';
import * as ccls from '../cls.js';
import * as head from '../header.js';
import * as log from '../logger.js';
import * as wiki from './wiki.js';
import * as tool from '../tooltip.js';
import type * as dev from '../dev.js';
import * as roots from './roots.js';
import * as derivations from './derivations.js';

const GREEK_WORD_RE = /^[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*$/u;
const ENGLISH_RE = /[\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*/u;

/**
 * Handle all Crum elements.
 * @param root
 * @param highlighter
 * @param full
 */
export function handle(
  root: HTMLElement,
  highlighter: high.Highlighter,
  full = true
): void {
  handleDialect(root, highlighter);
  addGreekLookups(root);
  wiki.handle(root, full);

  if (!full) {
    return;
  }
  handleCategories(root);
  handleRootType(root);
  handleCrumPage(root);
  handleExplanatory(root);
  handleDrvKey(root);
  handleExplanatoryKey(root);
  handleSisterKey(root);
  handleSisterView(root);
  handleAnkiNavigation(root);
  addCopticLookups(root);
  addEnglishLookups(root);
  handleNagHammadi(root);
  handleQuality(root);
}

/**
 *
 * @param root
 */
function handleCategories(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.CATEGORIES}`).forEach((el: Element): void => {
    const cats: string[] = el.textContent
      .trim()
      .split(',')
      .map((cat: string): string => cat.trim());
    el.replaceChildren(
      ...cats.flatMap((cat: string, index: number): (Node | string)[] => {
        const a: HTMLAnchorElement = document.createElement('a');
        a.classList.add(ccls.HOVER_LINK);
        a.target = '_blank';
        a.textContent = cat;
        a.href = paths.crum(cat);
        return index === cats.length - 1 ? [a] : [a, ', '];
      })
    );
  });
}

/**
 *
 * @param root
 */
function handleRootType(root: HTMLElement): void {
  root
    .querySelectorAll(`.${cls.PART_OF_SPEECH} b`)
    .forEach((el: Element): void => {
      const type: string = el.textContent.trim();
      const link = document.createElement('a');
      link.classList.add(ccls.HOVER_LINK);
      link.href = paths.crum(type.replaceAll('/', '_'));
      link.target = '_blank';
      link.textContent = type;
      el.replaceChildren(link);
    });
}

/**
 *
 * @param root
 */
function handleCrumPage(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE}`).forEach((el) => {
    const page: string = el.textContent.trim();
    el.replaceChildren(...scan.prettyPage(page));
    html.linkify(el, paths.crumScan(page));
  });
}

/**
 *
 * @param root
 */
function handleExplanatory(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY}`).forEach((el) => {
    const img: HTMLElement = el.querySelector('img')!;
    const alt = img.getAttribute('alt');
    if (!alt?.startsWith('http')) {
      // TODO: (#258) Ensure all image sources are populated.
      return;
    }
    const a = html.anchor(alt, img);
    el.prepend(a);
  });
}

/**
 *
 * @param root
 */
function handleDrvKey(root: HTMLElement): void {
  let rowNum: number | undefined = derivations.MAPPING[marcion() ?? 0];
  root
    .querySelectorAll<HTMLElement>(`.${cls.DRV_KEY}`)
    .forEach((key: HTMLElement) => {
      // The key should have the link to the row containing the derivation
      // definition in our source-of-truth sheet.
      // Make the target _blank so it will open in a separate page.
      if (!rowNum) {
        log.error(
          'Page has derivations, but unable to infer their row numbers!'
        );
      } else {
        html.linkify(key, paths.rowUrl(paths.CRUM_DERIVATIONS_URL, rowNum++));
      }

      // Create a second anchor pointing to this row in the HTML. This is useful
      // for users to share links to specific derivations.
      const a: HTMLAnchorElement = clip.fragmentLink(
        `#drv${key.textContent.trim()}`
      );

      // Store the key parent.
      const parent: ParentNode = key.parentNode!;

      // Create a span bearing the two anchors, with a space in between.
      const span: HTMLSpanElement = document.createElement('span');
      span.classList.add(cls.DRV_LINK);
      span.replaceChildren(a, ' ', key);

      // Add the new span as a child to the original parent.
      parent.appendChild(span);
    });
}

/**
 *
 * @param root
 */
function handleExplanatoryKey(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY_KEY}`)
    .forEach((el) => {
      html.linkify(el, `#explanatory${el.textContent.trim()}`, ccls.HOVER_LINK);
    });
}

/**
 *
 * @param root
 */
function handleSisterKey(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.SISTER_KEY}`).forEach((el) => {
    html.linkify(el, `#sister${el.textContent.trim()}`, ccls.HOVER_LINK);
  });
}

/**
 *
 * @param root
 */
function handleSisterView(root: HTMLElement): void {
  root
    .querySelectorAll(css.disjunction(cls.SISTERS_TABLE, cls.INDEX_TABLE))
    .forEach((table: Element): void => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((tr: HTMLTableRowElement): void => {
        const td: Element | null = tr.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          log.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        const span = document.createElement('span');
        span.classList.add(cls.SISTER_INDEX);
        span.textContent = `${(counter++).toString()}. `;
        td.prepend(span);
      });
    });
}

/**
 *
 * @param root
 * @param highlighter
 */
export function handleDialect(
  root: HTMLElement,
  highlighter: high.Highlighter
): void {
  root.querySelectorAll<HTMLElement>(`.${cls.DIALECT}`).forEach((el) => {
    const code: string = el.textContent.trim();

    const standard: boolean = code in dial.DIALECTS;
    const dialect: dial.Dialect | undefined = standard
      ? dial.DIALECTS[code as dial.DIALECT]
      : dial.NON_STANDARD[code];

    if (!dialect) {
      log.error(
        'Unknown dialect',
        code,
        'should be added to non-standard dialect list'
      );
      return;
    }

    // 1. Render Visuals: Replace text with Siglum and add Tooltip.
    const siglum: HTMLSpanElement = dialect.siglum();
    el.replaceChildren(siglum);
    tool.addTooltip(el, [dialect.name], [cls.DIALECT]);

    if (el.closest(`.${cls.WIKI}`) || !standard) {
      // There is no highlighting in Wiki. And definitely not for nonstandard
      // dialects.
      return;
    }

    // 2. Add Interaction: Toggle highlighting on click.
    siglum.classList.add(ccls.HOVER_ACTION);
    siglum.addEventListener('click', () => {
      highlighter.toggle(code as dial.DIALECT);
    });
  });
}

/**
 * Prefix all navigation URLs with the Lexicon path.
 * This is unnecessary on web because a browser is capable of resolving relative
 * paths. But it is necessary on Anki.
 * @param root
 */
function handleAnkiNavigation(root: HTMLElement): void {
  if (!iam.amI('card')) return;

  root
    .querySelectorAll<HTMLAnchorElement>(`a.${cls.NAVIGATE}`)
    .forEach((a: HTMLAnchorElement) => {
      // Get the raw attribute.
      const href: string | null = a.getAttribute('href');
      if (!href) {
        log.error(cls.NAVIGATE, 'element HREF is unset!');
        return;
      }
      if (href.startsWith('http')) {
        log.error(cls.NAVIGATE, 'element HREF looks like an absolute URL!');
        return;
      }
      a.setAttribute('href', `${paths.LEXICON}/${href}`);
    });
}

/**
 *
 * @param root
 *
 * TODO: (#658) Instead of hyperlinks, words should have tooltips that contain
 * buttons to copy or look up the words.
 */
function addCopticLookups(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.SPELLING}`).forEach((form: Element) => {
    html.linkifyText(
      form,
      // If the word is fully surrounded by parentheses, drop them.
      /(?=[^(]|\(\S+\)\S)\S+(?<=[^)]|\S\(\S+\))/,
      (match: RegExpExecArray): string | null => {
        // Skip words that don't contain any Coptic characters.
        return /\p{Script=Coptic}/u.test(match[0])
          ? paths.lexicon(match[0])
          : null;
      },
      [ccls.HOVER_LINK]
    );
  });
}

/**
 *
 * @param root
 */
export function addGreekLookups(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.GREEK}`).forEach((greek: Element): void => {
    html.linkifyText(greek, /\S+/, (match: RegExpExecArray): string | null =>
      GREEK_WORD_RE.test(match[0]) ? paths.greekLookup(match[0]) : null
    );
  });
}

/**
 *
 * @param root
 */
function addEnglishLookups(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
    html.linkifyText(
      el,
      ENGLISH_RE,
      (match: RegExpExecArray) => paths.lexicon(match[0]),
      [ccls.HOVER_LINK],
      [cls.PART_OF_SPEECH, cls.ROMAN, cls.HEADING, cls.LANG]
    );
  });
}

// A Nag Hammadi reference has the following format:
// eslint-disable-next-line max-len
//   codex {ROMAN_NUMERAL} - {TRACTATE_TITLE}; {TRACTATE_NUMBER}; {LEAF_NUMBER}; {LINE_NUMBER}; {QUOTE}
// There is a 1:1 mapping between tractate names and numbers, and tractate
// numbers don't really make sense outside of Marcion.
// The leaf number is almost always a number, but occasionally it's "flyleaf
// verso" or "flyleaft recto".
const NAG_HAMMADI_RE =
  /\bcodex ([a-z]*) - ([^;]+); [0-9]+; ([0-9]+|flyleaf (?:verso|recto)); ([0-9]+);/i;

/**
 * TODO: (#167) Use structured HTML for Nag Hammadi, instead of relying on
 * regular expressions to extract book names.
 *
 * @param root
 */
function handleNagHammadi(root: HTMLElement): void {
  Array.from(root.querySelectorAll(`.${cls.NAG_HAMMADI}`))
    .flatMap(
      (nh: Element): Text[] =>
        Array.from(nh.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        ) as Text[]
    )
    .forEach((elem: Text): void => {
      html.replaceNode(
        elem,
        NAG_HAMMADI_RE,
        (match: RegExpExecArray): (Node | string)[] => {
          const anchor: HTMLAnchorElement = document.createElement('a');
          anchor.target = '_blank';
          const [codex, title, leaf, line]: [string, string, string, string] = [
            match[1]!,
            match[2]!,
            match[3]!,
            match[4]!,
          ];
          anchor.href = paths.nagHammadiPapyrus(codex, leaf);
          // Notice that we intentionally drop the tractate number from the
          // output, because it doesn't make sense outside of Marcion.
          anchor.textContent = `codex ${codex} - ${title} - ${leaf}`;
          return [anchor, `: ${line}: `];
        }
      );
    });
}

/**
 * @returns The Marcion database key of the current word.
 */
function marcion(): number | undefined {
  const keyCell: Element | null = document.getElementById(id.KEY);
  if (!keyCell) {
    // This is a non-note page.
    return undefined;
  }
  const match = /(\d+)\.html$/.exec((keyCell as HTMLAnchorElement).href);
  if (!match?.[1]) {
    return undefined;
  }
  const key: number = parseInt(match[1]);
  return isNaN(key) ? undefined : key;
}

/**
 *
 * @param root
 */
function handleQuality(root: HTMLElement): void {
  const rowNum: number | undefined = roots.MAPPING[marcion() ?? 0];
  if (!rowNum) {
    log.error('Unable to retrieve root row number!');
    return;
  }

  root
    .querySelectorAll<HTMLElement>(`.${cls.QUALITY}`)
    .forEach((el: HTMLElement) => {
      html.linkify(el, paths.rowUrl(paths.CRUM_ROOTS_URL, rowNum));
    });
}

/**
 *
 * @param highlighter
 * TODO: (#203) This belongs in the header module.
 */
export function handleDeveloper(highlighter: dev.Highlighter): void {
  document.body
    .querySelectorAll<HTMLElement>(`.${head.CLS.DEVELOPER}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', highlighter.toggle.bind(highlighter));
    });
}
