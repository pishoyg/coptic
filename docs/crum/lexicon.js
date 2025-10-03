/** Main function for the lexicon. */
import * as xoox from '../xooxle.js';
import * as coll from '../collapse.js';
import * as css from '../css.js';
import * as high from './highlight.js';
import * as dial from './dialect.js';
import * as help from './help.js';
import * as head from '../header.js';
import * as paths from '../paths.js';
import * as crum from './crum.js';
import * as wiki from './wiki.js';
import * as drop from '../dropdown.js';
import * as log from '../logger.js';
import * as id from './id.js';
var ID;
(function (ID) {
  ID['SEARCH_BOX'] = 'searchBox';
  ID['FULL_WORD_CHECKBOX'] = 'fullWordCheckbox';
  ID['REGEX_CHECKBOX'] = 'regexCheckbox';
  ID['MESSAGE_BOX'] = 'message';
  ID['DIALECTS'] = 'dialects';
  // While we have two groups of checkboxes, confusingly enough, the unqualified
  // 'checkboxes' ID refers to the ones that show on a list, rather than the
  // ones that show in the drop-down menu. The reason this ID was used for those
  // boxes is that they preceded the more recent drop-down version.
  ID['CHECKBOXES'] = 'checkboxes';
  ID['REPORTS'] = 'reports';
  ID['FORM'] = 'form';
})(ID || (ID = {}));
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
class SearchResult extends xoox.SearchResult {
  static manager;
  static highlighter;
  /**
   *
   * @param manager
   * @param highlighter
   */
  static init(manager, highlighter) {
    SearchResult.manager = manager;
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
    return paths.crum(this.key);
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
    const active = SearchResult.manager.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }
    const highlightedDialectQuery = active
      .map((dialect) => `.${dialect} .${'match' /* xoox.CLS.MATCH */}`)
      .join(', ');
    if (row.querySelector(highlightedDialectQuery)) {
      // We have a match in a highlighted dialect.
      return DialectMatch.HIGHLIGHTED_DIALECT_MATCH;
    }
    const undialected = Array.from(
      row.querySelectorAll(`.${'match' /* xoox.CLS.MATCH */}`)
    ).some((el) => !el.closest(dial.ANY_DIALECT_QUERY));
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
    return paths.copticDictionaryOnline(this.key);
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
    const active = SearchResult.manager.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }
    const highlightedDialectQuery = active
      .map((dialect) => `.${dialect} .${'match' /* xoox.CLS.MATCH */}`)
      .join(', ');
    return row.querySelector(highlightedDialectQuery) ? 0 : 1;
  }
}
/**
 *
 */
class WikiSearchResult extends xoox.SearchResult {
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
    return `${paths.crum(this.key)}#${id.WIKI}`;
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
function addDropdownDialects() {
  document.querySelector(`#${ID.DIALECTS} .${drop.CLS.DROPPABLE}`).append(
    ...Object.values(dial.DIALECTS).map((dialect) => {
      const label = document.createElement('label');
      label.append(dialect.checkbox(), ...dialect.title());
      return label;
    })
  );
}
/**
 *
 */
function addListDialects() {
  document.querySelector(`#${ID.DIALECTS} #${ID.CHECKBOXES}`).append(
    ...Object.values(dial.DIALECTS).map((dialect) => {
      const label = document.createElement('label');
      label.append(dialect.checkbox(), dialect.siglum());
      drop.addDroppable(label, 'hover', ...dialect.anchoredName());
      return label;
    })
  );
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
  // We have a drop-down element bearing the dialects (intended for small
  // screens).
  addDropdownDialects();
  // We also have a second dialect list outside the dropdown (intended to be
  // shown on large screens).
  addListDialects();
  const manager = new dial.Manager();
  // Add event listeners for collapsibles.
  coll.addEventListenersForSiblings(true);
  // Add event listeners for tooltips.
  drop.addEventListeners('hover');
  drop.addEventListeners('click');
  const dropDialects = document.querySelectorAll(
    `#${ID.DIALECTS} .${drop.CLS.DROP}`
  );
  // Validate dropdown dialects, regardless of whether or not we end up using
  // them.
  log.ensure(dropDialects.length === 1);
  if (manager.setToDefaultIfUnset()) {
    // In order to alert the user to the fact that dialect selection has
    // changed, we make sure the dialect list is visible.
    // NOTE: This step should precede the construction of the highlighter, so
    // that the selected dialects will be visible to the highlighter during its
    // initialization.
    // It should also follow registration of event listeners, so that clicking
    // on the button will actually show the dialects.
    dropDialects[0]?.click();
  }
  const highlighter = new high.Highlighter(
    manager,
    // Retrieve the boxes created above.
    Array.from(document.querySelectorAll(`#${ID.DIALECTS} input`))
  );
  SearchResult.init(manager, highlighter);
  // Initialize searchers.
  // TODO: (#0) You initialize several Form and Xooxle objects, and many
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
    XOOXLES.map(async (xooxle) => {
      const json = await fetch(xooxle.indexURL).then((raw) => raw.json());
      const form = new xoox.Form({
        searchBoxID: ID.SEARCH_BOX,
        fullWordCheckboxID: ID.FULL_WORD_CHECKBOX,
        regexCheckboxID: ID.REGEX_CHECKBOX,
        // TODO: (#0) The message box gets written. Since multiple Xooxle
        // instances are allowed to coexist on the same page, we should create
        // several boxes, otherwise they could override each other!
        messageBoxID: ID.MESSAGE_BOX,
        resultsTableID: xooxle.tableID,
        collapsibleID: xooxle.collapsibleID,
        formID: ID.FORM,
      });
      new xoox.Xooxle(json, form, xooxle.searchResultType);
    })
  );
  // Create the help panel.
  help.makeHelpPanel(highlighter, new high.DevHighlighter());
  // Add event listener for reports.
  // TODO: (#203) This belongs in the (future) header module.
  document.getElementById(ID.REPORTS).addEventListener('click', head.reports);
}
await main();
