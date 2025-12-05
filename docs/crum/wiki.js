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
import * as white from './white.js';
import * as dev from '../dev.js';
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
 *
 * There is a whole lot of regex searches that would be executed against
 * candidate tags, so it may be a good idea to exclude as many subtrees as
 * possible.
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
  cls.ANNOTATION,
  // Glosses definitely have no abbreviations. Exclude for protectiveness.
  cls.GLOSS,
  // Processing Greek and Coptic text doesn't pose any risk of collision, but
  // we exclude them to slightly speed up the code.
  cls.GREEK,
  cls.COPTIC
);
/**
 * BIBLE_RE defines the regex used to catch Bible references.
 * A Bible book abbreviation starts with a capital letter followed by one
 * or more small letters. Optionally, the abbreviation may contain a book
 * number, with 4 being the maximum. Epistle of Jeremiah is an exception, so we
 * give it special handling.
 *
 * Some books, such as the Book of Esther, have special chapters called A, C, D,
 * and F. This is why we allow the chapter number to be one of those characters.
 * In some cases, only one number follows the book name, so we allow one of the
 * two numbers to be omitted.
 *
 * In a singleton known occurrence (in ⲁⲙⲟⲩ – 442), the book abbreviation was
 * followed by a period, so we account for that. Though we only pick up the
 * period if a chapter number is present.
 *
 * In another singleton occurrence (in ⲁⲥⲕ – 503), the chapter and verse numbers
 * are parenthesized, so we account for that.
 *
 * NOTE: It's important to perform the Bible search over two iterations, one
 * for abbreviations without a preceding digits, and one for abbreviations with
 * a digit.
 * Consider the following text from 2531:
 *    In 1 Cor 4 13
 * A combined regex would capture the matches "In 1" and "Cor 4 13", failing to
 * correctly capture the reference "1 Cor 4 13". But doing it over two
 * iterations will result in this reference being captured in the second
 * iteration.
 */
const NUMS = '(\\d+|A|C|D|F)(?: (\\d+))?';
// Match "NUMS" OR "(NUMS)"
// NOTE: This creates two sets of capture groups.
const CHAPTER_VERSE = `(?:\\.? (?:${NUMS}|\\(${NUMS}\\)))?`;
export const BIBLE_RES = [
  new RegExp(str.bounded(`(EpJer|[A-Z][a-z]+)${CHAPTER_VERSE}`), 'gu'),
  new RegExp(str.bounded(`([1-4] [A-Z][a-z]+)${CHAPTER_VERSE}`), 'gu'),
];
export const ANNOTATION_RES = [
  // Two-word annotation, and special cases:
  new RegExp(
    str.bounded(['&c', '[a-zA-Z0-9]+ [a-zA-Z]+'].join('|'), true),
    'gu'
  ),
  // Single-word annotation and special cases:
  new RegExp([str.bounded('[a-zA-Z]+'), '\\?', '†', 'ⲛ̅ⲉ̅'].join('|'), 'gu'),
];
export const PAGE_RE = new RegExp(str.bounded('p ([0-9]+)'));
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
//     - A sequence of digits, optionally preceded by an apostrophe or followed
//       by an asterisk.
//     - A single Latin letter.
//     This was constructed based on manual observation, and could change in the
//     future.
//     This implies that references and suffixes could look similar. A single
//     uppercase Latin letter could be a reference abbreviation or a suffix. We
//     assume that, if it occurs after a reference abbreviation, then it's
//     likely a suffix.
export const SUFFIX = new RegExp(
  `^(?: (?:'?[0-9]+\\*?|[a-zA-Z§]))+${str.WORD_END.source}`,
  'u'
);
export const COMMA_SUFFIX = new RegExp(
  `^(?:,(?: (?:'?[0-9]+\\*?|[a-zA-Z§]))+)+${str.WORD_END.source}`,
  'u'
);
const LETTER = /[a-zA-Z\p{M}&]/u;
const SPECIAL_CASES = [
  // The following entries have more than 3 words:
  'Imp Russ Ar S',
  'Inst franç Epiph De Gemm', // Also a special character (ç)!
  'Lect Instit Cath Paris',
  'Mart Viktor ed Lemm',
  'Spg Aeg u Gr Eigennamen',
  // The entries below have special characters, such as periods, apostrophes,
  // dashes, or digits:
  // NOTE: For some abbreviations, we're forced to mark a portion of the
  // abbreviation as optional when it occurs inside an <i> tag, because the
  // first part often occurs on its own in a node.
  'Almk 1',
  'Almk 2',
  'Berl\\.(?: Wörterb)?',
  'Encycl\\. Bibl\\.',
  'Epiphan\\.( De Gemm\\.)?',
  'Erman-Lange Pap\\. Lansing',
  'GMaspero Musée Eg\\.',
  'GMaspero Musée Ég\\.',
  'Mani 1',
  'Mani 2',
  'Masp\\.',
  'Mich 550',
  "O'Leary ?(?:H|The?)",
  "Samannûdi's Scala",
  'Bodl\\(P\\)',
  'Bodl \\(P\\)',
];
export const REFERENCE_RES = [
  // Special cases, and three-word reference abbreviations:
  new RegExp(
    str.bounded(
      [
        ...SPECIAL_CASES,
        `[A-Z]${LETTER.source}* ${LETTER.source}+ ${LETTER.source}+`,
      ].join('|'),
      true
    ),
    'gu'
  ),
  // Two-word reference abbreviations:
  new RegExp(str.bounded(`[A-Z]${LETTER.source}* ${LETTER.source}+`), 'gu'),
  // One-word reference abbreviations:
  new RegExp(str.bounded(`[A-Z]${LETTER.source}*`), 'gu'),
];
/**
 * Handle all Crum elements.
 * @param root
 */
export function handle(root) {
  root.querySelectorAll(`.${cls.WIKI}`).forEach((elem) => {
    const startText = dev.play(() => drop.noTipTextContent(elem));
    // Bible abbreviations are not expected to collide with other
    // abbreviations. We do them early to move them out of the way.
    handleBible(elem);
    // Some annotation abbreviations (e.g. MS for manuscript, MSS for
    // manuscripts, and ostr for ostracon) are parts of some reference
    // abbreviations. So references must be processed prior to annotations,
    // and annotations must exclude pieces of text that have been marked as
    // references.
    handleReferences(elem);
    // NOTE: We search for occurrences of:
    //   <reference>, <suffix>, <suffix>, ...
    // We do this after all references are detected to avoid mistakenly
    // interpreting a reference as a suffix.
    // For example, consider the following piece of text[1]:
    //   P 44 66, K 179
    // If the first run were to consider suffixes after commas, we may be
    // tempted to interpret "K 179" as a second suffix for the P reference.
    // However, processing all references first guarantees that this K
    // references gets caught, thus it won't be mistaken for a suffix of the P
    // reference.
    //
    // [1] https://remnqymi.com/crum/510.html#:~:text=P%2044%2066,%20K%20179
    handleCommasAfterReferences(elem);
    handleAnnotations(elem);
    handlePages(elem);
    handleCorrigenda(elem);
    handleSemicolons(elem);
    white.warnPotentiallyMissingReferences(elem, ABBREVIATION_EXCLUDE);
    dev.play(() => {
      const endText = drop.noTipTextContent(elem);
      // This handler should only add tooltips without modifying text content
      // at all. Verify that the text content hasn't changed.
      log.ensure(
        endText === startText,
        'Final text differs from original text! Original:',
        startText,
        'Final:',
        endText
      );
    });
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
      (match, _r, _n, node) => {
        const form = match[0];
        const annot = ann.MAPPING[form];
        if (!annot) {
          return {};
        }
        if (annot.noItalics && node.parentElement?.closest('i')) {
          // This annotation can't show in italicized text, and this node is
          // italicized.
          return {};
        }
        const span = document.createElement('span');
        span.textContent = form;
        drop.addDroppable(span, 'hover', 'below', annot.fullForm);
        span.classList.add(cls.ANNOTATION);
        return { replacement: span };
      },
      // Exclude all Wiki abbreviations to avoid overlap.
      ABBREVIATION_EXCLUDE
    );
  });
}
/**
 * Insert hyperlinks for page references in the text.
 *
 * @param root
 */
export function handlePages(root) {
  html.replaceText(
    root,
    PAGE_RE,
    (match, remainder, nextSibling) => {
      // A page number has the ormat 'p [0-9]+ [ab]?'. The regex matches the
      // first two parts (the letter "p" and the page number). The column number
      // lives in an <i> tag, which should be the next sibling.
      // However, we only inspect it if the remainder of the current string is
      // a single space character that sits between the page number and the
      // column name.
      const col = remainder === ' ' ? (nextSibling?.textContent ?? '') : '';
      const a = document.createElement('a');
      a.href = paths.crumScan(`${match[1]}${col}`);
      a.target = '_blank';
      a.textContent = match[0];
      if (col && nextSibling) {
        // We actually got the column from the next sibling.
        a.append(' ', nextSibling);
        // Reset the remainder. It was a single space character, but we've
        // just added a corresponding character to the constructed anchor.
        remainder = '';
      }
      return { replacement: a, remainder };
    },
    // Exclude all Wiki abbreviations to avoid overlap.
    ABBREVIATION_EXCLUDE
  );
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
/* eslint-disable complexity */
/**
 *
 * @param match
 * @param remainder
 * @returns
 */
function parseBibleCitation(match, remainder) {
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
  // "Is" and "He" are both English words that often occur in the text. We
  // account for the possibility that this match is a false positive.
  // NOTE: This heuristic is based on known examples (#524), but other cases
  // might turn up in the text that violate these rules.
  if (
    !chapter &&
    !verse &&
    ['Is', 'He'].includes(bookAbbreviation) &&
    remainder.startsWith(' ') &&
    remainder[1]?.match(/[a-z?]/i)
  ) {
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
/* eslint-enable complexity */
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
 *
 *
 * [1] https://developer.mozilla.org/en-US/docs/Glossary/IIFE
 *
 * TODO: (#633) Handle commas after biblical references as well.
 *
 * @param root
 *
 */
export function handleBible(root) {
  BIBLE_RES.forEach((regex) => {
    html.replaceText(
      root,
      regex,
      (match, remainder) => {
        const result = parseBibleCitation(match, remainder);
        if (!result) {
          return {};
        }
        const link = document.createElement('a');
        link.href = result.url;
        link.target = '_blank';
        link.classList.add(ccls.HOVER_LINK, cls.BIBLE);
        link.textContent = match[0];
        drop.addDroppable(link, 'hover', 'below', result.name);
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
  });
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
  let source;
  // Initialize the span.
  const span = document.createElement('span');
  span.classList.add(cls.REFERENCE);
  // Sometimes, part of the abbreviation lives inside the next sibling.
  // Notice that, since we want prioritize longer abbreviations, we attempt to
  // parse a reference obtained by combining the match with the next <i> tag,
  // before attempting to parse a reference from the match alone.
  if (
    !suffix && // There is no suffix text following the abbreviation.
    remainder === ' ' && // The remaining part in the text node is just a space.
    nextSibling?.nodeName === 'I' && // The next sibling is an idiomatic element.
    nextSibling.textContent && // The next node also has text.
    // The text obtained from combining this node and the text represents a
    // source abbreviation.
    (source = ref.MAPPING[`${match[0]} ${nextSibling.textContent}`])
  ) {
    // Success! The text obtained by combining the match and the next sibling is
    // a reference abbreviation.
    // Save a reference to the sibling's sibling, before we move the sibling and
    // we can no longer access its sibling.
    const nextNext = nextSibling.nextSibling;
    // Populate the span content.
    span.append(match[0], ' ', nextSibling);
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
  // If the above didn't succeed, try to parse a reference from the match alone.
  if (!source) {
    if ((source = ref.MAPPING[match[0]])) {
      span.append(match[0]);
    }
  }
  if (!source) {
    // Still no source found! Return!
    return {};
  }
  // Add the suffix as a child.
  if (suffix) {
    span.append(parseSuffix(suffix, nextSibling /* candidate superscript  */));
  }
  // Add a hover-invoked tooltip, if present.
  const tooltip = source.tooltip();
  if (tooltip?.length) {
    drop.addDroppable(span, 'hover', 'below', ...tooltip);
  }
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
// On a corrigendum element, the page number lives in a `data-page` attribute.
const DATA_PAGE = 'page';
/**
 *
 * @param root
 */
export function handleCorrigenda(root) {
  root.querySelectorAll(`.${cls.CORRIGENDUM}`).forEach((elem) => {
    const i = document.createElement('i');
    i.append('Additions and Corrections');
    drop.addDroppable(
      elem,
      'hover',
      'above',
      'From ',
      i,
      // TODO: (#427) Add a link to the page instead of simply appending it to
      // the text. And do not remove the terminating column number ('a' or
      // 'b').
      ` (${elem.dataset[DATA_PAGE].replace(/[ab]$/, '')})`
    );
  });
}
/**
 *
 * @param root
 */
export function handleSemicolons(root) {
  html.replaceText(
    root,
    /;/,
    () => {
      const span = document.createElement('span');
      span.classList.add(cls.SEMICOLON);
      span.textContent = ';';
      return { replacement: span };
    },
    // Maybe we should simply exclude tooltips (`drop.CLS.DROPPABLE`)?
    ABBREVIATION_EXCLUDE
  );
}
/**
 *
 * @param root
 */
export function handleCommasAfterReferences(root) {
  root.querySelectorAll(`.${cls.REFERENCE}`).forEach((reference) => {
    const nextSibling = reference.nextSibling;
    if (!nextSibling) {
      return;
    }
    if (reference.nextSibling?.nodeType !== Node.TEXT_NODE) {
      return;
    }
    const text = nextSibling.nodeValue;
    if (!text) {
      return;
    }
    const match = COMMA_SUFFIX.exec(text);
    if (!match) {
      return;
    }
    nextSibling.nodeValue = text.slice(match[0].length);
    // TODO: (#0) The current flow groups the first suffix (if present) under
    // one <span class="suffix"> tag, and all other comma-separated suffixes
    // under a second tag. For uniformity, we should have each separate suffix
    // in a separate tag.
    // TODO: (#633) The `parseSuffix` function considers the possibility that
    // our match has following <sup> element that is part of the suffix. Right
    // now, our code doesn't account for the possibility that such a
    // superscript is followed by a comma that is followed by more suffixes.
    const suffix = parseSuffix(
      match[0],
      nextSibling.nodeValue ? null : nextSibling.nextSibling
    );
    reference.append(suffix);
  });
}
