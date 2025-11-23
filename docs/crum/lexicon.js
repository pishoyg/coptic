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
import * as dev from '../dev.js';
import * as kellia from './kellia.js';
import * as andreas from './andreas.js';
import * as cls from './cls.js';
// NOTE: The terms "roman" and "italic" below are used to distinguish pieces of
// text surrounded by <span> tags with the "roman" class from those that are
// not. Roman elements correspond to text in Crum's book written in a roman
// font, as opposed to the italic or oblique font. Italic text is more
// interesting, since it bears the meaning of the word; while the roman font is
// used for notes that are not part of the meaning. Check the Crum text for
// example.
// To add to the confusion, as of the time of writing, roman text render in our
// website italicized, while "italic" text renders in roman font, thus reversing
// Crum's styling!
var Bucket;
(function (Bucket) {
  // Group 1: Match occurs in a text belonging to an active dialect.
  // The candidate has at least one of the active dialects, and the match
  // occurs in a piece of text marked with that dialect.
  Bucket[(Bucket['ACTIVE_DIALECT_MATCH'] = 0)] = 'ACTIVE_DIALECT_MATCH';
  // Group 2: The match occurs in an undialected text.
  // The distinction between italic and roman text is only relevant for
  // English translations, not for Coptic words. The English translation is
  // always undialected, which makes the italic and roman categories only
  // relevant for this group. Other groups don't need them.
  // The candidate has at least one of the active dialects. There is at least
  // one match in an undialected piece of text, and there is at least one match
  // in an italic piece of text.
  Bucket[(Bucket['UNDIALECTED_ITALIC_MATCH_WITH_ACTIVE_DIALECT'] = 1)] =
    'UNDIALECTED_ITALIC_MATCH_WITH_ACTIVE_DIALECT';
  // Same as above, but all matches are roman.
  Bucket[(Bucket['UNDIALECTED_ROMAN_MATCH_WITH_ACTIVE_DIALECT'] = 2)] =
    'UNDIALECTED_ROMAN_MATCH_WITH_ACTIVE_DIALECT';
  // The candidate doesn't have any active dialects in the first place. There is
  // at least one match in an undialected piece of text, and there is at least
  // one match in an italic piece of text.
  Bucket[(Bucket['UNDIALECTED_ITALIC_MATCH'] = 3)] = 'UNDIALECTED_ITALIC_MATCH';
  // Same as above, but all matches are roman.
  Bucket[(Bucket['UNDIALECTED_ROMAN_MATCH'] = 4)] = 'UNDIALECTED_ROMAN_MATCH';
  // Group 3: The match occurs in an inactive dialect.
  // Matches only occur in an inactive dialect for the current query. The
  // candidate does however have text belonging to an active dialect, but that
  // text doesn't have a match.
  Bucket[(Bucket['INACTIVE_DIALECT_MATCH_WITH_ACTIVE_DIALECT'] = 5)] =
    'INACTIVE_DIALECT_MATCH_WITH_ACTIVE_DIALECT';
  // Matches only occur in inactive dialects for the current query. The
  // dialect has no active dialects to start with!
  Bucket[(Bucket['INACTIVE_DIALECT_MATCH'] = 6)] = 'INACTIVE_DIALECT_MATCH';
})(Bucket || (Bucket = {}));
/**
 *
 * @param active
 * @returns
 */
function activeDialectMatchQuery(active) {
  return active
    .map((dialect) => `.${dialect} .${'match' /* xoox.CLS.MATCH */}`)
    .join(', ');
}
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
}
/**
 *
 */
class AndreasSearchResult extends xoox.SearchResult {
  /**
   * @param row
   */
  enrich(row) {
    andreas.handle(row);
  }
}
/**
 */
class CrumSearchResult extends SearchResult {
  static NUM_BUCKETS =
    1 +
    Math.max(
      ...Object.values(Bucket).filter((value) => typeof value === 'number')
    );
  // We have two overlaid databases of Crum, referred to as Marcion and Wiki.
  // We use checkboxes to control which database to search.
  static wikiCheckbox = document.getElementById(id.WIKI_CHECKBOX);
  static marcionCheckbox = document.getElementById(id.MARCION_CHECKBOX);
  /**
   * @returns
   */
  link() {
    return paths.crum(this.key);
  }
  /**
   *
   * @param row
   */
  enrich(row) {
    crum.addGreekLookups(row);
    crum.handleDialect(row, CrumSearchResult.highlighter);
    wiki.handle(row);
    drop.addEventListeners('hover', row);
  }
  /**
   * @returns
   */
  filter() {
    if (
      CrumSearchResult.wikiCheckbox.checked ===
      CrumSearchResult.marcionCheckbox.checked
    ) {
      // If both checkboxes are checked or both are unchecked, use default
      // behavior.
      return super.filter();
    }
    // Layer 0 is Marcion, layer 1 is Wiki.
    if (CrumSearchResult.marcionCheckbox.checked) {
      // If only the Marcion checkbox is checked, then only search Marcion.
      return !this.layer;
    }
    if (CrumSearchResult.wikiCheckbox.checked) {
      // If only the Wiki checkbox is checked, then only search Wiki.
      return !!this.layer;
    }
    log.fatal('This is impossible!');
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
    // Group 1:
    if (row.querySelector(activeDialectMatchQuery(active))) {
      // We have a match in an active dialect.
      return Bucket.ACTIVE_DIALECT_MATCH;
    }
    const hasActive = !!row.querySelector(css.classQuery(...active));
    const dialectedQuery = Object.keys(dial.DIALECTS)
      .map((d) => `.${d} *`)
      .join(',');
    // Group 2:
    if (
      row.querySelector(
        `.${'match' /* xoox.CLS.MATCH */}:not(${dialectedQuery})`
      )
    ) {
      // We have an undialected match.
      if (
        row.querySelector(
          `.${'match' /* xoox.CLS.MATCH */}:not(.${cls.ROMAN} *)`
        )
      ) {
        // We have a match in Italic text.
        return hasActive
          ? Bucket.UNDIALECTED_ITALIC_MATCH_WITH_ACTIVE_DIALECT
          : Bucket.UNDIALECTED_ITALIC_MATCH;
      }
      return hasActive
        ? Bucket.UNDIALECTED_ROMAN_MATCH_WITH_ACTIVE_DIALECT
        : Bucket.UNDIALECTED_ROMAN_MATCH;
    }
    // Group 3:
    // We only have matches in inactive dialects.
    return hasActive
      ? Bucket.INACTIVE_DIALECT_MATCH_WITH_ACTIVE_DIALECT
      : Bucket.INACTIVE_DIALECT_MATCH;
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
   *
   * @param row
   */
  enrich(row) {
    kellia.handle(row, SearchResult.highlighter);
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
    // If there is a match in an active dialect, then this result goes to the
    // first bucket. Otherwise it goes to the second bucket.
    return row.querySelector(activeDialectMatchQuery(active)) ? 0 : 1;
  }
}
const XOOXLES = [
  {
    indexURL: 'crum.json',
    tableID: id.CRUM,
    searchResultType: CrumSearchResult,
    otherCheckboxes: [
      [id.WIKI_CHECKBOX, 'wiki'],
      [id.MARCION_CHECKBOX, 'marcion'],
    ],
  },
  {
    indexURL: 'kellia.json',
    tableID: id.KELLIA,
    searchResultType: KELLIASearchResult,
  },
  {
    indexURL: 'andreas.json',
    tableID: id.ANDREAS,
    searchResultType: AndreasSearchResult,
  },
];
/**
 *
 */
function addDropdownDialects() {
  document.querySelector(`#${id.DIALECTS} .${drop.CLS.DROPPABLE}`).append(
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
  document.querySelector(`#${id.DIALECTS} #${id.CHECKBOXES}`).append(
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
async function main() {
  // We have a drop-down element bearing the dialects (intended for small
  // screens).
  addDropdownDialects();
  // We also have a second dialect list outside the dropdown (intended to be
  // shown on large screens).
  addListDialects();
  const manager = new dial.Manager();
  // Add event listeners for tooltips.
  drop.addEventListeners('hover');
  drop.addEventListeners('click');
  const dropDialects = document.querySelectorAll(
    `#${id.DIALECTS} .${drop.CLS.DROP}`
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
    Array.from(document.querySelectorAll(`#${id.DIALECTS} input`))
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
        searchBoxID: id.SEARCH_BOX,
        fullWordCheckboxID: id.FULL_WORD_CHECKBOX,
        regexCheckboxID: id.REGEX_CHECKBOX,
        // TODO: (#0) The message box gets written. Since multiple Xooxle
        // instances are allowed to coexist on the same page, we should create
        // several boxes, otherwise they could override each other!
        messageBoxID: id.MESSAGE_BOX,
        resultsTableID: xooxle.tableID,
        formID: id.FORM,
        boxes: xooxle.otherCheckboxes,
      });
      new xoox.Xooxle(json, form, xooxle.searchResultType);
      coll.fromIDs(
        id.collapse(xooxle.tableID),
        id.collapsible(xooxle.tableID),
        // We use the table ID as the name of the parameter that controls
        // dictionary visibility.
        xooxle.tableID
      );
    })
  );
  // Create the help panel.
  const devHighlighter = new dev.Highlighter();
  help.makeHelpPanel(highlighter, devHighlighter);
  // Add event listener for reports.
  // TODO: (#203) This belongs in the (future) header module.
  document.getElementById(id.REPORTS).addEventListener('click', head.reports);
  // TODO: (#203) Implement in the `header` package.
  crum.handleDeveloper(document.body, devHighlighter);
}
await main();
