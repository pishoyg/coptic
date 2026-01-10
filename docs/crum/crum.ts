/**
 * Package crum defines Crum note handlers.
 */

import * as iam from '../iam.js';

import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as high from './highlight.js';
import * as dial from './dialect.js';
import * as cls from './cls.js';
import * as id from './id.js';
import * as ccls from '../cls.js';
import * as head from '../header.js';
import * as log from '../logger.js';
import * as wiki from './wiki.js';
import * as drop from '../dropdown.js';
import * as dev from '../dev.js';
import * as roots from './roots.js';
import * as derivations from './derivations.js';
import * as str from '../str.js';

const COPTIC_RE = /[\p{Script=Coptic}][\p{Script=Coptic}\p{Mark}]*/gu;
const GREEK_RE = /[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/gu;
const ENGLISH_RE = /[\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*/gu;

/**
 * Handle all Crum elements.
 * @param root
 * @param highlighter
 * @param devHighlighter
 */
export function handle(
  root: HTMLElement,
  highlighter: high.Highlighter,
  devHighlighter: dev.Highlighter
): void {
  handleCategories(root);
  handleRootType(root);
  handleCrumPage(root);
  handleDawoudPageImg(root);
  handleCrumPageImg(root);
  handleExplanatory(root);
  handleDawoudPage(root);
  handleDrvKey(root);
  handleExplanatoryKey(root);
  handleSisterKey(root);
  handleSisterView(root);
  handleDialect(root, highlighter);
  handleDeveloper(root, devHighlighter);
  insertCrumAbbreviationsLink();
  handleAnkiNavigation(root);
  addCopticLookups(root);
  addGreekLookups(root);
  addEnglishLookups(root);
  handleNagHammadi(root);
  handleQuality(root);
  wiki.handle(root);
}

/**
 *
 * @param root
 */
export function handleCategories(root: HTMLElement): void {
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
export function handleRootType(root: HTMLElement): void {
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
export function handleCrumPage(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE}`).forEach((el) => {
    const page: string = el.textContent.trim();
    el.replaceChildren(...scan.prettyPage(page));
    const [num, _]: [string, string] = scan.chopColumn(page);

    if (!str.isDigits(num)) {
      // This page is non-numerical. It likely belongs to the Addenda, which we
      // don't support yet. We just add a tooltip, but no hyperlinks.
      // TODO: (#413) Remove the tooltip. The page number should have a
      // hyperlink pointing to the scan.
      const i = document.createElement('i');
      i.textContent = 'Additions and Corrections';
      drop.addDroppable(el, ['From ', i]);
      return;
    }

    html.linkify(
      el,
      // Inside Wiki, crum-page elements point externally.
      // Outside Wiki, crum-page elements point to an anchor within the page.
      // TODO: (#575) The scans should be removed from the notes, and all Crum
      // pages should point externally.
      el.closest(`.${cls.WIKI}`) ? paths.crumScan(page) : `#crum${num}`
    );
  });
}

/**
 *
 * @param root
 */
export function handleDawoudPageImg(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE_IMG}`)
    .forEach((el: HTMLElement): void => {
      html.linkify(
        el,
        paths.dawoudScan(el.querySelector('img')!.getAttribute('alt')!)
      );
    });
}

/**
 *
 * @param root
 */
export function handleCrumPageImg(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    html.linkify(
      el,
      paths.crumScan(el.querySelector('img')!.getAttribute('alt')!)
    );
  });
}

/**
 *
 * @param root
 */
export function handleExplanatory(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY}`).forEach((el) => {
    const img: HTMLElement = el.querySelector('img')!;
    const alt = img.getAttribute('alt');
    if (!alt?.startsWith('http')) {
      // TODO: (#258) Ensure all image sources are populated.
      return;
    }
    const a = html.anchor(alt, true, img);
    el.prepend(a);
  });
}

/**
 *
 * @param root
 */
export function handleDawoudPage(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    const page: string = el.textContent.trim();
    el.replaceChildren(...scan.prettyPage(page));
    html.linkify(el, `#dawoud${scan.chopColumn(page)[0]}`);
  });
}

/**
 *
 * @param root
 */
export function handleDrvKey(root: HTMLElement): void {
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
      const frag = `#drv${key.textContent.trim()}`;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = frag;
      a.textContent = '🔗';

      // Store the key parent.
      const parent: ParentNode = key.parentNode!;

      // Create a span bearing the two anchors, with a space in between.
      const span: HTMLSpanElement = document.createElement('span');
      span.classList.add(cls.DRV_LINK);
      span.replaceChildren(a, ' ', key);

      // Add the new span as a child to the original parent.
      parent.appendChild(span);

      if (iam.amI('anki')) {
        // Yanking is not straightforward on Anki, for what it seems!
        return;
      }

      // Clicking on the anchor also copies the URL.
      a.addEventListener('click', (): void => {
        const url: URL = new URL(window.location.href);
        url.hash = frag;
        browser.yank(url.toString());
      });
    });
}

/**
 *
 * @param root
 */
export function handleExplanatoryKey(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY_KEY}`)
    .forEach((el) => {
      html.linkify(
        el,
        `#explanatory${el.textContent.trim()}`,
        false,
        ccls.HOVER_LINK
      );
    });
}

/**
 *
 * @param root
 */
export function handleSisterKey(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.SISTER_KEY}`).forEach((el) => {
    html.linkify(el, `#sister${el.textContent.trim()}`, false, ccls.HOVER_LINK);
  });
}

/**
 *
 * @param root
 */
export function handleSisterView(root: HTMLElement): void {
  root
    .querySelectorAll(css.classQuery(cls.SISTERS_TABLE, cls.INDEX_TABLE))
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
    const isWiki = !!el.closest(`.${cls.WIKI}`);
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
    drop.addDroppable(
      el,
      isWiki ? [dialect.name] : Array.from(dialect.anchoredName())
    );

    if (isWiki || !standard) {
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
 *
 * @param root
 * @param highlighter
 */
export function handleDeveloper(
  root: HTMLElement,
  highlighter: dev.Highlighter
): void {
  root.querySelectorAll<HTMLElement>(`.${head.CLS.DEVELOPER}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    el.addEventListener('click', highlighter.toggle.bind(highlighter));
  });
}

/**
 *
 */
export function insertCrumAbbreviationsLink(): void {
  const crumElement = document.getElementById('crum');
  const anchor = document.createElement('a');
  anchor.textContent = 'Abbreviations';
  anchor.href = paths.CRUM_ABBREVIATIONS;
  anchor.classList.add(cls.ABBREVIATIONS);
  anchor.target = '_blank';
  crumElement?.insertBefore(anchor, crumElement.firstChild);
}

/**
 * Prefix all navigation URLs with the Lexicon path.
 * This is unnecessary on web because a browser is capable of resolving relative
 * paths. But it is necessary on Anki.
 * @param root
 */
export function handleAnkiNavigation(root: HTMLElement): void {
  if (!iam.amI('anki')) return;

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
 */
export function addCopticLookups(root: HTMLElement): void {
  html.linkifyText(
    root,
    COPTIC_RE,
    (match: RegExpExecArray) => paths.lexiconLookup(match[0]),
    [ccls.HOVER_LINK],
    // Most Coptic text in Wiki and Nag Hammadi are example sentences, with the
    // words containing prefixes or suffixes rather than being bare roots.
    // We exclude them from lookup hyperlinks in order to avoid confusion.
    // The type is usually "ⲡ" for masculine, "ⲧ" for feminine, "ⲛ" for
    // plural. Adding lookup hyperlinks to that doesn't really make sense.
    [cls.TYPE, cls.WIKI, cls.NAG_HAMMADI]
  );
}

/**
 *
 * @param root
 */
export function addGreekLookups(root: HTMLElement): void {
  html.linkifyText(
    root,
    GREEK_RE,
    (match: RegExpExecArray): string => paths.greekLookup(match[0]),
    [cls.GREEK]
  );
}

/**
 *
 * @param root
 */
export function addEnglishLookups(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
    html.linkifyText(
      el,
      ENGLISH_RE,
      (match: RegExpExecArray) => paths.lexiconLookup(match[0]),
      [ccls.HOVER_LINK],
      [cls.PART_OF_SPEECH, cls.ROMAN, cls.HEADING]
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
  /\bcodex ([a-z]*) - ([^;]+); [0-9]+; ([0-9]+|flyleaf (?:verso|recto)); ([0-9]+);/gi;

/**
 *
 * @param root
 */
export function handleNagHammadi(root: HTMLElement): void {
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
        (
          match: RegExpExecArray,
          _,
          remainder: string
        ): { replacement: Node[]; remainder: string } => {
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
          return {
            replacement: [anchor],
            remainder: `: ${line}: ${remainder}`,
          };
        }
      );
    });
}

/**
 * @returns The Marcion database key of the current word.
 */
function marcion(): number | undefined {
  const href = (document.getElementById(id.KEY) as HTMLAnchorElement).href;
  const match = /(\d+)\.html$/.exec(href);
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
export function handleQuality(root: HTMLElement): void {
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
