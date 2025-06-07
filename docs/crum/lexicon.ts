/** Main function for the lexicon. */
import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
import * as css from '../css.js';
import * as browser from '../browser.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';
import * as help from './help.js';
import * as crum from './crum.js';
import * as cls from './cls.js';

const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
// TODO: (#0) The message box gets written. Since multiple Xooxle instances are
// allowed to coexist on the same page, we should create several boxes,
// otherwise they could override each other!
const MESSAGE_BOX_ID = 'message';

const CRUM_HREF_FMT = '{KEY}.html';
const KELLIA_HREF_FMT = 'https://coptic-dictionary.org/entry.cgi?tla={KEY}';

enum DialectMatch {
  // The candidate has at least one of the highlighted dialects, and the match
  // occurs in one of the pieces of text market with that dialect.
  HIGHLIGHTED_DIALECT_MATCH = 0,
  // The candidate has at least one dialect of interest, but the match occurs in
  // an undialected piece of text.
  UNDIALECTED_MATCH_WITH_HIGHLIGHTED_DIALECT = 1,
  // The candidate doesn't have any dialects of interest in the first place. The
  // match occurs in an undialected piece of text.
  UNDIALECTED_MATCH_WITH_NO_HIGHLIGHTED_DIALECT = 2,
  // Matches only occur in dialects of no interest for the current query. The
  // candidate does however have a dialect of interest.
  OTHER_DIALECT_MATCH_WITH_HIGHLIGHTED_DIALECT = 3,
  // Matches only occur in dialects of no interest for the current query. The
  // dialect has no dialects of interest to start with!
  OTHER_DIALECT_MATCH_WITH_NO_HIGHLIGHTED_DIALECT = 4,
}

/**
 */
class CrumDialectSorter extends xooxle.BucketSorter {
  private static readonly NUM_BUCKETS =
    1 +
    Math.max(
      ...Object.values(DialectMatch).filter(
        (value) => typeof value === 'number'
      )
    );

  /**
   */
  constructor() {
    super(CrumDialectSorter.NUM_BUCKETS);
  }

  /**
   * @param _res
   * @param row - Table row.
   * @returns Bucket number.
   */
  override bucket(
    _res: xooxle.SearchResult,
    row: HTMLTableRowElement
  ): DialectMatch {
    const active: d.DIALECT[] | undefined = d.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }

    const highlightedDialectQuery: string = active
      .map((d) => `.${d} .${xooxle.CLS.MATCH}`)
      .join(', ');
    if (row.querySelector(highlightedDialectQuery)) {
      // We have a match in a highlighted dialect.
      return DialectMatch.HIGHLIGHTED_DIALECT_MATCH;
    }

    const undialected: boolean = Array.from(
      row.querySelectorAll(`.${xooxle.CLS.MATCH}`)
    ).some((el) => !el.closest(d.ANY_DIALECT_QUERY));
    const ofInterest = !!row.querySelector(css.classQuery(...active));
    if (undialected) {
      if (ofInterest) {
        return DialectMatch.UNDIALECTED_MATCH_WITH_HIGHLIGHTED_DIALECT;
      }
      return DialectMatch.UNDIALECTED_MATCH_WITH_NO_HIGHLIGHTED_DIALECT;
    }
    if (ofInterest) {
      return DialectMatch.OTHER_DIALECT_MATCH_WITH_HIGHLIGHTED_DIALECT;
    }
    return DialectMatch.OTHER_DIALECT_MATCH_WITH_NO_HIGHLIGHTED_DIALECT;
  }
}

/**
 * kelliaDialectSorter implements a dialect-based sorter for the KELLIA
 * dictionary.
 * Undialected entries are less significant in KELLIA, so we don't give them any
 * special treatment. Our sorting is simply based on whether we have a match in
 * a dialect of interest.
 */
class kelliaDialectSorter extends xooxle.BucketSorter {
  private static readonly NUM_BUCKETS = 2;

  /**
   */
  constructor() {
    super(kelliaDialectSorter.NUM_BUCKETS);
  }

  /**
   * @param _res
   * @param row - Table row.
   * @returns Bucket number.
   */
  override bucket(_res: xooxle.SearchResult, row: HTMLTableRowElement): number {
    const active: d.DIALECT[] | undefined = d.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }

    const highlightedDialectQuery: string = active
      .map((d) => `.${d} .${xooxle.CLS.MATCH}`)
      .join(', ');
    return row.querySelector(highlightedDialectQuery) ? 0 : 1;
  }
}

interface Xooxle {
  indexURL: string;
  tableID: string;
  collapsibleID: string;
  hrefFmt?: string;
  bucketSorter?: xooxle.BucketSorter;
  prepublish?: (row: HTMLTableRowElement) => void;
}

const XOOXLES: Xooxle[] = [
  {
    indexURL: 'crum.json',
    tableID: 'crum',
    collapsibleID: 'crum-collapsible',
    hrefFmt: CRUM_HREF_FMT,
    bucketSorter: new CrumDialectSorter(),
    prepublish: crum.addGreekLookups,
  },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
    hrefFmt: KELLIA_HREF_FMT,
    bucketSorter: new kelliaDialectSorter(),
  },
  {
    indexURL: 'copticsite.json',
    tableID: 'copticsite',
    collapsibleID: 'copticsite-collapsible',
  },
];

/**
 *
 */
async function main(): Promise<void> {
  // Prevent other elements in the page from picking up key events on the
  // search box.
  const searchBox = document.getElementById(SEARCH_BOX_ID)!;
  searchBox.addEventListener('keyup', browser.stopPropagation);
  searchBox.addEventListener('keydown', browser.stopPropagation);
  searchBox.addEventListener('keypress', browser.stopPropagation);

  const dialectCheckboxes: HTMLInputElement[] = Array.from(
    document.querySelectorAll<HTMLInputElement>(`.${cls.DIALECT_CHECKBOX}`)
  );

  const highlighter = new highlight.Highlighter(false, dialectCheckboxes);

  // Initialize searchers.
  // TODO: (#0) You initialize three different Form objects, and it looks like
  // each one of them will end up populating the query parameters separately!
  // They also populate the shared objects from the parameters repeatedly!
  // While this is not currently a problem, it remains undesirable.
  // Deduplicate these actions, somehow.
  await Promise.all(
    XOOXLES.map(async (xoox) => {
      const raw = await fetch(xoox.indexURL);
      const json = (await raw.json()) as xooxle._Index;
      const form = new xooxle.Form({
        searchBoxID: SEARCH_BOX_ID,
        fullWordCheckboxID: FULL_WORD_CHECKBOX_ID,
        regexCheckboxID: REGEX_CHECKBOX_ID,
        messageBoxID: MESSAGE_BOX_ID,
        resultsTableID: xoox.tableID,
        collapsibleID: xoox.collapsibleID,
      });
      new xooxle.Xooxle(
        json,
        form,
        xoox.hrefFmt,
        xoox.bucketSorter,
        () => true,
        xoox.prepublish
      );
    })
  );

  // Initialize collapsible elements.
  collapse.addEventListenersForSiblings(true);

  help.makeHelpPanel(highlighter);
}

await main();
