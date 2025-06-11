/** Main function for the lexicon. */
import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
import * as css from '../css.js';
import * as browser from '../browser.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';
import * as help from './help.js';
import * as header from '../header.js';
import * as paths from '../paths.js';
import * as crum from './crum.js';
import * as dropdown from '../dropdown.js';
import * as logger from '../logger.js';

const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
// TODO: (#0) The message box gets written. Since multiple Xooxle instances are
// allowed to coexist on the same page, we should create several boxes,
// otherwise they could override each other!
const MESSAGE_BOX_ID = 'message';
const DIALECTS_ID = 'dialects';

const REPORTS_ID = 'reports';

enum DialectMatch {
  // The candidate has at least one of the highlighted dialects, and the match
  // occurs in one of the pieces of text market with that dialect.
  HIGHLIGHTED_DIALECT_MATCH,
  // The candidate has at least one dialect of interest, but the match occurs in
  // an undialected piece of text.
  UNDIALECTED_MATCH_WITH_HIGHLIGHTED_DIALECT,
  // The candidate doesn't have any dialects of interest in the first place. The
  // match occurs in an undialected piece of text.
  UNDIALECTED_MATCH_WITH_NO_HIGHLIGHTED_DIALECT,
  // Matches only occur in dialects of no interest for the current query. The
  // candidate does however have a dialect of interest.
  OTHER_DIALECT_MATCH_WITH_HIGHLIGHTED_DIALECT,
  // Matches only occur in dialects of no interest for the current query. The
  // dialect has no dialects of interest to start with!
  OTHER_DIALECT_MATCH_WITH_NO_HIGHLIGHTED_DIALECT,
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
      .map((dialect: d.DIALECT) => `.${dialect} .${xooxle.CLS.MATCH}`)
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
class KELLIADialectSorter extends xooxle.BucketSorter {
  private static readonly NUM_BUCKETS = 2;

  /**
   */
  constructor() {
    super(KELLIADialectSorter.NUM_BUCKETS);
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
      .map((dialect: d.DIALECT) => `.${dialect} .${xooxle.CLS.MATCH}`)
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
    hrefFmt: paths.CRUM_PAGE_KEY_FMT,
    bucketSorter: new CrumDialectSorter(),
    prepublish: crum.addGreekLookups,
  },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
    hrefFmt: paths.CDO_LOOKUP_KEY_FMT,
    bucketSorter: new KELLIADialectSorter(),
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
  const dropdownDialects: dropdown.Dropdown[] = dropdown.addEventListeners();
  logger.ass(dropdownDialects.length === 1);
  if (d.setToDefaultIfUnset()) {
    // In order to alert the user to the fact that dialect selection has
    // changed, we make sure the dialect list is visible.
    // NOTE: This step should precede the construction of the highlighter, so
    // that the selected dialects will be visible to the highlighter during its
    // initialization.
    dropdownDialects[0]!.show();
  }

  // Prevent other elements in the page from picking up key events on the
  // search box.
  const searchBox = document.getElementById(SEARCH_BOX_ID)!;
  searchBox.addEventListener('keyup', browser.stopPropagation);
  searchBox.addEventListener('keydown', browser.stopPropagation);
  searchBox.addEventListener('keypress', browser.stopPropagation);

  const dialectCheckboxes: HTMLInputElement[] = Array.from(
    document.querySelectorAll<HTMLInputElement>(`#${DIALECTS_ID} input`)
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
      const json = (await raw.json()) as xooxle.Index;
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
  collapse.addEventListenersForSiblings(true, true);

  help.makeHelpPanel(highlighter);

  document
    .getElementById(REPORTS_ID)!
    .addEventListener('click', header.reports);
}

await main();
