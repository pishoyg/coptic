import * as scan from '../scan.js';
import * as env from '../env.js';
import * as logger from '../logger.js';
import * as coptic from '../coptic.js';

const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1054;
const OFFSET = 16;

const COPTIC = 'coptic.tsv';
const ARABIC = 'arabic.tsv';
const GREEK = 'greek.tsv';
// TODO: Add validation for the Arabic index.
const ALL = [COPTIC, ARABIC, GREEK];

/**
 * Dawoud gives ⲟⲩ special handling!
 * All words starting with ⲟⲩ are grouped together, under a section in the
 * dictionary between ⲟ and ⲡ.
 * We reimplement sorting for Dawoud!
 */
export class DawoudWord extends coptic.Word implements scan.Word {
  /**
   *
   * @param other
   * @returns
   */
  override leq(other: coptic.Word): boolean {
    if (DawoudWord.ou(this) === DawoudWord.ou(other)) {
      // Either neither is an ⲟⲩ words, or both are.
      // Lexicographic comparison should work either way.
      return super.leq(other);
    }
    if (!DawoudWord.o(this) || !DawoudWord.o(other)) {
      // One of them doesn't start with ⲟ. Again, lexicographic comparison
      // should work.
      return super.leq(other);
    }
    // Both words start with ⲟ, and only one of them starts with ⲟⲩ.
    // The ⲟⲩ word is lexicographically larger.
    return !DawoudWord.ou(this);
  }

  /**
   *
   * @param w
   * @returns
   */
  private static o(w: scan.Word): boolean {
    return w.word.startsWith('ⲟ');
  }

  /**
   *
   * @param w
   * @returns
   */
  private static ou(w: scan.Word): boolean {
    return w.word.startsWith('ⲟⲩ');
  }
}

/**
 *
 */
async function browserMain(): Promise<void> {
  const form: scan.Form = scan.Form.default();
  const scroller = new scan.Scroller(
    MIN_PAGE_NUM,
    MAX_PAGE_NUM,
    OFFSET,
    'jpg',
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
 *
 */
async function nodeMain(): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const url = await import('url');

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

  ALL.forEach((sheet) => {
    const filePath = path.join(__dirname, sheet);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${filePath}`);
    }
  });

  new scan.Index(
    fs.readFileSync(path.join(__dirname, COPTIC), 'utf8'),
    DawoudWord
  ).validate(false);
  new scan.Index(
    fs.readFileSync(path.join(__dirname, GREEK), 'utf8'),
    coptic.Word
  ).validate(false);
}

/**
 *
 */
async function main(): Promise<void> {
  if (env.node()) {
    await nodeMain();
  } else if (env.browser()) {
    await browserMain();
  } else {
    logger.fatal('Neither Node nor browser!!');
  }
}

await main();
