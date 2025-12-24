/**
 * Package wiki defines Crum Wiki handlers.
 */
/* eslint-disable max-lines */

import * as html from '../html.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as cls from './cls.js';
import * as log from '../logger.js';
import * as bible from './bible.js';
import * as ann from './annotations.js';
import * as ref from './references.js';
import * as drop from '../dropdown.js';
import * as str from '../str.js';
import * as white from './white.js';
import * as dev from '../dev.js';
import * as scan from '../scan.js';

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
const ABBREVIATION_EXCLUDE: string = css.classQuery(
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
  // Greek and text doesn't pose any risk of collision, but
  // we exclude it to slightly speed up the code.
  // We do, however, process Coptic text for annotations, because the signs for
  // verb forms (prenominal, pronominal, and qualitative) are often marked as
  // Coptic.
  cls.GREEK
);

/**
 * BIBLE_RES defines the regex used to catch Bible references.
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
// CHAPTER_VERSE matches "NUMS" OR "(NUMS)".
// NOTE:
// 1. This creates two sets of capture groups.
// 2. This is a sticky regex.
const CHAPTER_VERSE = new RegExp(`\\.? (?:${NUMS}|\\(${NUMS}\\))`, 'uy');
export const BIBLE_RES: RegExp[] = [
  new RegExp(
    str.bounded(`(EpJer|[A-Z][a-z]+)(?:${CHAPTER_VERSE.source})?`),
    'gu'
  ),
  new RegExp(
    str.bounded(`([1-4] [A-Z][a-z]+)(?:${CHAPTER_VERSE.source})?`),
    'gu'
  ),
];
const BIBLE_FOLLOWUP = new RegExp(
  `^(?:, (${NUMS})${str.WORD_END.source}| \\((${NUMS})\\))`,
  'u'
);

export const ANNOTATION_RES: RegExp[] = [
  // Two-word annotation, and special cases:
  new RegExp(
    str.bounded(['&c', '[a-zA-Z0-9]+ [a-zA-Z]+'].join('|'), true),
    'gu'
  ),
  // Single-word annotation and special cases:
  // NOTE: Initially, the regex for annotations didn't include the dash
  // character. For an (as of yet) singleton occurrence of a singleton
  // annotation that has a dash (namely "post-posit" for "postpositive"), we
  // decided to include it. Watch for false negatives, and implement it
  // differently if needed.
  new RegExp(
    [str.bounded('[0-9a-zA-Z\\-]+'), '\\?', '†', 'ⲛ̅ⲉ̅'].join('|'),
    'gu'
  ),
];

export const PAGE_RE = new RegExp(str.bounded('p ([0-9]+)'));

// NOTE: The following docs are outdated.
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
const NUMBERS = [
  "'?[0-9]+[a-zA-Z]?\\*?(?:–[0-9]+)?",
  '§',
  // TODO: (#0) Consider adding tooltips for the suffixes below.
  'ro', // recto folio
  'vo', // verso folio
  'Ad', // Addenda
  'stele',
  '[a-zA-Z]\\.?',
];

const NUMBER = `(?:${NUMBERS.join('|')})`;
// Some suffix parts are parenthesized.
// The space before the parenthesis is optional.
const NUMBER_GROUP = `(?: ${NUMBER}| ?\\(${NUMBER}(?: ${NUMBER})*\\))`;

export const SUFFIX = new RegExp(
  `^\\.?${NUMBER_GROUP}+${str.WORD_END.source}`,
  'u'
);
export const REFERENCE_FOLLOWUP = new RegExp(
  `^(?:(?:,| =)${NUMBER_GROUP}+)+${str.WORD_END.source}`,
  'u'
);

const LETTER = /[a-zA-Z\p{M}&]/u;
const SPECIAL_CASES: string[] = [
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

export const REFERENCE_RES: RegExp[] = [
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
export function handle(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.WIKI}`)
    .forEach((elem: HTMLElement): void => {
      const startText: string | undefined = dev.play(() =>
        drop.noTipTextContent(elem)
      );

      // Bible abbreviations are not expected to collide with other
      // abbreviations. We do them early to move them out of the way.
      handleBible(elem);

      handleReferences(elem);

      handlePages(elem);

      // IB handling needs to follow handling of References, Bible, and Pages.
      handleIB(elem);

      // Comma handling need to follow IB handling, because some IB references
      // are followed by commas. Needless to say, it also needs to follow
      // reference handling.
      // This searches for occurrences of:
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
      // Discovered commas and suffixes are merged into the reference that
      // they follow.
      //
      // [1] https://remnqymi.com/crum/510.html#:~:text=P%2044%2066,%20K%20179
      handleCommasAfterReferences(elem);

      // Some annotation abbreviations (e.g. MS for manuscript, MSS for
      // manuscripts, and ostr for ostracon) are parts of some reference
      // abbreviations. So references must be processed prior to annotations,
      // and annotations must exclude pieces of text that have been marked as
      // references.
      handleAnnotations(elem);

      // Corrigenda handling has no interdependencies and no possibility of
      // collision.
      handleCorrigenda(elem);

      // Semicolon handling has no interdependencies and no possibility of
      // collision.
      handleSemicolons(elem);

      dev.play(() => {
        white.warnPotentiallyMissingReferences(elem, ABBREVIATION_EXCLUDE);

        const endText: string = drop.noTipTextContent(elem);
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
export function handleAnnotations(root: HTMLElement): void {
  ANNOTATION_RES.forEach((regex: RegExp): void => {
    html.replaceText(
      root,
      regex,
      (match: RegExpExecArray, node: Text, _): { replacement?: Node[] } => {
        const annot: ann.Annotation | undefined = ann.MAPPING[match[0]];
        if (!annot) {
          return {};
        }
        if (annot.noStyledParent && node.parentElement?.closest('i, sup')) {
          // This annotation can't show in italicized text, and this node is
          // italicized.
          return {};
        }
        const span: HTMLSpanElement = document.createElement('span');
        span.textContent = match[0];
        drop.addDroppable(span, [annot.fullForm]);
        span.classList.add(cls.ANNOTATION);
        return { replacement: [span] };
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
export function handlePages(root: HTMLElement): void {
  html.replaceText(
    root,
    PAGE_RE,
    (
      match: RegExpExecArray,
      node: Text,
      remainder: string
    ): { replacement?: Node[]; remainder?: string } => {
      // A page number has the format 'p [0-9]+ [ab]?'. The regex matches the
      // first two parts (the letter "p" and the page number). The column number
      // lives in an <i> tag, which should be the next sibling.
      // Between the numerical part and the <i> tag there is expected to be a
      // single space.
      const col: string | null | undefined = node.nextSibling?.textContent;
      if (
        remainder !== ' ' ||
        !node.nextSibling ||
        (col !== 'a' && col !== 'b')
      ) {
        // This doesn't match the expected format.
        return {};
      }
      const a = html.anchor(
        paths.crumScan(`${match[1]!}${col}`),
        true,
        match[0],
        ' ',
        node.nextSibling
      );
      a.classList.add(cls.PAGE);
      return { replacement: [a], remainder: '' };
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
const DAN_OVERRIDE: Record<string, string> = { Su: 'a', Bel: 'c' };

/**
 *
 */
class Citation {
  private static readonly DATA_BOOK = 'book';
  private static readonly DATA_CHAPTER = 'chapter';
  private static readonly DATA_VERSE = 'verse';

  /*
   * explicit tracks whether all numbers in this Citation are explicitly spelled
   * out in its raw representation.
   * All citations are initially explicit. Whenever a citation is updated with
   * folloupws:
   * 1. If all numbers are given, then the new citation is also explicit.
   * 2. If some numbers are retrieved from the followups and some inherited from
   *    the previous citation, then the citation is no longer explicit.
   */
  private explicit = true;
  /**
   *
   * @param raw
   * @param chapter
   * @param verse
   * @param book
   */
  public constructor(
    private raw: string,
    private chapter: string | undefined,
    private verse: string | undefined,
    private readonly book: bible.Book
  ) {
    if (this.chapter && !this.verse && this.book.numChapters === 1) {
      // This is a one-chapter book. The chapter number is always 1. The number
      // immediately followed the book, which was interpreted as the chapter
      // number, is actually the verse number.
      this.verse = this.chapter;
      this.chapter = '1';
      this.explicit = false;
    }
  }

  /**
   * Update the citation with new numbers. The book is the same.
   *
   * @param raw - Raw text containing the two numbers.
   * @param first - First number within the text.
   * @param second - (Optional) second number within the text.
   */
  public update(raw: string, first?: string, second?: string): void {
    this.raw = raw;

    if (!first) {
      // No numbers! Nothing to update!
      this.explicit = false; // Both numbers are inherited.
      return;
    }

    if (second) {
      this.explicit = true;
      // We got both numbers.
      this.chapter = first;
      this.verse = second;
      return;
    }

    // Only one number is given. Whether this number updates the chapter or
    // verse depends on whether the original citation had a verse or not.
    if (this.verse) {
      // Since we inherit the chapter number from the previous citation, this
      // citation is no longer explicit.
      this.explicit = false;
      this.verse = first;
      return;
    }

    this.explicit = true;
    this.chapter = first;
  }

  /**
   * @returns
   */
  public anchor(): HTMLAnchorElement {
    const a = html.anchor(
      paths.bible(this.book.path, this.chapter, this.verse),
      true,
      this.raw
    );
    a.classList.add(cls.BIBLE);
    a.dataset[Citation.DATA_BOOK] = this.book.abb;
    a.dataset[Citation.DATA_CHAPTER] = this.chapter ?? '';
    a.dataset[Citation.DATA_VERSE] = this.verse ?? '';
    // If this citation is explicit (all numbers are present in `raw`), then
    // including them in the tooltip would be redundant.
    // However, if some numbers are inherited, we include the numbers in the
    // tooltip for readability.
    drop.addDroppable(a, [this.explicit ? this.book.name : this.name()]);
    return a;
  }

  /**
   * @param node
   * @returns
   */
  public static fromAnchor(node: HTMLElement): Citation {
    return new Citation(
      // TODO: (#0) Consider saving the `raw` field as well, for completion.
      '',
      /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
      node.dataset[Citation.DATA_CHAPTER] || undefined,
      node.dataset[Citation.DATA_VERSE] || undefined,
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
      bible.MAPPING[node.dataset[Citation.DATA_BOOK]!]!
    );
  }

  /**
   * @returns
   */
  private name(): string {
    if (!this.chapter) {
      return this.book.name;
    }
    if (!this.verse) {
      return `${this.book.name} ${this.chapter}`;
    }
    return `${this.book.name} ${this.chapter}:${this.verse}`;
  }

  /**
   * Perform some checks to reduce the chances of false positives.
   * @returns
   */
  public valid(): boolean {
    if (
      this.chapter?.match(/[A-Z]/) &&
      !['Est', 'Esth', 'Dan'].includes(this.book.abb)
    ) {
      // Only Esther and Daniel have alphabetical chapter numbers.
      // TODO: (#524) Handle non-uniform references. Particularly, Jeremiah
      // 51 is composed of two subchapters (51A and 51B), and so is Psalms 115.
      // TODO: (#524) If a numeric chapter number is given, consider checking
      // whether it exceeds the known number of chapters of this book. Perhaps
      // your Bible index should list the chapter names rather than the chapter
      // count, given that the chapters don't simply form a sequence of
      // integers.
      return false;
    }

    return true;
  }
}

/**
 *
 * @param match
 * @param node
 * @param remainder
 * @returns
 */
function parseBibleCitation(
  match: RegExpExecArray,
  node: Text,
  remainder: string
): Citation | null {
  // Our regex puts the book abbreviation in the first match group. The chapter
  // and verse numbers are either second and third, or fourth and fifth.
  let [bookAbbreviation, chapter, verse] = [
    match[1]!,
    match[2] ?? match[4],
    match[3] ?? match[5],
  ];

  if (bookAbbreviation in DAN_OVERRIDE) {
    // Given that this special book contains one chapter, the book
    // abbreviation is followed by the verse number only. This number would've
    // been mistakenly interpreted as the chapter number, but it's actually the
    // verse number.
    verse = chapter;
    chapter = DAN_OVERRIDE[bookAbbreviation];
    bookAbbreviation = 'Dan';
  }

  const book: bible.Book | undefined = bible.MAPPING[bookAbbreviation];
  if (!book) {
    // No book found! This match is not a Biblical reference.
    return null;
  }

  // "Is" and "He" are both English words that often occur in the text. "Col" is
  // used in some non-biblical abbreviations (it stands for "College").
  // Currently, we process biblical citations before non-biblical ones, so at
  // the time this code executes, an occurrence of 'Col' is still unclaimed by
  // another reference, which means that our code would misinterpret it as a
  // biblical citation!
  //
  // We account for the possibility that this match is a false positive.
  // NOTE: This heuristic is based on known examples (#524), but other cases
  // might turn up in the text that violate these rules.
  if (
    !chapter &&
    !verse &&
    ['Is', 'He', 'Col'].includes(bookAbbreviation) &&
    remainder.startsWith(' ') &&
    (remainder[1] ?? node.nextSibling?.textContent)?.match(/\p{L}/u)
  ) {
    return null;
  }

  return new Citation(match[0], chapter, verse, book);
}

/**
 *
 * @param cit
 * @param remainder
 * @returns
 */
function parseBibleFollowups(
  cit: Citation,
  remainder: string
): { replacement: (Node | string)[]; remainder: string } {
  const replacement: (Node | string)[] = [];
  // Create anchors for any following citations in the remaining text.
  while (remainder) {
    const match: RegExpExecArray | null = BIBLE_FOLLOWUP.exec(remainder);
    if (!match) {
      break;
    }

    // Our regex contains 6 capture groups.
    // A. Captures 1, 2, and 3 capture the raw citation text, chapter number,
    //    and verse number, respectively.
    // B. Captures 4, 5, 6 capture the same thing, albeit in a different format.
    //
    // Either A or B should be present, but not both.
    // If A is present:
    // - Captures 1 and 2 must be defined. Capture 3 may or may not be defined.
    //   Captures 4, 5, and 6 (belonging to be) must be undefined.
    // If B is present, then 4 and 5 are guaranteed to be defined, 6 may or may
    // not be defined, while 1, 2, and 3 are undefined.
    const raw: string = (match[1] ?? match[4])!;
    cit.update(raw, match[2] ?? match[5], match[3] ?? match[6]);
    if (!cit.valid()) {
      // This citation is invalid.
      break;
    }

    // The part that of the remainder that is being replaced is `match[0]`.
    // Within `match[0]`, the `raw` text will be enriched, while the text before
    // and after `raw` will be passed as is.
    const rawIdx: number = match[0].indexOf(raw);
    replacement.push(match[0].slice(0, rawIdx));
    replacement.push(cit.anchor());
    replacement.push(match[0].slice(rawIdx + raw.length));

    remainder = remainder.slice(match[0].length);
  }
  return { replacement, remainder };
}

/**
 *
 * @param match
 * @param node
 * @param remainder
 * @returns
 */
function replaceBible(
  match: RegExpExecArray,
  node: Text,
  remainder: string
): { replacement?: (Node | string)[]; remainder?: string } {
  const cit: Citation | null = parseBibleCitation(match, node, remainder);
  if (!cit?.valid()) {
    return {};
  }

  const replacement: (Node | string)[] = [];
  // Create an anchor for the first citation.
  replacement.push(cit.anchor());

  // Parse following chapter / verse numbers.
  const followups = parseBibleFollowups(cit, remainder);

  return {
    replacement: [...replacement, ...followups.replacement],
    remainder: followups.remainder,
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
 *
 *
 * [1] https://developer.mozilla.org/en-US/docs/Glossary/IIFE
 *
 * @param root
 *
 */
export function handleBible(root: HTMLElement): void {
  BIBLE_RES.forEach((regex: RegExp): void => {
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
    html.replaceText(root, regex, replaceBible, ABBREVIATION_EXCLUDE);
  });
}

/**
 *
 * @param suffix
 * @param maybeSuperscript
 * @returns
 */
function parseSuffix(
  suffix: string,
  maybeSuperscript: ChildNode | null
): HTMLSpanElement {
  const span: HTMLSpanElement = document.createElement('span');
  span.classList.add(cls.SUFFIX);
  span.textContent = suffix;

  if (maybeSuperscript?.nodeName !== 'SUP') {
    // The node is not a superscript.
    return span;
  }

  // We need to capture the superscript's sibling before we move the
  // superscript, otherwise we wouldn't be able to access it after the move.
  const nextSibling: ChildNode | null = maybeSuperscript.nextSibling;
  span.append(maybeSuperscript);

  // Sometimes, there are even more numbers following the superscript.
  if (!nextSibling?.nodeValue) {
    return span;
  }

  const match: RegExpMatchArray | null = nextSibling.nodeValue.match(SUFFIX);
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
 * @param node
 * @param remainder
 * @returns
 */
function replaceReference(
  match: RegExpExecArray,
  node: Text,
  remainder: string
): { replacement?: Node[]; remainder?: string } {
  let nextSibling: ChildNode | null = node.nextSibling;
  // Parse a suffix from the remainder. Update the remainder.
  let suffix: string | undefined = SUFFIX.exec(remainder)?.[0];
  remainder = remainder.slice(suffix?.length);

  let source: ref.Reference | undefined;

  // Initialize the span.
  let span: HTMLSpanElement | null = null;

  let noTipNextSibling: string;
  // Sometimes, part of the abbreviation lives inside the next sibling.
  // Notice that, since we want prioritize longer abbreviations, we attempt to
  // parse a reference obtained by combining the match with the next <i> tag,
  // before attempting to parse a reference from the match alone.
  // Reference titles only exist in text nodes and <i> nodes. The code below
  // covers the most common cases (the title existing entirely in the text node,
  // or in the text node along with the next sibling). There are still
  // (extremely few) cases not covered by this log.
  // TODO: (#572) Handle tricky references.
  if (
    !suffix && // There is no suffix text following the abbreviation.
    nextSibling?.nodeName === 'I' &&
    (noTipNextSibling = drop.noTipTextContent(nextSibling)) &&
    // The text obtained from combining the match with the remainder and the
    // next sibling forms a source abbreviation.
    (source = ref.MAPPING[match[0] + remainder + noTipNextSibling])
  ) {
    // Success!
    // Save a reference to the sibling's sibling, before we move the sibling and
    // we can no longer access its sibling.
    const nextNext: ChildNode | null = nextSibling.nextSibling;
    // Populate the span content.
    span = source.span();
    span.prepend(match[0], remainder, nextSibling);
    // Account for the possibility that the sibling contained a reference. Clean
    // all child tooltips, and `reference` or `suffix` classes.
    ref.Reference.dereference(nextSibling);
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
  if (!source && (source = ref.MAPPING[match[0]])) {
    span = source.span();
    span.append(match[0]);
  }

  if (!source || !span) {
    // Still no source found! Return!
    return {};
  }

  // Add the suffix as a child.
  if (suffix) {
    span.append(parseSuffix(suffix, nextSibling /* candidate superscript  */));
  }

  return { replacement: [span], remainder };
}

/* eslint-enable complexity */

/**
 *
 * @param root
 */
export function handleReferences(root: HTMLElement): void {
  REFERENCE_RES.forEach((regex: RegExp): void => {
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
export function handleCorrigenda(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.CORRIGENDUM}`)
    .forEach((elem: HTMLElement): void => {
      const i = document.createElement('i');
      i.append('Additions and Corrections');
      drop.addDroppable(
        elem,
        // TODO: (#413) The page number should have a hyeprlink pointing to the
        // scan.
        ['From ', i, ' (', ...scan.prettyPage(elem.dataset[DATA_PAGE]!), ')'],
        'hover',
        'above'
      );
    });
}

/**
 *
 * @param root
 */
export function handleSemicolons(root: HTMLElement): void {
  html.replaceText(
    root,
    /;/,
    () => {
      const span = document.createElement('span');
      span.classList.add(cls.SEMICOLON);
      span.textContent = ';';
      return { replacement: [span] };
    },
    // Maybe we should simply exclude tooltips (`drop.CLS.DROPPABLE`)?
    ABBREVIATION_EXCLUDE
  );
}

/**
 *
 * @param root
 */
export function handleCommasAfterReferences(root: HTMLElement): void {
  root
    .querySelectorAll(`.${cls.REFERENCE}`)
    .forEach((reference: Element): void => {
      const nextSibling: ChildNode | null = reference.nextSibling;
      if (!nextSibling) {
        return;
      }
      if (reference.nextSibling?.nodeType !== Node.TEXT_NODE) {
        return;
      }
      const text: string | null = nextSibling.nodeValue;
      if (!text) {
        return;
      }
      const match = REFERENCE_FOLLOWUP.exec(text);
      if (!match) {
        return;
      }
      nextSibling.nodeValue = text.slice(match[0].length);
      // TODO: (#0) The current flow groups the first suffix (if present) under
      // one <span class="suffix"> tag, and all other comma-separated suffixes
      // under a second tag. For uniformity, we should have each separate suffix
      // in a separate tag.
      // TODO: (#572) The `parseSuffix` function considers the possibility that
      // our match has following <sup> element that is part of the suffix. Right
      // now, our code doesn't account for the possibility that such a
      // superscript is followed by a comma that is followed by more suffixes.
      const suffix: HTMLSpanElement = parseSuffix(
        match[0],
        nextSibling.nodeValue ? null : nextSibling.nextSibling
      );
      reference.append(suffix);
    });
}

/**
 *
 * @param ib
 */
function ibFallback(ib: HTMLElement): void {
  ib.classList.add(cls.ANNOTATION);
  drop.addDroppable(ib, ['ibidem']);
}

/**
 *
 * @param ib
 * @param prev
 * @param next
 */
function handleReferenceIB(
  ib: HTMLElement,
  prev: HTMLElement,
  next: ChildNode
): void {
  const reference: ref.Reference = ref.Reference.fromSpan(prev);
  const span: HTMLSpanElement = reference.span();
  ib.replaceWith(span);

  // Extract a suffix, if available.
  // Notice that many ib references legitimately don't have a suffix.
  const suffix: string | undefined = next.nodeValue?.match(SUFFIX)?.[0];
  if (next.nodeValue && suffix) {
    next.nodeValue = next.nodeValue.slice(suffix.length);
    span.prepend(
      parseSuffix(suffix, next.nodeValue.length ? null : next.nextSibling)
    );
  }

  span.prepend(ib);
}

/**
 *
 * @param ib
 * @param prev
 * @param next
 */
function handleBibleIB(
  ib: HTMLElement,
  prev: HTMLElement,
  next: ChildNode
): void {
  // Construct the previous citation
  const cit: Citation = Citation.fromAnchor(prev);

  // Update the citation with numbers from this citation.
  // Notice that it's valid for the new citation to not have any numbers.
  // The regex is sticky. Last index needs to be reset.
  CHAPTER_VERSE.lastIndex = 0;
  const match: RegExpMatchArray | null | undefined =
    next.nodeValue?.match(CHAPTER_VERSE);
  cit.update(
    match?.[0] ?? '',
    match?.[1] ?? match?.[3],
    match?.[2] ?? match?.[4]
  );
  if (next.nodeValue && match) {
    // Chop off the matched text from the next sibling.
    next.nodeValue = next.nodeValue.slice(match[0].length);
  }

  const anchor: HTMLAnchorElement = cit.anchor();

  const followups: { replacement: (Node | string)[]; remainder: string } =
    parseBibleFollowups(cit, next.nodeValue ?? '');
  ib.replaceWith(anchor, ...followups.replacement);
  anchor.prepend(ib);
  next.nodeValue = followups.remainder;
}

/**
 *
 * @param ib
 * @param prev
 */
function handlePageIB(ib: HTMLElement, prev: HTMLAnchorElement): void {
  // This `ib` instances refers to a Crum page.
  // An example is 1730 (ⲟⲩⲱⲛⲅ):
  //   https://remnqymi.com/crum/1730.html
  // We don't expect a suffix to be present.
  const a = html.anchor(prev.href, true);
  ib.replaceWith(a);
  a.append(ib);
  drop.addDroppable(a, ['ibidem']);
}

const PREV_QUERY = css.classQuery(cls.REFERENCE, cls.BIBLE, cls.PAGE);
/**
 * Find the first preceding sibling to the given element that is:
 * 1. Either a reference, a Bible citation, or a page.
 * 2. Doesn't lie within parentheses.
 *
 * @param ib
 * @param strict
 * @returns
 */
function findPrev(ib: HTMLElement, strict: boolean): HTMLElement | null {
  let prev: ChildNode | null = ib.previousSibling;
  let rightParentheses = 0;

  while (
    prev &&
    // While we have a previous sibling that doesn't match the requirements:
    (!(prev instanceof Element) ||
      !prev.matches(PREV_QUERY) ||
      (strict && rightParentheses))
  ) {
    // Skip.
    prev = prev.previousSibling;
    if (!strict) {
      // We don't care about parentheses.
      continue;
    }

    // Count the parentheses in the element text.
    Array.from(prev?.textContent ?? '')
      .reverse()
      .forEach((c: string) => {
        if (c === ')') {
          rightParentheses++;
        } else if (c === '(' && rightParentheses) {
          rightParentheses--;
        }
      });
  }

  return prev instanceof HTMLElement ? prev : null;
}

/**
 *
 * @param root
 */
function handleIB(root: HTMLElement): void {
  root.querySelectorAll('i').forEach((ib: HTMLElement): void => {
    if (ib.textContent.toLowerCase() !== 'ib') {
      return;
    }

    const prev: HTMLElement | null = findPrev(ib, true) ?? findPrev(ib, false);

    if (!prev) {
      log.error(
        'Unable to find previous reference for ib element',
        ib,
        'previousSibling:',
        ib.previousSibling?.textContent
      );
      ibFallback(ib);
      return;
    }

    if (prev.classList.contains(cls.PAGE)) {
      handlePageIB(ib, prev as HTMLAnchorElement);
      return;
    }

    const next: ChildNode | null = ib.nextSibling;
    if (!next) {
      log.error('ib has no next sibling:', ib);
      ibFallback(ib);
      return;
    }

    if (prev.classList.contains(cls.REFERENCE)) {
      handleReferenceIB(ib, prev, next);
      return;
    }

    dev.play(() => {
      // Sanity check.
      log.ensure(prev.classList.contains(cls.BIBLE));
    });

    handleBibleIB(ib, prev, next);
  });
}
/* eslint-enable max-lines */
