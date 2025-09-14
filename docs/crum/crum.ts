/**
 * Package crum defines Crum note handlers.
 *
 * TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
 * possible. NOTE: The associated issue is closed. Judge whether it should be
 * reopened, or if we should create a new issue, or just delete this TODO.
 */

import * as iam from '../iam.js';

import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as header from '../header.js';
import * as logger from '../logger.js';
import * as bible from './bible.js';
import * as ann from './annotations.js';
import * as ref from './references.js';
import * as drop from '../dropdown.js';
import * as orth from '../orth.js';

/**
 * NOTE: All of the regexes below assume the following normalizations:
 * - HTML tree normalization[1], which allows us to use `\s` instead of `\s+`.
 * - NFD normalization[2], which allows us to use `\p{M}`.
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize */ // eslint-disable-line max-len

/**
 * BIBLE_RE defines the regex used to catch Bible references.
 * A Bible book abbreviation starts with a capital letter followed by one
 * or more small letters. Optionally, the abbreviation may contain a book
 * number, with 4 being the maximum.
 * Some books, such as the Book of Esther, have special chapters called A, C, D,
 * and F. This is why we allow the chapter number to be one of those characters.
 * In some cases, only one number follows the book name, so we allow one of the
 * two numbers to be omitted.
 */
const BIBLE_RE =
  /(\b(?:[1-4]\s)?[A-Z][a-z]+)(?:\s(\d+|A|C|D|F))(?:\s(\d+))?\b/gu;

const ANNOTATION_RES: RegExp[] = [
  /\b[a-zA-Z]+\s[a-zA-Z]+\b/gu, // Two-word annotation.
  /\b[a-zA-Z]+\b/gu, // One-word annotation.
];

// Some reference abbreviations have diacritics. We normalize the keys and the
// search text, so we can correctly detect them.
// Additionally, as of the time of writing, one abbreviation contains an
// apostrophe: ‘O'Leary H’, and two contain an ampersand: ‘J & C’, ‘N & E’.
// We presume that the inclusion of the apostrophe and the ampersand doesn't
// otherwise compromise our search logic.
const REFERENCE_RES: RegExp[] = [
  /[a-zA-Z\p{M}'&]+\s[a-zA-Z\p{M}'&]+\s[a-zA-Z\p{M}'&]+/gu,
  /[a-zA-Z\p{M}'&]+\s[a-zA-Z\p{M}'&]+/gu,
  /[a-zA-Z\p{M}'&]+/gu,
];

// TODO: (#0) Add a check to verify that all reference abbreviations are caught
// by the regex above.

const COPTIC_RE = /[\p{Script=Coptic}][\p{Script=Coptic}\p{Mark}]*/gu;
const GREEK_RE = /[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/gu;
const ENGLISH_RE = /[\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*/gu;

/**
 * Ensure that all the given keys are matched by at least one of the regexes.
 * @param keys
 * @param regexes
 */
function ensureKeysCovered(keys: string[], regexes: RegExp[]): void {
  const undetectable: string[] = keys.filter(
    (key: string): boolean =>
      !regexes.some(
        // We need to ensure, not just that there is a match, but that the match
        // covers the entire key.
        (regex: RegExp): boolean => key.match(regex)?.[0].length === key.length
      )
  );
  if (undetectable.length) {
    logger.fatal(undetectable, 'are not detected by our regexes!');
  }
}

// TODO: (#419) Once all corner cases are handled, add verification for
// references.
ensureKeysCovered(Object.keys(ann.MAPPING), ANNOTATION_RES);

/**
 *
 * @param root
 * @param highlighter
 */
export function handleAll(
  root: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  handleCategories(root);
  handleRootType(root);
  handleCrumPage(root);
  handleCrumPageExternal(root);
  handleDawoudPageExternal(root);
  handleDawoudPageImg(root);
  handleCrumPageImg(root);
  handleExplanatory(root);
  handleDawoudPage(root);
  handleDrvKey(root);
  handleExplanatoryKey(root);
  handleSisterKey(root);
  handleSisterView(root);
  handleDialect(root, highlighter);
  handleDeveloper(root, highlighter);
  insertCrumAbbreviationsLink();
  handleAnkiNavigation(root);
  addCopticLookups(root);
  addGreekLookups(root);
  addEnglishLookups(root);
  handleWikiDialects(root);
  handleWikiBible(root);
  handleWikiReferences(root);
  // NOTE: Some annotations (such as MS for manuscript, MSS for manuscripts,
  // and ostr for ostracon) are substrings of some reference abbreviations. So
  // annotations must be added AFTER references.
  handleWikiAnnotations(root);
  warnPotentiallyMissingReferences(root);
}

/**
 *
 * @param root
 */
export function handleCategories(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.CATEGORIES}`).forEach((el) => {
    el.innerHTML = el.innerText
      .trim()
      .split(',')
      .map((s) => s.trim())
      .map(
        (s) =>
          `<a class="${ccls.HOVER_LINK}" href="${paths.LEXICON}/${s}.html" target="_blank">${s}</a>`
      )
      .join(', ');
  });
}

/**
 *
 * @param root
 */
export function handleRootType(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.ROOT_TYPE}`).forEach((el) => {
    const type: string | undefined = el.querySelector('b')?.innerText;
    if (!type) {
      logger.error('Unable to infer the root type for element!', el);
      return;
    }
    el.innerHTML = `(<a class="${ccls.HOVER_LINK}" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
  });
}

/**
 *
 * @param root
 */
export function handleCrumPage(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerText)}`);
  });
}

/**
 *
 * @param root
 */
export function handleCrumPageExternal(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE_EXTERNAL}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', () => {
        browser.open(`${paths.CRUM_SCAN_PREFIX}${el.innerText}`);
      });
    });
}

/**
 *
 * @param root
 */
export function handleDawoudPageExternal(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE_EXTERNAL}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', () => {
        browser.open(`${paths.DAWOUD}?page=${el.innerText}`);
      });
    });
}

/**
 *
 * @param root
 */
export function handleDawoudPageImg(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE_IMG}`)
    .forEach((el) => {
      const img = el.children[0] as HTMLElement;
      img.classList.add(ccls.LINK);
      img.addEventListener('click', () => {
        browser.open(`${paths.DAWOUD}?page=${img.getAttribute('alt')!}`);
      });
    });
}

/**
 *
 * @param root
 */
export function handleCrumPageImg(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${img.getAttribute('alt')!}`);
    });
  });
}

/**
 *
 * @param root
 */
export function handleExplanatory(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    const alt = img.getAttribute('alt')!;
    if (!alt.startsWith('http')) return;
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(alt);
    });
  });
}

/**
 *
 * @param root
 */
export function handleDawoudPage(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerText)}`);
  });
}

/**
 *
 * @param root
 */
export function handleDrvKey(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLAnchorElement>(`.${cls.DRV_KEY}`)
    .forEach((key: HTMLAnchorElement) => {
      // The key should have the link to the row containing the derivation
      // definition in our source-of-truth sheet.
      // Make the target _blank so it will open in a separate page.
      key.target = '_blank';

      // Create a second anchor pointing to this row in the HTML. This is useful
      // for users to share links to specific derivations.
      const frag = `#drv${key.innerText}`;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = frag;
      a.classList.add(ccls.HOVER_LINK);
      a.innerText = '🔗';

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
      a.addEventListener('click', () => {
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
      el.classList.add(ccls.HOVER_LINK);
      html.makeSpanLinkToAnchor(el, `#explanatory${el.innerText}`);
    });
}

/**
 *
 * @param root
 */
export function handleSisterKey(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerText}`);
  });
}

/**
 *
 * @param root
 */
export function handleSisterView(root: HTMLElement): void {
  root
    .querySelectorAll(css.classQuery(cls.SISTERS_TABLE, cls.INDEX_TABLE))
    .forEach((table: Element) => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((el: HTMLTableRowElement) => {
        const td: Element | null = el.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          logger.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML = `<span class="${cls.SISTER_INDEX}">${counter.toString()}. </span>${
          td.innerHTML
        }`;
        counter++;
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
  highlighter: highlight.Highlighter
): void {
  root.querySelectorAll<HTMLElement>(`.${cls.DIALECT}`).forEach((el) => {
    const code: d.DIALECT = el.innerText as d.DIALECT;
    el.replaceChildren(...d.DIALECTS[code].prettyCode());
    if (el.closest(`.${cls.WIKI}`)) {
      // Dialect highlighting doesn't really work under Wiki, so we disable it
      // here!
      return;
    }
    el.classList.add(ccls.HOVER_LINK);
    el.addEventListener(
      'click',
      highlighter.toggleDialect.bind(highlighter, code)
    );
  });
}

/**
 *
 * @param root
 * @param highlighter
 */
export function handleDeveloper(
  root: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  root
    .querySelectorAll<HTMLElement>(`.${header.CLS.DEVELOPER}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', highlighter.toggleDev.bind(highlighter));
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
 *
 * @param root
 */
export function handleAnkiNavigation(root: HTMLElement): void {
  if (!iam.amI('anki')) return;
  root.querySelectorAll<HTMLElement>(`.${cls.NAVIGATE}`).forEach((e) => {
    if (e.tagName !== 'A' || !e.hasAttribute('href')) {
      logger.error(
        'This "navigate" element is not an <a> tag with an "href" property!',
        e
      );
      return;
    }
    e.setAttribute('href', `${paths.LEXICON}/${e.getAttribute('href')!}`);
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
    (match: RegExpExecArray) => paths.LOOKUP_URL_PREFIX + match[0],
    [ccls.HOVER_LINK],
    [cls.TYPE, cls.WIKI]
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
    (match: RegExpExecArray) => paths.GREEK_DICT_PREFIX + match[0],
    [ccls.LINK, cls.LIGHT]
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
      (match: RegExpExecArray) => paths.LOOKUP_URL_PREFIX + match[0],
      [ccls.HOVER_LINK]
    );
  });
}

/**
 *
 * @param root
 */
export function handleWikiDialects(root: HTMLElement): void {
  root
    .querySelectorAll(`.${cls.WIKI} .${cls.DIALECT}`)
    .forEach((el: Element): void => {
      drop.addHoverDroppable(el, d.DIALECTS[el.textContent as d.DIALECT].name);
    });
}

/**
 *
 * @param root
 */
export function handleWikiAnnotations(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((el: Element): void => {
    ANNOTATION_RES.forEach((regex: RegExp): void => {
      html.replaceText(
        el,
        regex,
        (match: RegExpExecArray): (Node | string)[] | null => {
          const form: string = match[0];
          const annot: ann.Annotation | undefined = ann.MAPPING[form];
          if (!annot) {
            return null;
          }
          const span: HTMLSpanElement = document.createElement('span');
          span.textContent = form;
          drop.addHoverDroppable(span, annot.fullForm);
          span.classList.add(cls.ANNOTATION);
          return [span];
        },
        // We want to skip bullet point bullets from processing (a., b., c.,
        // ...; I, II, II, ...).
        //
        // Additionally, if an element is already an annotation, we don't do
        // anything. This allows us to process two-word annotations in the
        // first iteration, and one-word annotations in the second iteration,
        // without worrying about annotations that are substrings of others.
        // For example, ‘c’ is a substring of ‘p c’. In order to prevent
        // conflict, we process the longer annotation (‘p c’) first, and mark
        // it using the ANNOTATION class. In the following iteration, when
        // we're searching for occurrences of ‘c’, we're sure we're gonna skip
        // the marked instances of ‘p c’.
        //
        // Finally, for mere defensiveness, we avoid processing all elements
        // containing Crum abbreviations (dialects, or biblical or
        // non-biblical references), in order to prevent any potential
        // overlap (although this is unexpected).
        css.classQuery(
          cls.BULLET,
          cls.ANNOTATION,
          cls.DIALECT,
          cls.REFERENCE,
          cls.BIBLE
        )
      );
    });
  });
}

/**
 * DAN_OVERRIDE defines special Book names used by Crum to refer to chapters in
 * the Book of Daniel.
 * - 'Su' refers to the chapter that St. Shenouda refers to as A.
 * - 'Bel' refers to the chapter that St. Shenouda refers to as C.
 */
const DAN_OVERRIDE: Record<string, { chapter: string; name: string }> = {
  Su: { chapter: 'a', name: 'Susanna' },
  Bel: { chapter: 'c', name: 'Bel' },
};

/**
 * NOTE: For the Bible abbreviation-to-id mapping, we opted for generating a
 * code file that defines the mapping. We used to populate the mapping in a
 * JSON, but this had to be retrieved with an async fetch. We prefer to `await`
 * (rather than `void`) promises as much as possible, and this would've
 * complicated things:
 * - Many dependent functions would've had to be made async in order to support
 *   an `await` operator.
 * - Our Anki bundler didn't support a top-level await for the IIFE[1] target,
 *   and this would've added a further complication.
 * Use of a code file makes things simpler, and it's not particularly painful to
 * maintain.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Glossary/IIFE
 *
 * @param root
 *
 */
export function handleWikiBible(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((el) => {
    html.replaceText(
      el,
      BIBLE_RE,
      (match: RegExpExecArray): (Node | string)[] | null => {
        const fullText: string = match[0];
        let [bookAbbreviation, chapter, verse] = [match[1], match[2], match[3]];
        if (!bookAbbreviation) {
          // NOTE: This is not expected, because the book abbreviation is a
          // non-optional piece of the regex.
          return null;
        }
        const danOverride = DAN_OVERRIDE[bookAbbreviation];
        if (danOverride) {
          // Given that this special book contains one chapter, the book
          // abbreviation is followed by the verse number only (there is no
          // chapter number).
          bookAbbreviation = 'Dan';
          verse = chapter;
          chapter = danOverride.chapter;
        }
        if (!bookAbbreviation || !chapter || !verse) {
          return null;
        }
        const book: { name: string; path: string } | undefined =
          bible.MAPPING[bookAbbreviation];
        if (!book) {
          return null;
        }
        const basename = `${paths.BIBLE}/${book.path}_${chapter}.html`;
        const url = `${basename}#v${verse}`;
        const link: HTMLAnchorElement = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.classList.add(ccls.HOVER_LINK, cls.BIBLE);
        link.textContent = fullText;
        drop.addHoverDroppable(link, danOverride?.name ?? book.name);
        return [link];
      },
      // Exclude all Wiki abbreviations to avoid overlap.
      // This is not expected to occur, but we add this check for defensiveness.
      css.classQuery(cls.ANNOTATION, cls.DIALECT, cls.REFERENCE, cls.BIBLE)
    );
  });
}

/**
 *
 * @param root
 */
export function handleWikiReferences(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((el: Element): void => {
    REFERENCE_RES.forEach((regex: RegExp): void => {
      html.replaceText(
        el,
        regex,
        (match: RegExpExecArray): (Node | string)[] | null => {
          const form: string = orth.normalize(match[0]);
          const source: ref.Source | undefined = ref.MAPPING[form];
          if (!source) {
            return null;
          }
          const span: HTMLSpanElement = document.createElement('span');
          span.textContent = form;
          drop.addHoverDroppable(span, source.name);
          span.classList.add(cls.REFERENCE);
          return [span];
        },
        // Exclude all Wiki abbreviations to avoid overlap.
        css.classQuery(
          cls.BULLET,
          cls.ANNOTATION,
          cls.DIALECT,
          cls.REFERENCE,
          cls.BIBLE
        )
      );
    });
  });
}

/**
 * Log warnings for all capital letters in the Wiki text that haven't been
 * marked.
 * In Crum's text, Capital letters are mainly used for abbreviations of
 * dialects, and biblical and non-biblical references—all of which we try to
 * detect. An unmarked text containing a capital letter may therefore be an
 * abbreviation that we failed to parse.
 * This method yields a lot of false positives, but we retain it in the meantime
 * while we sharpen our parser.
 *
 * TODO: (#419) Delete this function once your logic is more mature.
 *
 * @param root
 */
export function warnPotentiallyMissingReferences(root: HTMLElement): void {
  const query: string = css.classQuery(
    cls.BULLET,
    cls.ANNOTATION,
    cls.DIALECT,
    cls.REFERENCE,
    cls.BIBLE
  );

  root.querySelectorAll(`.${cls.WIKI}`).forEach((elem): void => {
    const walker: TreeWalker = document.createTreeWalker(
      elem,
      NodeFilter.SHOW_TEXT,
      (node: Node): number => {
        if (!node.nodeValue) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.parentElement?.closest(query)) {
          // This node is excluded.
          return NodeFilter.FILTER_REJECT;
        }
        if (!/[A-Z]/gu.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    );

    while (walker.nextNode()) {
      const text: Text = walker.currentNode as Text;
      // Find all words containing an upper-case letter.
      const words: string[] =
        text.nodeValue?.match(/(?=\p{L}*\p{Lu})[\p{L}\p{M}]+/gu) ?? [];
      logger.warn(
        'Possibly unmarked abbreviations:',
        ...words
          // Insert a comma after each word.
          .flatMap((entry: string, index: number): string[] =>
            index < words.length - 1 ? [entry, ','] : [entry]
          ),
        'in',
        text.nodeValue
      );
    }
  });
}
