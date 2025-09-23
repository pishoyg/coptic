/** Main function for the lexicon. */
import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
import * as css from '../css.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';
import * as help from './help.js';
import * as header from '../header.js';
import * as paths from '../paths.js';
import * as crum from './crum.js';
import * as wiki from './wiki.js';
import * as dropdown from '../dropdown.js';
import * as logger from '../logger.js';
import * as id from './id.js';
const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
// TODO: (#0) The message box gets written. Since multiple Xooxle instances are
// allowed to coexist on the same page, we should create several boxes,
// otherwise they could override each other!
const MESSAGE_BOX_ID = 'message';
const DIALECTS_ID = 'dialects';
// While we have two groups of checkboxes, confusingly enough, the unqualified
// 'checkboxes' ID refers to the ones that show on a list, rather than the ones
// that show in the drop-down menu. The reason this ID was used for those boxes
// is that they preceded the more recent drop-down version.
const CHECKBOXES_ID = 'checkboxes';
const REPORTS_ID = 'reports';
const FORM_ID = 'form';
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
/**
 */
class SearchResult extends xooxle.SearchResult {
  static highlighter;
  /**
   *
   * @param highlighter
   */
  static init(highlighter) {
    SearchResult.highlighter = highlighter;
  }
  /**
   *
   * @param total
   * @returns
   */
  row(total) {
    const row = super.row(total);
    crum.addGreekLookups(row);
    // TODO: (#499): Handling of dialects causes a (minor) bug: Dialect codes
    // don't get highlighted!
    // This is because the content of dialect spans gets completely overridden
    // in the call below. If this content had a match span, it would be removed
    // and replaced with new content that doesn't have the match span.
    // The following fix was considered: Your dialect handler should,
    // instead of replacing the entire HTML tree in dialect spans, replace the
    // text nodes only.
    // This suggestion was abandoned in favor of a more radical redesign of
    // Xooxle that eliminates such possibilities altogether. See #541.
    crum.handleDialect(row, CrumSearchResult.highlighter);
    return row;
  }
}
/**
 */
class CrumSearchResult extends SearchResult {
  static NUM_BUCKETS =
    1 +
    Math.max(
      ...Object.values(DialectMatch).filter(
        (value) => typeof value === 'number'
      )
    );
  /**
   * @returns
   */
  link() {
    return `${paths.LEXICON}/${this.key}.html`;
  }
  /**
   * @returns
   */
  static numBuckets() {
    return CrumSearchResult.NUM_BUCKETS;
  }
  /**
   * @param row - Table row.
   * @returns Bucket number.
   */
  bucket(row) {
    const active = d.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }
    const highlightedDialectQuery = active
      .map((dialect) => `.${dialect} .${'match' /* xooxle.CLS.MATCH */}`)
      .join(', ');
    if (row.querySelector(highlightedDialectQuery)) {
      // We have a match in a highlighted dialect.
      return DialectMatch.HIGHLIGHTED_DIALECT_MATCH;
    }
    const undialected = Array.from(
      row.querySelectorAll(`.${'match' /* xooxle.CLS.MATCH */}`)
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
class KELLIASearchResult extends SearchResult {
  /**
   * @returns
   */
  link() {
    return paths.CDO_LOOKUP_BY_KEY_PREFIX + this.key;
  }
  /**
   * @returns
   */
  static numBuckets() {
    return 2;
  }
  /**
   * @param row - Table row.
   * @returns Bucket number.
   */
  bucket(row) {
    const active = d.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }
    const highlightedDialectQuery = active
      .map((dialect) => `.${dialect} .${'match' /* xooxle.CLS.MATCH */}`)
      .join(', ');
    return row.querySelector(highlightedDialectQuery) ? 0 : 1;
  }
}
/**
 *
 */
class WikiSearchResult extends xooxle.SearchResult {
  /**
   *
   * @param total
   * @returns
   */
  row(total) {
    const row = super.row(total);
    crum.addGreekLookups(row);
    // TODO: (#541) Add other handlers once the post-processing bug is fixed.
    wiki.handleBible(row);
    return row;
  }
  /**
   * @returns
   */
  link() {
    return `${paths.LEXICON}/${this.key}.html#wiki`;
  }
}
const XOOXLES = [
  {
    indexURL: 'crum.json',
    tableID: 'crum',
    collapsibleID: 'crum-collapsible',
    searchResultType: CrumSearchResult,
  },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
    searchResultType: KELLIASearchResult,
  },
  {
    indexURL: 'copticsite.json',
    tableID: 'copticsite',
    collapsibleID: 'copticsite-collapsible',
  },
  {
    indexURL: 'wiki.json',
    tableID: 'wiki',
    collapsibleID: 'wiki-collapsible',
    searchResultType: WikiSearchResult,
  },
];
/**
 *
 */
function spellOutDialectsInDropdown() {
  document
    .querySelectorAll(`#${DIALECTS_ID} .${dropdown.CLS.DROPPABLE} input`)
    .forEach((el) => {
      const text = el.nextSibling;
      text.replaceWith(...d.DIALECTS[text.nodeValue].title());
    });
}
/**
 *
 */
function addTooltipsAndPrettifyDialectsInList() {
  document.querySelectorAll(`#${CHECKBOXES_ID} label`).forEach((label) => {
    const dialect = d.DIALECTS[label.textContent];
    dropdown.addHoverDroppable(label, ...dialect.anchoredName());
    // Replace the code with a prettified version.
    Array.from(label.childNodes)
      .find(
        (child) =>
          child.nodeType === Node.TEXT_NODE &&
          child.textContent === dialect.code
      )
      .replaceWith(dialect.siglum());
  });
}
/**
 *
 */
function maybeShowWiki() {
  const url = new URL(window.location.href);
  if (!url.searchParams.get('wiki')) {
    return;
  }
  for (const elementID of [id.WIKI_TITLE, id.WIKI_COLLAPSIBLE]) {
    document.getElementById(elementID).style.display = 'block';
  }
}
/**
 *
 */
async function main() {
  maybeShowWiki();
  // TODO: (#0) There is some duplication between the handling of the dialect
  // sigla in Crum, and the handling of the lexicon checkboxes. Consider
  // deduplicating the code. Perhaps it would help to generate the checkbox
  // elements in JavaScript instead of hardcoding them in HTML.
  // We have a drop-down element bearing the dialects (intended for small
  // screens).
  spellOutDialectsInDropdown();
  // We also have a second dialect list outside the dropdown (intended to be
  // shown on large screens).
  addTooltipsAndPrettifyDialectsInList();
  // Add event listeners for hover-invoked tooltips.
  dropdown.addEventListeners('hover');
  // Add event listeners for click-invoked tooltips, and also capture them
  // because we use them below.
  const dropdownDialects = dropdown.addEventListeners('click');
  logger.ensure(dropdownDialects.length === 1); // Expect a single such element.
  if (d.setToDefaultIfUnset()) {
    // In order to alert the user to the fact that dialect selection has
    // changed, we make sure the dialect list is visible.
    // NOTE: This step should precede the construction of the highlighter, so
    // that the selected dialects will be visible to the highlighter during its
    // initialization.
    dropdownDialects[0].show();
  }
  const highlighter = new highlight.Highlighter(
    Array.from(document.querySelectorAll(`#${DIALECTS_ID} input`))
  );
  SearchResult.init(highlighter);
  // Initialize searchers.
  // TODO: (#0) You initialize three different Form and Xooxle objects, and many
  // of elements are shared, which implies that some of the listeners will be
  // registered multiple times. As of the time of writing, the following
  // listeners (and potentially others) are registered redundantly:
  // - Populating query parameters from form elements.
  // - Populating form elements from query parameters.
  // - Preventing form submission.
  // - Stopping propagation of search box key events.
  // While this is not currently a problem, it remains undesirable.
  // Deduplicate these actions, somehow.
  await Promise.all(
    XOOXLES.map(async (xoox) => {
      const json = await fetch(xoox.indexURL).then((raw) => raw.json());
      const form = new xooxle.Form({
        searchBoxID: SEARCH_BOX_ID,
        fullWordCheckboxID: FULL_WORD_CHECKBOX_ID,
        regexCheckboxID: REGEX_CHECKBOX_ID,
        messageBoxID: MESSAGE_BOX_ID,
        resultsTableID: xoox.tableID,
        collapsibleID: xoox.collapsibleID,
        formID: FORM_ID,
      });
      new xooxle.Xooxle(json, form, xoox.searchResultType);
    })
  );
  // Initialize collapsible elements.
  collapse.addEventListenersForSiblings(true);
  help.makeHelpPanel(highlighter);
  document.getElementById(REPORTS_ID).addEventListener('click', header.reports);
}
await main();
