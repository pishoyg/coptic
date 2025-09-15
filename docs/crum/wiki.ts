/**
 * Package wiki defines Crum Wiki handlers.
 */

import * as html from '../html.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as d from './dialect.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
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
const ABBREVIATION_EXCLUDE: string = css.classQuery(
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
 * number, with 4 being the maximum. Epistle of Jeremiah is an exception, so we
 * give it special handling.
 * Some books, such as the Book of Esther, have special chapters called A, C, D,
 * and F. This is why we allow the chapter number to be one of those characters.
 * In some cases, only one number follows the book name, so we allow one of the
 * two numbers to be omitted.
 */
const BIBLE_RE =
  /(\b(?:[1-4]\s)?[A-Z][a-z]+|EpJer)(?:\s(\d+|A|C|D|F)(?:\s(\d+))?)?\b/gu;

const ANNOTATION_RES: RegExp[] = [
  /\b[a-zA-Z]+\s[a-zA-Z]+\b/gu, // Two-word annotation.
  /\?|†|ⲛ̅ⲉ̅|\b[a-zA-Z]+\b/gu, // One-word annotation.
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
const REFERENCE_RES: RegExp[] = [
  /\bImp Russ Ar S|O'Leary\s?H|O'Leary\s?The?|[a-zA-Z\p{M}&]+\s[a-zA-Z\p{M}&]+\s[a-zA-Z\p{M}&]+\b/gu,
  /\b[a-zA-Z\p{M}&]+\s[a-zA-Z\p{M}&]+\b/gu,
  /\b[a-zA-Z\p{M}&]+\b/gu,
];

/**
 * Ensure that all the given keys are matched by at least one of the regexes.
 * @param keys
 * @param regexes
 * @param strict
 */
function ensureKeysCovered(
  keys: string[],
  regexes: RegExp[],
  strict = true
): void {
  const undetectable: string[] = keys.filter(
    (key: string): boolean =>
      !regexes.some(
        // We need to ensure, not just that there is a match, but that the match
        // covers the entire key.
        (regex: RegExp): boolean => key.match(regex)?.[0].length === key.length
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
ensureKeysCovered(Object.keys(bible.MAPPING), [BIBLE_RE]);

/**
 * Handle all Crum elements.
 * @param root
 */
export function handle(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.WIKI}`)
    .forEach((elem: HTMLElement): void => {
      // Dialects are explicitly marked with a `dialect` class. There is no
      // risk of collision or overlap.
      handleDialects(elem);
      // Bible abbreviations are not expected to collide with other
      // abbreviations. We do them early to move them out of the way.
      handleBible(elem);
      // Some annotation abbreviations (e.g. MS for manuscript, MSS for
      // manuscripts, and ostr for ostracon) are parts of some reference
      // abbreviations. So references must be processed prior to annotations,
      // and annotations must exclude pieces of text that have been marked as
      // references.
      handleReferences(elem);
      handleAnnotations(elem);
      warnPotentiallyMissingReferences(elem);
    });
}

/**
 *
 * @param root
 */
export function handleDialects(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.DIALECT}`).forEach((el: Element): void => {
    drop.addHoverDroppable(el, d.DIALECTS[el.textContent as d.DIALECT].name);
  });
}

/**
 *
 * @param root
 */
export function handleAnnotations(root: HTMLElement): void {
  ANNOTATION_RES.forEach((regex: RegExp): void => {
    html.replaceText(
      root,
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
      // Exclude all Wiki abbreviations to avoid overlap.
      ABBREVIATION_EXCLUDE
    );
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
 *
 * @param match
 * @returns
 */
function parseBibleCitation(
  match: RegExpExecArray
): { url: string; name: string } | null {
  let [bookAbbreviation, chapter, verse] = [match[1], match[2], match[3]];
  if (!bookAbbreviation) {
    // NOTE: This is not expected, because the book abbreviation is a
    // non-optional piece of the regex. We have this check just to appease the
    // linter.
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
  const book: { name: string; path: string; numChapters: number } | undefined =
    bible.MAPPING[bookAbbreviation];
  if (!book) {
    return null;
  }
  const name: string = danOverride?.name ?? book.name;
  if (!chapter) {
    logger.ensure(
      !verse,
      'Given the regex, if there is no chapter, there is definitely no verse!'
    );
    // This points to the whole book.
    return { url: paths.bibleBookURL(book.path), name };
  }
  if (!verse && book.numChapters === 1) {
    // This is a one-chapter book. The chapter number is always 1. The given
    // number is actually the verse number.d
    verse = chapter;
    chapter = '1';
  }
  let url = `${paths.BIBLE}/${book.path}_${chapter}.html`;
  if (verse) {
    url = `${url}#v${verse}`;
  }
  return { url, name };
}

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
export function handleBible(root: HTMLElement): void {
  html.replaceText(
    root,
    BIBLE_RE,
    (match: RegExpExecArray): (Node | string)[] | null => {
      const result: { url: string; name: string } | null =
        parseBibleCitation(match);
      if (!result) {
        return null;
      }
      const link: HTMLAnchorElement = document.createElement('a');
      link.href = result.url;
      link.target = '_blank';
      link.classList.add(ccls.HOVER_LINK, cls.BIBLE);
      link.textContent = match[0];
      drop.addHoverDroppable(link, result.name);
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
}

/**
 *
 * @param root
 */
export function handleReferences(root: HTMLElement): void {
  REFERENCE_RES.forEach((regex: RegExp): void => {
    html.replaceText(
      root,
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
      // Exclude all Wiki abbreviations to avoid any overlap.
      ABBREVIATION_EXCLUDE
    );
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

  const walker: TreeWalker = document.createTreeWalker(
    root,
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
}
