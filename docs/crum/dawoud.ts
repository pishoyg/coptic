/** Init function for the Dawoud scan view. */

import * as scan from '../scan.js';
import * as copt from '../coptic.js';
import * as mode from './mode.js';
import * as id from './id.js';
import * as str from '../str.js';

const MODE: mode.Mode = mode.DAWOUD;

// Our dictionary pages are '0.png' to '1055.png', with '18.jpg' holding page 1.
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1055;
const EXT = 'png';
const OFFSET = 17;

const DATA_DIR = '../dawoud/';

// Paths to our indexes.
// TODO: (#640) Support looking up the Greek and Arabic indexes.
const COPTIC: string = str.joinPaths(DATA_DIR, 'coptic.tsv');

/**
 * Dawoud gives ⲟⲩ special handling in his dictionary.
 * All words starting with ⲟⲩ are grouped together, under a section in the
 * dictionary between ⲟ and ⲡ.
 * We reimplement sorting for Dawoud!
 */
export class DawoudWord extends copt.Word implements scan.Word {
  /**
   * Lexicographically compare two words in Dawoud's dictionary.
   * @param other - Word to compare.
   * @returns The truth value of `this <= other`, based on Dawoud's ordering.
   */
  public override leq(other: DawoudWord): boolean {
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

  new scan.ZoomerDragger(form, isActive);
  new scan.Dictionary(
    new scan.Index(
      await fetch(COPTIC).then((res: Response): Promise<string> => res.text()),
      DawoudWord
    ),
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
}
