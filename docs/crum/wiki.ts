/**
 * Package wiki defines Crum Wiki handlers.
 */
/* eslint-disable max-lines */

import * as html from '../html.js';
import * as browser from '../browser.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as cls from './cls.js';
import * as log from '../logger.js';
import * as bib from './bible.js';
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
 * EXCLUDE matches elements that don't require enrichment.
 *
 * There is a whole lot of regex searches that get executed against every text
 * node in the page, so it may be a good idea to exclude as many subtrees as
 * possible early on to improve performance.
 *
 * It also reduces the risk of false positives.
 */
const EXCLUDE: string = css.classQuery(
  cls.BULLET,
  cls.DIALECT,
  cls.GLOSS,
  // NOTE: Excluding Coptic text prevents annotating the '†' character (for
  // qualitative forms). This is OK, as the notation is readily understood
  // anyway. It also make it consistent with the prenominal and pronominal
  // notations, which are not annotated.
  cls.COPTIC,
  cls.AMHARIC,
  cls.ARABIC,
  cls.ARAMAIC,
  cls.DEMOTIC,
  cls.GREEK,
  cls.HEBREW,
  // TODO: (#522) The presence of the four classes below in the query will
  // become unnecessary when the query is solely used during enrichment.
  cls.BIBLE,
  cls.REFERENCE,
  cls.ANNOTATION,
  cls.PAGE
);

/**
 * CHAPTER_VERSE defines the regex used to parse the chapter and verse numbers
 * in a Bible citation.
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

const ENRICHMENT_RE = new RegExp(
  str.regex([
    // Bible:
    ...Object.keys(bib.MAPPING),
    ...Object.keys(DAN_OVERRIDE),
    // References:
    ...Object.keys(ref.MAPPING),
    // Pages:
    'p',
    'pp',
    // Annotations:
    ...Object.keys(ann.MAPPING),
    // Semicolons:
    ';',
    // Ibidem:
    'ib',
    'Ib',
  ]),
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

const PAGE_RE = /^p{1,2} ([0-9]+) $/;
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
  "'?[0-9]+[a-zA-Z]?\\*?(?:–'?[0-9]+)?",
  // 'no' means 'number', but it must be followed by an integer, otherwise it's
  // a false positive.
  'no [0-9]+',
  // 'pl' means 'plate', though outside suffixes it means 'plural'.
  'pl [0-9]+',
  // TODO: (#0) Consider explaining 'no' and 'pl' in the tooltip. Right now,
  // only suffixes retrieved from the list of annotations are explained in the
  // tooltip.
  '§\\d*',
  'stele',
  '[a-zA-Z]\\.?',
  // Roman numerals (in the range 1–3999):
  '(?=[MDCLXVI])M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})',
  '(?=[mdclxvi])m{0,3}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})',
  ...ann.DATA.filter((abb: ann.Abbreviation) => abb.suffix).flatMap(
    (abb: ann.Abbreviation): string[] =>
      Array.from(ann.variants(abb)).map((variant) => str.escape(variant))
  ),
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

const REFERENCE_RE = new RegExp(str.regex(Object.keys(ref.MAPPING)), 'gu');

/**
 *
 * @param wiki
 * @returns
 */
function textContent(wiki: HTMLElement): string {
  // Our enricher adds tooltips, which we need to eliminate in order to obtain
  // the original text.
  // Additionally, we add a copy button, and we should get rid of that as well.
  return str.textContent(wiki, { [drop.CLS.DROPPABLE]: '', [cls.COPY]: '' });
}

/**
 * Handle all Crum elements.
 * @param root
 */
export function handle(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.WIKI}`)
    .forEach((elem: HTMLElement): void => {
      const startText: string | undefined = dev.play(() => textContent(elem));

      enrich(elem);

      // Comma handling searches for occurrences of:
      //   <reference>, <suffix>, <suffix>, ...
      // Merge such "followups" into the preceding reference.
      //
      // NOTE: This needs to happen in a second post-enrichment pass, to avoid
      // mistakenly interpreting a reference as a suffix.
      // For example, consider the following piece of text[1]:
      //   P 44 66, K 179
      // If the first run were to consider suffixes after commas, we may be
      // tempted to interpret "K 179" as a second suffix for the P reference.
      // However, processing all references first guarantees that this K
      // reference gets caught, thus it won't be mistaken for a suffix of the P
      // reference.
      //
      // [1] https://remnqymi.com/crum/510.html#:~:text=P%2044%2066,%20K%20179
      handleReferenceFollowups(elem);

      // Consider the following case[1]:
      //   Job 3 18, 2 Cor 4 18
      // If we were to greedily parse Bible followups in the first enrichment
      // pass, this would capture "Job 3 18, 2", resulting in
      // the following:
      // - A Bible citation to Job 3 18
      // - A Bible citation to Job 3 2
      // - "Cor 4 18" wouldn't be interpreted!
      // It's therefore important to defer Bible followup handling until all
      // Bible citations have been processed.
      //
      // [1] https://remnqymi.com/crum/25.html
      handleBibleFollowups(elem);

      handleCorrigenda(elem);

      addCopyShortcuts(elem);

      handleFormSuperscripts(elem);

      dev.play(() => {
        white.warnPotentiallyMissingReferences(elem, EXCLUDE);

        const endText: string = textContent(elem);
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
 * @param tip
 * @param {...any} children
 * @returns
 */
function annotation(
  tip: string,
  ...children: (Node | string)[]
): HTMLSpanElement {
  const span: HTMLSpanElement = document.createElement('span');
  span.append(...children);
  drop.addDroppable(span, [tip]);
  span.classList.add(cls.ANNOTATION);
  return span;
}

/**
 *
 * @param key
 * @param node
 * @param remainder
 * @param preceding
 * @returns
 */
function handleAnnotation(
  key: string,
  node: Text,
  remainder: string,
  preceding: string
): { replacement: Node[] } | undefined {
  const annot: ann.Annotation | undefined = ann.MAPPING[key];
  if (!annot) {
    log.fatal("Can't find annotation:", key);
  }

  if (annot.noStyledParent && node.parentElement?.closest('i, sup')) {
    // This annotation can't show in italicized text, and this node is
    // italicized.
    return undefined;
  }

  if (
    key === 'art' &&
    (remainder.startsWith(' thou') || preceding.endsWith('thou '))
  ) {
    // False positive!
    return undefined;
  }

  // The question mark is a very common annotation, and punctuation mark. We use
  // a simple heuristic to distinguish the two. Even if heuristic yields false
  // negative annotations, false negatives are deemed more
  // tolerable than false positives, so this is OK.
  // The interpretation of the mark is quite clear, so it doesn't really need an
  // annotation.
  if (key === '?' && !['(', ' '].includes(preceding.slice(-1))) {
    return undefined;
  }

  return { replacement: [annotation(annot.fullForm, key)] };
}

/**
 * Insert hyperlinks for page references in the text.
 *
 * @param text
 * @param node
 * @returns
 */
function handlePage(
  text: string,
  node: Text
): { replacement: (Node | string)[]; remainder: string } | undefined {
  // A page number has the format 'p [0-9]+ [ab]?'. The regex matches this
  // format, excluding the column, which is expected to live in the <i> tag that
  // is the next sibling.
  const match: RegExpExecArray | null = PAGE_RE.exec(text);
  const next: ChildNode | null = node.nextSibling;
  if (!match || !next) {
    return undefined;
  }
  const col: string | null = next.textContent;
  if (col !== 'a' && col !== 'b') {
    return undefined;
  }
  // Handle followups before mutating the DOM.
  handlePageFollowups(next.nextSibling);
  const a = html.anchor(
    paths.crumScan(`${match[1]!}${col}`),
    true,
    match[0],
    next
  );
  a.classList.add(cls.PAGE);
  return { replacement: [a], remainder: '' };
}

/**
 *
 * @param node
 */
function handlePageFollowups(node: ChildNode | null): void {
  // Iteratively check for subsequent pages in the list
  // Structure expected: [Anchor] -> [Text: ", 123 "] -> [I: "a" or "b"]
  let next: ChildNode | null | undefined;
  while (node && (next = node.nextSibling)) {
    // Check validation:
    // 1. Text must match ", [number] "
    // 2. Column element must contain 'a' or 'b'
    const match: RegExpExecArray | null = PAGE_FOLLOWUP_RE.exec(
      node.textContent ?? ''
    );

    if (!match) {
      break;
    }
    const col: string | null = next.textContent;
    if (col !== 'a' && col !== 'b') {
      break;
    }

    const pageNum: string = match[1]!;

    // Create the new anchor
    // We include the number, the space (implied in the regex match), and
    // the column node.
    // Note: Passing `next` to html.anchor moves it from the DOM into the
    // anchor.
    const nextAnchor = html.anchor(
      paths.crumScan(`${pageNum}${col}`),
      true,
      pageNum,
      ' ',
      next
    );
    nextAnchor.classList.add(cls.PAGE);

    // Adjust the text node to only contain the comma and space separator
    node.textContent = ', ';

    // Insert the new anchor after the comma
    node.after(nextAnchor);

    // Advance the loop to check for another page after this new one
    node = nextAnchor.nextSibling;
  }
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
    private readonly book: bib.Book
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
   * @param ibidem
   * @returns
   */
  public anchor(ibidem = false): HTMLAnchorElement {
    const a = html.anchor(
      paths.bible(this.book.path, this.chapter, this.verse),
      true,
      this.raw
    );
    a.classList.add(cls.BIBLE);
    a.dataset[Citation.DATA_BOOK] = this.book.abb;
    a.dataset[Citation.DATA_CHAPTER] = this.chapter ?? '';
    a.dataset[Citation.DATA_VERSE] = this.verse ?? '';
    const tooltip: (Node | string)[] = [];
    if (ibidem) {
      // TODO: (#0) The `ibidem` helper is not Reference-specific, since it's
      // also used for Bible processing.
      tooltip.push(ref.ibidem(), ': ');
    }
    // If this citation is explicit (all numbers are present in `raw`), then
    // including them in the tooltip would be redundant.
    // However, if some numbers are inherited, we include the numbers in the
    // tooltip for readability.
    tooltip.push(this.explicit ? this.book.name : this.name());
    drop.addDroppable(a, tooltip);
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
      bib.MAPPING[node.dataset[Citation.DATA_BOOK]!]!
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
 * @param key
 * @param node
 * @param remainder
 * @returns
 */
function parseBibleCitation(
  key: string,
  node: Text,
  remainder: string
): [Citation | null, string | null] {
  // Parse the numbers following the book abbreviation.
  CHAPTER_VERSE.lastIndex = 0;
  const match: RegExpExecArray | null = CHAPTER_VERSE.exec(remainder);
  let [chapter, verse] = [match?.[1] ?? match?.[3], match?.[2] ?? match?.[4]];
  remainder = remainder.slice(match?.[0].length ?? 0);
  const raw: string = key + (match?.[0] ?? '');

  if (key in DAN_OVERRIDE) {
    // Given that this special book contains one chapter, the book
    // abbreviation is followed by the verse number only. This number would've
    // been mistakenly interpreted as the chapter number, but it's actually the
    // verse number.
    verse = chapter;
    chapter = DAN_OVERRIDE[key];
    key = 'Dan';
  }

  if (!positive(key, match, remainder, node)) {
    // False positive!
    return [null, null];
  }

  return [new Citation(raw, chapter, verse, bib.MAPPING[key]!), remainder];
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
 * @param key
 * @param node
 * @param remainder
 * @returns
 */
function replaceBible(
  key: string,
  node: Text,
  remainder: string
): { replacement: (Node | string)[]; remainder: string } | undefined {
  const [cit, rem]: [Citation | null, string | null] = parseBibleCitation(
    key,
    node,
    remainder
  );
  if (!cit?.valid()) {
    return undefined;
  }

  return { replacement: [cit.anchor()], remainder: rem ?? remainder };
}

/**
 * Determine whether a given Bible book abbreviation is a true or false
 * positive.
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
 * @param key
 * @param match - The chapter-verse match object.
 * @param remainder
 * @param node
 * @returns
 */
function positive(
  key: string,
  match: RegExpExecArray | null,
  remainder: string,
  node: Text
): boolean {
  if (match) {
    // This citation is followed by a chapter or verse number. It's a true
    // positive.
    return true;
  }
  if (key === 'Gen' || key === 'He') {
    // Definitely a false positive!
    return false;
  }

  if (key !== 'Is') {
    // Anything else is a true positive.
    return true;
  }

  // Isaiah was found to have chapterless verseless citations that are true
  // positives in the following cases only:
  if (remainder.startsWith(')')) {
    return true;
  }

  if (remainder.startsWith(' Kropp')) {
    return true;
  }

  if (
    remainder === ' ' &&
    node.nextSibling?.textContent === 'l c' // loco citato
  ) {
    return true;
  }

  if (
    remainder === ' ' &&
    node.nextSibling?.nodeType === Node.ELEMENT_NODE &&
    (node.nextSibling as Element).classList.contains(cls.DIALECT)
  ) {
    return true;
  }

  // Any other 'Is' is not Isaiah!
  return false;
}

/**
 * @param root
 */

/**
 * @param root
 */
function handleBibleFollowups(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.BIBLE}`)
    .forEach((bible: HTMLElement): void => {
      const cit: Citation = Citation.fromAnchor(bible);

      if (!bible.nextSibling?.nodeValue) {
        return;
      }

      bible.nextSibling.replaceWith(
        parseBibleFollowups(cit, bible.nextSibling.nodeValue)
      );
    });
}

/**
 *
 * @param maybeSUP
 * @param between
 * @returns
 */
function* suffixFollowups(
  maybeSUP: ChildNode | null,
  between: string
): Generator<Node | string> {
  if (between) {
    // There is text before the superscript that is suspected to be part of the
    // suffix.
    return;
  }

  if (maybeSUP?.nodeName !== 'SUP') {
    // This is not a superscript.
    return;
  }

  // No suffix superscript ever occurs at the very end of the suffix. It must be
  // followed by other parts. Check the next sibling to see if it contains the
  // suffix continuation, and if so, yield both.
  const next: ChildNode | null = maybeSUP.nextSibling;

  if (!next?.nodeValue) {
    return;
  }

  const match: RegExpMatchArray | null = next.nodeValue.match(SUFFIX);
  if (!match) {
    return;
  }

  yield maybeSUP;
  yield match[0];
  next.nodeValue = next.nodeValue.slice(match[0].length);
}

/**
 *
 * @param key
 * @param node
 * @param remainder
 * @returns
 * TODO: (#572) Enrichment Code Processes Chains of Nodes.
 */
function replaceReference(
  key: string,
  node: Text,
  remainder: string
): { replacement: Node[]; remainder?: string } | undefined {
  const suffix: string | undefined = SUFFIX.exec(remainder)?.[0];
  if (key === 'My' && !suffix && !remainder.startsWith(')')) {
    // False positive.
    return undefined;
  }

  const span: HTMLSpanElement = ref.MAPPING[key]!.span(key);
  if (!suffix) {
    return { replacement: [span] };
  }

  // Chop off the suffix from the remainder.
  remainder = remainder.slice(suffix.length);
  // Append the suffix.
  ref.Reference.suffix(
    span,
    suffix,
    ...suffixFollowups(node.nextSibling, remainder)
  );

  return { replacement: [span], remainder };
}

/**
 *
 * @param root
 * @returns An array containing nodes in the root that are either:
 * 1. Text nodes.
 * 2. Element nodes with the MANUAL class.
 */
function walk(root: Node): Node[] {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    (node: Node): number => {
      if (node.parentElement?.classList.contains(cls.MANUAL)) {
        // Manual nodes are handled individually. Their children don't get
        // processed.
        return NodeFilter.FILTER_REJECT;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        // All text nodes are processed.
        return NodeFilter.FILTER_ACCEPT;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        // A non-text and non-element node should be skipped.
        return NodeFilter.FILTER_SKIP;
      }

      if ((node as Element).matches(EXCLUDE)) {
        // If this element matches the exclude selector, FILTER_REJECT
        // tells TreeWalker to discard this node AND its children.
        return NodeFilter.FILTER_REJECT;
      }

      if ((node as Element).classList.contains(cls.MANUAL)) {
        return NodeFilter.FILTER_ACCEPT;
      }

      // If it's a normal element, we don't want to yield the element
      // itself, but we DO want to visit its children.
      return NodeFilter.FILTER_SKIP;
    }
  );

  const nodes: Node[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
}

/**
 * Replace an enrichment match.
 *
 * @param match
 * @param node
 * @param remainder
 * @param preceding
 * @returns
 */
function replaceMatch(
  match: RegExpExecArray,
  node: Text,
  remainder: string,
  preceding: string
): { replacement?: (Node | string)[]; remainder?: string } {
  // There is a singleton known key that is interpretable as a Bible
  // citation or a Reference, and that is "Am" which could mean:
  // - Amos
  // - Amélineau
  // Whenever it occurs on its own, it refers to the Biblical book.
  // As a postfix of Sh (ShAm), it's Amélineau.
  //
  // For this reason, we prioritize Bible matches over Reference matches.
  const key: string = match[0];
  if (key in bib.MAPPING || key in DAN_OVERRIDE) {
    return replaceBible(key, node, remainder) ?? {};
  }

  if (key in ref.MAPPING) {
    return replaceReference(key, node, remainder) ?? {};
  }

  if (key === 'p' || key === 'pp') {
    const res = handlePage(key + remainder, node);
    // If this is indeed a Crum page, return. Otherwise, fall back to treating
    // it as an annotation below.
    if (res) {
      return res;
    }
  }

  if (key in ann.MAPPING) {
    // 'p' and 'pp' are also annotations, so it's important for annotation
    // handling to have less priority than page handling.
    return handleAnnotation(key, node, remainder, preceding) ?? {};
  }

  // NOTE: Our current regex doesn't match semicolons that immediately
  // follow a word character. This is OK:
  // - In the vast majority of cases, semicolons that should be annotated
  //   occur at some form of boundary.
  // - The few false negatives are acceptable, as the tooltip is identical
  //   for all semicolons, which are abundant.
  if (key === ';') {
    return { replacement: [semicolon()] };
  }

  if (key.toLowerCase() === 'ib') {
    const ib: HTMLElement | null = node.parentElement;
    if (ib?.textContent.toLowerCase() !== 'ib') {
      log.error('ib encountered in an unexpected node:', node);
      return {};
    }
    handleIB(ib);
    return {};
  }

  log.fatal('This is impossible!');
}

/**
 *
 * @param root
 */
function enrich(root: HTMLElement): void {
  for (const node of walk(root)) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).classList.contains(cls.MANUAL)
    ) {
      handleManual(node as HTMLElement);
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      html.replaceNode(node as Text, ENRICHMENT_RE, replaceMatch);
      continue;
    }

    log.fatal('This is impossible!');
  }
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
 * @returns
 */
function semicolon(): HTMLSpanElement {
  const span = document.createElement('span');
  span.classList.add(cls.SEMICOLON);
  span.textContent = ';';
  drop.addDroppable(span, ['semicolons separate groups in meaning or usage']);
  return span;
}

/**
 *
 * @param root
 */
function handleReferenceFollowups(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLSpanElement>(`.${cls.REFERENCE}`)
    .forEach((reference: HTMLSpanElement): void => {
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
      // TODO: (#572) The `suffixFollowups` function considers the possibility
      // that our match has following <sup> element that is part of the suffix.
      // Right now, our code doesn't account for the possibility that such a
      // superscript is followed by a comma that is followed by more suffixes.
      ref.Reference.suffix(
        reference,
        match[0],
        ...suffixFollowups(nextSibling.nextSibling, nextSibling.nodeValue)
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

  const span: HTMLSpanElement = reference.span(ib.cloneNode(true));
  ib.replaceWith(span);

  // Extract a suffix, if available.
  // Notice that many ib references legitimately don't have a suffix.
  if (!next.nodeValue) {
    // No suffix!
    return;
  }
  const suffix: string | undefined = next.nodeValue.match(SUFFIX)?.[0];
  if (!suffix) {
    // No suffix!
    return;
  }

  // TODO: (#671) In some cases, the first token in the suffix is actually
  // part of the reference abbreviation.
  // For example:
  //   1. Mani H ... ib K
  //      The ibidem reference should be interpreted as "Mani K"
  //      rather than "Mani H".
  //   2. BM ... ib Or
  //      The ibidem reference should be interpreted as "BMOr".
  next.nodeValue = next.nodeValue.slice(suffix.length);
  ref.Reference.suffix(
    span,
    suffix,
    ...suffixFollowups(next.nextSibling, next.nodeValue)
  );
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

  const anchor: HTMLAnchorElement = cit.anchor(true);
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
  const a = html.anchor(antecedent.href, true, ib.cloneNode(true));
  ib.replaceWith(a);
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

const DATA_KEY = 'key';
/**
 *
 * @param manual
 * @returns
 */
function handleManual(manual: HTMLElement): void {
  const key: string | undefined = manual.dataset[DATA_KEY];

  if (key === '') {
    // An empty key indicates that this should not be annotated.
    manual.replaceWith(...manual.childNodes);
    return;
  }

  // NOTE: We don't split the suffix out of manually-labeled references, the
  // whole text inside the manual tag is treated as a reference name (which
  // is not true).
  // As of the time of writing, the only side effect of this bug is that
  // annotations don't reflect in the tooltip (#666). This is OK, because
  // the number of manually-marked references is very small anyway.
  if (key) {
    // The key is explicit. The possibilities are:
    // 1. The key is a reference abbreviation.
    // 2. The key is an annotation.
    //
    // The third possibility (the key being a Bible book abbreviation) has
    // never been encountered, so it remains unimplemented.
    //
    // TODO: (#0) Consider supporting explicit Bible book keys for
    // completion. This would require attempting to parse a chapter and
    // verse number from the text.
    const reference: ref.Reference | undefined = ref.MAPPING[key];
    if (reference) {
      // This represents a reference.
      manual.replaceWith(reference.span(...manual.childNodes));
      return;
    }

    // The key represents an annotation.
    manual.replaceWith(annotation(key, ...manual.childNodes));
    return;
  }

  log.ensure(key === undefined); // Sanity check.

  // We need to infer the interpretation. If the text starts with a
  // reference name, then it's a reference. Otherwise, it's a dangling
  // suffix, and we need to find an antecedent.
  REFERENCE_RE.lastIndex = 0;
  const match: RegExpExecArray | null = REFERENCE_RE.exec(manual.textContent);

  if (match?.index === 0) {
    // We can infer the reference from the text.
    const reference: ref.Reference = ref.MAPPING[match[0]]!;
    const span: HTMLSpanElement = reference.span(...manual.childNodes);
    manual.replaceWith(span);
    return;
  }

  // This is a dangling suffix. Find an antecedent.
  // TODO: (#668) Complete the implementation.
}

/**
 *
 * @param ib
 */
function handleIB(ib: HTMLElement): void {
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

  if (antecedent.classList.contains(cls.BIBLE)) {
    handleBibleIB(ib, antecedent, next);
    return;
  }

  log.fatal('This is impossible!');
}

const textContentOverrides: Record<string, string> = {
  [drop.CLS.DROPPABLE]: '',
  [cls.COPY]: '',
  [cls.TAB]: '    ',
  [cls.SEMICOLON]: '; ',
};

/**
 *
 * @param root
 */
function addCopyShortcuts(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.ENTRY}`).forEach((entry: Element): void => {
    const copy: HTMLSpanElement = document.createElement('span');
    copy.textContent = '📋';
    copy.addEventListener('click', () => {
      browser.yank(
        Array.from(entry.querySelectorAll('p'))
          .map((p) => `    ${str.textContent(p, textContentOverrides)}`)
          .join('\n')
      );
    });
    copy.classList.add(cls.COPY);
    drop.addDroppable(copy, ['copy text']);
    entry.prepend(copy);
  });
}

/**
 * Sometimes, Crum uses a superscript to refer to Coptic word forms throughout a
 * paragraph. (Example: ⲛⲏⲏⲃⲉ[1] on 'p 222 a')
 *
 * This function searches for such superscripts and annotates them with
 * tooltips.
 *
 * [1] https://remnqymi.com/crum/1174.html
 * @param root
 */
function handleFormSuperscripts(root: HTMLElement): void {
  const map: Map<string, string> = new Map<string, string>();
  root.querySelectorAll('sup').forEach((sup: HTMLElement): void => {
    if (sup.parentElement?.matches(EXCLUDE)) {
      // This superscript doesn't require annotation. It may be part of a
      // reference suffix or a dialect siglum.
      return;
    }
    const form: string | undefined = map.get(sup.textContent);
    if (form) {
      // This superscript was encountered before. Annotate this instance.
      drop.addDroppable(sup, [form]);
      return;
    }
    // This superscript is seen for the first time. Store the form that it
    // represents in the map.
    const prev: ChildNode | null = sup.previousSibling;
    if (
      prev?.nodeType === Node.ELEMENT_NODE &&
      (prev as Element).classList.contains(cls.COPTIC) &&
      prev.textContent
    ) {
      map.set(sup.textContent, prev.textContent);
    }
  });
}
/* eslint-enable max-lines */
