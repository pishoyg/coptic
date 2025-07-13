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

const XOOXLES = (highlighter: highlight.Highlighter): Xooxle[] => [
  {
    indexURL: 'crum.json',
    tableID: 'crum',
    collapsibleID: 'crum-collapsible',
    hrefFmt: paths.CRUM_PAGE_KEY_FMT,
    bucketSorter: new CrumDialectSorter(),
    prepublish: (row: HTMLTableRowElement): void => {
      crum.addGreekLookups(row);
      crum.handleDialect(row, highlighter);
    },
  },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
    hrefFmt: paths.CDO_LOOKUP_KEY_FMT,
    bucketSorter: new KELLIADialectSorter(),
    prepublish: (row: HTMLTableRowElement): void => {
      // TODO: (#0) Add Greek lookups after making your linkifier smart enough
      // to recognize diacritics.
      crum.handleDialect(row, highlighter);
    },
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
function spellOutDialectsInDropdown(): void {
  document
    .querySelectorAll<HTMLInputElement>(
      `#${DIALECTS_ID} .${dropdown.CLS.DROPPABLE} input`
    )
    .forEach((el: HTMLInputElement): void => {
      const next: ChildNode | null = el.nextSibling;
      logger.ass(next?.nodeType === Node.TEXT_NODE);
      const dialect: d.Dialect = d.DIALECTS[el.name as d.DIALECT];
      next?.parentNode?.replaceChild(dialect.title(), next);
    });
}

/**
 *
 */
function spellOutDialectsInList(): void {
  document
    .querySelectorAll<HTMLLabelElement>(`#${CHECKBOXES_ID} label`)
    .forEach((drop: HTMLLabelElement): void => {
      const dialect: d.Dialect = d.DIALECTS[drop.textContent as d.DIALECT];

      // Make the label a .dropdown element.
      drop.classList.add(dropdown.CLS.DROPDOWN);
      // Create a hover-invoked droppable.
      const droppable = document.createElement('span');
      droppable.classList.add(dropdown.CLS.DROPPABLE);
      droppable.append(...dialect.anchoredName());
      // A hover-invoked .droppable must be a child of its associated .dropdown
      // element.
      drop.appendChild(droppable);
      // Replace the code with a prettified version.
      Array.from(drop.childNodes)
        .find(
          (child: ChildNode) =>
            child.nodeType === Node.TEXT_NODE &&
            child.textContent === dialect.code
        )!
        .replaceWith(...dialect.prettyCode());
    });
}

/**
 *
 */
async function main(): Promise<void> {
  spellOutDialectsInDropdown();
  spellOutDialectsInList();

  const dropdownDialects: dropdown.Droppable[] =
    dropdown.addEventListenersForSiblings();
  logger.ass(dropdownDialects.length === 1);
  if (d.setToDefaultIfUnset()) {
    // In order to alert the user to the fact that dialect selection has
    // changed, we make sure the dialect list is visible.
    // NOTE: This step should precede the construction of the highlighter, so
    // that the selected dialects will be visible to the highlighter during its
    // initialization.
    dropdownDialects[0]!.show();
  }

  const dialectCheckboxes: HTMLInputElement[] = Array.from(
    document.querySelectorAll<HTMLInputElement>(`#${DIALECTS_ID} input`)
  );

  const highlighter = new highlight.Highlighter(false, dialectCheckboxes);

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
    XOOXLES(highlighter).map(async (xoox: Xooxle) => {
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

  document
    .getElementById(REPORTS_ID)!
    .addEventListener('click', header.reports);
}

await main();
