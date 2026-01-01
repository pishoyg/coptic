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
 * Additionally, we use unicode-aware regex boundary expressions, because `\b`
 * doesn't fully support Unicode.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize */ // eslint-disable-line max-len

/**
 * ABBREVIATION_EXCLUDE is used to avoid overlap between detected abbreviations.
 *
 * There is a whole lot of regex searches that get executed against every text
 * node in the page, so it may be a good idea to exclude as many subtrees as
 * possible early on to improve performance.
 *
 * It also reduces the risk of false positives.
 */
const ABBREVIATION_EXCLUDE: string = css.classQuery(
  cls.BULLET,
  cls.BIBLE,
  cls.REFERENCE,
  cls.DIALECT,
  cls.ANNOTATION,
  cls.GLOSS,
  // We process Coptic text for annotations, because the signs for verb forms
  // (prenominal, pronominal, and qualitative) are often marked as part of the
  // Coptic word. (Although, as of the time of writing, we only annotate
  // qualitative sign: †). So we don't exclude Coptic text.
  cls.AMHARIC,
  cls.ARABIC,
  cls.ARAMAIC,
  cls.DEMOTIC,
  cls.GREEK,
  cls.HEBREW
);

/**
 * Allegedly, modern JavaScript engines such as V8 use a trie to implement a
 * regex constructed from the disjunction of a large number of strings. Thus,
 * the regex constructed using this method remains performant even if there is a
 * large number of keys.
 *
 * @param keys
 * @param bound
 * @returns
 */
function regex(keys: string[], bound = true): string {
  const expression: string = keys
    // It's important to sort the keys by length, bringing longer keys first.
    // The regex stops whenever a match is encountered, and it processes the
    // matches in order. If a key is a prefix of another key, the longer key
    // should come earlier in the list. Otherwise, the regex could match the
    // prefix and return early.
    .sort((a: string, b: string): number => b.length - a.length)
    .map((key: string): string => str.escape(key))
    .join('|');
  return bound
    ? // Group and bound.
      str.bounded(expression, true /* group */)
    : // Only group the regexes.
      str.grouped(expression);
}

/**
 * BIBLE_RE defines the regex used to catch Bible references.
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
 */
const NUMS = '(\\d+|A|C|D|F)(?: (\\d+))?';
// CHAPTER_VERSE matches "NUMS" OR "(NUMS)".
// NOTE:
// 1. This creates two sets of capture groups.
// 2. This is a sticky regex.
const CHAPTER_VERSE = new RegExp(`\\.? (?:${NUMS}|\\(${NUMS}\\))`, 'uy');
/**
 * DAN_OVERRIDE defines special Book names used by Crum to refer to chapters in
 * the Book of Daniel.
 * - 'Su' refers to the chapter that St. Shenouda refers to as A.
 * - 'Bel' refers to the chapter that St. Shenouda refers to as C.
 */
const DAN_OVERRIDE: Record<string, string> = { Su: 'a', Bel: 'c' };

const BIBLE_RE = new RegExp(
  // Capture the book abbreviation.
  // The CHAPTER_VERSE regex defines its own capture groups.
  `(${regex([
    ...Object.keys(bible.MAPPING),
    ...Object.keys(DAN_OVERRIDE),
  ])})(?:${CHAPTER_VERSE.source})?`,
  'gu'
);

/**
 * BIBLE_FOLLOWUP catches followups, such as:
 * - Is 27 11, 56 9, 10
 * - Sa 15 7–9
 * - Si 34 29 (31 26)
 */
const BIBLE_FOLLOWUP = new RegExp(
  `^(?:(?:, |–)(${NUMS})${str.WORD_END.source}| ?\\((${NUMS})\\))`,
  'u'
);

const ANNOTATION_RE = new RegExp(
  ((): string => {
    // boundaryKeys are keys that occur as standalone words.
    const boundaryKeys: string[] = Object.entries(ann.MAPPING)
      .filter(([_, annot]: [string, ann.Annotation]) => !annot.noBoundary)
      .map(([key, _]) => key);

    // noBoundaryKeys are keys that can occur mid-word.
    const noBoundaryKeys: string[] = Object.entries(ann.MAPPING)
      .filter(([_, annot]: [string, ann.Annotation]) => annot.noBoundary)
      .map(([key, _]) => key);

    return [regex(boundaryKeys), regex(noBoundaryKeys, false)].join('|');
  })(),
  'gu'
);

const PAGE_RE = new RegExp(str.bounded('p{1,2} ([0-9]+)'));
const PAGE_FOLLOWUP_RE = /^, ([0-9]+) $/;

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
// - Suffixes:
//     A suffix indicates a manuscript number, a shelf number, page number, etc.
//     This was constructed based on manual observation, and has been expanding
//     as we discover more cases.
//     This implies that references and suffixes could look similar. A single
//     uppercase Latin letter could be a reference abbreviation or a suffix. We
//     assume that, if it occurs after a reference abbreviation, then it's
//     likely a suffix.
const NUMBERS = [
  "'?[0-9]+[a-zA-Z]?\\*?(?:–[0-9]+)?",
  '§',
  // TODO: (#666) Decide on a uniform way to handle annotations that mostly
  // follow references, such as:
  // - vo (verse folio)
  // - ro (recto folio)
  // - Ad (Addenda)
  // - pass (passim)
  // - ff (and following pages/verses)
  // - inf (infra)
  // - s f (sub finem)
  // - ut sup (ut supra)
  // - ...etc.
  // As of now, vo, ro, and Ad are treated as suffices, while all the others are
  // only treated as annotations.
  // Ideally, we would capture and highlight them as part of the suffix, but we
  // would also include a note explaining them in the tooltip.
  'ro',
  'vo',
  'Ad',
  'stele',
  '[a-zA-Z]\\.?',
  // Roman numerals:
  // Large Roman numerals (with L, C, D, and M) haven't been encountered. We
  // avoid them to minimize the risk of false positives.
  '[ivx]+',
  '[IVX]+',
];

const NUMBER = `(?:${NUMBERS.join('|')})`;
// Some suffix parts are parenthesized.
// The space before the parenthesis is optional.
const NUMBER_GROUP = `(?: ${NUMBER}| ?\\(${NUMBER}(?: ${NUMBER})*\\))`;

const SUFFIX = new RegExp(`^\\.?${NUMBER_GROUP}+${str.WORD_END.source}`, 'u');
const REFERENCE_FOLLOWUP = new RegExp(
  `^(?:(?:,| =)${NUMBER_GROUP}+)+${str.WORD_END.source}`,
  'u'
);

const REFERENCE_RE = new RegExp(regex(Object.keys(ref.MAPPING)), 'gu');

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
      handlePageFollowups(elem);

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
      handleReferenceFollowups(elem);

      // Comma handling needs to follow both Bible handling and IB handling.
      // Consider the following case[1]:
      //   Job 3 18, 2 Cor 4 18
      // If we were to greedily parse Bible followups in the first iteration of
      // Bible citation search, this would capture "Job 3 18, 2", resulting in
      // the following:
      // - A Bible citation to Job 3 18
      // - A Bible citation to Job 3 2
      // - "Cor 4 18" wouldn't be interpreted!
      // It's therefore important to defer Bible followup handling until all
      // Bible citations have been processed.
      //
      // [1] https://remnqymi.com/crum/25.html
      handleBibleFollowups(elem);

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
function handleAnnotations(root: HTMLElement): void {
  html.replaceText(
    root,
    ANNOTATION_RE,
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
}

/**
 * Insert hyperlinks for page references in the text.
 *
 * @param root
 */
function handlePages(root: HTMLElement): void {
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
 *
 * @param root
 */
function handlePageFollowups(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.PAGE}`)
    .forEach((page: HTMLElement): void => {
      // Iteratively check for subsequent pages in the list
      // Structure expected: [Anchor] -> [Text: ", 123 "] -> [I: "a" or "b"]
      let textNode: ChildNode | null;
      let colNode: ChildNode | null | undefined;

      while (
        (textNode = page.nextSibling) &&
        (colNode = textNode.nextSibling)
      ) {
        // Check validation:
        // 1. Text must match ", [number] "
        // 2. Column element must contain 'a' or 'b'
        const match: RegExpExecArray | null = PAGE_FOLLOWUP_RE.exec(
          textNode.textContent ?? ''
        );

        if (
          !match ||
          (colNode.textContent !== 'a' && colNode.textContent !== 'b')
        ) {
          break;
        }

        const pageNum: string = match[1]!;

        // Create the new anchor
        // We include the number, the space (implied in the regex match), and
        // the column node.
        // Note: Passing colNode to html.anchor moves it from the DOM into the
        // anchor.
        const nextAnchor = html.anchor(
          paths.crumScan(`${pageNum}${colNode.textContent}`),
          true,
          pageNum,
          ' ',
          colNode
        );
        nextAnchor.classList.add(cls.PAGE);

        // Adjust the text node to only contain the comma and space separator
        textNode.textContent = ', ';

        // Insert the new anchor after the comma
        textNode.after(nextAnchor);

        // Advance the loop to check for another page after this new one
        page = nextAnchor;
      }
    });
}

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
   * All citations are initially explicit. Whenever an antecedent citation is
   * updated with folloupws:
   * 1. If all numbers are given, then the new citation is also explicit.
   * 2. If some numbers are retrieved from the followups and some inherited from
   *    the antecedent citation, then the citation is no longer explicit.
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
      // Since we inherit the chapter number from the antecedent citation, this
      // citation is no longer explicit.
      this.explicit = false;
      this.verse = first;
      return;
    }

    this.explicit = true;
    this.chapter = first;
  }

  /**
   * @param {...any} tooltipPrefix
   * @returns
   */
  public anchor(...tooltipPrefix: (Node | string)[]): HTMLAnchorElement {
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
    drop.addDroppable(a, [
      ...tooltipPrefix,
      this.explicit ? this.book.name : this.name(),
    ]);
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

  if (!chapter && !verse && falsePositive(bookAbbreviation, remainder, node)) {
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
): DocumentFragment {
  const fragment: DocumentFragment = document.createDocumentFragment();
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
    fragment.append(match[0].slice(0, rawIdx));
    fragment.append(cit.anchor());
    fragment.append(match[0].slice(rawIdx + raw.length));

    remainder = remainder.slice(match[0].length);
  }
  fragment.append(remainder);
  fragment.normalize();
  return fragment;
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
): { replacement?: (Node | string)[] } {
  const cit: Citation | null = parseBibleCitation(match, node, remainder);
  if (!cit?.valid()) {
    return {};
  }

  return { replacement: [cit.anchor()] };
}

/**
 * Determine whether a given chapterless and verseless Bible book abbreviation
 * is a false positive.
 *
 * "Is" and "He" are both English words that often occur in the text.
 *
 * "Gen" is a rare abbreviation for Genesis, and it's confused with "gen" for
 * "genitive".
 * There is currently a singleton known Genesis citation using "Gen" under
 * ⲓⲁⲗ:
 *   https://remnqymi.com/crum/2796.html
 * Other than that, Genesis is cited as "Ge".
 *
 * NOTE: This heuristic is based on known examples (#524), but other cases
 * might turn up in the text that violate these rules.
 *
 * @param bookAbbreviation
 * @param remainder
 * @param node
 * @returns
 */
function falsePositive(
  bookAbbreviation: string,
  remainder: string,
  node: Text
): boolean {
  if (bookAbbreviation === 'Gen' || bookAbbreviation === 'He') {
    return true;
  }

  if (bookAbbreviation === 'Is') {
    // Isaiah was found to have chapterless verseless citations that are true
    // positives, in two cases:
    if (remainder.startsWith(')')) {
      return false;
    }
    if (
      remainder === ' ' &&
      node.nextSibling?.textContent === 'l c' /* loco citato */
    ) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * NOTE: For the Bible index, we opted for generating a JavaScript file that
 * defines the mapping. We used to populate the mapping in a JSON, but this
 * presented the following challenges:
 * 1. It has to be retrieved with an async fetch. We prefer to `await`
 *   (rather than `void`) promises as much as possible, and this would've
 *   complicated things:
 *   - Many dependent functions would've had to be made async in order to
 *     support an `await` operator.
 *   - Our Anki bundler didn't support a top-level await for the IIFE[1] target,
 *     and this would've added a further complication.
 * 2. I am unsure how easy it is to retrieve a JSON on Anki.
 *
 * Use of a JavaScript file makes things simpler, and it's not particularly
 * painful to maintain.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Glossary/IIFE
 *
 * @param root
 */
function handleBible(root: HTMLElement): void {
  html.replaceText(root, BIBLE_RE, replaceBible, ABBREVIATION_EXCLUDE);
}

/**
 * @param root
 */
function handleBibleFollowups(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.BIBLE}`)
    .forEach((bib: HTMLElement): void => {
      const cit: Citation = Citation.fromAnchor(bib);

      if (!bib.nextSibling?.nodeValue) {
        return;
      }

      bib.nextSibling.replaceWith(
        parseBibleFollowups(cit, bib.nextSibling.nodeValue)
      );
    });
}

/**
 *
 * @param maybeSuperscript
 * @returns
 */
function* parseSuffix(
  maybeSuperscript: ChildNode | null
): Generator<Node | string> {
  if (maybeSuperscript?.nodeName !== 'SUP') {
    // The node is not a superscript.
    return;
  }

  // We need to capture the superscript's sibling before we move the
  // superscript, otherwise we wouldn't be able to access it after the move.
  const nextSibling: ChildNode | null = maybeSuperscript.nextSibling;
  yield maybeSuperscript;

  // Sometimes, there are even more numbers following the superscript.
  if (!nextSibling?.nodeValue) {
    return;
  }

  const match: RegExpMatchArray | null = nextSibling.nodeValue.match(SUFFIX);
  if (!match) {
    return;
  }

  yield match[0];
  nextSibling.nodeValue = nextSibling.nodeValue.slice(match[0].length);
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
    span.append(suffix, ...parseSuffix(nextSibling));
  }

  return { replacement: [span], remainder };
}

/* eslint-enable complexity */

/**
 *
 * @param root
 */
function handleReferences(root: HTMLElement): void {
  html.replaceText(root, REFERENCE_RE, replaceReference, ABBREVIATION_EXCLUDE);
}

// On a corrigendum element, the page number lives in a `data-page` attribute.
const DATA_PAGE = 'page';

/**
 *
 * @param root
 */
function handleCorrigenda(root: HTMLElement): void {
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
function handleSemicolons(root: HTMLElement): void {
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
function handleReferenceFollowups(root: HTMLElement): void {
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
      // TODO: (#572) The `parseSuffix` function considers the possibility that
      // our match has following <sup> element that is part of the suffix. Right
      // now, our code doesn't account for the possibility that such a
      // superscript is followed by a comma that is followed by more suffixes.
      reference.append(
        match[0],
        ...parseSuffix(nextSibling.nodeValue ? null : nextSibling.nextSibling)
      );
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
 * @returns
 */
function ibidem(): HTMLElement {
  const i: HTMLElement = document.createElement('i');
  i.textContent = 'ibidem';
  i.classList.add(cls.IBIDEM);
  return i;
}

/**
 *
 * @param ib
 * @param antecedent
 * @param next
 */
function handleReferenceIB(
  ib: HTMLElement,
  antecedent: HTMLElement,
  next: ChildNode
): void {
  const reference: ref.Reference = ref.Reference.fromSpan(antecedent);
  const span: HTMLSpanElement = reference.span(ibidem());
  ib.replaceWith(span);

  // Extract a suffix, if available.
  // Notice that many ib references legitimately don't have a suffix.
  const suffix: string | undefined = next.nodeValue?.match(SUFFIX)?.[0];
  if (next.nodeValue && suffix) {
    // TODO: (#647) In some cases, the first token in the suffix is actually
    // part of the reference abbreviation.
    // For example:
    //   1. Mani H ... ib K
    //      The ibidem reference should be interpreted as "Mani K"
    //      rather than "Mani H".
    //   2. BM ... ib Or
    //      The ibidem reference should be interpreted as "BMOr".
    next.nodeValue = next.nodeValue.slice(suffix.length);
    span.prepend(
      suffix,
      ...parseSuffix(next.nodeValue.length ? null : next.nextSibling)
    );
  }

  span.prepend(ib);
}

/**
 *
 * @param ib
 * @param antecedent
 * @param next
 */
function handleBibleIB(
  ib: HTMLElement,
  antecedent: HTMLElement,
  next: ChildNode
): void {
  // Construct the antecedent citation.
  const cit: Citation = Citation.fromAnchor(antecedent);

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

  const anchor: HTMLAnchorElement = cit.anchor(ibidem(), ': ');
  ib.replaceWith(anchor);
  anchor.prepend(ib);
}

/**
 *
 * @param ib
 * @param antecedent
 */
function handlePageIB(ib: HTMLElement, antecedent: HTMLAnchorElement): void {
  // This `ib` instances refers to a Crum page.
  // An example is 1730 (ⲟⲩⲱⲛⲅ):
  //   https://remnqymi.com/crum/1730.html
  // We don't expect a suffix to be present.
  const a = html.anchor(antecedent.href, true);
  ib.replaceWith(a);
  a.append(ib);
  drop.addDroppable(a, ['ibidem']);
}

const ANTECEDENT_QUERY: string = css.classQuery(
  cls.REFERENCE,
  cls.BIBLE,
  cls.PAGE
);
/**
 * Find the first preceding sibling to the given ibidem element that is either
 * a reference, a Bible citation, or a page.
 *
 * @param ib - The ibidem element.
 * @param strict - If true, skip elements between parentheses. Otherwise, just
 * retrieve the first match, even if it lies within parentheses.
 * @returns
 */
function findAntecedent(ib: HTMLElement, strict?: boolean): HTMLElement | null {
  if (strict === undefined) {
    return findAntecedent(ib, true) ?? findAntecedent(ib, false);
  }

  let antecedent: ChildNode | null = ib.previousSibling;
  let depth = 0; // Track the parenthesis depth.

  while (
    antecedent &&
    // While we have a preceding sibling that doesn't match the requirements:
    (!(antecedent instanceof Element) ||
      !antecedent.matches(ANTECEDENT_QUERY) ||
      (strict && depth > 0))
  ) {
    // Skip.
    // Count the parentheses in the element text.
    // Only do so in strict mode, otherwise we don't really care about
    // parenthesis depth.
    if (strict) {
      Array.from(antecedent.textContent ?? '').forEach((c: string) => {
        if (c === ')') {
          depth++;
        } else if (c === '(') {
          depth--;
        }
      });
    }

    antecedent = antecedent.previousSibling;
  }

  return antecedent instanceof HTMLElement ? antecedent : null;
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

    const antecedent: HTMLElement | null = findAntecedent(ib);

    if (!antecedent) {
      log.error(
        'Unable to find antecedent reference for ib element',
        ib,
        'previousSibling:',
        ib.previousSibling?.textContent
      );
      ibFallback(ib);
      return;
    }

    if (antecedent.classList.contains(cls.PAGE)) {
      handlePageIB(ib, antecedent as HTMLAnchorElement);
      return;
    }

    const next: ChildNode | null = ib.nextSibling;
    if (!next) {
      log.error('ib has no next sibling:', ib);
      ibFallback(ib);
      return;
    }

    if (antecedent.classList.contains(cls.REFERENCE)) {
      handleReferenceIB(ib, antecedent, next);
      return;
    }

    dev.play(() => {
      // Sanity check.
      log.ensure(antecedent.classList.contains(cls.BIBLE));
    });

    handleBibleIB(ib, antecedent, next);
  });
}
/* eslint-enable max-lines */
