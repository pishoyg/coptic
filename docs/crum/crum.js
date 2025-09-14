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
 * ABBREVIATION_EXCLUDE is used to avoid overlap between detected abbreviations,
 * and is crucial to the operation of our logic.
 *
 * It also allows us to correctly handle abbreviations that contain others.
 * For example, ‘p c’ contains ‘c’. Our logic words as follows:
 * - Search for two-word annotations during the first round. This would detect
 *   ‘p c’ and mark it as an annotation.
 * - In the next round, the ‘c’ inside ‘p c’ won't be detected, because it's
 *   contained within a span that is marked by an excluded class.
 *
 * The same is true for three-and two-word references, and for references that
 * contain annotations.
 *
 * Given the above, it is paramount to perform searches in the correct order.
 */
const ABBREVIATION_EXCLUDE = css.classQuery(
  // BULLET is not an abbreviation class, but it could collide with some
  // abbreviation, so we exclude it.
  cls.BULLET,
  cls.BIBLE,
  cls.REFERENCE,
  cls.DIALECT,
  cls.ANNOTATION
);
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
const ANNOTATION_RES = [
  /\b[a-zA-Z]+\s[a-zA-Z]+\b/gu, // Two-word annotation.
  /\b[a-zA-Z]+\b/gu, // One-word annotation.
];
// Pay attention to the following:
// - Diacritics:
//     Some reference abbreviations have diacritics. In order for the logic to
//     work correctly, both the pattern and the searchable text should be
//     normalized.
//     The references package should take care of normalizing the keys.
//     On our side, our logic below should normalize the text. Thus, our regex
//     can be constructed with that assumption in mind.
//     Additionally, our search logic should normalize the text that is to be
//     searched, so it can function correctly.
// - Four-word abbreviation:
//     We have a single four-word abbreviation:
//     - Imp Russ Ar S
//     We add it as a special case, instead of introducing another matching
//     step.
// - Apostrophe:
//     Two abbreviations have an apostrophe:
//     - O'Leary H
//     - O'Leary Th(e)
//     We give those special handling.
//     We can not simply allow an apostrophe as a valid abbreviation word
//     character, because it could corrupt matches in some cases where an
//     apostrophe that is not part of the abbreviation happens to immediately
//     follow the abbreviation.
//     Consider the following example from 512:
//     ```
//       Pliny's atramentum sutorium
//     ```
//     If apostrophes were allowed, our regex would match the word ‘Pliny's’ and
//     try to search for that, instead of simply matching ’Pliny’.
//
//     P.S. We could also solve the problem by adding more stages to the
//     matching process—with and without apostrophes. We could consider that if
//     apostrophes turn out to be more common (#522). For the time being, this
//     is simpler, and does the job.
// - Ampersand:
//     As of the time of writing, two abbreviations have an ampersand:
//     - ‘N&E’
//     - ‘J&C’
//     We therefore allow an ampersand as a valid abbreviation character. We
//     don't run the same risk of corrupting matches that we run with
//     apostrophes, so we adopt this simpler approach.
const REFERENCE_RES = [
  /\bImp Russ Ar S|O'Leary\s?H|O'Leary\s?The?|[a-zA-Z\p{M}&]+\s[a-zA-Z\p{M}&]+\s[a-zA-Z\p{M}&]+\b/gu,
  /\b[a-zA-Z\p{M}&]+\s[a-zA-Z\p{M}&]+\b/gu,
  /\b[a-zA-Z\p{M}&]+\b/gu,
];
const COPTIC_RE = /[\p{Script=Coptic}][\p{Script=Coptic}\p{Mark}]*/gu;
const GREEK_RE = /[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/gu;
const ENGLISH_RE = /[\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*/gu;
/**
 * Ensure that all the given keys are matched by at least one of the regexes.
 * @param keys
 * @param regexes
 * @param strict
 */
function ensureKeysCovered(keys, regexes, strict = true) {
  const undetectable = keys.filter(
    (key) =>
      !regexes.some(
        // We need to ensure, not just that there is a match, but that the match
        // covers the entire key.
        (regex) => key.match(regex)?.[0].length === key.length
      )
  );
  if (undetectable.length) {
    (strict ? logger.fatal : logger.warn)(
      undetectable,
      'are not detected by our regexes!'
    );
  }
}
ensureKeysCovered(Object.keys(ann.MAPPING), ANNOTATION_RES);
// TODO: (#419) Once all corner cases are handled, make reference verification
// strict.
ensureKeysCovered(Object.keys(ref.MAPPING), REFERENCE_RES, false);
// TODO: (#524) Build a regex that only matches book names (without a chapter or
// verse number), and add verification for your Bible regex.
/**
 * Handle all Crum elements.
 * @param root
 * @param highlighter
 */
export function handle(root, highlighter) {
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
  // Dialects are explicitly marked with a `dialect` class. There is no risk of
  // collision or overlap.
  handleWikiDialects(root);
  // Bible abbreviations are not expected to collide with other abbreviations.
  // We do them early to move them out of the way.
  handleWikiBible(root);
  // Some annotation abbreviations (e.g. MS for manuscript, MSS for manuscripts,
  // and ostr for ostracon) are parts of some reference abbreviations. So
  // references must be processed prior to annotations, and annotations must
  // exclude pieces of text that have been marked as references.
  handleWikiReferences(root);
  handleWikiAnnotations(root);
  warnPotentiallyMissingReferences(root);
}
/**
 *
 * @param root
 */
export function handleCategories(root) {
  root.querySelectorAll(`.${cls.CATEGORIES}`).forEach((el) => {
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
export function handleRootType(root) {
  root.querySelectorAll(`.${cls.ROOT_TYPE}`).forEach((el) => {
    const type = el.querySelector('b')?.innerText;
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
export function handleCrumPage(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerText)}`);
  });
}
/**
 *
 * @param root
 */
export function handleCrumPageExternal(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE_EXTERNAL}`).forEach((el) => {
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
export function handleDawoudPageExternal(root) {
  root.querySelectorAll(`.${cls.DAWOUD_PAGE_EXTERNAL}`).forEach((el) => {
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
export function handleDawoudPageImg(root) {
  root.querySelectorAll(`.${cls.DAWOUD_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0];
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.DAWOUD}?page=${img.getAttribute('alt')}`);
    });
  });
}
/**
 *
 * @param root
 */
export function handleCrumPageImg(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0];
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${img.getAttribute('alt')}`);
    });
  });
}
/**
 *
 * @param root
 */
export function handleExplanatory(root) {
  root.querySelectorAll(`.${cls.EXPLANATORY}`).forEach((el) => {
    const img = el.children[0];
    const alt = img.getAttribute('alt');
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
export function handleDawoudPage(root) {
  root.querySelectorAll(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerText)}`);
  });
}
/**
 *
 * @param root
 */
export function handleDrvKey(root) {
  root.querySelectorAll(`.${cls.DRV_KEY}`).forEach((key) => {
    // The key should have the link to the row containing the derivation
    // definition in our source-of-truth sheet.
    // Make the target _blank so it will open in a separate page.
    key.target = '_blank';
    // Create a second anchor pointing to this row in the HTML. This is useful
    // for users to share links to specific derivations.
    const frag = `#drv${key.innerText}`;
    const a = document.createElement('a');
    a.href = frag;
    a.classList.add(ccls.HOVER_LINK);
    a.innerText = '🔗';
    // Store the key parent.
    const parent = key.parentNode;
    // Create a span bearing the two anchors, with a space in between.
    const span = document.createElement('span');
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
      const url = new URL(window.location.href);
      url.hash = frag;
      browser.yank(url.toString());
    });
  });
}
/**
 *
 * @param root
 */
export function handleExplanatoryKey(root) {
  root.querySelectorAll(`.${cls.EXPLANATORY_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#explanatory${el.innerText}`);
  });
}
/**
 *
 * @param root
 */
export function handleSisterKey(root) {
  root.querySelectorAll(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerText}`);
  });
}
/**
 *
 * @param root
 */
export function handleSisterView(root) {
  root
    .querySelectorAll(css.classQuery(cls.SISTERS_TABLE, cls.INDEX_TABLE))
    .forEach((table) => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((el) => {
        const td = el.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          logger.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML = `<span class="${cls.SISTER_INDEX}">${counter.toString()}. </span>${td.innerHTML}`;
        counter++;
      });
    });
}
/**
 *
 * @param root
 * @param highlighter
 */
export function handleDialect(root, highlighter) {
  root.querySelectorAll(`.${cls.DIALECT}`).forEach((el) => {
    const code = el.innerText;
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
export function handleDeveloper(root, highlighter) {
  root.querySelectorAll(`.${header.CLS.DEVELOPER}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    el.addEventListener('click', highlighter.toggleDev.bind(highlighter));
  });
}
/**
 *
 */
export function insertCrumAbbreviationsLink() {
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
export function handleAnkiNavigation(root) {
  if (!iam.amI('anki')) return;
  root.querySelectorAll(`.${cls.NAVIGATE}`).forEach((e) => {
    if (e.tagName !== 'A' || !e.hasAttribute('href')) {
      logger.error(
        'This "navigate" element is not an <a> tag with an "href" property!',
        e
      );
      return;
    }
    e.setAttribute('href', `${paths.LEXICON}/${e.getAttribute('href')}`);
  });
}
/**
 *
 * @param root
 */
export function addCopticLookups(root) {
  html.linkifyText(
    root,
    COPTIC_RE,
    (match) => paths.LOOKUP_URL_PREFIX + match[0],
    [ccls.HOVER_LINK],
    [cls.TYPE, cls.WIKI]
  );
}
/**
 *
 * @param root
 */
export function addGreekLookups(root) {
  html.linkifyText(
    root,
    GREEK_RE,
    (match) => paths.GREEK_DICT_PREFIX + match[0],
    [ccls.LINK, cls.LIGHT]
  );
}
/**
 *
 * @param root
 */
export function addEnglishLookups(root) {
  root.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
    html.linkifyText(
      el,
      ENGLISH_RE,
      (match) => paths.LOOKUP_URL_PREFIX + match[0],
      [ccls.HOVER_LINK]
    );
  });
}
/**
 *
 * @param root
 */
export function handleWikiDialects(root) {
  root.querySelectorAll(`.${cls.WIKI} .${cls.DIALECT}`).forEach((el) => {
    drop.addHoverDroppable(el, d.DIALECTS[el.textContent].name);
  });
}
/**
 *
 * @param root
 */
export function handleWikiAnnotations(root) {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((el) => {
    ANNOTATION_RES.forEach((regex) => {
      html.replaceText(
        el,
        regex,
        (match) => {
          const form = match[0];
          const annot = ann.MAPPING[form];
          if (!annot) {
            return null;
          }
          const span = document.createElement('span');
          span.textContent = form;
          drop.addHoverDroppable(span, annot.fullForm);
          span.classList.add(cls.ANNOTATION);
          return [span];
        },
        // Exclude all Wiki abbreviations to avoid overlap.
        ABBREVIATION_EXCLUDE
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
const DAN_OVERRIDE = {
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
export function handleWikiBible(root) {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((el) => {
    html.replaceText(
      el,
      BIBLE_RE,
      (match) => {
        const fullText = match[0];
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
        const book = bible.MAPPING[bookAbbreviation];
        if (!book) {
          return null;
        }
        const basename = `${paths.BIBLE}/${book.path}_${chapter}.html`;
        const url = `${basename}#v${verse}`;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.classList.add(ccls.HOVER_LINK, cls.BIBLE);
        link.textContent = fullText;
        drop.addHoverDroppable(link, danOverride?.name ?? book.name);
        return [link];
      },
      // Exclude all Wiki abbreviations to avoid overlap.
      // This is not expected to occur, especially for Biblical references,
      // which have unique names and format that can not be conflated with
      // something else.
      // Also, it may be particularly useless for Biblical references because
      // they tend to be searched early on in the process, thus none of the
      // other abbreviation classes would be present at that stage anyway.
      // It makes sense for the following stages to exclude abbreviations added
      // in earlier stages, not the other way around.
      // But we add the check anyway for consistency.
      ABBREVIATION_EXCLUDE
    );
  });
}
/**
 *
 * @param root
 */
export function handleWikiReferences(root) {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((el) => {
    REFERENCE_RES.forEach((regex) => {
      html.replaceText(
        el,
        regex,
        (match) => {
          const form = orth.normalize(match[0]);
          const source = ref.MAPPING[form];
          if (!source) {
            return null;
          }
          const span = document.createElement('span');
          span.textContent = form;
          drop.addHoverDroppable(span, source.name);
          span.classList.add(cls.REFERENCE);
          return [span];
        },
        // Exclude all Wiki abbreviations to avoid any overlap.
        ABBREVIATION_EXCLUDE
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
export function warnPotentiallyMissingReferences(root) {
  const query = css.classQuery(
    cls.BULLET,
    cls.ANNOTATION,
    cls.DIALECT,
    cls.REFERENCE,
    cls.BIBLE
  );
  root.querySelectorAll(`.${cls.WIKI}`).forEach((elem) => {
    const walker = document.createTreeWalker(
      elem,
      NodeFilter.SHOW_TEXT,
      (node) => {
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
      const text = walker.currentNode;
      // Find all words containing an upper-case letter.
      const words =
        text.nodeValue?.match(/(?=\p{L}*\p{Lu})[\p{L}\p{M}]+/gu) ?? [];
      logger.warn(
        'Possibly unmarked abbreviations:',
        ...words
          // Insert a comma after each word.
          .flatMap((entry, index) =>
            index < words.length - 1 ? [entry, ','] : [entry]
          ),
        'in',
        text.nodeValue
      );
    }
  });
}
