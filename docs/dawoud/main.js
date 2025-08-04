/** Main function for the Dawoud scan. */
import * as scan from '../scan.js';
import * as env from '../env.js';
import * as logger from '../logger.js';
import * as coptic from '../coptic.js';
// Our dictionary pages are '0.png' to '1055.png', with '18.jpg' holding page 1.
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1055;
const EXT = 'png';
const OFFSET = 17;
// Paths to our indexes.
const COPTIC = 'coptic.tsv';
const ARABIC = 'arabic.tsv';
const GREEK = 'greek.tsv';
// TODO: (#405) Add validation for the Arabic index.
const ALL = [COPTIC, ARABIC, GREEK];
/**
 * Dawoud gives ⲟⲩ special handling in his dictionary.
 * All words starting with ⲟⲩ are grouped together, under a section in the
 * dictionary between ⲟ and ⲡ.
 * We reimplement sorting for Dawoud!
 */
export class DawoudWord extends coptic.Word {
  /**
   * Lexicographically compare two words in Dawoud's dictionary.
   * @param other - Word to compare.
   * @returns The truth value of `this <= other`, based on Dawoud's ordering.
   */
  leq(other) {
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
  o() {
    return this.word.startsWith('ⲟ');
  }
  /**
   * @returns Whether the words starts with an omicron ua.
   */
  ou() {
    return this.word.startsWith('ⲟⲩ');
  }
}
/**
 * Main function to run in the browser.
 * Build the index, add event listeners, ...
 */
async function browserMain() {
  const form = new scan.Form(
    document.getElementById('scan'),
    document.getElementById('next'),
    document.getElementById('prev'),
    document.getElementById('reset'),
    document.getElementById('search-box')
  );
  const scroller = new scan.Scroller(
    MIN_PAGE_NUM,
    MAX_PAGE_NUM,
    OFFSET,
    EXT,
    form
  );
  const index = new scan.Index(
    await fetch(COPTIC).then((res) => res.text()),
    DawoudWord
  );
  new scan.ZoomerDragger(form);
  new scan.Dictionary(index, scroller, form);
}
/**
 * Main function to run when the script is invoked in a Node.js environment.
 * Validate the indexes.
 * TODO: (#457) Deprecate this method. Perform validation in browser code.
 */
async function nodeMain() {
  const fs = await import('fs');
  const path = await import('path');
  const url = await import('url');
  const dirname = path.dirname(url.fileURLToPath(import.meta.url));
  ALL.forEach((sheet) => {
    const filePath = path.join(dirname, sheet);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${filePath}`);
    }
  });
  new scan.Index(
    fs.readFileSync(path.join(dirname, COPTIC), 'utf8'),
    DawoudWord
  ).validate(false);
  new scan.Index(
    fs.readFileSync(path.join(dirname, GREEK), 'utf8'),
    coptic.Word
  ).validate(false);
}
/**
 * Run the browser's main function in the browser, or Node's main function in
 * Node.js.
 */
async function main() {
  if (env.node()) {
    await nodeMain();
  } else if (env.browser()) {
    await browserMain();
  } else {
    logger.fatal('Neither Node nor browser!!');
  }
}
await main();
