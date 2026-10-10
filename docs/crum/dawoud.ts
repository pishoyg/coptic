/** Init function for the Dawoud scan view. */

import * as browser from '../browser.js';
import * as cls from './cls.js';
import * as scan from '../scan.js';
import * as lang from '../lang.js';
import * as orth from '../orth.js';
import * as mode from './mode.js';
import * as id from './id.js';
import * as params from './params.js';
import * as str from '../str.js';
import * as tool from '../tooltip.js';

const MODE: mode.Mode = mode.DAWOUD;

// Our dictionary pages are '0.png' to '1055.png', with '18.jpg' holding page 1.
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1055;
const EXT = 'png';
const OFFSET = 17;

const DATA_DIR = '../dawoud/';

// Paths to our indexes.
const COPTIC: string = str.joinPaths(DATA_DIR, 'coptic.tsv');
const GREEK: string = str.joinPaths(DATA_DIR, 'greek.tsv');
// TODO: (#640) Dawoud ignores the definite article when sorting, but we
// don't. Remove it from the sentinels الدسقولية (page 950), المُتزعزع (page
// 1006), and المُنبَثِق (page 1026) in the index sheet.
const ARABIC: string = str.joinPaths(DATA_DIR, 'arabic.tsv');

// GREEK_TO_COPTIC maps a Greek letter to its Coptic counterpart.
const GREEK_TO_COPTIC: Record<string, string> = {
  α: 'ⲁ',
  β: 'ⲃ',
  γ: 'ⲅ',
  δ: 'ⲇ',
  ε: 'ⲉ',
  ζ: 'ⲍ',
  η: 'ⲏ',
  θ: 'ⲑ',
  ι: 'ⲓ',
  κ: 'ⲕ',
  λ: 'ⲗ',
  μ: 'ⲙ',
  ν: 'ⲛ',
  ξ: 'ⲝ',
  ο: 'ⲟ',
  π: 'ⲡ',
  ρ: 'ⲣ',
  σ: 'ⲥ',
  ς: 'ⲥ',
  τ: 'ⲧ',
  υ: 'ⲩ',
  φ: 'ⲫ',
  χ: 'ⲭ',
  ψ: 'ⲯ',
  ω: 'ⲱ',
};

/**
 * Dawoud gives ⲟⲩ special handling in his dictionary.
 * All words starting with ⲟⲩ are grouped together, under a section in the
 * dictionary between ⲟ and ⲡ.
 * We reimplement sorting for Dawoud!
 */
class Coptic extends lang.Coptic implements lang.Word {
  /**
   * Lexicographically compare two words in Dawoud's dictionary.
   * @param other - Word to compare.
   * @returns The truth value of `this <= other`, based on Dawoud's ordering.
   */
  public override leq(other: Coptic): boolean {
    if (this.ou() === other.ou()) {
      // Either both words start with ⲟⲩ, or neither does.
      // Either way, lexicographic comparison should work.
      return super.leq(other);
    }
    if (!this.o() || !other.o()) {
      // One of them doesn't start with ⲟ. Again, lexicographic comparison
      // should work.
      return super.leq(other);
    }
    // Both words start with ⲟ, and only one of them starts with ⲟⲩ.
    // The ⲟⲩ word is lexicographically larger.
    return !this.ou();
  }

  /**
   * @returns Whether the word starts with an omicron.
   */
  private o(): boolean {
    return this.word.startsWith('ⲟ');
  }

  /**
   * @returns Whether the words starts with an omicron ua.
   */
  private ou(): boolean {
    return this.word.startsWith('ⲟⲩ');
  }
}

/**
 * Dawoud spells the words in his Greek index in Coptic letters, and sorts them
 * like Coptic words. A word in Greek letters is transliterated to Coptic, so it
 * can be looked up in the index as well.
 *
 * NOTE: Lookups in Greek letters are secondary, so the transliteration is
 * deliberately dumb: a letter-for-letter substitution, with the diacritics
 * dropped. It knows nothing of Greek orthography, only of how Copticized Greek
 * words are spelled. For example:
 * - The rough breathing expressed using ϩ in Coptic (e.g. αἵρεσις ->
 *   ϩⲁⲓⲣⲉⲥⲓⲥ), is simply dropped.
 * - τι is never contracted into ϯ (e.g. στιχάριον > ⲥϯⲭⲁⲣⲓⲟⲛ).
 * Such words land on the wrong page, and should be typed in Coptic letters
 * instead.
 */
class Greek extends lang.Coptic implements lang.Word {
  /* CHARS matches a small Coptic or Greek letter. */
  public static override readonly CHARS = new RegExp(
    `${lang.Coptic.CHARS.source}|[α-ω]`,
    'u'
  );

  /**
   * @param word - The string representation of the word, in Coptic or Greek
   * letters.
   */
  public constructor(word: string) {
    super(
      Array.from(word, (c: string): string => GREEK_TO_COPTIC[c] ?? c).join('')
    );
  }
}

/**
 * Arabic represents a word in Dawoud's Arabic index. Diacritics and
 * tatweel (e.g. بـِ) are ignored. A hamza seated on a wāw sorts as the wāw
 * itself (e.g. مُنشَرِح < مُؤامرة < مُوَلَّد), but one seated on a yāʾ sorts as
 * a bare hamza.
 *
 * The index often follows a word with a parenthesized gloss (e.g. تحرير
 * (كتابة)), which breaks ties between homographs. The parentheses are word
 * boundaries, so the gloss sorts as a word of its own.
 */
class Arabic extends lang.Keyed {
  /* CHARS matches an Arabic letter (including tatweel), a diacritic, a space,
   * or a parenthesis. */
  public static readonly CHARS = /[ء-غـ-ي\p{M} ()]/u;

  /**
   * @param word - The string representation of the word.
   */
  public constructor(word: string) {
    super(word, (w: string): string =>
      // The seated hamzas must be replaced before the diacritics are cleaned,
      // otherwise they decompose into their seats. The word is normalized
      // first, so decomposed ones get replaced as well.
      orth
        .cleanDiacritics(
          w.normalize('NFC').replaceAll('ؤ', 'و').replaceAll('ئ', 'ء')
        )
        .replaceAll(/[()]/gu, ' ')
        .replaceAll('ـ', '')
        // TODO: (#640) Normalize the following in the index if possible. The
        // generic substitution may be inaccurate.
        .replaceAll('ى', 'ي')
        .replaceAll('ة', 'ه')
    );
  }
}

/**
 * @param path - Path to a TSV index.
 * @param wordType - The type of words in the index.
 * @returns The index.
 */
async function fetchIndex(
  path: string,
  wordType: lang.WordType
): Promise<scan.Index> {
  const res: Response = await fetch(path);
  return new scan.Index(await res.text(), wordType);
}

/**
 * Initialise the Dawoud scan view: build the index, wire the scroller,
 * and hand the shared search box to the `Dictionary` so it searches on
 * every keystroke.
 */
export async function init(): Promise<void> {
  const form: scan.Form = {
    image: document.getElementById(id.DAWOUD_SCAN) as HTMLImageElement,
    nextButton: document.getElementById(id.NEXT)!,
    prevButton: document.getElementById(id.PREV)!,
    resetButton: document.getElementById(id.RESET)!,
  };

  const isActive: scan.IsActive = () => mode.active(MODE);

  const [coptic, greek, arabic]: [scan.Index, scan.Index, scan.Index] =
    await Promise.all([
      fetchIndex(COPTIC, Coptic),
      fetchIndex(GREEK, Greek),
      fetchIndex(ARABIC, Arabic),
    ]);

  const lookup = new scan.Lookup({
    [lang.Language.COPTIC]: coptic,
    [lang.Language.GREEK]: greek,
    [lang.Language.ARABIC]: arabic,
  });

  // The Greek checkbox forces the interpretation of Coptic letters as Greek
  // ones, searching them in the Greek index. Its state is mirrored to the
  // `?greek=` URL parameter, and restored from it before the first search.
  const greekCheckbox = document.getElementById(
    id.GREEK_CHECKBOX
  ) as HTMLInputElement;
  if (browser.getParam(params.GREEK)) {
    greekCheckbox.checked = true;
    lookup.alias(lang.Language.COPTIC, lang.Language.GREEK);
  }

  new scan.ZoomerDragger(form, isActive);
  const dictionary = new scan.Dictionary(
    lookup,
    new scan.Scroller({
      start: MIN_PAGE_NUM,
      end: MAX_PAGE_NUM,
      ext: EXT,
      form,
      offset: OFFSET,
      directory: DATA_DIR,
      isActive,
    }),
    document.getElementById(id.SEARCH_BOX) as HTMLInputElement
  );

  wireGreekCheckbox(greekCheckbox, dictionary);
}

/**
 * Explain the Greek checkbox in a tooltip, and mirror its state to the URL and
 * the dictionary whenever it changes.
 *
 * @param checkbox - The Greek checkbox.
 * @param dictionary - The Dawoud dictionary.
 */
function wireGreekCheckbox(
  checkbox: HTMLInputElement,
  dictionary: scan.Dictionary
): void {
  tool.addTooltip(
    document.querySelector<HTMLLabelElement>(`label[for="${checkbox.id}"]`)!,
    ["Search Dawoud's Greek Appendix"],
    [cls.EXPLAIN_CHECKBOX]
  );

  checkbox.addEventListener('change', (): void => {
    // TODO: (#640) Remove the parameter from the URL on mode switches. It only
    // applies to Dawoud, but it currently lingers in the other modes.
    browser.setParam(params.GREEK, checkbox.checked);
    dictionary.alias(
      lang.Language.COPTIC,
      checkbox.checked ? lang.Language.GREEK : undefined
    );
  });
}
