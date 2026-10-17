/**
 * Init function for the Kasser scan view. Kasser supplemented Crum with two
 * books, each with its own scan and index, and the view shows one of them at
 * a time:
 * - Compléments au dictionnaire copte de Crum (IFAO, 1964).
 * - Compléments morphologiques au dictionnaire de Crum (BIFAO 64, 1966).
 *
 * The Morphologiques checkbox switches between the two. Both books follow the
 * search box all along, so each is ready on its query's page when switched to,
 * and the navigation buttons only move the book on view.
 */
import * as browser from '../browser.js';
import * as book from './book.js';
import * as cls from './cls.js';
import * as scan from '../scan.js';
import * as mode from './mode.js';
import * as id from './id.js';
import * as params from './params.js';
import * as str from '../str.js';
import * as tool from '../tooltip.js';

const MODE: mode.Mode = mode.IFAO;
const EXT = 'png';
// The first image of each book is "0.png".
const START = 0;

const DATA_DIR = '../kasser/';

/**
 * Book defines one of Kasser's books. The book's scan lives in
 * `${DATA_DIR}${name}/`, and its index at `${DATA_DIR}${name}.tsv`.
 */
interface Book {
  name: string;
  /** ID of the <img> element holding the book page. */
  image: string;
  /** Integer basename of the last image. The first is `START`. */
  end: number;
  /** See `scan.ScrollerOptions.offset`. */
  offset: number;
  /** See `scan.Lookup`. */
  overrides?: Record<string, string>;
}

/* The pages of the Compléments are "0.png" to "152.png", with "18.png"
 * holding page 1. The pages before it are numbered in Roman numerals, from i
 * ("0.png") to xviii ("17.png"), which run from -17 to 0 in our logical page
 * numbering.
 * TODO: (#0) Share the Roman-numeral overrides with `book.ts`, through a
 * builder that generates the numerals rather than listing them. */
const ROMAN_START = -17;
const ROMAN_PAGES: string[] = [
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
  'xvi',
  'xvii',
  'xviii',
];

const COMPLEMENTS: Book = {
  name: 'complements',
  image: id.COMPLEMENTS_SCAN,
  end: 152,
  offset: 17,
  overrides: Object.fromEntries(
    ROMAN_PAGES.map((item: string, idx: number): [string, string] => [
      item,
      (ROMAN_START + idx).toString(),
    ])
  ),
};

/* The Morphologiques is an article in a bulletin, so its pages are numbered
 * from the bulletin's. Its pages are "0.png" to "47.png", with "0.png" holding
 * page 19. */
const MORPHOLOGIQUES: Book = {
  name: 'morphologiques',
  image: id.MORPHOLOGIQUES_SCAN,
  end: 47,
  offset: -19,
};

/**
 * Coptic represents a word in Kasser's Coptic index, which Kasser sorts like
 * Crum.
 *
 * The index spells some words with Kasser's annotations, such as the hyphen of
 * ⲁ-, the parentheses of ⲧⲁ(ⲟ)ⲩⲟ, the superlinear stroke of ⲙ︥ⲛ︤-, the
 * oblique double hyphen of ϫⲱ⸗, the dagger of ⲕⲙⲕⲁⲙⲧ†, or the lacuna of
 * ϣⲗⲓ[.... They play no role in sorting, so they are dropped.
 */
class Coptic extends book.Coptic {
  /* ALPHABET matches a letter of Kasser's dictionary. */
  private static readonly ALPHABET =
    /[ⲁⲃⲅⲇⲉⲍⲏⲑⲓⲕⳤⲹⲗⲙⲛⲻⲳⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣⳋⳓϥⳉϧϩϫϭϯ]/u;

  /* CHARS matches a letter of `ALPHABET`, or a character of Kasser's
   * annotations. */
  public static override readonly CHARS = new RegExp(
    [Coptic.ALPHABET.source, '[-()[\\].⸗†\\p{M}]'].join('|'),
    'u'
  );

  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(scan.restrict(word, Coptic.ALPHABET));
  }
}

/**
 * Initialise the view of one of Kasser's books: build its index, wire its
 * scroller, and hand the shared search box to its `Dictionary` so it searches
 * on every keystroke.
 *
 * @param b - The book.
 * @param isActive - Whether the book is on view.
 */
async function initBook(b: Book, isActive: scan.IsActive): Promise<void> {
  const form: scan.Form = {
    image: document.getElementById(b.image) as HTMLImageElement,
    nextButton: document.getElementById(id.NEXT)!,
    prevButton: document.getElementById(id.PREV)!,
    resetButton: document.getElementById(id.RESET)!,
  };

  const res: Response = await fetch(str.joinPaths(DATA_DIR, `${b.name}.tsv`));
  const index = new scan.Index(await res.text(), Coptic);

  new scan.ZoomerDragger(form, isActive);
  new scan.Dictionary(
    new scan.Lookup({ [scan.Language.COPTIC]: index }, b.overrides),
    new scan.Scroller({
      start: START,
      end: b.end,
      ext: EXT,
      form,
      offset: b.offset,
      directory: str.joinPaths(DATA_DIR, b.name),
      isActive,
    }),
    document.getElementById(id.SEARCH_BOX) as HTMLInputElement,
    // By default, land on the first page in the scan.
    START - b.offset
  );
}

/**
 * Initialise the Kasser scan view.
 */
export async function init(): Promise<void> {
  // The Morphologiques checkbox switches from the Compléments to the
  // Morphologiques. Its state is mirrored to the `?morphologiques=` URL
  // parameter, and restored from it. The CSS shows the book on view based on
  // the checkbox.
  const checkbox = document.getElementById(
    id.MORPHOLOGIQUES_CHECKBOX
  ) as HTMLInputElement;
  checkbox.checked = !!browser.getParam(params.MORPHOLOGIQUES);
  tool.addTooltip(
    document.querySelector<HTMLLabelElement>(`label[for="${checkbox.id}"]`)!,
    ["Show Kasser's Compléments morphologiques"],
    [cls.EXPLAIN_CHECKBOX]
  );
  checkbox.addEventListener('change', (): void => {
    // TODO: (#640) Remove the parameter from the URL on mode switches. It only
    // applies to Kasser, but it currently lingers in the other modes.
    browser.setParam(params.MORPHOLOGIQUES, checkbox.checked);
  });

  await Promise.all([
    initBook(COMPLEMENTS, () => mode.active(MODE) && !checkbox.checked),
    initBook(MORPHOLOGIQUES, () => mode.active(MODE) && checkbox.checked),
  ]);
}
