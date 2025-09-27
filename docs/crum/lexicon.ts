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
class SearchResult extends xooxle.SearchResult {
  protected static manager: d.Manager;
  private static highlighter: highlight.Highlighter;

  /**
   *
   * @param manager
   * @param highlighter
   */
  static init(manager: d.Manager, highlighter: highlight.Highlighter): void {
    SearchResult.manager = manager;
    SearchResult.highlighter = highlighter;
  }

  /**
   *
   * @param total
   * @returns
   */
  override row(total: number): HTMLTableRowElement {
    const row: HTMLTableRowElement = super.row(total);
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
  private static readonly NUM_BUCKETS =
    1 +
    Math.max(
      ...Object.values(DialectMatch).filter(
        (value) => typeof value === 'number'
      )
    );

  /**
   * @returns
   */
  override link(): string {
    return `${paths.LEXICON}/${this.key}.html`;
  }

  /**
   * @returns
   */
  static override numBuckets(): number {
    return CrumSearchResult.NUM_BUCKETS;
  }

  /**
   * @param row - Table row.
   * @returns Bucket number.
   */
  override bucket(row: HTMLTableRowElement): DialectMatch {
    const active: d.DIALECT[] | undefined = SearchResult.manager.active();
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
class KELLIASearchResult extends SearchResult {
  /**
   * @returns
   */
  override link(): string {
    return paths.CDO_LOOKUP_BY_KEY_PREFIX + this.key;
  }

  /**
   * @returns
   */
  static override numBuckets(): number {
    return 2;
  }

  /**
   * @param row - Table row.
   * @returns Bucket number.
   */
  override bucket(row: HTMLTableRowElement): number {
    const active: d.DIALECT[] | undefined = SearchResult.manager.active();
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

/**
 *
 */
class WikiSearchResult extends xooxle.SearchResult {
  /**
   *
   * @param total
   * @returns
   */
  override row(total: number): HTMLTableRowElement {
    const row: HTMLTableRowElement = super.row(total);
    crum.addGreekLookups(row);
    // TODO: (#541) Add other handlers once the post-processing bug is fixed.
    wiki.handleBible(row);
    return row;
  }

  /**
   * @returns
   */
  override link(): string {
    return `${paths.LEXICON}/${this.key}.html#wiki`;
  }
}

interface Xooxle {
  indexURL: string;
  tableID: string;
  collapsibleID: string;
  searchResultType?: typeof xooxle.SearchResult;
}

const XOOXLES: Xooxle[] = [
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
function addDropdownDialects(): void {
  document.querySelector(`#${DIALECTS_ID} .${dropdown.CLS.DROPPABLE}`)!.append(
    ...Object.values(d.DIALECTS).map((dialect: d.Dialect): HTMLElement => {
      const label: HTMLLabelElement = document.createElement('label');
      label.append(dialect.checkbox(), ...dialect.title());
      return label;
    })
  );
}

/**
 *
 */
function addListDialects(): void {
  document.querySelector(`#${DIALECTS_ID} #${CHECKBOXES_ID}`)!.append(
    ...Object.values(d.DIALECTS).map((dialect: d.Dialect): HTMLElement => {
      const label: HTMLLabelElement = document.createElement('label');
      label.append(dialect.checkbox(), dialect.siglum());
      dropdown.addDroppable(label, 'hover', ...dialect.anchoredName());
      return label;
    })
  );
}

/**
 *
 */
function maybeShowWiki(): void {
  const url: URL = new URL(window.location.href);
  if (!url.searchParams.get('wiki')) {
    return;
  }
  for (const elementID of [id.WIKI_TITLE, id.WIKI_COLLAPSIBLE]) {
    document.getElementById(elementID)!.style.display = 'block';
  }
}

/**
 *
 */
async function main(): Promise<void> {
  maybeShowWiki();

  // We have a drop-down element bearing the dialects (intended for small
  // screens).
  addDropdownDialects();
  // We also have a second dialect list outside the dropdown (intended to be
  // shown on large screens).
  addListDialects();

  const manager: d.Manager = new d.Manager();

  const dropDialects: NodeListOf<HTMLElement> =
    document.querySelectorAll<HTMLElement>(
      `#${DIALECTS_ID} .${dropdown.CLS.DROP}`
    );
  // Validate dropdown dialects, regardless of whether or not we end up using
  // them.
  logger.ensure(dropDialects.length === 1);
  if (manager.setToDefaultIfUnset()) {
    // In order to alert the user to the fact that dialect selection has
    // changed, we make sure the dialect list is visible.
    // NOTE: This step should precede the construction of the highlighter, so
    // that the selected dialects will be visible to the highlighter during its
    // initialization.
    dropDialects[0]?.click();
  }

  const highlighter: highlight.Highlighter = new highlight.Highlighter(
    manager,
    // Retrieve the boxes created above.
    Array.from(
      document.querySelectorAll<HTMLInputElement>(`#${DIALECTS_ID} input`)
    )
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
    XOOXLES.map(async (xoox: Xooxle) => {
      const json: xooxle.Index = (await fetch(xoox.indexURL).then(
        (raw: Response) => raw.json()
      )) as xooxle.Index;
      const form: xooxle.Form = new xooxle.Form({
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

  // Add event listeners for collapsibles.
  collapse.addEventListenersForSiblings(true);
  // Add event listeners for tooltips.
  dropdown.addEventListeners('hover');
  dropdown.addEventListeners('click');

  // Create the help panel.
  help.makeHelpPanel(highlighter, new highlight.DevHighlighter());

  // Add event listener for reports.
  // TODO: (#203) This belongs in the (future) header module.
  document
    .getElementById(REPORTS_ID)!
    .addEventListener('click', header.reports);
}

await main();
