import type * as high from './highlight.js';
import * as crum from './crum.js';
import * as css from '../css.js';
import * as html from '../html.js';
import * as paths from '../paths.js';
import * as str from '../str.js';
import * as tool from '../tooltip.js';
import * as cls from './cls.js';

// SOURCES lists the works that KELLIA cites, keyed by their abbreviations.
// The list comes from the bibliography in the header of the TEI XML of the
// Comprehensive Coptic Lexicon.
//
// NOTE: `BiblSource` and `EtymSource` in
// `dictionary/kellia_uni_goettingen_de/tei.py` list the works that translations
// and etymologies cite, and the pipeline validates the citations against them.
// Every one of them must have an entry here, under the same abbreviation, or
// its citations will lack a hint. Keep the lists aligned.
const SOURCES: Record<string, string> = {
  CD: 'W.E. Crum, A Coptic Dictionary, Oxford: Clarendon Press, 1939',
  CDC: "R. Kasser, Compléments au dictionnaire copte de Crum, Kairo: Inst. Français d'Archéologie Orientale, 1964",
  KoptHWb:
    'W. Westendorf, Koptisches Handwörterbuch, Heidelberg: Winter, 1965 (1977)',
  CED: 'J. Černý, Coptic Etymological Dictionary, Cambridge: Cambridge Univ. Press, 1976',
  DELC: 'W. Vycichl, Dictionnaire étymologique de la langue copte, Leuven: Peeters, 1983',
  ChLCS:
    'P. Cherix, Lexique Copte (dialecte sahidique), Copticherix, 2006-2018',
  ONB: 'T. Orlandi, Koptische Papyri theologischen Inhalts (Mitteilungen aus der Papyrussammlung der Österreichischen Nationalbibliothek (Papyrus Erzherzog Rainer) / Neue Serie, 9), Wien: Hollinek, 1974',
  WbGWKDT:
    'H. Förster, Wörterbuch der griechischen Wörter in den koptischen dokumentarischen Texten. Berlin/Boston: de Gruyter, 2002',
  LCG: 'B. Layton, A Coptic grammar: with a chrestomathy and glossary; Sahidic dialect, Wiesbaden: Harrassowitz, 2000',
  'Till D':
    'W. Till, Koptische Dialektgrammatik: mit Lesestücken und Wörterbuch, München: Beck, 1961',
  'Osing, Pap. Ox.':
    'J. Osing: Der spätägyptische Papyrus BM 10808, Harrassowitz, Wiesbaden 1976',
  Bauer:
    'W. Bauer, K. Aland, B. Aland, Griechisch-deutsches Wörterbuch zu den Schriften des Neuen Testaments und der frühchristlichen Literatur, Berlin: de Gruyter, 1988',
  BDAG: 'F.W. Danker, W. Bauer, A Greek-English Lexicon of the New Testament and other Early Christian Literature, Chicago/London: University of Chicago Press, 2000',
  'Daris 1991':
    "S. Daris, Il lessico Latino nel Greco d'Egitto (Estudis de Papirologia i Filologia Biblica 2), Barcelona: Ediciones Aldecoa, 1991",
  'Denniston 1959':
    'J.D. Denniston, The Greek Particles, London: Clarendon Press, 1959',
  'du Cange':
    'C. F. du Cange, Glossarium ad scriptores mediae et infimae Graecitatis I-II, Graz: Akademische Druck- und Verlagsanstalt, 1958',
  'Hatch/Redpath 1906':
    'E. Hatch, H.A. Redpath, A concordance to the Septuagint and the other Greek versions of the Old Testament (including the apocryphal books), Supplement, Graz: Akademische Druck- und Verlagsanstalt, 1906',
  Kontopoulos:
    'N. Kontopoulos, A Lexicon of Modern Greek-English and English-Modern Greek, Smyrna/London: B. Tatikidos, Trübner & Co., 1868',
  Lampe:
    'G.W.H. Lampe, A patristic Greek lexicon, Oxford: Clarendon Press, 1978',
  LBG: 'E. Trapp, Lexikon zur byzantinischen Gräzität, besonderes des 9.-12. Jahrhunderts, Philosophisch-historische Klasse, Denkschriften (Veröffentlichungen der Kommission für Byzantinistik 238; VI/1-4) , Wien: Österreichische Akademie der Wissenschaften, 2001',
  LSJ: 'H.G. Liddell, R. Scott, H.S. Jones, A Greek-English lexicon, Oxford: Clarendon Press, 1968',
  'LSJ Suppl.':
    'H.G. Liddell, R. Scott, H.S. Jones, E.A. Barber, A Greek-English lexicon/Supplement, Oxford: Clarendon Press, 1968',
  'Muraoka 2009':
    'T. Muraoka, A Greek-English Lexicon of the Septuagint, Louvain/Paris/Walpole: Peeters, 2009',
  Passow:
    'F. Passow, V.C.F Rost, F. Palm, Handwörterbuch der griechischen Sprache, Leipzig: Vogel, 1841',
  Preisigke:
    'F. Preisigke, Wörterbuch der griechischen Papyrusurkunden mit Einschluß der griechischen Inschriften, Aufschriften, Ostraka, Mumienschilder usw. aus Ägypten, Berlin: Selbstverlag der Erben, 1925-1931',
  // The header of the XML lacks this work, but two etymologies cite it. Without
  // an entry of its own, its citations would match `Preisigke` instead.
  'Preisigke Fwb':
    'F. Preisigke, Fachwörter des öffentlichen Verwaltungsdienstes Ägyptens in den griechischen Papyrusurkunden der ptolemäisch-römischen Zeit, Göttingen: Vandenhoeck & Ruprecht, 1915',
  Sophocles:
    'E.A. Sophocles, Greek Lexicon of the Roman and Byzantine Periods (From B. C. 146 to A. D. 1100. Memorial Edition), Cambridge/Leipzig: Harvard University Press/Harrassowitz, 1914',
  'T. S. Richter 2014b':
    'T.S. Richter, Neue koptische medizinische Rezepte (Zeitschrift für Ägyptische Sprache und Altertumskunde ZÄS 141(2), 154-194), 2014',
  'Till 1951a':
    'W.C. Till, Arzneikunde der Kopten, Berlin: Akademie Verlag, 1951',
  TLG: 'L. Berkowitz, K.A. Squitier, Thesaurus Linguae Graecae (Canon of Greek Authors and Works), New York/Oxford: University Press, 1990',
};

// The grammar below recognizes every location that the pipeline admits. See
// `_LOCATIONS` and `_ETYM_LOCATIONS` in
// `dictionary/kellia_uni_goettingen_de/tei.py`, and keep them aligned.
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
// followed by the locations cited (or a placeholder), if any. A location is
// separated from the abbreviation by a space, a comma, or a colon (as in
// `Muraoka 2009, 30a` or `Denniston 1959: 108-11`). Anything that follows the
// locations, such as a headword or a note, is left out of the citation.
// NOTE: The regex must not be global. See `html.replaceText`.
const SOURCE_RE = new RegExp(
  `(${str.regex(Object.keys(SOURCES))})` +
    `(?:(?: |, |: )(?:${LOCATION}(?:, ?${LOCATION})*|${PLACEHOLDER}))?`,
  'u'
);

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
      // TODO: (#51) Link cross-references to ⲡⲓⲖⲉⲝⲓⲕⲟⲛ rather than CDO, so
      // users can look the words up on our website, and go on to CDO from
      // there.
      html.linkify(el, paths.cdo(el.textContent));
    });
}

/**
 * Wrap the citations in the bibliography, and in the notes and Greek references
 * of the etymology, and explain the abbreviations of the cited works in
 * tooltips.
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
          const span: HTMLSpanElement = html.classify(
            html.span(match[0]),
            cls.SOURCE
          );
          // TODO: (#0) Link the citations of Crum (`CD`) and Kasser (`CDC`)
          // to the scans of the cited pages, which our website hosts. See
          // `paths.crumScan` and `paths.ifao`.
          tool.addTooltip(span, [
            html.classify(html.span(abbreviation, ': '), cls.ABBREVIATION),
            SOURCES[abbreviation]!,
          ]);
          return [span];
        }
      );
    });
}
