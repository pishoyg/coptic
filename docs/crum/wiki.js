/**
 * Package wiki defines Crum Wiki handlers.
 */
import * as html from '../html.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as log from '../logger.js';
import * as bible from './bible.js';
import * as ann from './annotations.js';
import * as ref from './references.js';
import * as drop from '../dropdown.js';
import * as str from '../str.js';
/**
 * NOTE: All of the regexes below assume the following normalizations:
 * - HTML tree normalization[1], which allows us to use `\s` instead of `\s+`.
 * - NFD normalization[2], which allows us to use `\p{M}`.
 *
 * Additionally, we unicode-aware regex boundary expressions, because `\b`
 * doesn't fully support Unicode.
 *
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
 * - In the next round, the ‘c’ inside ‘p c’ won't be searched because it lives
 *   inside a node that is marked as an annotation, which is one of the excluded
 *   classes.
 *
 * The same is true for three- and two-word references, and for references that
 * contain annotations.
 *
 * Given the above, it is paramount to perform searches in the correct order in
 * order to ensure correctness.
 */
const ABBREVIATION_EXCLUDE = css.classQuery(
  // BULLET is not an abbreviation class, but it could collide with some
  // abbreviation, so we exclude it.
  cls.BULLET,
  cls.BIBLE,
  cls.REFERENCE,
  // Suffixes are, as of the time of writing, always included within references.
  // But we add them to the list for completion.
  cls.SUFFIX,
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
export const BIBLE_RE = new RegExp(
  str.bounded(
    '(EpJer|(?:[1-4]\\s)?[A-Z][a-z]+)(?:\\s(\\d+|A|C|D|F)(?:\\s(\\d+))?)?'
  ),
  'gu'
);
export const ANNOTATION_RES = [
  // Two-word annotation:
  new RegExp(str.bounded('[a-zA-Z]+\\s[a-zA-Z]+'), 'gu'),
  // Single-word annotation and special cases:
  new RegExp([str.bounded('[a-zA-Z]+'), '\\?', '†', 'ⲛ̅ⲉ̅'].join('|'), 'gu'),
];
// Pay attention to the following:
// - Reference abbreviations always start with a capital letter. This must be
//   enforced, in order to avoid errors.
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
// - Suffixes:
//     A suffix (which indicates a manuscript number, a shelf number, page
//     number, ...etc.) is the second capture group, and is common among all
//     regexes below.
//     It consists of any number of occurrences of a space character followed by
//     a "number". The "number", on the other hand, could be:
//     - A sequence of digits, optionally preceded by an apostrophe.
//     - A single Latin letter.
//     This was constructed based on manual observation, and could change in the
//     future.
//     This implies that references and suffixes could look similar. A single
//     uppercase Latin letter could be a reference abbreviation or a suffix. We
//     assume that, if it occurs after a reference abbreviation, then it's
//     likely a suffix.
export const SUFFIX = new RegExp(
  `^(?:\\s(?:'?[0-9]+|[a-zA-Z])${str.BOUNDARY_END.source})+`,
  'u'
);
const LETTER = /[a-zA-Z\p{M}&]/u;
const SPECIAL_CASES = [
  'Imp Russ Ar S', // This consists of 4 words!
  "O'Leary\\s?(?:H|The?)", // This has an apostrophe.
  'Berl\\. Wörterb', // This has a period.
  // The abbreviation usually occurs with ‘Wörterb’ occurring inside a <i> tag,
  // so we need to be able to match ‘Berl.’ on its own as well.
  'Berl\\.',
  // The following cases contain digits!
  'Mani 1',
  'Mani 2',
  'Almk 1',
  'Almk 2',
  'Mich 550',
];
export const REFERENCE_RES = [
  // Special cases, and three-word reference abbreviations:
  new RegExp(
    str.bounded(
      [
        ...SPECIAL_CASES,
        `[A-Z]${LETTER.source}*\\s${LETTER.source}+\\s${LETTER.source}+`,
      ].join('|'),
      true
    ),
    'gu'
  ),
  // Two-word reference abbreviations:
  new RegExp(str.bounded(`[A-Z]${LETTER.source}*\\s${LETTER.source}+`), 'gu'),
  // One-word reference abbreviations:
  new RegExp(str.bounded(`[A-Z]${LETTER.source}*`), 'gu'),
];
/**
 * Handle all Crum elements.
 * @param root
 */
export function handle(root) {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((elem) => {
    const startText = drop.noTipTextContent(elem);
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
    const endText = drop.noTipTextContent(elem);
    // This handler should only add tooltips without modifying text content at
    // all. Verify that the text content hasn't changed.
    log.check(
      endText === startText,
      'Final text differs from original text! Original:',
      startText,
      'Final:',
      endText
    );
  });
}
/**
 *
 * @param root
 */
export function handleAnnotations(root) {
  ANNOTATION_RES.forEach((regex) => {
    html.replaceText(
      root,
      regex,
      (match) => {
        const form = match[0];
        const annot = ann.MAPPING[form];
        if (!annot) {
          return {};
        }
        const span = document.createElement('span');
        span.textContent = form;
        drop.addDroppable(span, 'hover', annot.fullForm);
        span.classList.add(cls.ANNOTATION);
        return { replacement: span };
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
const DAN_OVERRIDE = {
  Su: { chapter: 'a', name: 'Susanna' },
  Bel: { chapter: 'c', name: 'Bel' },
};
/**
 *
 * @param match
 * @returns
 */
function parseBibleCitation(match) {
  let [bookAbbreviation, chapter, verse] = [match[1], match[2], match[3]];
  const danOverride = DAN_OVERRIDE[bookAbbreviation];
  if (danOverride) {
    // Given that this special book contains one chapter, the book
    // abbreviation is followed by the verse number only. This number would've
    // been mistakenly interpreted as the chapter number, but it's actually the
    // verse number.
    verse = chapter;
    chapter = danOverride.chapter;
    bookAbbreviation = 'Dan';
  }
  const book = bible.MAPPING[bookAbbreviation];
  if (!book) {
    // No book found! This match is not a Biblical reference.
    return null;
  }
  if (chapter && !verse && book.numChapters === 1) {
    // This is a one-chapter book. The chapter number is always 1. The number
    // immediately followed the book, which was interpreted as the chapter
    // number, is actually the verse number.
    verse = chapter;
    chapter = '1';
  }
  return {
    url: paths.bible(book.path, chapter, verse),
    name: danOverride?.name ?? book.name,
  };
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
export function handleBible(root) {
  html.replaceText(
    root,
    BIBLE_RE,
    (match) => {
      const result = parseBibleCitation(match);
      if (!result) {
        return {};
      }
      const link = document.createElement('a');
      link.href = result.url;
      link.target = '_blank';
      link.classList.add(ccls.HOVER_LINK, cls.BIBLE);
      link.textContent = match[0];
      drop.addDroppable(link, 'hover', result.name);
      return { replacement: link };
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
 * @param suffix
 * @param maybeSuperscript
 * @returns
 */
function parseSuffix(suffix, maybeSuperscript) {
  const span = document.createElement('span');
  span.classList.add(cls.SUFFIX);
  span.textContent = suffix;
  if (maybeSuperscript?.nodeName !== 'SUP') {
    // The node is not a superscript.
    return span;
  }
  // We need to capture the superscript's sibling before we move the
  // superscript, otherwise we wouldn't be able to access it after the move.
  const nextSibling = maybeSuperscript.nextSibling;
  span.append(maybeSuperscript);
  // Sometimes, there are even more numbers following the superscript.
  if (!nextSibling?.nodeValue) {
    return span;
  }
  const match = nextSibling.nodeValue.match(SUFFIX);
  if (!match) {
    return span;
  }
  span.append(match[0]);
  nextSibling.nodeValue = nextSibling.nodeValue.slice(match[0].length);
  return span;
}
// TODO: (#0) Simplify this method.
/* eslint-disable complexity */
/**
 *
 * @param match
 * @param remainder
 * @param nextSibling
 * @returns
 */
function replaceReference(match, remainder, nextSibling) {
  // Parse a suffix from the remainder. Update the remainder.
  let suffix = SUFFIX.exec(remainder)?.[0];
  remainder = remainder.slice(suffix?.length);
  // Try to find a source.
  let source = ref.MAPPING[match[0]];
  // Construct a tentative span.
  const span = document.createElement('span');
  span.classList.add(cls.REFERENCE);
  span.textContent = match[0];
  // Sometimes, part of the abbreviation lives inside the next sibling.
  if (
    !source && // We still haven't succeeded in parsing the source.
    !suffix && // There is no suffix text following the abbreviation.
    remainder === ' ' && // The remaining part in the text node is just a space.
    nextSibling?.nodeName === 'I' && // The next sibling is an idiomatic element.
    nextSibling.textContent && // The next node also has text.
    // The text obtained from combining this node and the text represents a
    // source abbreviation.
    (source = ref.MAPPING[`${match[0]} ${nextSibling.textContent}`])
  ) {
    // Success! The next sibling is actually part of the abbreviation.
    // Save a reference to the sibling's sibling, before we move the sibling and
    // we can no longer access its sibling.
    const nextNext = nextSibling.nextSibling;
    // Move the sibling to the reference span that you're constructing.
    span.append(' ', nextSibling);
    remainder = ''; // We have consumed the remainder.
    // Check if the sibling's sibling bears a suffix.
    if ((suffix = nextNext?.nodeValue?.match(SUFFIX)?.[0])) {
      // We can successfully retrieve a suffix from the node.
      nextNext.nodeValue = nextNext.nodeValue.slice(suffix.length);
      // If the suffix node has no text left, its sibling is a candidate
      // superscript.
      nextSibling = nextNext.nodeValue ? null : nextNext.nextSibling;
    }
  } else if (remainder) {
    // We pass the next sibling to the suffix parser, because it might be a
    // superscript.
    // We only do that if there is no remainder. Otherwise, such a remainder
    // would show between the suffix and the superscript.
    nextSibling = null;
  }
  if (!source) {
    // Still no source found! Return!
    return {};
  }
  // Add the suffix as a child.
  if (suffix) {
    span.append(parseSuffix(suffix, nextSibling /* candidate superscript  */));
  }
  // Add a hover-invoked tooltip.
  drop.addDroppable(span, 'hover', ...source.tooltip());
  return { replacement: span, remainder };
}
/* eslint-enable complexity */
/**
 *
 * @param root
 */
export function handleReferences(root) {
  REFERENCE_RES.forEach((regex) => {
    html.replaceText(
      root,
      regex,
      replaceReference,
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
export function warnPotentiallyMissingReferences(root) {
  const query = css.classQuery(
    cls.BULLET,
    cls.ANNOTATION,
    cls.DIALECT,
    cls.REFERENCE,
    cls.BIBLE
  );
  const walker = document.createTreeWalker(
    root,
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
    log.warn(
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
}
