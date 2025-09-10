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
import * as drop from '../dropdown.js';

const BIBLE_RE = /(\b(?:[123]\s)?[a-zA-Z]+)(?:\s+(\d+))(?:\s+(\d+))?\b/gu;
const TWO_WORD_ANNOTATION_RE = /\b[a-zA-Z]+\s+[a-zA-Z]+\b/gu;
const ONE_WORD_ANNOTATION_RE = /\b[a-zA-Z]+\b/gu;

const COPTIC_RE = /[\p{Script=Coptic}\p{Mark}]+/gu;
const GREEK_RE = /[\p{Script=Greek}\p{Mark}]+/gu;
const ENGLISH_RE = /[\p{Script=Latin}\p{Mark}]+/gu;

/**
 *
 * @param elem
 * @param highlighter
 */
export function handleAll(
  elem: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  handleCategories(elem);
  handleRootType(elem);
  handleCrumPage(elem);
  handleCrumPageExternal(elem);
  handleDawoudPageExternal(elem);
  handleDawoudPageImg(elem);
  handleCrumPageImg(elem);
  handleExplanatory(elem);
  handleDawoudPage(elem);
  handleDrvKey(elem);
  handleExplanatoryKey(elem);
  handleSisterKey(elem);
  handleSisterView(elem);
  handleDialect(elem, highlighter);
  handleDeveloper(elem, highlighter);
  insertCrumAbbreviationsLink();
  handleAnkiNavigation(elem);
  addCopticLookups(elem);
  addGreekLookups(elem);
  addEnglishLookups(elem);
  handleWikiDialects(elem);
  handleWikiBible(elem);
  handleWikiAnnotations(elem);
}

/**
 *
 * @param elem
 */
export function handleCategories(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.CATEGORIES}`).forEach((el) => {
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
 * @param elem
 */
export function handleRootType(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.ROOT_TYPE}`).forEach((el) => {
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
 * @param elem
 */
export function handleCrumPage(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerText)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPageExternal(elem: HTMLElement): void {
  elem
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
 * @param elem
 */
export function handleDawoudPageExternal(elem: HTMLElement): void {
  elem
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
 * @param elem
 */
export function handleDawoudPageImg(elem: HTMLElement): void {
  elem
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
 * @param elem
 */
export function handleCrumPageImg(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${img.getAttribute('alt')!}`);
    });
  });
}

/**
 *
 * @param elem
 */
export function handleExplanatory(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY}`).forEach((el) => {
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
 * @param elem
 */
export function handleDawoudPage(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerText)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleDrvKey(elem: HTMLElement): void {
  elem
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
 * @param elem
 */
export function handleExplanatoryKey(elem: HTMLElement): void {
  elem
    .querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY_KEY}`)
    .forEach((el) => {
      el.classList.add(ccls.HOVER_LINK);
      html.makeSpanLinkToAnchor(el, `#explanatory${el.innerText}`);
    });
}

/**
 *
 * @param elem
 */
export function handleSisterKey(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerText}`);
  });
}

/**
 *
 * @param elem
 */
export function handleSisterView(elem: HTMLElement): void {
  elem
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
 * @param elem
 * @param highlighter
 */
export function handleDialect(
  elem: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.DIALECT}`).forEach((el) => {
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
 * @param elem
 * @param highlighter
 */
export function handleDeveloper(
  elem: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  elem
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
 * @param elem
 */
export function handleAnkiNavigation(elem: HTMLElement): void {
  if (!iam.amI('anki')) return;
  elem.querySelectorAll<HTMLElement>(`.${cls.NAVIGATE}`).forEach((e) => {
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
 * @param elem
 */
export function addCopticLookups(elem: HTMLElement): void {
  html.linkifyText(
    elem,
    COPTIC_RE,
    (match: RegExpExecArray) => paths.LOOKUP_URL_PREFIX + match[0],
    [ccls.HOVER_LINK],
    [cls.TYPE, cls.WIKI]
  );
}

/**
 *
 * @param elem
 */
export function addGreekLookups(elem: HTMLElement): void {
  html.linkifyText(
    elem,
    GREEK_RE,
    (match: RegExpExecArray) => paths.GREEK_DICT_PREFIX + match[0],
    [ccls.LINK, cls.LIGHT]
  );
}

/**
 *
 * @param elem
 */
export function addEnglishLookups(elem: HTMLElement): void {
  elem.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
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
 * @param elem
 */
export function handleWikiDialects(elem: HTMLElement): void {
  elem
    .querySelectorAll(`.${cls.WIKI} .${cls.DIALECT}`)
    .forEach((el: Element): void => {
      drop.addHoverDroppable(el, d.DIALECTS[el.textContent as d.DIALECT].name);
    });
}

/**
 *
 * @param elem
 */
export function handleWikiAnnotations(elem: HTMLElement): void {
  elem.querySelectorAll(`.${cls.WIKI}`).forEach((el: Element): void => {
    [TWO_WORD_ANNOTATION_RE, ONE_WORD_ANNOTATION_RE].forEach(
      (regex: RegExp): void => {
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
          // <b> tags are used for iterator bullet (a., b., c., ...; I, II, II,
          // ...). We want to skip those.
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
          `b, ${css.classQuery(cls.ANNOTATION, cls.DIALECT, cls.REFERENCE, cls.BIBLE)}`
        );
      }
    );
  });
}

/**
 *
 * TODO: (#419) Some biblical references do not have a verse number. (Example:
 * ⲁⲃⲁϭⲏⲉⲓⲛ[1] cites "Ap 4" without a verse number.) Those should bear a
 * hyperlink to the chapter file.
 * [1]https://remnqymi.com/crum/97.html
 *
 * TODO: (#419) It appears that, for one-chapter books, Crum might have
 * omitted the chapter number! (Example: ⲛⲟϭ[1] cites "Philem 9".)
 * Handle this corner case!
 * [1] https://remnqymi.com/crum/88.html
 *
 * TODO: (#419) Omit hyperlinks for nonexistent chapters.
 *
 * NOTE: The three issues above should likely be worked on together! If you see
 * a book abbreviation followed by just one number, how do you know if it's a
 * chapter or a verse number?
 *
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
 * @param elem
 *
 */
export function handleWikiBible(elem: HTMLElement): void {
  elem.querySelectorAll(`.${cls.WIKI}`).forEach((el) => {
    html.replaceText(
      el,
      BIBLE_RE,
      (match: RegExpExecArray): (Node | string)[] | null => {
        const fullText: string = match[0];
        let [bookAbbreviation, chapter, verse] = [match[1], match[2], match[3]];
        let nameOverride: string | undefined = undefined;
        if (bookAbbreviation === 'Su') {
          // The Book of Susanna needs special handling. This is because it's
          // treated as a separate book by Crum, but it's just a chapter in
          // Daniel in the Bible index.
          // Given that it only contains one chapter, the book abbreviation
          // is followed by the verse number only (there is no chapter number).
          bookAbbreviation = 'Dan';
          verse = chapter;
          chapter = 'a';
          nameOverride = 'Susanna';
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
        link.classList.add(ccls.HOVER_LINK, cls.BIBLE);
        link.textContent = fullText;
        drop.addHoverDroppable(link, nameOverride ?? book.name);
        return [link];
      },
      // Exclude all Wiki abbreviations to avoid overlap.
      // This is not expected to occur, but we add this check for defensiveness.
      css.classQuery(cls.ANNOTATION, cls.DIALECT, cls.REFERENCE, cls.BIBLE)
    );
  });
}
