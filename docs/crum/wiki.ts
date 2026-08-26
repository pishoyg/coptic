/**
 * Package wiki defines Crum Wiki handlers.
 *
 * NOTE: Changes to the enricher may require corresponding updates to the
 * materializer (`dictionary/marcion_sourceforge_net/wiki.ts`) or Ambrose
 * (`.claude/commands/ambrose.md`).
 */
/* eslint-disable max-lines */

import * as html from '../html.js';
import * as browser from '../browser.js';
import * as clip from '../clip.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
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
import * as book from './book.js';

/**
 * The Bible book mapping, keyed by every Crum abbreviation. It's derived from
 * the generated book list (`bib.BOOKS`): each book is reachable under each of
 * its abbreviations.
 */
const BIBLE_MAPPING: Record<string, bib.Book> = Object.fromEntries(
  bib.BOOKS.flatMap((bk: bib.Book): [string, bib.Book][] =>
    bk.crum.map((abb: string): [string, bib.Book] => [abb, bk])
  )
);

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
  cls.HIEROGLYPHIC,
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
  'Dan Vis xiv': 'D', // Only once.
  'Dan vis xiv': 'D', // Does not occur, added for completion!
};

// UNNUMBERED_BIBLE_BOOK is a set of names of multi-part Bible books, with the
// numbers removed.
// As of the time of writing (at 95% complete), Crum omitted the number from a
// numbered Bible book only two times:
// - Citing 'Kg' under ⲙⲁϩ-[1].
// - Citing 'Thes' under ⲛⲟⲩϯ[2].
//
// A third time ('Kg' under ⲑⲟⲩⲁⲓ[3]) is a typo.
// As of the time of writing, due to similarity in the notations used for manual
// labeling and footnotes, we can either footnote or manually label this typo.
// Since it's footnoted, we cannot use a manual label to omit the erroneous
// tooltip. Thus, this feature has a precision of 66%!
//
// [1] https://remnqymi.com/crum/1151.html#:~:text=Kg
// [2] https://remnqymi.com/crum/31.html#:~:text=Thes
// [3] https://remnqymi.com/crum/1666.html#:~:text=Kg
const UNNUMBERED_BIBLE_BOOK: Set<string> = new Set<string>(
  Object.keys(BIBLE_MAPPING)
    .filter((key: string): boolean => /^\d /.test(key))
    .map((key: string): string => key.slice(2))
    // There is '1 Jo', '2 Jo', and '3 Jo' for the Epistles. But there is also
    // just 'Jo' for the Gospel of John. An unqualified 'Jo' refers to the
    // Gospel, not the epistles.
    .filter((key: string): boolean => !(key in BIBLE_MAPPING))
);

// DANGLING_SUFFIX_MARKERS are tokens that precede dangling suffixes. The
// boolean value indicates confidence levels. A value of true means that we can
// safely assume that whenever this token is followed by a number, that number
// is a dangling suffix. False indicates that we should exercise some caution.
const DANGLING_SUFFIX_MARKERS: Record<string, boolean> = {
  cf: true,
  Cf: true,
  v: true,
  V: true,
  as: true,
  also: true,
  but: true,
  paral: true,
  var: true,
  varr: true,
  'e g': true,
  nos: true,
  which: true,
  in: false,
  for: false,
  ':': false,
  ',': false,
  ';': false,
  '=': false,
  '&': false,
  '?': false,
};

// ENRICHMENT_RE decides WHICH key matches. It is the first of the two stages
// that together determine every enrichment decision; the second is
// `replaceMatch`, which decides how the matched key is INTERPRETED.
//
// The stages run in that order, and the consequence is easy to miss: because
// `str.regex` sorts all keys longest-first, the longest key that fits wins the
// match outright, before any interpretation priority gets a say. A key that is
// chosen too greedily here cannot be rescued by the ladder in `replaceMatch`.
//
// "Heb" is the standing example. Crum writes it for the Epistle to the Hebrews
// (whose abbreviation is "He"), but "Heb" is also the annotation for "Hebrew",
// and being longer it takes the match. The Bible's higher interpretation
// priority never applies, and "Heb 11 38" would read as "Hebrew". It does not,
// only because it is manually labeled in the data: `{Heb 11 38}{He}`.
const ENRICHMENT_RE = new RegExp(
  str.regex([
    // Bible:
    ...Object.keys(BIBLE_MAPPING),
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
    // Bible book abbreviations that should be numbered, but occurred in the
    // text without a number.
    ...UNNUMBERED_BIBLE_BOOK,
    ...Object.keys(DANGLING_SUFFIX_MARKERS),
  ]),
  'u'
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
  '[٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹]+',
  "['-]?[0-9]+[a-zA-Z]?\\*?(?:[–-]'?[0-9]+)*",
  'ed [A-Z]\\p{Letter}+',
  // 'no' means 'number'.
  // It's not part of our canonical list of suffix annotations because it would
  // produce too many false positives, so we have to add it here.
  // It must be followed by an integer, otherwise it's a false positive.
  'no [0-9]+',
  '§\\d*',
  'line',
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
      Array.from(ann.variants(abb)).map(RegExp.escape)
  ),
];

// LONE_LETTER_OPENING matches a reference abbreviation that opens with a letter
// standing on its own: either the whole key ("K", "P"), or a first letter set
// off from the rest by a non-word character ("N&E", "O'Leary H", "V Sitz").
// Such a key is indistinguishable by shape from the single-letter `[a-zA-Z]`
// suffix token, because nothing binds its leading letter to what follows.
//
// A key whose first letter runs straight into another word character ("Wess.",
// "Cl") needs no guard: the suffix token would consume that letter alone, and
// the ASSERT_NON_WORD closing SUFFIX then fails in the middle of the word.
//
// The character class is the suffix token's own `[a-zA-Z]`, not `\p{Letter}`:
// the point is to detect a collision with that token, so a letter the token
// can't match can't collide with it either.
const LONE_LETTER_OPENING = new RegExp(
  `^[a-zA-Z]${str.ASSERT_NON_WORD.source}`,
  'u'
);

// NOT_CONFUSABLE_REFERENCE keeps such an abbreviation from being mistaken for
// the start of a followup. Without it, the "K" in "P 44 66, K 179" and the "N"
// in "P 44 66, N&E 179" would both be swallowed as suffixes of the "P"
// reference instead of being recognized as references of their own.
//
// The lookahead spells out each key in full rather than just its leading
// letter, so that only a genuine reference — not any stray letter that happens
// to be followed by punctuation — suppresses the followup.
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
// Two filters keep the alternation small:
// 1. Only keys with a lone-letter opening are included. The rest can't be
//    confused with the single-letter suffix token, so including them would only
//    bloat the lookahead.
// 2. A key is dropped when its opening letter is itself a key ("P Bad" given
//    "P"). The shorter key already fires the guard at the same position: it
//    matches the same opening letter, and the ASSERT_NON_WORD that follows it
//    is satisfied by the very non-word character that qualified the longer key
//    under filter 1. Listing both would be pure duplication. This drops more
//    than half of the keys that survive filter 1.
//
// NOTE: The single letter is not the only suffix token a key could be confused
// with — NUMBERS also admits Roman numerals and words such as "scala". A key
// whose opening token is a multi-letter Roman numeral would slip past filter 1.
// None currently does: the Roman numeral patterns are case-uniform, so the
// mixed-case keys that come closest ("Cl", "DM", "Vi") match only their first
// letter, and are stopped by the same mid-word ASSERT_NON_WORD.
const NOT_CONFUSABLE_REFERENCE = `(?! (?:${Object.keys(ref.MAPPING)
  .filter(
    (key: string): boolean =>
      LONE_LETTER_OPENING.test(key) &&
      (key.length === 1 || !(key.charAt(0) in ref.MAPPING))
  )
  .map(RegExp.escape)
  .join('|')})${str.ASSERT_NON_WORD.source})`;

const NUMBER = `(?:${NUMBERS.join('|')})`;
const NUMBER_GROUP = `(?: ${NUMBER}| ?\\(${NUMBER}(?: ${NUMBER})*\\))`;

// Suffix do not usually end with 'v', 'V', 'l', or 'pl'.
// Following a reference, these are annotations for 'vide' ('V' being the same
// word opening a sentence), or for 'legendum' or 'plural', rather than part of
// the suffix. 's v' stands for 'sub voce', and is a valid suffix, so we account
// for that.
//
// A lone 'I' is the English pronoun whenever an English verb follows it, which
// is how Crum introduces the sense of a citation ("BM 592 I wrote thee",
// "J 70 6 I am about to"). It is a genuine Roman numeral otherwise, as in
// "BerlSitz '33 I, Taf 1", so the lowercase lookahead is what separates the
// two, and it must stay specific to 'I': the letters above close a suffix no
// matter what follows them, and 'V' is in fact followed by a capitalized word
// ("BM 528 n. V Crum AZ 65").
//
// The '\b' confines all of this to a letter standing on its own, which is what
// keeps the Roman numerals matching: the final 'I' of 'II', 'III', or 'VI',
// and the 'V' of 'IV', are all preceded by a word character, so no word
// boundary precedes them, and the lookbehind doesn't fire.
const SUFFIX_END = '(?<!\\b(?:p?l|(?<!\\bs )v|V|I(?= [a-z])))';

// SUFFIX ABSORPTION: how much of the trailing text each element type swallows.
//
// A citation trails tokens that locate it more precisely: numbers, but also
// `l c` (*loco citato*), `above`, `inf` (*infra*). How many of them end up
// INSIDE the enriched element differs by type, and the differences are
// deliberate.
//
// - Reference (`SUFFIX`, below) is the liberal one. A `.reference` span names a
//   work; it does not point into it. Its suffix is therefore inert payload —
//   whatever is swallowed rides along inside the span without having to be
//   understood — and `Reference.suffixAnnotations` spells out any abbreviation
//   among it, so swallowing one costs the reader nothing.
//
// - Bible (`CHAPTER_VERSE`, `BIBLE_FOLLOWUP`) is the strict one. A `.bible`
//   anchor is a hyperlink to one verse, built out of the chapter and verse it
//   parsed, so it can only take in what it can resolve into those. `l c` and
//   `above` are a component of the citation's location just as much as the
//   numbers are, but not one we can aim a link at, so they are left outside the
//   element and enriched on their own — `l c` as an annotation, `above` as
//   plain text.
//
// - Page (`NUM_COL_LINE`) sits in between, and draws its line at whether the
//   token needs spelling out. `above` is absorbed: it is plain English, and
//   `replacePage` leaves it out of the scan key anyway. `inf` is not, though it
//   says the same thing, because a `.page` anchor — like `.bible`, and unlike
//   `.reference` — has no way to spell an abbreviation out from within itself.
//   Left outside, `inf` falls through to the annotation rung of `replaceMatch`
//   and earns an *infra* tooltip; absorbed, it would sit in the link text
//   unexplained. We would rather explain it.
//
// The only abbreviations spelled out from inside a non-`.reference` element are
// the two hardcoded in `Citation.anchor`: `ib` (*ibidem*), and a verse that is
// itself an annotation (`tit` / `subscr`, the non-numeric branch of `NUMS`).

// DIRECTION is Crum's cross-reference adverb, pointing at another place in the
// dictionary: "J 76 above", "Tri below". It closes a suffix, and belongs to
// the citation, but it is deliberately NOT a suffix token in NUMBERS:
// - It sits after SUFFIX_END, so a trailing 'v' / 'l' / 'pl' is still read as
//   an annotation. Were it a suffix token, the run in "Mor 29 5 v above" would
//   no longer end on the 'v', SUFFIX_END would never fire, and the 'vide'
//   would be swallowed into the reference.
// - It stays out of NUMBER_GROUP's parenthesized branch, so a parenthetical
//   aside — "Va 57 165 (v below)" — is not absorbed whole.
// A followup must still carry a number of its own, so DIRECTION alone can not
// open one: the "above" in "BIF 20 223 & above ⲉⲓⲟⲩⲉ" is a fresh
// cross-reference to another entry, not a continuation of the BIF citation.
//
// This token is reference-only. A Crum page absorbs "above" through
// `NUM_COL_LINE`'s own branch, and a Bible citation absorbs neither adverb.
// See SUFFIX ABSORPTION above.
const DIRECTION = '(?: (?:above|below))';

// SUFFIX matches a reference suffix together with any followups that trail it,
// e.g. the whole " 44 66, 179" in "P 44 66, 179".
//
// NOTE: KNOWN UNHANDLED CASE: A numbered Bible book abbreviation (e.g. "2 Cor")
// immediately following a reference would have its leading number swallowed as
// a suffix token, leaving the bare book name ("Cor 4 18") behind. Both suffix
// branches are exposed: the leading `NUMBER_GROUP+` would eat the "2" in
// "P 44 2 Cor 4 18", and the followup branch would eat the ", 2" in
// "P 44, 2 Cor 4 18" — its NOT_CONFUSABLE_REFERENCE guard rules out reference
// abbreviations, not numbered book names.
//
// This is deliberately left unguarded, unlike BIBLE_FOLLOWUP below, which does
// carry the NOT_NUMBERED_BIBLE_BOOK lookahead for the mirror-image case (a
// numbered citation trailing another Bible citation). The asymmetry reflects
// the data: Crum states in his preface that illustration begins with biblical
// examples, and that holds uniformly throughout the book, so a Bible citation
// never follows a non-Bible reference within a single enrichment run. No
// occurrence has been encountered, so we don't pay for a guard we don't need.
//
// NOTE: KNOWN UNHANDLED CASE: A suffix must open with a run of numbers, or with
// a bare DIRECTION, so one that opens with a followup — the ", 83" of
// "P 130³, 83" — can not match. Only a suffix interrupted by a `<sup>` takes
// that shape. See `suffixFollowups`.
const SUFFIX = new RegExp(
  `^\\.?(?:${NUMBER_GROUP}+${SUFFIX_END}${DIRECTION}?|${DIRECTION})(?:(?:,| [=&])${NOT_CONFUSABLE_REFERENCE}${NUMBER_GROUP}+${SUFFIX_END}${DIRECTION}?)*${str.ASSERT_NON_WORD.source}`,
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
 *
 * Nothing beyond these numbers is taken in. Trailing tokens that also locate
 * the citation — `l c`, `above` — stay outside the `.bible` element, unlike
 * their treatment in a reference suffix. See SUFFIX ABSORPTION above.
 */
const NUMS = '(\\d+|[A-F])(?: (\\d+|tit|subscr))?';
// CHAPTER_VERSE matches "NUMS" OR "(NUMS)".
// NOTE:
// 1. This creates two sets of capture groups.
// 2. This is anchored at the start of the string.
const CHAPTER_VERSE = new RegExp(`^\\.? (?:${NUMS}|\\(${NUMS}\\))\\b`, 'u');

// MANUAL_CHAPTER_VERSE parses a chapter/verse pair (e.g. "27 11") from the
// text content of a manually-keyed or dangling Bible citation.
const MANUAL_CHAPTER_VERSE = new RegExp(`\\b${NUMS}\\b`, 'u');

// Bible book abbreviations that begin with a number — e.g. "2 Cor". A Bible
// followup is a bare chapter/verse number, so the "2" in
// "Job 3 18, 2 Cor 4 18" could be misread as a followup verse, splitting off
// the "2 Cor" book name. This negative lookahead — built only from numbered
// books, the only abbreviations a numeric followup can be confused with —
// prevents that. Non-numbered books can't be mistaken for a followup, so
// including them would only bloat the lookahead.
const NOT_NUMBERED_BIBLE_BOOK = `(?!${str.regex(
  Object.keys(BIBLE_MAPPING).filter((key: string): boolean => /^\d/.test(key)),
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
 * The NOT_CONFUSABLE_REFERENCE assertion prevents matching a reference
 * abbreviation as a followup (e.g. the "C" in "Jer 52 16, C 41 42", or the "B"
 * in "Jer 52 16, B Ap 4"). It guards only the comma branch; the en-dash branch
 * always introduces a numeric range, where a reference can't appear.
 *
 * NOTE: 'A' and 'C' are both single-letter references and special chapter
 * labels (see CHAPTER_VERSE below; e.g. the Book of Esther). The assertion thus
 * makes a genuine comma-followup to chapter A or C (such as a hypothetical
 * "Esth A 1, C 5") unrepresentable — it would be read as a reference instead.
 * No such followup has been encountered in the data, so we accept the trade-off
 * in favor of catching the single-letter reference case.
 */
// The `d` flag records each capture group's `[start, end]` span in
// `match.indices`, which `parseBibleFollowups` uses to locate the enriched
// citation text within the match without searching for it.
const BIBLE_FOLLOWUP = new RegExp(
  `^(?:(?:,${NOT_CONFUSABLE_REFERENCE} |–)${NOT_NUMBERED_BIBLE_BOOK}(${NUMS})${str.ASSERT_NON_WORD.source}| ?\\((${NUMS})\\))`,
  'du'
);

// Instead of using a generic expression for Roman numerals, we only include
// those roman numerals that we know are present in the book, to minimize the
// chances of false positives.
//
// NOTE: When Crum references a page in his own book, it's usually a
// preceding page, rather than an upcoming one. Hence we have 'above', but not
// 'below' as an optional suffix.
// 'up', following the line number, means that the lines should be counted from
// the bottom up.
// 'above' is absorbed here, but 'inf', which says the same thing in
// abbreviated form, deliberately is not. See SUFFIX ABSORPTION above.
const NUM_COL_LINE = `(${['[0-9]+', ...book.ROMAN_PAGES].join('|')})(?: ([ab])(?: \\d+(?: up)?)?)?(?: above)?\\b`;
const PAGE_RE = new RegExp(`^p{1,2}\\.? ${NUM_COL_LINE}`);
const PAGE_FOLLOWUP_RE = new RegExp(`^(, )${NUM_COL_LINE}`);
// MANUAL_PAGE_RE tells whether the key of a manual label names a page in the
// Crum book scan. The key is forwarded to the scan verbatim, so it captures
// nothing.
// The scan accepts more than this: a page without a column, and the
// Roman-numeral intro pages. Manual labels need neither. They are only ever
// used for the pages that the automatic heuristics can't reach, and those are
// numbered pages carrying a column. Keeping the pattern this tight also keeps
// the branch from hijacking the keys below it: a bare Roman page would swallow
// `v` (*vide*), which is an annotation.
const MANUAL_PAGE_RE = /^[0-9]+[ab]$/;

// Roman-numeral pages of the Preface and the List of Abbreviations in the
// Crum book scan. The `Index` override table in `crum/book.ts` resolves
// these to logical page numbers.
const PREFACE_PAGE = 'v';
const LIST_OF_ABBREVIATIONS_PAGE = 'xi';

const REFERENCE_RE = new RegExp(`^${str.regex(Object.keys(ref.MAPPING))}`, 'u');
const BIBLE_RE = new RegExp(
  `^${str.regex([...Object.keys(BIBLE_MAPPING), ...Object.keys(DAN_OVERRIDE)])}`,
  'u'
);

enum EVENT {
  VISIT = 'visit',
  LEAVE = 'leave',
}

/**
 * Ambient is the state scoped to the processing of a single wiki subtree by
 * `handleAux`. It is installed as a stack frame by `withAmbient` so that a
 * re-entrant call stacks its own frame instead of clobbering the caller's.
 *
 * We keep this ambient rather than threading it as a parameter: doing so would
 * complicate the signatures of many functions between `enrich` and its deep
 * consumers. Bundling both fields into one frame keeps that simplicity while
 * making the save/restore discipline structural — `withAmbient` is the single
 * place it lives, so a field added here can't be left unsaved.
 */
interface Ambient {
  /**
   * formSuperscripts maps the text content of a form-superscript element to the
   * Coptic form it stands for, for the wiki currently being processed.
   *
   * It is populated by `collectFormSuperscripts` before enrichment, consulted
   * by `suffixFollowups` to decide whether a trailing `<sup>` belongs to a
   * reference suffix or is a form superscript, and read by
   * `handleFormSuperscripts` to add tooltips at the end.
   */
  formSuperscripts: Map<string, string>;

  /**
   * crossParagraphs controls whether antecedent search (for `ib` elements and
   * dangling suffixes) is allowed to walk past the boundary of the enclosing
   * paragraph into the preceding one.
   *
   * On the full Crum page the entire entry is rendered, so the paragraph that
   * precedes a citation in the DOM is genuinely its textual antecedent. In the
   * Xooxle search view, however, the entry is truncated to a handful of
   * matching units and whole paragraphs may be dropped, so the paragraph that
   * happens to precede a citation in the (incomplete) DOM may not be its real
   * antecedent. Crossing the boundary there risks binding a citation to an
   * unrelated antecedent; we would rather fail to resolve it than resolve it
   * incorrectly.
   */
  crossParagraphs: boolean;
}

/**
 * ambient is the currently-installed processing frame. `withAmbient` swaps it
 * for the duration of one `handleAux` call and restores it on exit.
 */
let ambient: Ambient = {
  formSuperscripts: new Map<string, string>(),
  crossParagraphs: true,
};

/**
 * Install `next` as the ambient frame for the duration of `fn`, restoring the
 * previous frame on exit. Re-entrant by construction: a nested call stacks its
 * own frame, so a footnote pass can't clobber the state its caller's later
 * steps depend on.
 *
 * @param next - The frame to install.
 * @param fn - The function to run with `next` installed.
 * @returns Whatever `fn` returns.
 */
function withAmbient<T>(next: Ambient, fn: () => T): T {
  const saved: Ambient = ambient;
  ambient = next;
  try {
    return fn();
  } finally {
    ambient = saved;
  }
}

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
 * Handle all Wiki elements.
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
  // Identify form superscripts before enrichment so that reference suffix
  // processing can distinguish a trailing `<sup>` that stands for a Coptic
  // form from one that is part of the suffix itself.
  //
  // `withAmbient` installs this frame for the duration of the call and restores
  // the previous one on exit. `handleFootnotes` re-enters `handleAux` on each
  // footnote's detached content; that nested call stacks its own frame, so it
  // can't clobber the state this call's own later steps depend on (notably
  // `handleFormSuperscripts`, which runs after `handleFootnotes`).
  withAmbient(
    {
      formSuperscripts: collectFormSuperscripts(wiki),
      crossParagraphs: full,
    },
    (): void => {
      const startText: string | undefined = dev.play(() => textContent(wiki));

      enrich(wiki);

      handleAddenda(wiki);

      handleFootnotes(wiki);

      addTextCopyTriggers(wiki);

      handleFormSuperscripts(wiki);

      if (full) {
        addEntryCopyShortcuts(wiki);

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
  );
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
function annotation(
  tip: string,
  ...children: (Node | string)[]
): HTMLSpanElement {
  const span: HTMLSpanElement = html.span(...children);
  span.classList.add(cls.ANNOTATION);
  const italic: boolean = children.every(
    (e: Node | string): boolean => e instanceof Node && e.nodeName === 'I'
  );
  tool.addTooltip(span, [html.maybeI(tip, italic)]);
  return span;
}

// The styling that `styledParent` and `noStyledParent` are predicated on.
// NOTE: This is matched against both the node and its parent, because `walk`
// surfaces the two cases differently: an <i> is yielded as an atomic node of
// the chain, whereas a <sup> is stepped over and only its text is yielded.
const STYLED = 'i, sup';

/**
 * @param key
 * @param context
 * @returns
 */
function falsePositive(key: string, context: html.Context): boolean {
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
    return true;
  }

  if (
    key === 'art' &&
    (context.right.startsWith(' thou') || context.left.endsWith('thou '))
  ) {
    // False positive!
    return true;
  }

  // 'do' is the ditto annotation, but also the English verb. A ditto never
  // follows an infinitive marker or an auxiliary, and it is never negated, so
  // these readings are certain. The reverse doesn't hold: an English 'do' can
  // sit exactly where a ditto sits (after a dialect code or a citation), and a
  // ditto can be followed by an English word ("C 86 73 B do of 25 years"), so
  // the rest of the false positives are suppressed through manual labeling.
  if (
    key === 'do' &&
    (context.right.startsWith(' not') ||
      ['to ', 'will ', 'thou ', 'ye '].some((token: string): boolean =>
        context.left.endsWith(token)
      ))
  ) {
    // False positive!
    return true;
  }

  return false;
}

/**
 *
 * @param context
 * @returns
 */
function replaceAnnotation(context: html.Context): void {
  const key: string = context.match[0];
  const annot: ann.Annotation | undefined = ann.MAPPING[key];
  if (!annot) {
    log.fatal("Can't find annotation:", key);
  }

  if (falsePositive(key, context)) {
    return;
  }

  // Compute the full form before advancing the cursor while `context.left`
  // still shows the text before the key.
  const fullForm: string =
    key === 'inf' &&
    !context.left.trim() &&
    context.previousSibling instanceof Element &&
    context.previousSibling.classList.contains(cls.GREEK)
      ? 'infinitive'
      : annot.fullForm;

  // We consume the key-length nodes first so we can inspect them.
  const nodes: Node[] = context.munch(key.length);

  const styled: boolean = nodes.some(
    (node: Node): boolean =>
      (node instanceof Element && node.matches(STYLED)) ||
      !!node.parentElement?.matches(STYLED)
  );
  if ((annot.noStyledParent && styled) || (annot.styledParent && !styled)) {
    // This annotation can't show in styled text, and this node is
    // styled.
    context.insert(nodes);
    return;
  }

  context.insert(annotation(fullForm, ...nodes));
}

/**
 *
 * @param key
 * @param {...any} children
 * @returns
 */
function page(key: string, ...children: (Node | string)[]): HTMLAnchorElement {
  const a: HTMLAnchorElement = html.anchor(paths.crumScan(key), ...children);
  a.classList.add(cls.PAGE);
  return a;
}

/**
 * Insert hyperlinks for page references in the text.
 *
 * @param context
 * @returns
 */
function replacePage(context: html.Context): boolean {
  // A page number has the format 'pp? [0-9]+ [ab]?'. The regex matches this
  // format, excluding the column, which is expected to live in the <i> tag that
  // is the next sibling.
  let match: RegExpExecArray | null = PAGE_RE.exec(context.remainder);
  if (!match) {
    return false;
  }

  context.insert(
    page(`${match[1]!}${match[2] ?? ''}`, ...context.munch(match[0].length))
  );

  while ((match = PAGE_FOLLOWUP_RE.exec(context.remainder))) {
    const comma: string = match[1]!;
    context.advance(comma.length);
    context.insert(
      page(
        `${match[2]!}${match[3] ?? ''}`,
        ...context.munch(match[0].length - comma.length)
      )
    );
  }

  return true;
}

/**
 *
 */
export class Citation {
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
  // The abbreviation under which the book was cited. The book data is shared
  // across abbreviations, so the specific one used is tracked here rather than
  // on `book`. Several heuristics in `valid()` are abbreviation-specific.
  private readonly abb: string;
  /**
   *
   * @param chapter
   * @param verse
   * @param key
   */
  public constructor(
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

    this.book = BIBLE_MAPPING[key]!;
    this.abb = key;

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
   * @param first - First number within the text.
   * @param second - (Optional) second number within the text.
   */
  public update(first?: string, second?: string): void {
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
   * @param content
   * @returns
   */
  public anchor(...content: (Node | string)[]): HTMLElement {
    let elem: HTMLElement;
    // The `this.chapter` guard is required because we want to hyperlink
    // chapter-less citations normally.
    if (this.chapter && !this.knownChapter()) {
      // If the chapter is missing from our Bible index, fall back to a plain
      // <span>: we still annotate with a tooltip, but skip the hyperlink (which
      // would point to a non-existent page).
      log.warn(
        'Bible citation references unknown chapter:',
        `${this.abb} ${this.chapter}`
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
    elem.dataset[Citation.DATA_BOOK] = this.abb;
    elem.dataset[Citation.DATA_CHAPTER] = this.chapter ?? '';
    elem.dataset[Citation.DATA_VERSE] = this.verse ?? '';
    const tooltip: (Node | string)[] = [];
    if (ann.ib(elem.textContent)) {
      tooltip.push(ann.ibidem(), ': ');
    }
    tooltip.push(
      // If this citation is explicit (all numbers are present in `raw`), then
      // including them in the tooltip would be redundant.
      // However, if some numbers are inherited, we include the numbers in the
      // tooltip for readability.
      // We also include the numbers if the verse number is a suffix, so we can
      // spell it out.
      !this.explicit || (this.verse && this.verse in ann.MAPPING)
        ? this.name()
        : this.book.name
    );
    tool.addTooltip(elem, tooltip, [cls.BIBLE]);
    return elem;
  }

  /**
   * @param node - A `.bible` element.
   * @returns Whether it carries citation data, and can therefore be read back
   * with `fromAnchor`. An unnumbered book link — `Kg`, standing for all four of
   * Samuel and Kings (`replaceUnnumberedBibleBook`) — resolves to no single
   * book, so it is not built from a Citation and carries none, although it
   * carries the `BIBLE` class.
   */
  public static tagged(node: HTMLElement): boolean {
    return Citation.DATA_BOOK in node.dataset;
  }

  /**
   * NOTE: Use the `tagged` function, instead of checking for the presence of
   * the `BIBLE` class, to verify whether this method is safe to invoke on an
   * element. Unnumbered Bible books bear the class but not the data.
   * As of the time of writing, there are only 3 instances of unnumbered book
   * abbreviations in the corpus, and none causes an erroneous invocation of
   * this function.
   *
   * @param node
   * @returns
   */
  public static fromAnchor(node: HTMLElement): Citation {
    return new Citation(
      /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
      node.dataset[Citation.DATA_CHAPTER] || undefined,
      node.dataset[Citation.DATA_VERSE] || undefined,
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
      node.dataset[Citation.DATA_BOOK]!
    );
  }

  /**
   * @returns The citation in full: the book's name, and its chapter and verse
   * when it has them. A tooltip shows this only when some number was inherited
   * (see `anchor`), but it is always the whole of what the citation resolved
   * to.
   */
  public name(): string {
    let name = this.book.name;
    if (!this.chapter) {
      return name;
    }
    name = `${name} ${this.chapter}`;
    if (!this.verse) {
      return name;
    }
    const annot: ann.Annotation | undefined = ann.MAPPING[this.verse];
    if (annot) {
      return `${name} ${annot.fullForm}`;
    }
    return `${name}:${this.verse}`;
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

    if (this.abb === 'Pr') {
      // Where no chapter or verse specified, this is Preisigke's Namenbuch for
      // Greek personal names, not Proverbs.
      return !!this.chapter;
    }

    if (['AP', 'PS', 'AM'].includes(this.abb)) {
      // Distinguish between citations of Acta Pauli and Apocalypse, Pistis
      // Sophia and Psalms, and Amos and Actes des Martyrs.
      // See #705 and #709.
      return this.knownChapter() && !!this.verse;
    }

    // Amos citations were always followed by either zero numbers or two numbers
    // representing the chapter and verse, while the latter was only followed by
    // one number represented the page.
    // One exception to that is cross-references that, occasionally, reference a
    // chapter alone (e.g. "cf Am 4 above"). This would land on Actes des
    // Martyrs. Label those manually, carrying the chapter in the key:
    //   `{Am 4}{Am 4}`.
    // See the collision note in `interpretKey` for why that key forces the
    // Bible reading.
    if (this.abb === 'Am') {
      return !this.chapter || (this.knownChapter() && !!this.verse);
    }

    // "Is" and "He" are also English words that often occur in the text.
    // This heuristic is based on known examples (#524), but other cases might
    // turn up in the text that violate these rules. See #709.
    // The check is skipped when the parse context is not provided.
    // Where it rejects a true positive — a book cited bare, as in
    // "Ps 62 2 (S ⲉ-), Is Hos l l c" (14) or "2 Cor He Thes" (31) — label it
    // manually, repeating the abbreviation as the key: `{Is}{Is}`, `{He}{He}`.
    // Manual labels bypass this method entirely, so the key restores the
    // citation the heuristic threw away.
    if (['He', 'Is'].includes(this.abb)) {
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

  /**
   *
   * @param span
   * @returns
   */
  public sameBook(span: HTMLElement): boolean {
    return (
      Citation.tagged(span) &&
      Citation.fromAnchor(span).book.path === this.book.path
    );
  }
}

/**
 *
 * @param context
 */
function replaceDanglingSuffix(context: html.Context): void {
  context.advance(); // Skip the match (if it's not skipped already).

  const confident = !!DANGLING_SUFFIX_MARKERS[context.match[0]];
  // If we're confident that this marker precedes dangling suffixes, a single
  // number suffices. Otherwise, we only treat it as a dangling suffix if two
  // numbers follow.
  const regex = new RegExp(`^(?: \\d+(?!/\\d)){${confident ? 1 : 2}}\\b`);
  if (!regex.test(context.remainder)) {
    // Not a dangling suffix!
    return;
  }
  if (ENRICHMENT_RE.exec(context.remainder)?.index === 1) {
    // Not a dangling suffix! The number is part of some other enrichment key.
    return;
  }

  const antecedent: HTMLElement | null = findAntecedent(context);
  if (!antecedent) {
    log.error(
      'Unable to find antecedent for the dangling suffix at',
      context.remainder
    );
    return;
  }
  replaceAnaphor(context, antecedent);
}

/**
 *
 * @param context
 */
function replaceUnnumberedBibleBook(context: html.Context): void {
  const regex = new RegExp(`^\\d ${context.match[0]}$`);
  const books: bib.Book[] = Object.entries(BIBLE_MAPPING)
    .filter(([abb, _]: [string, bib.Book]): boolean => regex.test(abb))
    .map(([_, bk]: [string, bib.Book]): bib.Book => bk);
  const anchor: HTMLAnchorElement = html.anchor(
    paths.bible(books.map((bk: bib.Book): string => bk.path)),
    ...context.munch()
  );
  anchor.classList.add(cls.BIBLE);
  tool.addTooltip(
    anchor,
    Array.from(
      html.parse(books.map((bk: bib.Book): string => bk.name).join('<br>'))
    ),
    [cls.BIBLE]
  );
  context.insert(anchor);
}

/**
 * Parse the Bible followups that trail a citation, updating `cit` in place as
 * it goes.
 *
 * NOTE: Followups are read off `context.remainder` — the flat chain. Addenda
 * and footnoted spans are wrappers that sit ON that chain while holding their
 * content BELOW it (see `replaceAnaphor` for the full account of the shape),
 * and no followup handler descends into one. The same holds for the reference
 * followups in `SUFFIX` and the page followups in `PAGE_FOLLOWUP_RE`.
 *
 * The consequence is a rule for whoever writes the Wiki text, and it is
 * recorded at `replace_addendum` in
 * `dictionary/marcion_sourceforge_net/wiki.py`: a citation must never be split
 * across an addendum boundary. Written as `Ge 1 //1//2//`, the "Ge 1" enriches
 * and the two numbers — sitting inside the wrapper — are invisible to this
 * function, which would otherwise have made them chapter and verse.
 *
 * @param antecedent
 * @param cit - The antecedent citation, which will get mutated to reflect each
 * followup.
 * @param context
 */
function parseBibleFollowups(
  antecedent: HTMLElement,
  cit: Citation,
  context: html.Context
): void {
  for (;;) {
    const match: RegExpExecArray | null = BIBLE_FOLLOWUP.exec(
      context.remainder
    );
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
    cit.update(match[2] ?? match[5], match[3] ?? match[6]);
    if (!cit.valid()) {
      // This citation is invalid.
      log.error('Bible followup contains invalid citation:', match[0]);
      break;
    }

    // The raw citation text is captured by group 1 or 4 (whichever branch
    // matched); its `[start, end]` span within `match[0]` comes straight from
    // the regex (see the `d` flag on BIBLE_FOLLOWUP). The text before and after
    // it passes through unchanged. Munching reuses the chain's own nodes as the
    // anchor's content.
    const [start, end]: [number, number] = (match.indices![1] ??
      match.indices![4])!;
    const prefix: Node[] = context.munch(start);
    const anaphor: HTMLElement = cit.anchor(...context.munch(end - start));
    const suffix: Node[] = context.munch(match[0].length - end);
    context.insert([...prefix, anaphor, ...suffix]);
    link(anaphor, antecedent);
  }
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
  const match: RegExpExecArray | null = CHAPTER_VERSE.exec(right);
  right = right.slice(match?.[0].length ?? 0);

  const cit: Citation = new Citation(
    match?.[1] ?? match?.[3],
    match?.[2] ?? match?.[4],
    key
  );

  if (!cit.valid(right, context.nextSibling)) {
    return false;
  }

  // NOTE: This citation's anchor must be built before parsing followups,
  // since followup parsing mutates `cit` in place. The matched key and
  // chapter/verse text are munched off the chain and reused as the anchor's
  // content.
  const len: number = key.length + (match?.[0].length ?? 0);
  const anchor: HTMLElement = cit.anchor(...context.munch(len));
  context.insert(anchor);

  // Resolve any followups (e.g. the ", 56 9" in "Is 27 11, 56 9") in the same
  // pass. This used to be deferred to a second pass to avoid splitting a
  // numbered book like the "2 Cor" in "Job 3 18, 2 Cor 4 18"; a negative
  // lookahead in BIBLE_FOLLOWUP now guards against that instead.
  parseBibleFollowups(anchor, cit, context);
  return true;
}

/**
 * Yield the single `<sup>` that abuts the end of the chain, and the suffix text
 * behind it, when both belong to the reference suffix.
 *
 * A suffix can be interrupted by a superscript, as the "P 131¹ 66" of [1] is.
 * A superscript's text is not a sibling of the text around it, so `enrich` cuts
 * the chain at every one of them, and the `SUFFIX` match that brought us here
 * only ever covers the stretch before the first.
 *
 * NOTE: KNOWN UNHANDLED CASES: Two shapes are left half-enriched, the leftover
 * sitting outside the reference as plain text. Both are rare, and are manually
 * labeled where they occur. A walk that consumed them was implemented under
 * #542 and reverted: too few instances for the heuristics it took.
 *
 * - A suffix broken by more than one superscript, as the "P 131¹ 66, 131³ 1"
 *   of [1]. Only the first superscript is taken.
 *
 * - A suffix whose remainder opens with a followup rather than with a run of
 *   numbers, as the ", 83" of the "P 130³, 83" of [2] — the superscript
 *   standing where the opening numbers would be. `SUFFIX` can not match such a
 *   remainder at all (see SUFFIX above), so none of it is taken.
 *
 * [1] https://remnqymi.com/crum/1058.html#:~:text=P%201311%2066
 * [2] https://remnqymi.com/crum/636.html#:~:text=P%201303
 * @param context
 * @yields The superscript, and the suffix text behind it, to be appended to the
 * reference.
 */
function* suffixFollowups(context: html.Context): Generator<Node | string> {
  if (context.remainder) {
    // There is text before the superscript that is suspected to be part of the
    // suffix.
    return;
  }

  const maybeSUP: Node | null = context.nextSibling;
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
      // `next` belongs to no chain — it lies beyond this one — so the text
      // taken out of it has to be chopped off. `enrich` drops a node
      // that this empties, since nothing is left in it to enrich.
      next.nodeValue = next.nodeValue.slice(match[0].length);
      return;
    }
  }

  // No further suffix text was found behind the superscript: either nothing
  // follows it, or what does is a remainder `SUFFIX` can not match (the
  // second unhandled case above). If the superscript matches a known form
  // superscript, leave it alone — it will receive a form tooltip in
  // `handleFormSuperscripts`. Otherwise, treat it as a trailing part of the
  // suffix.
  // NOTE: This check replaced a positional assumption — that a suffix
  // superscript only ever appears mid-suffix, so one reaching this point must
  // be a trailing part of the suffix. That pulled a form superscript trailing
  // a citation into the reference.
  if (ambient.formSuperscripts.has(maybeSUP.textContent ?? '')) {
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
    context.munch(),
    suffix ? [...context.munch(suffix.length), ...suffixFollowups(context)] : []
  );

  context.insert(span);
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
 * Interpret the key that `ENRICHMENT_RE` matched.
 *
 * This is the second of the two stages described at `ENRICHMENT_RE`: which key
 * matched was settled there, longest-first; here we decide what it means. The
 * branches below are a priority ladder, in this order:
 *
 *   Bible → Reference → ibidem → page → unnumbered Bible book →
 *   annotation / semicolon / dangling suffix
 *
 * Two corollaries follow from annotations sitting at the bottom:
 *
 * 1. An annotation false positive is often not an annotation problem at all,
 *    but a *missing* reference or Bible variant upstream. The token fell
 *    through to the last rung because nothing above it claimed the key. Adding
 *    the variant to `bib.yaml` fixes the false positive at its source, which
 *    is why raising the recall of the higher-priority types also raises
 *    annotation precision (see the `noCaseVariant` note in `annotations.ts`).
 * 2. When a heuristic *declines* a match — a false-positive `Is`, `He`
 *    (`Citation.valid`), or `My` (`replaceReference`) — the token is passed
 *    over silently and no alternative reading is attempted. Only the ambiguous
 *    abbreviations listed below fall back from Bible to Reference. A wrong
 *    refusal therefore leaves no trace in the console: the only way to catch it
 *    is to read the text that came out unmarked.
 *
 * @param context
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
  //
  // - 'Pr' is ambiguous. It usually refers to Preisigke's Namenbuch, but is
  //   rarely used for Proverbs (instead of 'Pro'). They can be told apart
  //   through a heuristic.

  if (['Am', 'AM', 'AP', 'PS', 'Pr'].includes(key)) {
    if (!replaceBible(context)) {
      replaceReference(context);
    }
    return;
  }

  if (key in BIBLE_MAPPING || key in DAN_OVERRIDE) {
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
    if (replacePage(context)) {
      return;
    }
    // If this is not a Crum page, fall back to handling it as an annotation
    // below.
    // NOTE: This is not expected, because the `p` annotation only ever occurs
    // as a Crum page or a suffix annotation.
  }

  if (UNNUMBERED_BIBLE_BOOK.has(key)) {
    replaceUnnumberedBibleBook(context);
    return;
  }

  // `flag` is used to verify that the key is processed at least once.
  let flag = false;
  if (key in ann.MAPPING) {
    // 'p' and 'pp' are also annotations, so it's important for annotation
    // handling to have less priority than page handling.
    replaceAnnotation(context);
    // Do not return because some annotations are also dangling suffix markers.
    flag = true;
  }

  if (key === ';') {
    replaceSemicolon(context);
    // Do not return because the semicolon is also a dangling suffix marker.
    flag = true;
  }

  if (key in DANGLING_SUFFIX_MARKERS) {
    // Dangling suffix detected!
    replaceDanglingSuffix(context);
    flag = true;
  }
  log.ensure(flag, 'This is impossible');
}

/**
 *
 * @param root
 */
export function enrich(root: HTMLElement): void {
  const chains = function* (): Generator<Node[]> {
    let chain: Node[] = [];
    for (const node of walk(root)) {
      if (node.nodeType === Node.TEXT_NODE && !node.nodeValue) {
        // The walk above happened before any enrichment, and `suffixFollowups`
        // empties the text nodes whose whole content it takes into a reference
        // suffix. Such a node has nothing left to enrich, and `Chain` can't
        // munch a node with no text, so it must not be seated in a chain.
        // TODO: (#0) Ideally, you would remove such nodes from the tree.
        continue;
      }

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
    new html.Context(new html.Chain(chain)).replaceNodes(
      ENRICHMENT_RE,
      replaceMatch
    );
  }
}

// On an addendum element, the page number lives in a `data-page` attribute.
const DATA_PAGE = 'page';

// On a `.footnoted` wrapper, the footnote text lives in a `data-footnote`
// attribute.
const DATA_FOOTNOTE = 'footnote';

/**
 * Wire a hover tooltip onto each `.footnoted` wrapper carrying a
 * `data-footnote`. The inner `.mark` keeps the footnote symbol visible to
 * flag the presence of a footnote, and is itself the tooltip's trigger.
 *
 * The footnote text in `data-footnote` is the raw HTML produced by the Python
 * pipeline (Coptic/Greek spans, italics, etc. all rendered before the footnote
 * was extracted). It is injected via `innerHTML` so that formatting is
 * preserved, then run through `handleAux` so that citations and references
 * inside the footnote pick up the same enrichment as the main entry.
 *
 * @param root
 */
function handleFootnotes(root: HTMLElement): void {
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
      tool.addTooltip(footnoted.querySelector(css.c(cls.MARK))!, [content]);
    });
}

/**
 * Wire each addendum's mark. The mark shows a tooltip linking to the addenda
 * page, and - on a device that can hover - is itself a link to the same page,
 * so that it can be followed directly rather than through the tooltip.
 *
 * On a touchscreen, a tap is the only way to summon the tooltip, so the mark
 * must not be a link there; following it would preempt the tooltip, leaving no
 * way to see it.
 *
 * @param root
 */
function handleAddenda(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(css.c(cls.ADDENDUM))
    .forEach((elem: HTMLElement): void => {
      const key: string = elem.dataset[DATA_PAGE]!;
      const mark: HTMLElement = elem.querySelector(`:scope > .${cls.MARK}`)!;
      const url: string = paths.crumScan(key);
      if (browser.hoverable()) {
        html.linkify(mark, url, ccls.HOVER_LINK);
      }
      tool.addTooltip(mark, [
        html.anchor(url, 'Addenda (', ...scan.prettyPage(key), ')'),
      ]);
    });
}

/**
 *
 * @param context
 * @returns
 */
function replaceSemicolon(context: html.Context): void {
  const span: HTMLSpanElement = html.span(...context.munch());
  span.classList.add(cls.SEMICOLON);
  tool.addTooltip(
    span,
    ['semicolons separate groups in meaning or usage'],
    [cls.SEMICOLON]
  );
  context.insert(span);
}

const DATA_KEY = 'key';

/**
 *
 * @param manual
 * @returns
 */
function handleManual(manual: HTMLElement): void {
  const replacement: Iterable<Node> | Node = handleManualAux(manual);
  manual.replaceWith(
    ...(replacement instanceof Node ? [replacement] : replacement)
  );
}

/**
 *
 * @param manual
 * @param key
 *
 * @returns
 */
function interpretKey(manual: HTMLElement, key: string): Iterable<Node> | Node {
  if (key === '') {
    // An empty key indicates that this should not be annotated.
    return manual.childNodes;
  }

  // NOTE: We don't split the suffix out of manually-labeled references, the
  // whole text inside the manual tag is treated as a reference name (which
  // is not true).
  // As of the time of writing, the only side effect of this bug is that
  // annotations don't reflect in the tooltip (#666). This is OK, because
  // the number of manually-marked references is very small anyway.
  // The key is explicit. The possibilities are:
  // 1. The key is a page in the book scan.
  // 2. The key is a reference abbreviation.
  // 3. The key is a Bible book abbreviation, potentially with overrides for
  //    the chapter / verse numbers.
  // 4. The key is an annotation.
  if (MANUAL_PAGE_RE.test(key)) {
    return page(key, ...manual.childNodes);
  }

  // NOTE: A few abbreviations are ambiguous: they exist in both `ref.MAPPING`
  // and `BIBLE_MAPPING`. Elsewhere we resolve such collisions in favour of
  // Bible citations, but manual labels reverse that priority and resolve to
  // the reference, because manual labels are primarily intended for
  // references; their use for Bible citations is incidental and rare.
  // As of the time of writing, the collisions are `Am` / `AM`, `AP`, `PS`
  // and `Pr` — the same set that `replaceMatch` sends down the Bible-first
  // fallback. None of them is stranded, because the collision is only on
  // the BARE abbreviation. `AP`, `PS` and `Pr` have Bible-only counterparts
  // (`Ap` / `Apoc`, `Ps` / `Pss`, `Pro`) that a contributor can use to force
  // the Bible reading. `Am` / `AM` have none — but the `ref.MAPPING` lookup
  // below is on the WHOLE key, so carrying the chapter is enough to force
  // Amos: `Am 4` is not a declared postfix composition, so it misses the
  // reference map, falls to the Bible branch, and reads its chapter
  // straight out of the key. That is just the documented `{Bk C V}` form
  // with the verse left off, and it is the fix wherever Crum cites a
  // chapter alone — `(cf Am 4 above)` under ϩⲁϫⲱ⸗ (2364), pointing at
  // his own `Am 4 7` earlier on the page — which `Citation.valid` refuses
  // automatically, since one number is neither zero numbers nor two.
  const reference: ref.Reference | undefined = ref.MAPPING[key];
  if (reference) {
    const span: HTMLSpanElement = reference.span(manual.childNodes);
    // NOTE: `sameKey` may be too strict.
    // Non-load-bearing postfixes may be better ignored in this comparison.
    // The blast radius is extremely small and both modes
    // of failure are benign, so we pick the one that keeps the code simpler.
    // TODO: (#0) Consider ignoring non-load-bearing postfixes.
    linkMatching(manual, span, reference.sameKey.bind(reference));
    return span;
  }

  const match: RegExpExecArray | null = BIBLE_RE.exec(key);
  if (match) {
    // The key starts with the abbreviation of a Bible book.
    // Try extracting the chapter and verse numbers from the key, falling back
    // to extracting them from the manual element itself.
    // NOTE: Should the citation be marked as non-explicit if the numbers are
    // retrieved from the key? The blast radius is extremely small, and failures
    // are benign both ways.
    const cv: RegExpExecArray | null =
      MANUAL_CHAPTER_VERSE.exec(key.slice(match[0].length)) ??
      MANUAL_CHAPTER_VERSE.exec(manual.textContent);
    const cit: Citation = new Citation(cv?.[1], cv?.[2], match[0]);
    const anchor: HTMLElement = cit.anchor(...manual.childNodes);
    linkMatching(manual, anchor, cit.sameBook.bind(cit));
    return anchor;
  }

  // Fall back to treating the key as an annotation.
  return annotation(key, ...manual.childNodes);
}

/**
 * Interpret a manual label — an enrichment decision made by a scholar.
 *
 * A manual label overrides the enrichment heuristics for one span of text, and
 * it is the fix for most findings, since the algorithm is mature enough that
 * what remains is usually an inconsistency in Crum's text that no heuristic
 * can resolve. The notation lives in the Wiki sheet, and is parsed by
 * `replace_manual` in `dictionary/marcion_sourceforge_net/wiki.py`, which packs
 * the key into `data-key` for us. The forms:
 *
 * - `{text}{}` suppresses. An empty key means "leave this text alone", and is
 *   the fix for a false positive.
 * - `{text}{Abb}` forces a reference. `Abb` must be a variant in `bib.yaml`.
 * - `{text}{Bk C V}` forces a Bible citation, e.g. `{ib 26}{Jud 19 26}`, or
 *   `{Heb 11 38}{He}`. The chapter and verse are optional; whatever the key
 *   omits is read out of the text instead.
 * - `{text}{full form}` forces an annotation. The key is displayed as the
 *   tooltip text, e.g. `{pl}{plate}`. Expanding an abbreviation is the
 *   commonest use, but not the only one: `{ib}{ibidem}` forces the LITERAL
 *   reading of an anaphor, and is the fix wherever an `ib` points at
 *   something that is not a citation at all — 'ⲥ. ⲕⲟⲩⲓ ‹v› ib ⟨B⟩' (174),
 *   where it means this same entry, or an erratum quoting Crum's own text
 *   (1780). Without it the anaphor binds to whatever citation precedes.
 * - `{text}{98b}` forces a page link. The key is the page — a page number
 *   followed by its column — and the whole text becomes the hyperlink,
 *   e.g. `{98 _b_}{98b}`. Note that this really is the WHOLE text:
 *   `{108 a 2 above}{108a}` (368) makes 'above' part of the link, so keep
 *   the span down to the page reference itself unless the wider text is
 *   meant to be clickable.
 * - `{text}`, with no key, infers: a reference if the text opens with one,
 *   otherwise a dangling suffix resolved against its antecedent.
 *
 * A `{text}{Abb}` label and a `variants:` entry in `bib.yaml` both teach us to
 * read an abbreviation Crum spelled his own way, and they are not
 * interchangeable. A spelling that is unambiguous WHEREVER it occurs belongs
 * in `bib.yaml`, where it is fixed once for the whole lexicon. A spelling that
 * is only correct in context, or that Crum used once, has to be a manual
 * label: `{P 42}{Mani P}` reads `P` as the Manichaean Psalm-Book, which is
 * true inside a Manichaean entry and false everywhere else, and `{PMd}{PMéd}`
 * repairs a single dropped accent that as a global variant would invite false
 * positives.
 *
 * An explicit key is resolved reference-first — the reverse of the automatic
 * priority in `replaceMatch` — which is what makes the chapter in `{Am 4}`
 * load-bearing. See the collision note below.
 *
 * @param manual
 * @returns
 */
function handleManualAux(manual: HTMLElement): Iterable<Node> | Node {
  // NOTE: Manual labels don't support suffix annotations. No manually-labeled
  // references with suffix annotations are present in the data, as of the time
  // of writing.
  // Even if such cases were to be introduced, their frequency would be too low
  // to be worth addressing.
  const key: string | undefined = manual.dataset[DATA_KEY];

  if (key !== undefined) {
    return interpretKey(manual, key);
  }

  // There is no provided key. We need to infer the interpretation. If the text
  // starts with a reference name, then it's a reference. Otherwise, it's a
  // dangling suffix, and we need to find an antecedent.
  const match: RegExpExecArray | null = REFERENCE_RE.exec(manual.textContent);

  if (match) {
    // We can infer the reference from the text.
    return ref.MAPPING[match[0]]!.span(manual.childNodes);
  }

  // This is a dangling suffix.
  // There are two possibilities:
  // 1. The antecedent is a Bible citation.
  // 2. The antecedent is a reference.
  const antecedent: HTMLElement | null = findAntecedent(manual);

  if (!antecedent) {
    log.error('Unable to find antecedent for dangling manual suffix', manual);
    return manual.childNodes;
  }

  if (antecedent.classList.contains(cls.REFERENCE)) {
    const anaphor: HTMLSpanElement = ref.Reference.fromSpan(antecedent).span(
      manual.childNodes
    );
    link(anaphor, antecedent);
    return anaphor;
  }

  log.ensure(antecedent.classList.contains(cls.BIBLE)); // Sanity check.

  const cv: RegExpExecArray | null = MANUAL_CHAPTER_VERSE.exec(
    manual.textContent
  );
  const cit: Citation = Citation.fromAnchor(antecedent);
  cit.update(cv?.[1], cv?.[2]);
  const anaphor: HTMLElement = cit.anchor(...manual.childNodes);
  link(anaphor, antecedent);
  return anaphor;
}

/**
 * NOTE: KNOWN UNHANDLED CASE (#671): Crum often repeats only the POSTFIX of the
 * antecedent after the 'ib' — "BMOr 8775 …, ib Or 8775 113", "ManiK …, ib K
 * …". A bare postfix is not a key, so the text after the 'ib' either stays
 * unenriched or resolves to an unrelated reference ('K' is Kircher). The
 * generic fix — retrying the antecedent's key with successively shorter
 * postfix chains — was implemented for `Mani` and reverted: it produced more
 * false positives than true ones. Instead:
 * 1. Consolidate the source in `bib.yaml`, so that the postfix stops being
 *    load-bearing. See the postfix NOTE there.
 * 2. Mark the few survivors by hand, as `{_ib_ Or 8775 113}{BMOr}`.
 *
 * @param context
 * @returns
 */
function replaceIB(context: html.Context): void {
  // NOTE: The antecedent must be resolved BEFORE the 'ib' is munched.
  // `findAntecedent` walks the live tree starting at `context.first()`, which
  // is the chain's first UNCONSUMED node. Munching an 'ib' that is the last
  // node of its chain empties the chain, and `Chain.first` then returns
  // undefined (it asserts non-null on an `at(-1)` that has nothing to return).
  // `backtrack` short-circuits on that undefined, skipping the live-tree walk
  // in its entirety and silently reporting no antecedent.
  const antecedent: HTMLElement | null = findAntecedent(context);

  // We expect the 'ib' match to be a clean 'ib' element.
  const ibNodes: Node[] = context.munch();

  let ib: HTMLElement;
  if (
    ibNodes.length === 1 &&
    ibNodes[0]?.nodeType === Node.ELEMENT_NODE &&
    ibNodes[0].textContent?.toLowerCase() === 'ib'
  ) {
    ib = ibNodes[0] as HTMLElement;
  } else {
    log.error('ib element found in an unexpected node:');
    context.insert(ibNodes);
    return;
  }

  if (!antecedent) {
    log.error('Unable to find antecedent reference for ib element', ib);
    context.insert(annotation(ann.IBIDEM, ib));
    return;
  }

  replaceAnaphor(context, antecedent, [ib]);
}

/**
 * Wire an anaphor to its antecedent, so hovering the former highlights the
 * latter.
 *
 * The highlight is transitive. An antecedent is often an anaphor in its own
 * right — in "Is 27 11, 56 9" followed by a dangling "3 4", the "56 9" refers
 * back to "Is 27 11", and the "3 4" refers back to "56 9" — so rather than
 * merely toggling the class, we re-dispatch VISIT / LEAVE on the antecedent.
 * If it was itself linked, its own listener fires and carries the highlight
 * one hop further back, until the head of the chain is reached.
 *
 * NOTE: The custom events deliberately don't bubble. Propagation must follow
 * the anaphor chain, which is a relation between siblings, not the DOM tree.
 *
 * @param anaphor - The expression that refers back.
 * @param antecedent - The citation it refers back to.
 */
function link(anaphor: HTMLElement, antecedent: HTMLElement): void {
  const visitAntecedent = (): void => {
    antecedent.classList.add(cls.ANTECEDENT);
    antecedent.dispatchEvent(new CustomEvent(EVENT.VISIT));
  };

  const leaveAntecedent = (): void => {
    antecedent.classList.remove(cls.ANTECEDENT);
    antecedent.dispatchEvent(new CustomEvent(EVENT.LEAVE));
  };

  anaphor.addEventListener('mouseenter', visitAntecedent);
  anaphor.addEventListener('mouseleave', leaveAntecedent);

  anaphor.addEventListener(EVENT.VISIT, visitAntecedent);
  anaphor.addEventListener(EVENT.LEAVE, leaveAntecedent);
}

/**
 * Resolve an anaphor — an expression whose numbers refer back to an antecedent
 * citation — into a link that inherits the antecedent's book/chapter/verse (for
 * a Bible antecedent) or reference (for a reference antecedent).
 *
 * @param context
 * @param antecedent - The citation the anaphor refers back to.
 * @param prefix - Carrier nodes placed inside the produced link (e.g. the `ib`
 * element). Empty for a dangling suffix, where the numbers stand alone.
 */
function replaceAnaphor(
  context: html.Context,
  antecedent: HTMLElement,
  prefix: HTMLElement[] = []
): void {
  const munch = (match: RegExpMatchArray | null | undefined): Node[] => {
    // Munch an anaphor's matched content into nodes for the produced link.
    // With no carrier prefix (the dangling-suffix case) a leading space before
    // the numbers is plain text, not part of the link: advance it into the
    // fragment so it renders as a space, and munch only the rest into the link.
    const length: number = match?.[0].length ?? 0;
    const lead: number = !prefix.length && match?.[0]?.startsWith(' ') ? 1 : 0;
    context.advance(lead);
    return context.munch(length - lead);
  };

  if (antecedent.classList.contains(cls.REFERENCE)) {
    const match: RegExpMatchArray | null = SUFFIX.exec(context.remainder);
    const suffix: (Node | string)[] = match
      ? [...munch(match), ...suffixFollowups(context)]
      : [];
    const anaphor: HTMLSpanElement = ref.Reference.fromSpan(antecedent).span(
      prefix,
      suffix
    );
    context.insert(anaphor);
    link(anaphor, antecedent);
    return;
  }

  log.ensure(antecedent.classList.contains(cls.BIBLE)); // Sanity check.

  // Construct the antecedent citation.
  const cit: Citation = Citation.fromAnchor(antecedent);

  // Update the citation with numbers from this citation.
  // Notice that it's valid for the new citation to not have any numbers.
  const match: RegExpMatchArray | null | undefined = CHAPTER_VERSE.exec(
    context.remainder
  );
  cit.update(match?.[1] ?? match?.[3], match?.[2] ?? match?.[4]);

  const anaphor: HTMLElement = cit.anchor(...prefix, ...munch(match));
  context.insert(anaphor);
  link(anaphor, antecedent);
  parseBibleFollowups(anaphor, cit, context);
  return;
}

/* eslint-disable complexity */
/**
 * NOTE: This function assumes the following HTML structure:
 *   <p>
 *     <span class="subparagraph"> ...candidates </span>
 *     ...
 *     <span class="subparagraph"> ...candidates </span>
 *   </p>
 *   <p>
 *     <span class="subparagraph"> ...candidates </span>
 *     ...
 *     <span class="subparagraph"> ...candidates </span>
 *   </p>
 *   ...
 *
 * Addenda and footnoted spans are the exceptions to this flat structure: they
 * nest. Both are wrappers that sit ON the flat chain while holding their
 * content one (or more) levels BELOW it:
 *   - A correction `//removed//added//` is emitted (by `replace_addendum` in
 *     `dictionary/marcion_sourceforge_net/wiki.py`) as
 *       <span class="addendum"><del>removed</del> <ins>added</ins>
 *       <span class="mark">MARK</span></span>
 *   - Text carrying a footnote is emitted (by `replace_footnote`) as
 *       <span class="footnoted" data-footnote="…">text<span class="mark">MARK
 *       </span></span>
 * so an element produced inside either wrapper sits below the flat chain rather
 * than on it. The second branch below accounts for both, giving two behaviors:
 *   - An element that ORIGINATES inside a wrapper (e.g. an `ib`) first
 *     backtracks among its siblings within that wrapper — its antecedent may
 *     have been written alongside it — and only then resumes from the wrapper's
 *     own predecessors on the flat chain. For an addendum it additionally never
 *     crosses into the other half: a `<del>` element stays within `<del>`, an
 *     `<ins>` element within `<ins>`.
 *
 *   - A wrapper merely ENCOUNTERED along the walk is yielded whole (its own
 *     class never matches an antecedent query) and stepped over; we never
 *     descend into its contents.
 *
 *     Cases where an anaphor has its antecedent in an addendum, while they do
 *     occur (e.g. under ⲟⲩⲉⲓⲛⲓⲛ – 523), are extremely rare. And resolving them
 *     programmatically is awkward: it's not clear whether the <ins> or <del>
 *     element should contain the true antecedent. We therefore skip the whole
 *     addendum, keeping the walk simple, and label those `ib`s manually
 *     instead.
 *
 *     A footnoted span is skipped the same way, but its
 *     content is real, current text rather than corrected/obsolete text, so a
 *     citation buried in it could legitimately be a later `ib`'s antecedent.
 *     We guard against that editorially: when adding footnotes to the data, we
 *     are careful not to wrap text that serves as the antecedent of a
 *     following `ib`, so a footnote never conceals a true antecedent.
 *
 * The last two branches hop to a container and then descend into it. Both
 * SELECT that container with `previousElementSibling` / `lastElementChild`, to
 * skip the whitespace text nodes between adjacent `<span>`s and `<p>`s — a text
 * node there has no children to walk into, so the hop would dead-end. But both
 * DESCEND with `lastChild`, deliberately, so that a subparagraph's trailing
 * text is walked rather than skipped: `findAntecedent` reads the text between
 * the candidates to track parenthesis nesting, and `lastElementChild` would
 * silently drop every parenthesis standing after a subparagraph's last element.
 *
 * Termination: every branch returns either null or a node that strictly
 * precedes `node` in document order. In particular the wrapper branch searches
 * from `parentElement`, so it can only return a STRICT ancestor — never `node`
 * itself. (`closest` includes the element it is called on, so searching from
 * `node` would let a wrapper span return itself and spin `backtrack`'s walk
 * forever.) The strictly-decreasing position guarantees the walk halts.
 *
 * P.S. Subparagraphs were introduced in #693.
 *
 * @param node
 * @returns
 */
function previous(node: Node | null): Node | null {
  // Try the element's previous sibling.
  return (
    node?.previousSibling ??
    // Step out of a nesting wrapper — an addendum's <del>/<ins> or a footnoted
    // span — once the sibling walk above has exhausted the content inside it.
    // Resume from the wrapper span itself, which is the element that lives on
    // the flat chain. Searching from `parentElement` (not `node`) finds only an
    // enclosing wrapper, so this returns the wrapper for an element nested
    // inside one, and nothing for a plain flat element (whose parent is the
    // subparagraph). See the note above on why this must be a strict ancestor.
    node?.parentElement?.closest(
      css.disjunction(cls.ADDENDUM, cls.FOOTNOTED)
    ) ??
    // Move to the previous subparagraph. Use `previousElementSibling` to
    // skip the whitespace text node between adjacent `<span>`s, but land on
    // its `lastChild`. See the note below on the final step.
    node?.parentElement?.previousElementSibling?.lastChild ??
    // Move to the previous paragraph. Use `previousElementSibling` to skip
    // the whitespace between adjacent `<p>`s, and `lastElementChild` to
    // skip trailing whitespace inside that previous `<p>` and descend into
    // its last subparagraph.
    // This cross-paragraph hop is suppressed when `crossParagraphs` is false.
    // This can be used on views where some paragraphs are dropped, making the
    // preceding `<p>` an unreliable antecedent.
    (ambient.crossParagraphs
      ? node?.parentElement?.parentElement?.previousElementSibling
          ?.lastElementChild?.lastChild
      : null) ??
    null
  );
}
/* eslint-enable complexity */

/**
 *
 * @param node
 * @param context
 */
function* backtrack(
  node: Node | null,
  context?: html.Context
): Generator<Node> {
  // Candidates are gathered from two roots, because the preceding elements are
  // split across two trees at this point in enrichment:
  // 1. The already-enriched elements of the CURRENT chain live in the
  //    in-progress `fragment`, which is detached from the document until
  //    `replaceNodes` splices it back at the very end. A DOM walk rooted at
  //    `node` (the `ib` element, still in the live tree) therefore cannot see
  //    them, so we take them directly: `elem` (the closest) and its
  //    predecessors within the fragment.
  //    This walk only applies when a `context` is given. Manually-marked
  //    elements are enriched outside the chain machinery, after all preceding
  //    chains have been spliced back into the live tree, so they have no
  //    in-progress fragment and pass none.
  // 2. Everything before this chain — earlier siblings, subparagraphs, and
  //    paragraphs — is still in the live document and is reached by walking up
  //    from `node`.
  //
  // The two walks cannot overlap: walk 1 ranges only over the detached
  // fragment, walk 2 only over the live document, and a node belongs to exactly
  // one of those trees. (The fragment's nodes were *moved*, not copied, out of
  // the live tree as they were enriched.)
  //
  // Note the asymmetry: walk 1 is a plain `previousSibling` loop with none of
  // the addendum/footnoted wrapper handling that `previous` applies in
  // walk 2. It needs none, because the fragment is flat by construction.
  // `enrich`'s `walk` descends INTO wrappers and only ever chains their leaf
  // contents (text and `<i>` atoms), never the wrapper elements themselves, and
  // chains are contiguous siblings, so they never cross a wrapper boundary. A
  // wrapper is therefore never munched into a fragment: walk 1 can never
  // encounter one, and an `ib` originating inside a wrapper has its same-chain
  // antecedents (the wrapper's interior is its own chain) sitting at the
  // fragment's top level. Wrappers stay intact only in the live tree, which is
  // why only walk 2 has to climb out of and step over them.
  for (
    let child: Node | null | undefined = context?.fragmentLastChild;
    child;
    child = child.previousSibling
  ) {
    yield child;
  }

  while ((node = previous(node))) {
    yield node;
  }
}

const ANTECEDENTS: string[] = [cls.BIBLE, cls.REFERENCE];
const ANTECEDENT_QUERY: string = css.disjunction(...ANTECEDENTS);

/**
 *
 * @param node
 * @returns Whether the given node is a potential antecedent HTML element.
 */
function antecede(node: Node): node is HTMLElement {
  return node instanceof HTMLElement && node.matches(ANTECEDENT_QUERY);
}

/**
 * The parenthesis nesting of the backward walk RELATIVE TO THE ANAPHOR.
 */
interface Nesting {
  /**
   * How many parentheses have opened and closed again between the anaphor and
   * the walk's current position. Zero means the walk stands at the anaphor's
   * own level; a positive depth means it is buried in a parenthesis that closed
   * before the anaphor.
   */
  depth: number;
  /**
   * Whether the walk has stepped out of a parenthesis that encloses the anaphor
   * itself — a '(' with no ')' of its own to close.
   */
  enclosed: boolean;
}

/**
 * Accumulate the nesting across `text`.
 *
 * The walk reads the text backwards, so a ')' opens a parenthesis and a '('
 * closes it. A '(' at depth zero closes nothing: it is the one enclosing the
 * anaphor, so it raises `enclosed` and leaves the depth alone rather than
 * driving it negative. That is what confines the depth to candidates BURIED
 * relative to the anaphor — everything beyond such a '(' stands at a level the
 * anaphor shares or sits inside. Letting the depth go negative instead would
 * make this the symmetric depth comparison that was tried and abandoned (see
 * `findAntecedent`).
 *
 * @param text - The text just traversed.
 * @param nest - The nesting accumulated by the walk up to `text`.
 * @returns The nesting accumulated including `text`.
 */
function nesting(text: string, nest: Nesting): Nesting {
  let { depth, enclosed } = nest;

  for (let i = text.length - 1; i >= 0; --i) {
    if (text[i] === ')') {
      ++depth;
    } else if (text[i] === '(') {
      if (depth === 0) {
        enclosed = true;
      } else {
        --depth;
      }
    }
  }

  return { depth, enclosed };
}

/**
 * @param one - A candidate antecedent.
 * @param another - Another candidate antecedent.
 * @returns Whether the two are citations of the same kind — both Bible
 * citations, or both references.
 */
function sameKind(one: HTMLElement, another: HTMLElement): boolean {
  return ANTECEDENTS.some(
    (klass: string): boolean =>
      one.classList.contains(klass) && another.classList.contains(klass)
  );
}

const MAX_CANDIDATES = 3;

/**
 * Link the first antecedent that matches the given precedent to the given
 * anaphor, if found.
 * The number of candidates to consider is capped at `MAX_CANDIDATES`.
 * Candidates farther than that are unlikely to actually be antecedents.
 *
 * False negatives are possible, due to non-load-bearing postfixes (#671), and
 * perhaps due to the distance. They're largely benign.
 * False positives are rather unlikely, and they're also benign.
 *
 * As of the time of writing, this is only used for manual labels with an
 * explicit key, which is a very small population in the first place, making the
 * above issues extremely rare.
 *
 * That tiny population, and the failures above, are equally
 * an argument for dropping the feature altogether. We retain it because those
 * labels are ALREADY annotated as anaphors: `Reference.span` and
 * `Citation.anchor` both run `ann.ib` over their text and push an `ibidem`
 * line into the tooltip. Without this, the site tells the reader that a label
 * means `ibidem` and then, alone among every `ib` on the page, declines to
 * show them of WHAT — in exactly the spot where a scholar already intervened
 * because the heuristics failed. Dropping the feature makes that
 * inconsistency permanent.
 *
 * @param start
 * @param anaphor
 * @param predicate
 *
 * @returns
 */
function linkMatching(
  start: HTMLElement | null,
  anaphor: HTMLElement,
  predicate: (_: HTMLElement) => boolean
): void {
  // We consider all candidates, regardless of parentheses.
  const candidate: HTMLElement | undefined = backtrack(start)
    .filter(antecede)
    .take(MAX_CANDIDATES)
    .find(predicate);

  if (!candidate) {
    return;
  }
  link(anaphor, candidate);
}

/**
 * Find the antecedent of an anaphor — the nearest already-enriched Bible
 * citation or reference that precedes `start` in document order, with one
 * exception: when a parenthesis INTERRUPTS a running citation, the anaphor
 * resumes the citation standing outside the parenthesis rather than the one
 * buried inside it.
 *
 * A parenthesis is read as interrupting, rather than continuing, the running
 * citation by the KIND of citation it holds. Crum's commonest shape is a Bible
 * citation, then a parenthesis naming the edition a variant reading comes from,
 * then an 'ib' resuming the Bible book:
 * 'Mt 20 5 [S][F] ⲧϫⲡ- (PMich 539, [B] ⲛⲁϫⲡ-) περὶ ὥ., ib 27 45', where
 * 'ib 27 45' is Mt 27:45 and not a page of P Mich. Its mirror is just as real:
 * a reference, then a parenthesis citing the scripture a passage echoes, then
 * an 'ib' resuming the reference's pages:
 * 'BMis 413 ⲛⲧⲛⲡⲟⲣϫⲛ ⲉⲛⲁⲑⲏ (cf Phil 3 13), ib 140', where 'ib 140' is page 140
 * of B Mis — Philippians 3 has 21 verses, so 'Phil 3 140' cannot be meant. In
 * both, the parenthesis holds an aside of the OTHER kind. A parenthesis holding
 * the SAME kind is continuing the running series instead, and there the nearer
 * (buried) candidate is the right one: in 'ⲡϣⲱⲛⲧⲉ (Lant 44), ⲡϣⲁⲛⲧⲉ (ib 49)'
 * the 'ib' is Lant, though an earlier reference stands outside every
 * parenthesis.
 *
 * NOTE:
 * - The anaphor must not sit inside a parenthesis itself (`enclosed`). A
 *   parenthetical aside resumes the citation of the aside before it, not the
 *   running text around them both: in 'ⲫⲁⲛⲓϫⲱⲓⲧ (C 86 161) = ⲡⲓⲉⲍⲍⲉⲓⲑⲟⲩⲛ
 *   (ib 173)' the 'ib' is C, however many Bible citations precede.
 * - Depth is relative to the anaphor and never goes negative (see
 *   `nesting`), so a candidate is skipped only when it is nested
 *   deeper than the anaphor, never when it is nested less deeply. An earlier
 *   version of this heuristic tracked absolute depth and refused any candidate
 *   at a depth different from the anaphor's; that rejected the outer candidate
 *   whenever the anaphor itself sat inside a parenthesis — usually exactly the
 *   right antecedent — and it produced numerous errors, so it was removed.
 *
 * NOTE: KNOWN: The nesting of a wrapper — an addendum's <del>/<ins> or a
 * footnoted span — is counted twice. `previous` yields the wrapper only once
 * the walk has gone through its interior sibling by sibling, so its text has
 * already been accounted for; counting the wrapper itself adds that text again,
 * along with the part of it that follows the anaphor. `nesting` is not
 * idempotent on unbalanced text, so this can inflate the depth or raise
 * `enclosed` for an anaphor sitting inside a wrapper whose antecedent lies
 * outside it. No entry currently binds differently for this reason, and
 * guarding it costs a `contains` check per node, so it is left alone.
 *
 * The nearest candidate is still returned whenever the exception does not
 * apply, so this can only reorder the candidates, never lose them: an anaphor
 * that resolved before still resolves. See #709, #511.
 *
 * @param start - one of two forms, matching the two ways anaphors are enriched:
 * - An `html.Context`, for elements enriched inside the chain machinery. The
 *   walk begins at `context.first()` and additionally consults the fragment.
 * - A plain `Node`, for manually-marked elements enriched after their chains
 *   have already been spliced back into the live tree (no fragment to consult).
 * @returns the antecedent, or null if none precedes `start`.
 */
function findAntecedent(start: Node | null | html.Context): HTMLElement | null {
  const candidates: Iterable<Node> =
    start instanceof html.Context
      ? backtrack(start.first(), start)
      : backtrack(start);

  // The nearest candidate, once the walk has found one buried in a parenthesis
  // and gone on looking for the outer one that may override it.
  let nearest: HTMLElement | null = null;
  let nest: Nesting = { depth: 0, enclosed: false };

  for (const node of candidates) {
    if (antecede(node)) {
      if (nest.depth === 0 || nest.enclosed) {
        // The walk stands at the anaphor's own level, so this candidate is the
        // outer one. It resumes the running citation — and wins — unless it is
        // of the same kind as the buried candidate, in which case the two
        // belong to one series and the nearer of them is the antecedent.
        return nearest && sameKind(node, nearest) ? nearest : node;
      }

      nearest ??= node;
      // This is not a candidate. Just update parenthesis nesting.
      continue;
    }

    nest = nesting(node.textContent ?? '', nest);
  }

  return nearest;
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
      // NOTE: The following intentionally includes GREEK although it is, as of
      // the time of writing, hyperlinked.
      // Clicking Greek elements both triggers a clipboard copy and opens a
      // link. This is acceptable.
      // Notice that the copied text may be a superset of the hyperlinked text,
      // as hyperlinks are added to each word individually instead of an entire
      // `.greek` span.
      // TODO: (#658) Figure out a way to allow copying and lookups to coexist
      // gracefully.
      css.disjunction(
        cls.GLOSS,
        cls.COPTIC,
        cls.GREEK,
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
    const form: string | undefined = ambient.formSuperscripts.get(
      sup.textContent
    );
    if (!form) {
      log.warn('Unable to find the form of superscript', sup.textContent);
      return;
    }
    if (sup.previousSibling?.textContent === form) {
      // This is the element that defines the form.
      return;
    }

    // In a singleton known instance[1], two paragraphs in the entry use two
    // different groups of form superscripts and their corresponding forms.
    // We detect this case by checking if the previous sibling is a spelled-out
    // Coptic word, in which case we update the stored form for the superscript
    // and refrain from adding a tooltip.
    //
    // [1]: https://remnqymi.com/crum/79.html (ϩⲱⲃⲥ)
    const prev: string | null | undefined = sup.previousSibling?.textContent;
    if (prev && /^\p{Script=Coptic}*$/u.test(prev)) {
      ambient.formSuperscripts.set(sup.textContent, prev);
      return;
    }

    tool.addTooltip(sup, [form]);
  });
}
/* eslint-enable max-lines */
