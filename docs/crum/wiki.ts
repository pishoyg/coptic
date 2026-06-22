/**
 * Package wiki defines Crum Wiki handlers.
 */
/* eslint-disable max-lines */

import * as html from '../html.js';
import * as browser from '../browser.js';
import * as clip from '../clip.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as cls from './cls.js';
import * as log from '../logger.js';
import * as bib from './bible.js';
import * as ann from './annotations.js';
import * as ref from './references.js';
import * as tool from '../tooltip.js';
import * as str from '../str.js';
import * as white from './white.js';
import * as dev from '../dev.js';
import * as scan from '../scan.js';
import * as dial from '../dialect.js';

/**
 * NOTE: All of the regexes below assume the following normalizations:
 * - HTML tree normalization[1], which allows us to use `\s` instead of `\s+`.
 * - NFD normalization[2], which allows us to use `\p{M}`.
 *
 * Additionally, we use unicode-aware regex boundary expressions, because `\b`
 * doesn't fully support Unicode.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize */

/**
 * EXCLUDE matches elements that don't require enrichment.
 *
 * There is a whole lot of regex searches that get executed against every text
 * node in the page, so it may be a good idea to exclude as many subtrees as
 * possible early on to improve performance.
 *
 * It also reduces the risk of false positives.
 */
const EXCLUDE: string = css.disjunction(
  cls.BULLET,
  cls.DIALECT,
  dial.CLS.SIGLUM,
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
 * DAN_OVERRIDE defines special Book names used by Crum to refer to chapters in
 * the Book of Daniel.
 * - 'Su' refers to the chapter that St. Shenouda refers to as A.
 * - 'Bel' refers to the chapter that St. Shenouda refers to as C.
 * - 'Dan Vis 14' refers to the chapter that St. Shenouda refers to as D.
 */
const DAN_OVERRIDE: Record<string, string> = {
  Su: 'A',
  Bel: 'C',
  'Dan Vis 14': 'D',
  'Dan vis 14': 'D',
};

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
  'ed [A-Z]\\p{Letter}+',
  // 'no' means 'number', but it must be followed by an integer, otherwise it's
  // a false positive.
  'no [0-9]+',
  // 'pl' means 'plate', though outside suffixes it means 'plural'.
  'pl [0-9]+',
  // TODO: (#0) Consider explaining 'no' and 'pl' in the tooltip. Right now,
  // only suffixes retrieved from the list of annotations are explained in the
  // tooltip.
  '§\\d*',
  'scala',
  'Scala',
  'stele',
  'plate',
  // TODO: (#709) Treating single letters as suffixes causes a lot of false
  // positives.
  // Elsewhere, our code uses heuristics to exclude common false positives.
  // In most cases, we have to manually mark references to prevent inclusion of
  // false positive suffixes.
  // The following query may be a good start:
  // https://remnqymi.com/crum/?query=%5Cb%5Cd%2B+%5Bacflmv%5D%5Cb&kellia=false&andreas=false&regex=true&wiki=true&case=true
  '[a-zA-Z]\\.?',
  // Roman numerals (in the range 1–3999):
  // NOTE: The Roman numeral regexes must use lookbehind rather than lookahed to
  // force a non-empty match.
  'M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})(?<=[MDCLXVI])',
  'm{0,3}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})(?<=[mdclxvi])',
  ...ann.DATA.filter((abb: ann.Abbreviation) => abb.suffix).flatMap(
    (abb: ann.Abbreviation): string[] =>
      Array.from(ann.variants(abb)).map((variant) => str.escape(variant))
  ),
];

// Single-letter reference abbreviations (e.g. K, P, H) are indistinguishable
// by shape from the single-letter `[a-zA-Z]` suffix token. Without care, the
// "K" in "P 44 66, K 179" would be swallowed as a suffix of the "P" reference
// instead of being recognized as its own reference. This negative lookahead
// keeps a standalone single-letter reference from being mistaken for the start
// of a followup.
//
// The guard applies only to the FIRST token of each followup (the token right
// after the "," / " =" / " &" separator), which is where a new reference would
// begin. It is intentionally not applied elsewhere:
// - Not to the leading suffix: a single letter directly after a reference (as
//   in "P K 179") is still read as a suffix.
// - Not to later tokens within a followup: a mid-followup letter (as the "K" in
//   "P 44, 56 K 179") is intentionally treated as a suffix token, not a new
//   reference.
//
// Only single-letter keys are included: multi-letter abbreviations can't be
// confused with the single-letter suffix token, so including them would only
// bloat the lookahead.
const NOT_SINGLE_LETTER_REFERENCE = `(?! [${Object.keys(ref.MAPPING)
  .filter((key: string): boolean => key.length === 1)
  .join('')}]${str.ASSERT_NON_WORD.source})`;

const NUMBER = `(?:${NUMBERS.join('|')})`;
// A suffix never ends with 'v' or 'l'. As of the time of writing, no such
// suffix is known to exist. Following a reference, these are annotations for
// 'vide' or 'legendum', rather than part of the suffix. (The rule applies to
// the suffix only, matching the historical behavior; followups are unaffected.)
const NUMBER_GROUP = `(?: ${NUMBER}| ?\\(${NUMBER}(?: ${NUMBER})*\\))`;

// SUFFIX matches a reference suffix together with any followups that trail it,
// e.g. the whole " 44 66, 179" in "P 44 66, 179".
const NOT_VL = '(?<!\\b[vl])';

const SUFFIX = new RegExp(
  `^\\.?${NUMBER_GROUP}+${NOT_VL}(?:(?:,| [=&])${NOT_SINGLE_LETTER_REFERENCE + NUMBER_GROUP}+${NOT_VL})*${str.ASSERT_NON_WORD.source}`,
  'u'
);

/**
 * CHAPTER_VERSE defines the regex used to parse the chapter and verse numbers
 * in a Bible citation.
 *
 * Some books, such as the Book of Esther, have special chapters called labeled
 * A through F (though, as of the time of writing, our Bible version only has A,
 * C, D, and F). This is why we allow the chapter number to be one of those
 * characters.
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
const NUMS = '(\\d+|[A-F])(?: (\\d+))?';
// CHAPTER_VERSE matches "NUMS" OR "(NUMS)".
// NOTE:
// 1. This creates two sets of capture groups.
// 2. This is a sticky regex.
const CHAPTER_VERSE = new RegExp(`\\.? (?:${NUMS}|\\(${NUMS}\\))\\b`, 'uy');

// Bible book abbreviations that begin with a number — e.g. "2 Cor". A Bible
// followup is a bare chapter/verse number, so the "2" in
// "Job 3 18, 2 Cor 4 18" could be misread as a followup verse, splitting off
// the "2 Cor" book name. This negative lookahead — built only from numbered
// books, the only abbreviations a numeric followup can be confused with —
// prevents that. Non-numbered books can't be mistaken for a followup, so
// including them would only bloat the lookahead.
const NOT_NUMBERED_BIBLE_BOOK = `(?!${str.regex(
  Object.keys(bib.MAPPING).filter((key: string): boolean => /^\d/.test(key)),
  false
)}${str.ASSERT_NON_WORD.source})`;

/**
 * BIBLE_FOLLOWUP catches followups, such as:
 * - Is 27 11, 56 9, 10
 * - Sa 15 7–9
 * - Si 34 29 (31 26)
 *
 * The NOT_NUMBERED_BIBLE_BOOK lookahead keeps a new numbered citation (e.g.
 * the "2 Cor" in "Job 3 18, 2 Cor 4 18") from being swallowed as a followup.
 * See its definition above.
 *
 * The NOT_SINGLE_LETTER_REFERENCE assertion prevents matching a single-letter
 * reference as a followup (e.g. in "Jer 52 16, C 41 42"). It guards only the
 * comma branch; the en-dash branch always introduces a numeric range, where a
 * single-letter reference can't appear.
 *
 * NOTE: 'A' and 'C' are both single-letter references and special chapter
 * labels (see CHAPTER_VERSE below; e.g. the Book of Esther). The assertion thus
 * makes a genuine comma-followup to chapter A or C (such as a hypothetical
 * "Esth A 1, C 5") unrepresentable — it would be read as a reference instead.
 * No such followup has been encountered in the data, so we accept the trade-off
 * in favor of catching the single-letter reference case.
 */
const BIBLE_FOLLOWUP = new RegExp(
  `^(?:(?:,${NOT_SINGLE_LETTER_REFERENCE} |–)${NOT_NUMBERED_BIBLE_BOOK}(${NUMS})${str.ASSERT_NON_WORD.source}| ?\\((${NUMS})\\))`,
  'u'
);

const PAGE_RE = /^p{1,2} ([0-9]+)(?: ([ab]))?\b/;
const PAGE_FOLLOWUP_RE = /^(, )([0-9]+)(?: ([ab]))?\b/;

// Roman-numeral pages of the Preface and the List of Abbreviations in the
// Crum book scan. The `Index` override table in `crum/book.ts` resolves
// these to logical page numbers.
const PREFACE_PAGE = 'v';
const LIST_OF_ABBREVIATIONS_PAGE = 'xi';

const REFERENCE_RE = new RegExp(str.regex(Object.keys(ref.MAPPING)), 'gu');

/**
 * formSuperscripts maps the text content of a form-superscript element to the
 * Coptic form it stands for, for the wiki currently being processed.
 *
 * It is populated by `collectFormSuperscripts` before enrichment, consulted by
 * `suffixFollowups` to decide whether a trailing `<sup>` belongs to a
 * reference suffix or is a form superscript, and read by
 * `annotateFormSuperscripts` to add tooltips at the end.
 */
let formSuperscripts = new Map<string, string>();

/**
 *
 * @param wiki
 * @returns
 */
function textContent(wiki: HTMLElement): string {
  // Our enricher adds tooltips, which we need to eliminate in order to obtain
  // the original text.
  // Additionally, we add a copy button, and we should get rid of that as well.
  return str.textContent(wiki, {
    [`.${cls.COPY}`]: '',
    [`.${cls.FINE_PRINT}`]: '',
    del: '',
  });
}

/**
 * Handle all Crum elements.
 * @param root
 * @param full
 */
export function handle(root: HTMLElement, full = true): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.WIKI}`)
    .forEach((wiki: HTMLElement): void => {
      handleAux(wiki, full);
    });
}

/**
 *
 * @param wiki
 * @param full
 */
function handleAux(wiki: HTMLElement, full: boolean): void {
  const startText: string | undefined = dev.play(() => textContent(wiki));

  // Identify form superscripts before enrichment so that reference suffix
  // processing can distinguish a trailing `<sup>` that stands for a Coptic
  // form from one that is part of the suffix itself.
  formSuperscripts = collectFormSuperscripts(wiki);

  enrich(wiki);

  handleAddenda(wiki);

  handleFootnotes(wiki);

  if (full) {
    addEntryCopyShortcuts(wiki);

    addTextCopyTriggers(wiki);

    handleFormSuperscripts(wiki);

    addFinePrint(wiki);
  }

  dev.play(() => {
    white.warnPotentiallyMissingReferences(wiki, EXCLUDE);

    const endText: string = textContent(wiki);
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
}

/**
 *
 * @param wiki
 */
function addFinePrint(wiki: HTMLElement): void {
  const div: HTMLDivElement = document.createElement('div');
  div.append(
    'See ',
    html.anchor(paths.crumScan(PREFACE_PAGE), 'preface'),
    ' and ',
    html.anchor(
      paths.crumScan(LIST_OF_ABBREVIATIONS_PAGE),
      'list of abbreviations'
    ),
    '.'
  );
  div.classList.add(cls.FINE_PRINT);
  wiki.insertAdjacentElement('beforeend', div);
}

/**
 *
 * @param tip
 * @param {...any} children
 * @returns
 */
function annotation(tip: string, ...children: (Node | string)[]): Element {
  let elem: Element;
  let italic: boolean;
  if (children.length === 1 && children[0] instanceof Element) {
    elem = children[0];
    italic = elem.nodeName === 'I';
  } else {
    elem = document.createElement('span');
    elem.append(...children);
    italic = children.every((e) => e instanceof Node && e.nodeName === 'I');
  }
  tool.addTooltip(elem, [html.maybeI(tip, italic)]);
  elem.classList.add(cls.ANNOTATION);
  return elem;
}

/**
 *
 * @param context
 * @returns
 */
function handleAnnotation(context: html.Context): void {
  const key: string = context.match[0];
  const annot: ann.Annotation | undefined = ann.MAPPING[key];
  if (!annot) {
    log.fatal("Can't find annotation:", key);
  }

  // The question mark is a very common annotation, and punctuation mark. We use
  // a simple heuristic to distinguish the two. Even if heuristic yields false
  // negative annotations, false negatives are deemed more
  // tolerable than false positives, so this is OK.
  // The interpretation of the mark is quite clear, so it doesn't really need an
  // annotation.
  if (
    key === '?' &&
    !['(', ' '].some((token) => context.left.endsWith(token))
  ) {
    // False positive!
    return;
  }

  if (
    key === 'art' &&
    (context.right.startsWith(' thou') || context.left.endsWith('thou '))
  ) {
    // False positive!
    return;
  }

  // We consume the key-length nodes first so we can inspect them.
  const nodes = context.munch(key.length);

  if (
    annot.noStyledParent &&
    nodes.some((node: Node): boolean => ['I', 'SUP'].includes(node.nodeName))
  ) {
    // This annotation can't show in styled text, and this node is
    // styled.
    context.replace(nodes, 0);
    return;
  }

  context.replace(annotation(annot.fullForm, ...nodes), 0);
}

/**
 * Insert hyperlinks for page references in the text.
 *
 * @param context
 * @returns
 */
function handlePage(context: html.Context): boolean {
  const key: string = context.match[0];
  // A page number has the format 'pp? [0-9]+ [ab]?'. The regex matches this
  // format, excluding the column, which is expected to live in the <i> tag that
  // is the next sibling.
  let match: RegExpExecArray | null = PAGE_RE.exec(key + context.right);
  if (!match) {
    return false;
  }

  const replacement: (Node | string)[] = [];
  const nodes = context.munch(match[0].length);
  const a = html.anchor(
    paths.crumScan(`${match[1]!}${match[2] ?? ''}`),
    ...nodes
  );
  a.classList.add(cls.PAGE);
  replacement.push(a);

  for (
    let remainder = context.right;
    (match = PAGE_FOLLOWUP_RE.exec(remainder));
    remainder = context.right
  ) {
    const comma = match[1]!;
    replacement.push(...context.munch(comma.length));
    const followupNodes = context.munch(match[0].length - comma.length);
    const followupA = html.anchor(
      paths.crumScan(`${match[2]!}${match[3] ?? ''}`),
      ...followupNodes
    );
    followupA.classList.add(cls.PAGE);
    replacement.push(followupA);
  }

  context.replace(replacement, 0);
  return true;
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
  private readonly book: bib.Book;
  /**
   *
   * @param raw
   * @param chapter
   * @param verse
   * @param key
   */
  public constructor(
    private raw: string,
    private chapter: string | undefined,
    private verse: string | undefined,
    key: string
  ) {
    if (key in DAN_OVERRIDE) {
      this.verse = this.chapter;
      this.chapter = DAN_OVERRIDE[key];
      key = 'Dan';
      this.explicit = false;
    }

    this.book = bib.MAPPING[key]!;

    if (this.chapter && !this.verse && this.book.chapters.length === 1) {
      // This is a one-chapter book. The number immediately following the book
      // abbreviation was interpreted as the chapter number, but it is actually
      // the verse number; the chapter is the book's sole chapter.
      this.verse = this.chapter;
      this.chapter = this.book.chapters[0]!;
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
   * If the chapter is undefined, we return false.
   *
   * @returns
   */
  private knownChapter(): boolean {
    // TODO: (#0) Add a developer-mode check that the list of chapters is sorted
    // in lexicographical order.

    if (this.chapter === undefined) {
      return false;
    }

    let left = 0;
    let right = this.book.chapters.length - 1;

    while (left <= right) {
      // Find the middle index
      const mid: number = Math.floor((left + right) / 2);
      const midChapter: string = this.book.chapters[mid]!;

      if (midChapter === this.chapter) {
        return true;
      }

      if (midChapter < this.chapter) {
        left = mid + 1; // Search the right half.
      } else {
        right = mid - 1; // Search the left half.
      }
    }

    return false; // Chapter not found
  }

  /**
   * @param ibidem
   * @param content
   * @returns
   */
  public anchor(ibidem = false, ...content: (Node | string)[]): HTMLElement {
    if (!content.length) {
      content.push(this.raw);
    }

    let elem: HTMLElement;
    // The `this.chapter` guard is required because we want to hyperlink
    // chapter-less citations normally.
    if (this.chapter && !this.knownChapter()) {
      // If the chapter is missing from our Bible index, fall back to a plain
      // <span>: we still annotate with a tooltip, but skip the hyperlink (which
      // would point to a non-existent page).
      log.warn(
        'Bible citation references unknown chapter:',
        `${this.book.abb} ${this.chapter}`
      );
      elem = document.createElement('span');
      elem.append(...content);
    } else {
      elem = html.anchor(
        paths.bible(this.book.path, this.chapter, this.verse),
        ...content
      );
    }

    elem.classList.add(cls.BIBLE);
    elem.dataset[Citation.DATA_BOOK] = this.book.abb;
    elem.dataset[Citation.DATA_CHAPTER] = this.chapter ?? '';
    elem.dataset[Citation.DATA_VERSE] = this.verse ?? '';
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
    tool.addTooltip(elem, tooltip, [cls.BIBLE]);
    return elem;
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
      node.dataset[Citation.DATA_BOOK]!
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
   *
   * The optional parameters provide the surrounding parse context, which is
   * required for the disambiguation heuristic for some books.
   *
   * @param remainder - The text remaining after the book abbreviation and the
   *   chapter/verse match (if any) were consumed.
   * @param next - The sibling node that follows the text containing this
   *   citation. Used as a signal by the disambiguation heuristic.
   * @returns
   */
  public valid(remainder?: string, next?: Node | null): boolean {
    // NOTE: In most cases, we deliberately don't reject citations whose chapter
    // is missing from the Bible index — `anchor()` handles that case by
    // annotating with a tooltip but no hyperlink, and logging a warning.
    // However, in some cases, strictness is necessary.
    // See #705 and #709.

    // NOTE: We don't verify any verification of verse numbers. But in some
    // cases the absence of a verse is used to detect false positives.

    if (['AP', 'PS', 'AM'].includes(this.book.abb)) {
      // Distinguish between citations of Acta Pauli and Apocalypse, Pistis
      // Sophia and Psalms, and Amos and Actes des Martyrs.
      // See #705 and #709.
      return this.knownChapter() && !!this.verse;
    }

    // Amos citations were always followed by either zero numbers or two numbers
    // representing the chapter and verse, while the latter was only followed by
    // one number represented the page.
    if (this.book.abb === 'Am') {
      return !this.chapter || (this.knownChapter() && !!this.verse);
    }

    // "Is" and "He" are also English words that often occur in the text.
    // This heuristic is based on known examples (#524), but other cases might
    // turn up in the text that violate these rules. See #709.
    // The check is skipped when the parse context is not provided.
    if (['He', 'Is'].includes(this.book.abb)) {
      if (remainder === undefined) {
        // We can not detect false positives without the context. Assume true
        // positive.
        return true;
      }

      if (this.chapter) {
        // Followed by a chapter — true positive.
        return true;
      }

      if (
        [')', ' Kropp', ' om ', ' l c'].some((token: string): boolean =>
          remainder.startsWith(token)
        )
      ) {
        return true;
      }

      if (
        remainder === ' ' &&
        next?.nodeType === Node.ELEMENT_NODE &&
        (next as Element).classList.contains(cls.DIALECT)
      ) {
        return true;
      }

      // Otherwise, false positive.
      return false;
    }

    return true;
  }
}

/**
 * Parse the Bible followups that trail a citation, updating `cit` in place as
 * it goes.
 *
 * @param cit - The antecedent citation, mutated to reflect each followup.
 * @param remainder - The text following the citation.
 * @returns The replacement `nodes` for the consumed followups and the number of
 *   characters (`munch`) consumed from `remainder`.
 */
function parseBibleFollowups(
  cit: Citation,
  remainder: string
): (Node | string)[] {
  const nodes: (Node | string)[] = [];
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
      log.error('Bible followup contains invalid citation:', match[0]);
      break;
    }

    // The part that of the remainder that is being replaced is `match[0]`.
    // Within `match[0]`, the `raw` text will be enriched, while the text before
    // and after `raw` will be passed as is.
    const rawIdx: number = match[0].indexOf(raw);
    nodes.push(
      match[0].slice(0, rawIdx),
      cit.anchor(),
      match[0].slice(rawIdx + raw.length)
    );

    remainder = remainder.slice(match[0].length);
  }
  return nodes;
}

/**
 *
 * @param context - A context whose `match` field is a Bible key.
 * @returns
 */
function replaceBible(context: html.Context): boolean {
  // Parse the numbers following the book abbreviation.
  const key: string = context.match[0];
  let right: string = context.right;
  CHAPTER_VERSE.lastIndex = 0;
  const match: RegExpExecArray | null = CHAPTER_VERSE.exec(right);
  right = right.slice(match?.[0].length ?? 0);

  const cit: Citation = new Citation(
    key + (match?.[0] ?? ''),
    match?.[1] ?? match?.[3],
    match?.[2] ?? match?.[4],
    key
  );

  if (!cit.valid(right, context.chainNextSibling)) {
    return false;
  }

  context.replace([
    // NOTE: This citation's anchor must be built before parsing followups,
    // since followup parsing mutates `cit` in place.
    cit.anchor(),
    // Resolve any followups (e.g. the ", 56 9" in "Is 27 11, 56 9") in the same
    // pass. This used to be deferred to a second pass to avoid splitting a
    // numbered book like the "2 Cor" in "Job 3 18, 2 Cor 4 18"; a negative
    // lookahead in BIBLE_FOLLOWUP now guards against that instead.
    ...parseBibleFollowups(cit, right),
  ]);
  return true;
}

/**
 *
 * @param context
 * @returns
 */
function* suffixFollowups(context: html.Context): Generator<Node | string> {
  // TODO: (#0) This function considers the possibility
  // that our match has following <sup> element that is part of the suffix.
  // Right now, our code doesn't account for the possibility that such a
  // superscript is followed by a comma that is followed by more suffixes.
  // We have never encountered such a case in reality, so we dismiss this
  // possibility for the time being.

  if (context.right) {
    // There is text before the superscript that is suspected to be part of the
    // suffix.
    return;
  }

  const maybeSUP: Node | null = context.chainNextSibling;
  if (maybeSUP?.nodeName !== 'SUP') {
    // This is not a superscript.
    return;
  }

  const next: ChildNode | null = maybeSUP.nextSibling;
  if (next?.nodeValue) {
    const match: RegExpMatchArray | null = next.nodeValue.match(SUFFIX);
    if (match) {
      // The superscript appears in the middle of a suffix (more suffix text
      // follows it), so it is part of the suffix.
      yield maybeSUP;
      yield match[0];
      next.nodeValue = next.nodeValue.slice(match[0].length);
      return;
    }
  }

  // The superscript appears at the end of the suffix (no further suffix text
  // follows it). If it matches a known form superscript, leave it alone — it
  // will receive a form tooltip in `annotateFormSuperscripts`. Otherwise,
  // treat it as a trailing part of the suffix.
  // NOTE: Previously, the heuristic assumed that suffix superscripts only
  // appeared mid-suffix. Rare exceptions (e.g. [1]) where they appear
  // at the end necessitated checking against known form superscripts instead
  // of relying solely on position.
  //   https://remnqymi.com/crum/636.html#:~:text=P%201303
  if (formSuperscripts.has(maybeSUP.textContent ?? '')) {
    return;
  }

  yield maybeSUP;
}

/**
 *
 * @param context
 * @returns
 */
function replaceReference(context: html.Context): void {
  const key: string = context.match[0];
  const suffix: string | undefined = SUFFIX.exec(context.right)?.[0];
  if (key === 'My' && !suffix && !context.right.startsWith(')')) {
    // False positive.
    return;
  }

  const span: HTMLSpanElement = ref.MAPPING[key]!.span(
    context.munch(key.length),
    suffix ? [...context.munch(suffix.length), ...suffixFollowups(context)] : []
  );

  context.replace(span, 0);
}

/**
 *
 * @param root
 * @returns An array containing nodes in the root that are either:
 * 1. Text nodes.
 * 2. Element nodes with the MANUAL class.
 * 3. Element nodes that are <i> tags.
 */
function walk(root: Node): Node[] {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    (node: Node): number => {
      const parent = node.parentElement;
      if (parent?.classList.contains(cls.MANUAL)) {
        // Manual nodes are handled individually. Their children don't get
        // processed.
        return NodeFilter.FILTER_REJECT;
      }

      if (parent?.nodeName === 'I') {
        // We handle <i> elements as atomic nodes in the chain. Thus, we should
        // not visit their children.
        return NodeFilter.FILTER_REJECT;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        // All text nodes are processed.
        return NodeFilter.FILTER_ACCEPT;
      }

      if (!(node instanceof Element)) {
        // A non-text and non-element node should be skipped.
        return NodeFilter.FILTER_SKIP;
      }

      if (node.matches(EXCLUDE)) {
        // If this element matches the exclude selector, FILTER_REJECT
        // tells TreeWalker to discard this node AND its children.
        return NodeFilter.FILTER_REJECT;
      }

      if (node.classList.contains(cls.MANUAL)) {
        return NodeFilter.FILTER_ACCEPT;
      }

      if (node.nodeName === 'I') {
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
 * @param context
 * @returns
 */
function replaceMatch(context: html.Context): void {
  const key: string = context.match[0];

  // NOTE: The text contains frequent errors, especially regarding
  // capitalization of abbreviations.
  // The Bible parsing logic has more intelligent validation that can detect
  // false positives. For ambiguous cases, we try to parse the match as a Bible
  // citation first, falling back to parsing it as a Reference.
  //
  // The following cases are resolved using this heuristics:
  //
  // - 'Am' and 'AM' are ambiguous.
  //   The former usually refers to Amos, but occasionally refers to Actes des
  //   Martyrs.
  //   The latter usually refers to Actes des Martyrs, but occasionally refers
  //   to Amos.
  //
  // - 'AP' is ambiguous. It usually refers to Acta Pauli, but occasionally
  //   refers to the Apocalypse.
  //   'Ap' usually refers to Apocalypse, but occasionally refers to Acta
  //   Pauli. We resolve such errors manually, as they can't be easily caught
  //   with a heuristic.
  //
  // - 'PS' is ambiguous. It usually refers to Pistis Sophia, but occasionally
  //   refers to the Psalms.
  //   'Ps' almost always refers to the Psalms. Instances where 'Ps' refers to
  //   Pistis Sophia are rare, and can't be easily detected with a heuristic, so
  //   we opted for marking them manually whenever we come across one.

  if (['Am', 'AM', 'AP', 'PS'].includes(key)) {
    if (!replaceBible(context)) {
      replaceReference(context);
    }
    return;
  }

  if (key in bib.MAPPING || key in DAN_OVERRIDE) {
    replaceBible(context);
    return;
  }

  if (key in ref.MAPPING) {
    replaceReference(context);
    return;
  }

  if (key.toLowerCase() === 'ib') {
    replaceIB(context);
    return;
  }

  if (key === 'p' || key === 'pp') {
    if (handlePage(context)) {
      return;
    }
    // If this is not a Crum page, fall back to handling it as an annotation
    // below.
    // NOTE: This is not expected, because the `p` annotation only ever occurs
    // as a Crum page or a suffix annotation.
  }

  if (key in ann.MAPPING) {
    // 'p' and 'pp' are also annotations, so it's important for annotation
    // handling to have less priority than page handling.
    handleAnnotation(context);
    return;
  }

  if (key === ';') {
    context.replace(semicolon());
    return;
  }

  log.fatal('This is impossible!');
}

/**
 *
 * @param root
 */
export function enrich(root: HTMLElement): void {
  const chains = function* (): Generator<Node[]> {
    let chain: Node[] = [];
    for (const node of walk(root)) {
      if (node instanceof Element && node.classList.contains(cls.MANUAL)) {
        if (chain.length > 0) {
          yield chain;
          chain = [];
        }
        handleManual(node as HTMLElement);
        continue;
      }

      if (chain.length === 0) {
        chain.push(node);
        continue;
      }

      if (chain[chain.length - 1]!.nextSibling === node) {
        chain.push(node);
      } else {
        yield chain;
        chain = [node];
      }
    }
    if (chain.length > 0) {
      yield chain;
    }
  };

  for (const chain of chains()) {
    html.replaceNodes(new html.Chain(chain), ENRICHMENT_RE, replaceMatch);
  }
}

// On an addendum element, the page number lives in a `data-page` attribute.
const DATA_PAGE = 'page';

// On a `.footnoted` wrapper, the footnote text lives in a `data-footnote`
// attribute.
const DATA_FOOTNOTE = 'footnote';

/**
 * Wire a hover tooltip onto each `.footnoted` wrapper carrying a
 * `data-footnote` so the footnote text renders above it, matching the addenda
 * treatment. The whole wrapper is the trigger; the inner `.mark` keeps the
 * `[N]` indicator visible to flag the presence of a footnote.
 *
 * The footnote text in `data-footnote` is the raw HTML produced by the Python
 * pipeline (Coptic/Greek spans, italics, etc. all rendered before the footnote
 * was extracted). It is injected via `innerHTML` so that formatting is
 * preserved, then run through `handleAux` so that citations and references
 * inside the footnote pick up the same enrichment as the main entry.
 *
 * @param root
 */
export function handleFootnotes(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.FOOTNOTED}[data-${DATA_FOOTNOTE}]`)
    .forEach((footnoted: HTMLElement): void => {
      const content: HTMLSpanElement = document.createElement('span');
      content.innerHTML = footnoted.dataset[DATA_FOOTNOTE]!;
      handleAux(content, false);
      // We attach footnotes to the mark rather than the `.footnoted` parent to
      // avoid having too many tooltips at the same time, which would make the
      // display overwhelming.
      // The footnote itself is a tooltip that (usually) contains nested
      // tooltips! Footnoted text also (usually) has tooltips. If hovering the
      // footnoted text were to show the footnote, that could trigger too many
      // overlapping tooltips simultaneously!
      tool.addTooltip(
        footnoted.querySelector(css.c(cls.MARK))!,
        [content],
        [],
        'hover',
        'above'
      );
    });
}

/**
 *
 * @param root
 */
export function handleAddenda(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(`.${cls.ADDENDUM}`)
    .forEach((elem: HTMLElement): void => {
      const page: string = elem.dataset[DATA_PAGE]!;
      const a: HTMLAnchorElement = html.anchor(
        paths.crumScan(page),
        ...scan.prettyPage(page)
      );
      tool.addTooltip(elem, ['Addenda', ' (', a, ')'], [], 'hover', 'above');
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
  tool.addTooltip(
    span,
    ['semicolons separate groups in meaning or usage'],
    [cls.SEMICOLON]
  );
  return span;
}

const DATA_KEY = 'key';
/**
 *
 * @param manual
 * @returns
 */
function handleManual(manual: HTMLElement): void {
  // NOTE: Manual labels don't support suffix annotations. No manually-labeled
  // references with suffix annotations are present in the data, as of the time
  // of writing.
  // Even if such cases were to be introduced, their frequency would be too low
  // to be worth addressing.
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
      manual.replaceWith(reference.span([...manual.childNodes]));
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
    const span: HTMLSpanElement = reference.span([...manual.childNodes]);
    manual.replaceWith(span);
    return;
  }

  // This is a dangling suffix. Find an antecedent.
  // TODO: (#668) Complete the implementation.
}

/**
 *
 * @param ib
 * @returns
 */
function ibFallback(ib: HTMLElement): HTMLElement {
  ib.classList.add(cls.ANNOTATION);
  tool.addTooltip(ib, [ref.ibidem()]);
  return ib;
}

/**
 *
 * @param ib
 * @param antecedent
 * @param context
 * @returns
 */
function handleReferenceIB(
  ib: HTMLElement,
  antecedent: HTMLElement,
  context: html.Context
): void {
  const suffix: string | undefined = SUFFIX.exec(context.right)?.[0];
  const span: HTMLSpanElement = ref.Reference.fromSpan(antecedent).span(
    [ib],
    suffix ? [...context.munch(suffix.length), ...suffixFollowups(context)] : []
  );
  context.replace(span, 0);
}

/**
 *
 * @param ib
 * @param antecedent
 * @param context
 * @returns
 */
function handleBibleIB(
  ib: HTMLElement,
  antecedent: HTMLElement,
  context: html.Context
): void {
  // Construct the antecedent citation.
  const cit: Citation = Citation.fromAnchor(antecedent);

  // Update the citation with numbers from this citation.
  // Notice that it's valid for the new citation to not have any numbers.
  // The regex is sticky. Last index needs to be reset.
  CHAPTER_VERSE.lastIndex = 0;
  const match: RegExpMatchArray | null | undefined = CHAPTER_VERSE.exec(
    context.right
  );
  cit.update(
    match?.[0] ?? '',
    match?.[1] ?? match?.[3],
    match?.[2] ?? match?.[4]
  );

  const anchor: HTMLElement = cit.anchor(
    true,
    ib,
    ...context.munch(match?.[0].length ?? 0)
  );

  const followups: (Node | string)[] = parseBibleFollowups(
    cit,
    context.remainder
  );
  context.replace([anchor, ...followups], html.textLength(followups));
}

/**
 *
 * @param ib
 * @param antecedent
 * @returns
 */
function handlePageIB(
  ib: HTMLElement,
  antecedent: HTMLAnchorElement
): HTMLElement {
  // This `ib` instances refers to a Crum page.
  // An example is 1730 (ⲟⲩⲱⲛⲅ):
  //   https://remnqymi.com/crum/1730.html
  // We don't expect a suffix to be present.
  const a = html.anchor(antecedent.href, ib.cloneNode(true));
  tool.addTooltip(a, [ref.ibidem()]);
  return a;
}

/**
 *
 * @param context
 * @returns
 */
function replaceIB(context: html.Context): void {
  // We expect the 'ib' match to be a clean 'ib' element.
  const ibNodes: Node[] = context.munch(context.match[0].length);

  let ib: HTMLElement;
  if (
    ibNodes.length === 1 &&
    ibNodes[0]?.nodeType === Node.ELEMENT_NODE &&
    ibNodes[0].textContent?.toLowerCase() === 'ib'
  ) {
    ib = ibNodes[0] as HTMLElement;
  } else {
    log.error('ib element found in an unexpected node:');
    context.replace(ibNodes, 0);
    return;
  }

  const antecedent: HTMLElement | null = findAntecedent(context, ib);

  if (!antecedent) {
    log.error('Unable to find antecedent reference for ib element', ib);
    ibFallback(ib);
    context.replace(ib, 0);
    return;
  }

  if (antecedent.classList.contains(cls.PAGE)) {
    context.replace(handlePageIB(ib, antecedent as HTMLAnchorElement), 0);
    return;
  }

  if (antecedent.classList.contains(cls.REFERENCE)) {
    handleReferenceIB(ib, antecedent, context);
    return;
  }

  if (antecedent.classList.contains(cls.BIBLE)) {
    handleBibleIB(ib, antecedent, context);
    return;
  }

  log.fatal('This is impossible!');
}

const ANTECEDENT_QUERY: string = css.disjunction(
  cls.REFERENCE,
  cls.BIBLE,
  cls.PAGE
);

/**
 *
 * @param node
 */
function* antecedentWalk(node: Element | null): Generator<Element> {
  // NOTE: The following while loop is implemented based on the current HTML
  // structure, which, as of the time of writing, looks as follows:
  //   <p>
  //     <span class="subparagraph"> ...candidates </span>
  //     ...
  //     <span class="subparagraph"> ...candidates </span>
  //   </p>
  //   <p>
  //     <span class="subparagraph"> ...candidates </span>
  //     ...
  //     <span class="subparagraph"> ...candidates </span>
  //   </p>
  //   ...
  while (
    (node =
      // Try the element's previous sibling.
      node?.previousElementSibling ??
      // Move to the previous subparagraph. Use `previousElementSibling` to
      // skip the whitespace text node between adjacent `<span>`s.
      node?.parentElement?.previousElementSibling?.lastElementChild ??
      // Move to the previous paragraph. Use `previousElementSibling` to skip
      // the whitespace between adjacent `<p>`s, and `lastElementChild` to
      // skip trailing whitespace inside that previous `<p>`.
      node?.parentElement?.parentElement?.previousElementSibling
        ?.lastElementChild?.lastElementChild ??
      null)
  ) {
    yield node;
  }
}

/**
 * Find the first preceding sibling to the given ibidem element that is either
 * a reference, a Bible citation, or a page.
 *
 * @param context
 * @param start
 * @returns
 */
function findAntecedent(
  context: html.Context,
  start: HTMLElement
): HTMLElement | null {
  // Candidates are gathered from two roots, because the preceding elements are
  // split across two trees at this point in enrichment:
  // 1. The already-enriched elements of the CURRENT chain live in the
  //    in-progress `fragment`, which is detached from the document until
  //    `replaceNodes` splices it back at the very end. A DOM walk rooted at
  //    `start` (the `ib` element, still in the live tree) therefore cannot see
  //    them, so we take them directly: `nearest` (the closest) and its
  //    predecessors within the fragment.
  // 2. Everything before this chain — earlier siblings, subparagraphs, and
  //    paragraphs — is still in the live document and is reached by walking up
  //    from `start`.
  //
  // The two walks cannot overlap: walk 1 ranges only over the detached
  // fragment, walk 2 only over the live document, and a node belongs to exactly
  // one of those trees. (The fragment's nodes were *moved*, not copied, out of
  // the live tree as they were enriched.)
  const candidates = function* (): Generator<Element> {
    const nearest: Element | null = context.matchPreviousElementSibling();
    if (nearest) {
      yield nearest;
      yield* antecedentWalk(nearest);
    }
    yield* antecedentWalk(start);
  };

  for (const curr of candidates()) {
    if (curr.matches(ANTECEDENT_QUERY)) {
      return curr as HTMLElement;
    }
  }

  return null;
}

/**
 *
 * @param entry
 * @returns
 */
function entryText(entry: Element): string {
  return Array.from(entry.querySelectorAll('p'))
    .map((p: HTMLParagraphElement): string =>
      Array.from(p.querySelectorAll(`.${cls.SUBPARAGRAPH}`))
        // Drop `<del>` tags, which are used for omissions.
        .map((element: Element) => str.textContent(element))
        .map((text: string): string => `    ${text}`)
        .join('')
    )
    .join('\n');
}

/**
 *
 * @param root
 */
function addEntryCopyShortcuts(root: HTMLElement): void {
  root.querySelectorAll(`.${cls.ENTRY}`).forEach((entry: Element): void => {
    entry.prepend(clip.copyButton(() => entryText(entry), [cls.COPY]));
  });
}

/**
 *
 * @param root
 */
function addTextCopyTriggers(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(
      // NOTE: The following currently excludes GREEK, because Greek possesses
      // lookup hyperlinks.
      // TODO: (#661,#658) Figure out a way to allow copying and lookups to
      // coexist.
      css.disjunction(
        cls.GLOSS,
        cls.COPTIC,
        cls.AMHARIC,
        cls.ARABIC,
        cls.ARAMAIC,
        cls.DEMOTIC,
        cls.HEBREW
      )
    )
    .forEach((word: HTMLElement): void => {
      word.addEventListener('click', () => {
        browser.yank(word.textContent);
      });
    });
}

/**
 * Sometimes, Crum uses a superscript to refer to Coptic word forms throughout a
 * paragraph. (Example: ⲛⲏⲏⲃⲉ[1] on 'p 222 a')
 *
 * A form superscript is a `<sup>` element whose immediate previous sibling is
 * a `<span class="coptic">`. This function walks the wiki and builds a map
 * from each such superscript's text content to its Coptic form. The map is
 * keyed by text content so that later occurrences of the same superscript
 * (without an adjacent Coptic sibling) can also be annotated.
 *
 * [1] https://remnqymi.com/crum/1174.html
 * @param root
 * @returns
 */
function collectFormSuperscripts(root: HTMLElement): Map<string, string> {
  const map: Map<string, string> = new Map<string, string>();
  root.querySelectorAll('sup').forEach((sup: HTMLElement): void => {
    const prev: ChildNode | null = sup.previousSibling;
    if (
      prev?.nodeType !== Node.ELEMENT_NODE ||
      !(prev as Element).classList.contains(cls.COPTIC) ||
      !prev.textContent
    ) {
      return;
    }
    if (map.has(sup.textContent)) {
      return;
    }
    map.set(sup.textContent, prev.textContent);
  });
  return map;
}

/**
 * Add form tooltips to `<sup>` elements that were not consumed as part of a
 * reference suffix during enrichment. Uses the form-superscript map built by
 * `collectFormSuperscripts`.
 *
 * @param root
 */
function handleFormSuperscripts(root: HTMLElement): void {
  root.querySelectorAll('sup').forEach((sup: HTMLElement): void => {
    if (sup.parentElement?.matches(EXCLUDE)) {
      // This superscript doesn't require annotation. It may be inside a
      // reference span, a dialect siglum, or another excluded element.
      return;
    }
    const form: string | undefined = formSuperscripts.get(sup.textContent);
    if (!form) {
      log.error('Unable to find the form of superscript', sup.textContent);
      return;
    }
    if (sup.previousSibling?.textContent === form) {
      // This is the <sup> element that defines the form.
      return;
    }
    tool.addTooltip(sup, [form]);
  });
}
/* eslint-enable max-lines */
