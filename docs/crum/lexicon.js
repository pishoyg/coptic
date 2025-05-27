import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
import * as utils from '../utils.js';
import * as highlight from './highlight.js';
import * as help from './help.js';
const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
// TODO: The message box gets written. Since multiple Xooxle instances are
// allowed to coexist on the same page, we should create several boxes,
// otherwise they could override each other!
const MESSAGE_BOX_ID = 'message';
const CRUM_HREF_FMT = '{KEY}.html';
const KELLIA_HREF_FMT = 'https://coptic-dictionary.org/entry.cgi?tla={KEY}';
const XOOXLES = [
  {
    indexURL: 'crum.json',
    tableID: 'crum',
    collapsibleID: 'crum-collapsible',
    hrefFmt: CRUM_HREF_FMT,
  },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
    hrefFmt: KELLIA_HREF_FMT,
  },
  {
    indexURL: 'copticsite.json',
    tableID: 'copticsite',
    collapsibleID: 'copticsite-collapsible',
  },
];
var DialectMatch;
(function (DialectMatch) {
  // The candidate has at least one of the highlighted dialects, and the match
  // occurs in one of the pieces of text market with that dialect.
  DialectMatch[(DialectMatch['HIGHLIGHTED_DIALECT_MATCH'] = 0)] =
    'HIGHLIGHTED_DIALECT_MATCH';
  // The candidate has at least one dialect of interest, but the match occurs in
  // an undialected piece of text.
  DialectMatch[
    (DialectMatch['UNDIALECTED_MATCH_WITH_HIGHLIGHTED_DIALECT'] = 1)
  ] = 'UNDIALECTED_MATCH_WITH_HIGHLIGHTED_DIALECT';
  // The candidate doesn't have any dialects of interest in the first place. The
  // match occurs in an undialected piece of text.
  DialectMatch[
    (DialectMatch['UNDIALECTED_MATCH_WITH_NO_HIGHLIGHTED_DIALECT'] = 2)
  ] = 'UNDIALECTED_MATCH_WITH_NO_HIGHLIGHTED_DIALECT';
  // Matches only occur in dialects of no interest for the current query. The
  // candidate does however have a dialect of interest.
  DialectMatch[
    (DialectMatch['OTHER_DIALECT_MATCH_WITH_HIGHLIGHTED_DIALECT'] = 3)
  ] = 'OTHER_DIALECT_MATCH_WITH_HIGHLIGHTED_DIALECT';
  // Matches only occur in dialects of no interest for the current query. The
  // dialect has no dialects of interest to start with!
  DialectMatch[
    (DialectMatch['OTHER_DIALECT_MATCH_WITH_NO_HIGHLIGHTED_DIALECT'] = 4)
  ] = 'OTHER_DIALECT_MATCH_WITH_NO_HIGHLIGHTED_DIALECT';
})(DialectMatch || (DialectMatch = {}));
const NUM_BUCKETS =
  1 +
  Math.max(
    ...Object.values(DialectMatch).filter((value) => typeof value === 'number')
  );
/**
 */
class DialectSorter extends xooxle.BucketSorter {
  highlighter;
  /**
   * @param highlighter
   */
  constructor(highlighter) {
    super(NUM_BUCKETS);
    this.highlighter = highlighter;
  }
  /**
   * @param _res
   * @param row - Table row.
   * @returns Bucket number.
   */
  bucket(_res, row) {
    const active = this.highlighter.activeDialects();
    if (!active?.length) {
      // There is no dialect highlighting. All dialects fall in the first
      // bucket.
      return 0;
    }
    const highlightedDialectQuery = active
      .map((d) => `.${d} .${'match' /* xooxle.CLS.MATCH */}`)
      .join(', ');
    if (row.querySelector(highlightedDialectQuery)) {
      // We have a match in a highlighted dialect.
      return DialectMatch.HIGHLIGHTED_DIALECT_MATCH;
    }
    const undialected = Array.from(
      row.querySelectorAll(`.${'match' /* xooxle.CLS.MATCH */}`)
    ).some((el) => !el.closest(highlight.ANY_DIALECT_QUERY));
    const ofInterest = !!row.querySelector(utils.classQuery(active));
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
 *
 */
async function main() {
  // Prevent other elements in the page from picking up key events on the
  // search box.
  const searchBox = document.getElementById(SEARCH_BOX_ID);
  searchBox.addEventListener('keyup', utils.stopPropagation);
  searchBox.addEventListener('keydown', utils.stopPropagation);
  searchBox.addEventListener('keypress', utils.stopPropagation);
  const dialectCheckboxes = Array.from(
    document.querySelectorAll('.dialect-checkbox')
  );
  const highlighter = new highlight.Highlighter(false, dialectCheckboxes);
  // Initialize searchers.
  // TODO: You initialize three different Form objects, and it looks like each
  // one of them will end up populating the query parameters separately! They
  // also populate the shared objects from the parameters repeatedly!
  // While this is not currently a problem, it remains undesirable.
  // Deduplicate these actions, somehow.
  await Promise.all(
    XOOXLES.map(async (xoox) => {
      const raw = await fetch(xoox.indexURL);
      const json = await raw.json();
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
        new DialectSorter(highlighter)
      );
    })
  );
  // Initialize collapsible elements.
  collapse.addListenersForSiblings(true);
  help.makeHelpPanel(highlighter);
  highlighter.update();
}
await main();
