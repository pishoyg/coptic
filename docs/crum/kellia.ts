import type * as high from './highlight.js';
import * as crum from './crum.js';
import * as ccls from '../cls.js';
import * as css from '../css.js';
import * as html from '../html.js';
import * as log from '../logger.js';
import * as paths from '../paths.js';
import * as str from '../str.js';
import * as tool from '../tooltip.js';
import * as cls from './cls.js';

/** Location is a location that a citation gives, split into its parts. */
interface Location {
  /**
   * volume is the volume cited, as `2` in `Preisigke 2:475` or `I` in
   * `ONB I 23`, if any.
   */
  readonly volume: string | undefined;
  /** page is the page (or column) cited, with Roman numerals in lower case. */
  readonly page: string;
  /**
   * section is true if the citation gives a section (`§`) rather than a page,
   * as in `LCG § 285`, in which case `page` is the number of the section.
   */
  readonly section: boolean;
  /** column is the column of the page cited, as `b` in `CD 391b`, if any. */
  readonly column: string | undefined;
}

/** Source is a work that KELLIA cites. */
interface Source {
  /** title is the bibliographic reference of the work. */
  readonly title: string;
  /** url is the URL of a copy of the work online, if any. */
  readonly url?: string;
  /**
   * locate builds the URL of the location that a citation gives, if we can
   * link to locations in the work. It takes precedence over `url`, which
   * serves the citations that it can't locate.
   */
  readonly locate?: (location: Location) => string | undefined;
}

/**
 * @param id - The identifier of an item on the Internet Archive.
 * @param page - Where to land in the item, if anywhere: the number printed on
 * a page, if the item maps its images to the printed numbers, or the index of
 * an image.
 * @returns The URL of the item, showing one page at a time.
 */
function archive(id: string, page?: string | number): string {
  const item = `https://archive.org/details/${id}`;
  if (page === undefined) {
    return `${item}/mode/1up`;
  }
  const image: string = typeof page === 'number' ? `n${page.toString()}` : page;
  return `${item}/page/${image}/mode/1up`;
}

/**
 * Run is a run of images in the scan of a work that prints two numbered
 * columns on a page, the odd one on the left. A leaf that the scan skips or
 * repeats starts a new run.
 */
interface Run {
  /** id is the identifier of the item on the Internet Archive. */
  readonly id: string;
  /** last is the last column in the run. */
  readonly last: number;
  /**
   * offset is twice the index of an image in the run, minus the left column on
   * the image.
   */
  readonly offset: number;
}

/**
 * @param column - The column cited.
 * @param runs - The runs of the scan, in order. The last one must end at
 * `Infinity`.
 * @returns The URL of the image that shows the column.
 */
function columns(column: string, runs: Run[]): string {
  const number = Number(column);
  const run: Run | undefined = runs.find(
    ({ last }: Run): boolean => number <= last
  );
  log.ensure(run, 'No run holds column', column);
  return archive(run.id, Math.floor((number + run.offset) / 2));
}

// SOURCES lists the works that KELLIA cites, keyed by their abbreviations.
// The titles come from the bibliography in the header of the TEI XML of the
// Comprehensive Coptic Lexicon.
//
// We only link to copies on the Internet Archive that it scanned itself, or
// that come from libraries. Most of them are in its lending library, so users
// must borrow them to read them, and a link to a page only lands on the page
// while the user has the copy on loan. Works that are out of copyright are
// free to read. We land on the page cited wherever we can: through the page
// numbers that the Internet Archive maps to the images, or, where it maps none
// (or maps them wrong), through offsets that we measured by reading the numbers
// printed on sampled images. Some works that are still in copyright, such as
// BDAG, Lampe, Denniston, and Westendorf's Koptisches Handwörterbuch, also
// have copies that users uploaded, which are likely pirated. We leave those
// out.
//
// TODO: (#0) Expand the links as more works become available online. As of
// the time of writing, 3,327 of the 31,223 citations in the data (10.7%) have
// no link, 3,224 of them to DELC.
//
// NOTE: `BiblSource` and `EtymSource` in
// `dictionary/kellia_uni_goettingen_de/tei.py` list the works that translations
// and etymologies cite, and the pipeline validates the citations against them.
// Every one of them must have an entry here, under the same abbreviation, or
// its citations will lack a hint. Keep the lists aligned.
const SOURCES: Record<string, Source> = {
  CD: {
    title: 'W.E. Crum, A Coptic Dictionary, Oxford: Clarendon Press, 1939',
    locate: ({ page, column }: Location): string =>
      paths.crumScan(`${page}${column ?? ''}`),
  },
  CDC: {
    title:
      "R. Kasser, Compléments au dictionnaire copte de Crum, Kairo: Inst. Français d'Archéologie Orientale, 1964",
    locate: ({ page, column }: Location): string =>
      paths.ifao(`${page}${column ?? ''}`),
  },
  KoptHWb: {
    title:
      'W. Westendorf, Koptisches Handwörterbuch, Heidelberg: Winter, 1965 (1977)',
    locate: ({ page }: Location): string =>
      archive('koptischeshandwr0000west', page),
  },
  CED: {
    title:
      'J. Černý, Coptic Etymological Dictionary, Cambridge: Cambridge Univ. Press, 1976',
    locate: ({ page }: Location): string =>
      archive('copticetymologic0000ernj', page),
  },
  DELC: {
    title:
      'W. Vycichl, Dictionnaire étymologique de la langue copte, Leuven: Peeters, 1983',
  },
  ChLCS: {
    title:
      'P. Cherix, Lexique Copte (dialecte sahidique), Copticherix, 2006-2018',
    url: 'https://de.cdn-website.com/3e823bf7e8654767a06a86d670bf72af/files/uploaded/Cherix-Lexicopte23.pdf',
    // Cherix also publishes a Greek lexicon, which KELLIA doesn't cite:
    // https://de.cdn-website.com/3e823bf7e8654767a06a86d670bf72af/files/uploaded/Cherix-Lexigrec22.pdf
  },
  ONB: {
    title:
      'T. Orlandi, Koptische Papyri theologischen Inhalts (Mitteilungen aus der Papyrussammlung der Österreichischen Nationalbibliothek (Papyrus Erzherzog Rainer) / Neue Serie, 9), Wien: Hollinek, 1974',
  },
  WbGWKDT: {
    title:
      'H. Förster, Wörterbuch der griechischen Wörter in den koptischen dokumentarischen Texten. Berlin/Boston: de Gruyter, 2002',
  },
  LCG: {
    title:
      'B. Layton, A Coptic grammar: with a chrestomathy and glossary; Sahidic dialect, Wiesbaden: Harrassowitz, 2000',
    // The Internet Archive has the second edition (2004), whose pages match
    // those of the first. It doesn't map sections to pages, so a citation of
    // a section lands on the work.
    locate: ({ page, section }: Location): string =>
      archive('copticgrammarwit0000layt', section ? undefined : page),
  },
  'Till D': {
    title:
      'W. Till, Koptische Dialektgrammatik: mit Lesestücken und Wörterbuch, München: Beck, 1961',
    // Like LCG, citations of a section land on the work.
    locate: ({ page, section }: Location): string =>
      archive('koptischedialekt0000till', section ? undefined : page),
  },
  'Osing, Pap. Ox.': {
    title:
      'J. Osing: Der spätägyptische Papyrus BM 10808, Harrassowitz, Wiesbaden 1976',
  },
  Bauer: {
    title:
      'W. Bauer, K. Aland, B. Aland, Griechisch-deutsches Wörterbuch zu den Schriften des Neuen Testaments und der frühchristlichen Literatur, Berlin: de Gruyter, 1988',
    // The Internet Archive only has earlier editions (1928, 1937, and 1958),
    // whose pages don't match those of the sixth edition, which KELLIA cites.
  },
  BDAG: {
    title:
      'F.W. Danker, W. Bauer, A Greek-English Lexicon of the New Testament and other Early Christian Literature, Chicago/London: University of Chicago Press, 2000',
  },
  'Daris 1991': {
    title:
      "S. Daris, Il lessico Latino nel Greco d'Egitto (Estudis de Papirologia i Filologia Biblica 2), Barcelona: Ediciones Aldecoa, 1991",
  },
  'Denniston 1959': {
    title: 'J.D. Denniston, The Greek Particles, London: Clarendon Press, 1959',
    locate: ({ page }: Location): string =>
      archive('greekparticles0000jdde', page),
  },
  'du Cange': {
    title:
      'C. F. du Cange, Glossarium ad scriptores mediae et infimae Graecitatis I-II, Graz: Akademische Druck- und Verlagsanstalt, 1958',
    // The Graz edition reprints the Lyon edition of 1688, whose tomes the
    // Internet Archive has from two libraries. The first tome holds columns 1
    // to 1278, and the second carries on the numbering. The scan of the second
    // tome skips columns 1517-1518 and 1633-1636.
    locate: ({ page }: Location): string =>
      columns(page, [
        { id: 'bub_gb_IFNLAAAAcAAJ', last: 1278, offset: 111 },
        { id: 'A210119', last: 1516, offset: -1265 },
        { id: 'A210119', last: 1632, offset: -1267 },
        { id: 'A210119', last: Infinity, offset: -1271 },
      ]),
  },
  'Hatch/Redpath 1906': {
    title:
      'E. Hatch, H.A. Redpath, A concordance to the Septuagint and the other Greek versions of the Old Testament (including the apocryphal books), Supplement, Graz: Akademische Druck- und Verlagsanstalt, 1906',
    url: archive('aconcordancetos00redpgoog'),
  },
  Kontopoulos: {
    title:
      'N. Kontopoulos, A Lexicon of Modern Greek-English and English-Modern Greek, Smyrna/London: B. Tatikidos, Trübner & Co., 1868',
    // The index of the image of a page is its number plus 12, up to page 348.
    // After that, the scan drifts, so we land on the work.
    // TODO: (#0) The two citations of Kontopoulos don't align with this copy:
    // the word that `Kontopoulos 120B` cites occurs on page 109, and that of
    // `Kontopoulos 25B` on page 22.
    locate: ({ page }: Location): string => {
      const lastPage = 348;
      const offset = 12;
      return Number(page) <= lastPage
        ? archive('glexiknllynoagg00kontgoog', Number(page) + offset)
        : archive('glexiknllynoagg00kontgoog');
    },
  },
  Lampe: {
    title:
      'G.W.H. Lampe, A patristic Greek lexicon, Oxford: Clarendon Press, 1978',
    locate: ({ page }: Location): string =>
      archive('patristicgreekle0000lamp', page),
  },
  LBG: {
    title:
      'E. Trapp, Lexikon zur byzantinischen Gräzität, besonderes des 9.-12. Jahrhunderts, Philosophisch-historische Klasse, Denkschriften (Veröffentlichungen der Kommission für Byzantinistik 238; VI/1-4) , Wien: Österreichische Akademie der Wissenschaften, 2001',
    // The TLG hosts the lexicon, behind a free registration.
    url: 'https://stephanus.tlg.uci.edu/lbg/',
  },
  LSJ: {
    title:
      'H.G. Liddell, R. Scott, H.S. Jones, A Greek-English lexicon, Oxford: Clarendon Press, 1968',
    // KELLIA cites the 1968 printing, which binds the lexicon of the ninth
    // edition (1925-1940), reprinted with its pages, with a new supplement.
    // The Internet Archive only lends its copies of the 1968 printing, so we
    // link to the Wellcome Library's set instead, which is free to read. The
    // set scans the lexicon of the 1940 printing in two volumes, and the
    // supplement of 1968 as a third item (see `LSJ Suppl.`), so the lexicon
    // and the supplement link to different items. The first volume ends on
    // page 1020. The index of the image of a page is its number plus 53 in the
    // first volume, and its number minus 1013 in the second.
    locate: ({ page }: Location): string => {
      const number = Number(page);
      const lastPageOfFirstVolume = 1020;
      const firstVolumeOffset = 53;
      const secondVolumeOffset = -1013;
      return number <= lastPageOfFirstVolume
        ? archive('b31364949_0001', number + firstVolumeOffset)
        : archive('b31364949_0002', number + secondVolumeOffset);
    },
  },
  'LSJ Suppl.': {
    title:
      'H.G. Liddell, R. Scott, H.S. Jones, E.A. Barber, A Greek-English lexicon/Supplement, Oxford: Clarendon Press, 1968',
    // The supplement is the third item of the Wellcome Library's set (see
    // `LSJ`), which maps its pages to the printed numbers.
    locate: ({ page }: Location): string => archive('b31364949_0003', page),
  },
  'Muraoka 2009': {
    title:
      'T. Muraoka, A Greek-English Lexicon of the Septuagint, Louvain/Paris/Walpole: Peeters, 2009',
  },
  Passow: {
    title:
      'F. Passow, V.C.F Rost, F. Palm, Handwörterbuch der griechischen Sprache, Leipzig: Vogel, 1841',
  },
  Preisigke: {
    title:
      'F. Preisigke, Wörterbuch der griechischen Papyrusurkunden mit Einschluß der griechischen Inschriften, Aufschriften, Ostraka, Mumienschilder usw. aus Ägypten, Berlin: Selbstverlag der Erben, 1925-1931',
    // The first two volumes print two numbered columns on a page. The scan of
    // the first volume repeats columns 799-802. The third volume is a list of
    // words, with numbered pages.
    locate: ({ volume, page }: Location): string | undefined => {
      switch (volume) {
        case '1':
          return columns(page, [
            { id: 'wrterbuchdergrie0001prei', last: 802, offset: 39 },
            { id: 'wrterbuchdergrie0001prei', last: Infinity, offset: 43 },
          ]);
        case '2':
          return columns(page, [
            { id: 'wrterbuchdergrie0000prei_y4l3', last: Infinity, offset: 19 },
          ]);
        case '3':
          return archive('wrterbuchdergrie0003prei', page);
        case undefined:
        default:
          return undefined;
      }
    },
  },
  // The header of the XML lacks this work, but two etymologies cite it. Without
  // an entry of its own, its citations would match `Preisigke` instead.
  'Preisigke Fwb': {
    title:
      'F. Preisigke, Fachwörter des öffentlichen Verwaltungsdienstes Ägyptens in den griechischen Papyrusurkunden der ptolemäisch-römischen Zeit, Göttingen: Vandenhoeck & Ruprecht, 1915',
    locate: ({ page }: Location): string =>
      archive('fachwrterdes00preiuoft', page),
  },
  Sophocles: {
    title:
      'E.A. Sophocles, Greek Lexicon of the Roman and Byzantine Periods (From B. C. 146 to A. D. 1100. Memorial Edition), Cambridge/Leipzig: Harvard University Press/Harrassowitz, 1914',
    locate: ({ page }: Location): string =>
      archive('greeklexiconofro00soph', page),
  },
  'T. S. Richter 2014b': {
    title:
      'T.S. Richter, Neue koptische medizinische Rezepte (Zeitschrift für Ägyptische Sprache und Altertumskunde ZÄS 141(2), 154-194), 2014',
    url: 'https://archiv.ub.uni-heidelberg.de/propylaeumdok/3981',
  },
  'Till 1951a': {
    title: 'W.C. Till, Arzneikunde der Kopten, Berlin: Akademie Verlag, 1951',
  },
  TLG: {
    title:
      'L. Berkowitz, K.A. Squitier, Thesaurus Linguae Graecae (Canon of Greek Authors and Works), New York/Oxford: University Press, 1990',
    url: 'https://stephanus.tlg.uci.edu/canon.php',
  },
};

// The grammar below recognizes every location that the pipeline admits. See
// `_LOCATIONS` and `_ETYM_LOCATIONS` in
// `dictionary/kellia_uni_goettingen_de/tei.py`, and keep them aligned.
// `LOCATION_PARTS` splits a location into its parts, so keep it aligned with
// `LOCATION` too.
//
// COLUMN is the column of a page, if the source has columns. Hatch and Redpath
// print three columns on a page, and Kontopoulos is cited with a `B`.
const COLUMN = '(?:a-b|ab|a|b|c|B)?';
// PAGE is a page number, or one of the Roman numerals that number Crum's
// addenda (XV to XXIV), followed by its column. It may extend, with `f` or
// `ff`, to the following pages.
const PAGE = String.raw`(?:\d+|X[IVX]*)${COLUMN}(?:ff?\.?)?`;
// ANNOTATION is the headword that a source lists the word under, a quoted
// note, or a footnote, as in `ChLCS 71b (s. v. ⲱⲃ)` or `KoptHWb 456, Anm. 7`.
const ANNOTATION = String.raw`(?: \((?:s\. v\.|unter) [Ϣ-ϯϗⲀ-⳪]+\)| \("[^";]+"\)|, Anm\. \d+)`;
// LOCATION is a page, or a range of pages, optionally preceded by a section
// sign and by a volume (such as `2:` in `Preisigke 2:190`, or `I ` in
// `ONB I 23`), and optionally annotated.
const LOCATION = String.raw`(?:§§? ?)?(?:\d+:|[IVX]+ )?${PAGE}(?:-${PAGE})?${ANNOTATION}?`;
// PLACEHOLDER stands in for a location that a citation fails to give, as in
// `LBG xxx` or `LBG ???`.
const PLACEHOLDER = String.raw`xxx|\?\?\?`;
// SOURCE_RE matches a citation: the abbreviation of a cited work, captured,
// followed by the locations cited (or a placeholder), if any, of which the
// first is captured. A location is separated from the abbreviation by a space,
// a comma, or a colon (as in `Muraoka 2009, 30a` or `Denniston 1959: 108-11`).
// Anything that follows the locations, such as a headword or a note, is left
// out of the citation.
// NOTE: The regex must not be global. See `html.replaceText`.
const SOURCE_RE = new RegExp(
  `(${str.regex(Object.keys(SOURCES))})` +
    `(?:(?: |, |: )(?:(${LOCATION})(?:, ?${LOCATION})*|${PLACEHOLDER}))?`,
  'u'
);

// LOCATION_PARTS splits a location that `LOCATION` matched into its section
// sign, its volume (Arabic or Roman), its page, and its column. A range of
// pages, or of columns, lands on its start.
const LOCATION_PARTS = /^(§§? ?)?(?:(\d+):|([IVX]+) )?(\d+|X[IVX]*)([abcB])?/;

/**
 * @param source - The cited work.
 * @param location - The first location cited, if any.
 * @returns The URL of the cited work, landing on the location cited if we can,
 * or undefined if the work isn't available online.
 */
function url(source: Source, location: string | undefined): string | undefined {
  if (location === undefined) {
    return source.url;
  }
  const parts: RegExpExecArray | null = LOCATION_PARTS.exec(location);
  log.ensure(parts, 'Unable to parse location:', location);
  return (
    source.locate?.({
      section: !!parts[1],
      volume: parts[2] ?? parts[3],
      page: parts[4]!.toLowerCase(),
      column: parts[5],
    }) ?? source.url
  );
}

/**
 *
 * @param root
 * @param highlighter
 */
export function handle(root: HTMLElement, highlighter: high.Highlighter): void {
  crum.addGreekLookups(root);
  crum.handleDialect(root, highlighter);
  handleSources(root);
  handleCrossReferences(root);
}

/**
 * Link the words that cross-references refer to, to their entries on Coptic
 * Dictionary Online.
 *
 * @param root
 */
function handleCrossReferences(root: HTMLElement): void {
  root
    .querySelectorAll<HTMLElement>(css.c(cls.XR_TARGET))
    .forEach((el: HTMLElement): void => {
      // TODO: (#0) Consider linking cross-references to ⲡⲓⲖⲉⲝⲓⲕⲟⲛ rather than
      // CDO, so users can look the words up on our website, and go on to CDO
      // from there.
      // P.S. The upcoming version of the Comprehensive Coptic Lexicon (#305)
      // has the cross references with IDs, which we can use to construct direct
      // URL without executing a search.
      html.linkify(el, paths.cdo(el.textContent));
    });
}

/**
 * Wrap the citations in the bibliography, and in the notes and Greek references
 * of the etymology, explain the abbreviations of the cited works in tooltips,
 * and link the citations of the works that are available online.
 *
 * We only search the text whose citations the pipeline validates. The rest of
 * the etymology is free text, where an abbreviation could be a word of its own
 * (`Bauer` is German for `farmer`).
 *
 * @param root
 */
function handleSources(root: HTMLElement): void {
  root
    .querySelectorAll(css.disjunction(cls.BIBL, cls.ETYM_NOTE, cls.GREEK_REF))
    .forEach((el: Element): void => {
      html.replaceText(
        el,
        SOURCE_RE,
        (match: RegExpExecArray): (Node | string)[] => {
          const abbreviation: string = match[1]!;
          const source: Source = SOURCES[abbreviation]!;
          const span: HTMLSpanElement = html.classify(
            html.span(match[0]),
            cls.SOURCE
          );
          const href: string | undefined = url(source, match[2]);
          if (href) {
            // The link keeps the color of the citation, even when hovered.
            html.linkify(span, href, ccls.HOVER_ACTION);
          }
          tool.addTooltip(span, [
            html.classify(html.span(abbreviation, ': '), cls.ABBREVIATION),
            source.title,
          ]);
          return [span];
        }
      );
    });
}
