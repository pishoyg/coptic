/**
 * Init for the digital lexicon view (Xooxle-driven Crum + KELLIA +
 * Andreas dictionaries).
 *
 * Owns the dialect-highlighting controls, checkbox tooltips, the
 * Marcion/Wiki bucket sorting, and the help panel — everything that
 * is specific to the `digital` mode.
 */
import * as xoox from '../xooxle.js';
import * as coll from '../collapse.js';
import * as css from '../css.js';
import * as high from './highlight.js';
import * as dial from './dialect.js';
import * as help from './help.js';
import * as head from '../header.js';
import * as paths from '../paths.js';
import * as crum from './crum.js';
import * as tool from '../tooltip.js';
import * as log from '../logger.js';
import * as id from './id.js';
import * as dev from '../dev.js';
import * as kellia from './kellia.js';
import * as andreas from './andreas.js';
import * as cls from './cls.js';
import * as html from '../html.js';
import * as query from './query.js';
import * as mode from './mode.js';
import type * as ddial from '../dialect.js';

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
enum Bucket {
  // Group 1: Match occurs in a text belonging to an active dialect.

  // The candidate has at least one of the active dialects, and the match
  // occurs in a piece of text marked with that dialect.
  ACTIVE_DIALECT_MATCH,

  // Group 2: The match occurs in an undialected text.
  // The distinction between italic and roman text is only relevant for
  // English translations, not for Coptic words. The English translation is
  // always undialected, which makes the italic and roman categories only
  // relevant for this group. Other groups don't need them.

  // The candidate has at least one of the active dialects. There is at least
  // one match in an undialected piece of text, and there is at least one match
  // in an italic piece of text.
  UNDIALECTED_ITALIC_MATCH_WITH_ACTIVE_DIALECT,
  // Same as above, but all matches are roman.
  UNDIALECTED_ROMAN_MATCH_WITH_ACTIVE_DIALECT,
  // The candidate doesn't have any active dialects in the first place. There is
  // at least one match in an undialected piece of text, and there is at least
  // one match in an italic piece of text.
  UNDIALECTED_ITALIC_MATCH,
  // Same as above, but all matches are roman.
  UNDIALECTED_ROMAN_MATCH,

  // Group 3: The match occurs in an inactive dialect.

  // Matches only occur in an inactive dialect for the current query. The
  // candidate does however have text belonging to an active dialect, but that
  // text doesn't have a match.
  INACTIVE_DIALECT_MATCH_WITH_ACTIVE_DIALECT,
  // Matches only occur in inactive dialects for the current query. The
  // dialect has no active dialects to start with!
  INACTIVE_DIALECT_MATCH,

  // Group 4: Wiki buckets
  HEADWORD_OR_GLOSS_MATCH,
  OTHER_WIKI,
}

/**
 * WIKI_UNITS_LIMIT is the maximum number of units to display per field for
 * Wiki search results.
 */
const WIKI_UNITS_LIMIT = 3;

/**
 *
 * @param active
 * @returns
 */
function activeDialectMatchQuery(active: dial.DIALECT[]): string {
  return active
    .map((dialect: dial.DIALECT) => `.${dialect} .${xoox.CLS.MATCH}`)
    .join(', ');
}

/**
 * SearchResult is a search result type shared by both Crum and KELLIA.
 */
class SearchResult extends xoox.SearchResult {
  private static readonly NUM_BUCKETS =
    1 +
    Math.max(
      ...Object.values(Bucket).filter((value) => typeof value === 'number')
    );
  protected static manager: dial.Manager;
  protected static highlighter: high.Highlighter;

  /**
   *
   * @param manager
   * @param highlighter
   */
  public static init(
    manager: dial.Manager,
    highlighter: high.Highlighter
  ): void {
    SearchResult.manager = manager;
    SearchResult.highlighter = highlighter;
  }

  /**
   * @returns
   */
  public static override numBuckets(): number {
    return CrumSearchResult.NUM_BUCKETS;
  }

  /**
   * @param row - Table row.
   * @returns Bucket number.
   */
  public override bucket(row: HTMLTableRowElement): Bucket {
    const active: dial.DIALECT[] | undefined = SearchResult.manager.active();
    if (!active?.length) {
      // There is no dialect highlighting. All results fall in the first bucket.
      return 0;
    }

    // Group 1:
    if (row.querySelector(activeDialectMatchQuery(active))) {
      // We have a match in an active dialect.
      return Bucket.ACTIVE_DIALECT_MATCH;
    }

    const hasActive = !!row.querySelector(css.disjunction(...active));

    const dialectedQuery = Object.keys(dial.DIALECTS)
      .map((d: string): string => `.${d} *`)
      .join(',');

    // Group 2:
    if (row.querySelector(`.${xoox.CLS.MATCH}:not(${dialectedQuery})`)) {
      // We have an undialected match.
      if (row.querySelector(`.${xoox.CLS.MATCH}:not(.${cls.ROMAN} *)`)) {
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
 *
 */
class AndreasSearchResult extends xoox.SearchResult {
  /**
   * @param row
   */
  public override enrich(row: HTMLTableRowElement): void {
    andreas.handle(row);
  }
}

/**
 */
class CrumSearchResult extends SearchResult {
  // We have two overlaid databases of Crum, referred to as Marcion and Wiki.
  // We use checkboxes to control which database to search.
  public static wikiCheckbox: HTMLInputElement = document.getElementById(
    id.WIKI_CHECKBOX
  ) as HTMLInputElement;
  public static marcionCheckbox: HTMLInputElement = document.getElementById(
    id.MARCION_CHECKBOX
  ) as HTMLInputElement;

  /**
   * @returns
   */
  protected override link(): string {
    return paths.crum(this.key);
  }

  /**
   *
   * @param row
   */
  public override enrich(row: HTMLTableRowElement): void {
    crum.handle(row, CrumSearchResult.highlighter, false);
  }

  /**
   *
   * @param row
   * @returns
   */
  public override bucket(row: HTMLTableRowElement): Bucket {
    if (this.marcion()) {
      // Marcion uses the dialect-based bucket sorter implemented in the parent
      // class.
      return super.bucket(row);
    }
    // This is a Wiki entry. Dialects are irrelevant, but we have some
    // preferences.
    // Ideally, we would also prioritize Coptic words (forms) in the heading
    // over Coptic words in examples / explanation, but we currently don't mark
    // them in any special way so we have no way to detect them.
    // A workaround might be prioritizing results with matches closer to the
    // beginning of the text.
    // TODO: (#0) Consider overriding the parent's `compareKey` method.
    return row.querySelector(
      `.${cls.HEADWORD} .${xoox.CLS.MATCH}, .${cls.GLOSS} .${xoox.CLS.MATCH}`
    )
      ? Bucket.HEADWORD_OR_GLOSS_MATCH
      : Bucket.OTHER_WIKI;
  }

  /**
   * @returns
   */
  private marcion(): boolean {
    // Marcion is layer 0.
    return !this.layer;
  }

  /**
   * @returns
   */
  private wiki(): boolean {
    // Wiki is layer 1.
    return !!this.layer;
  }

  /**
   * @returns
   */
  public override filter(): boolean {
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
      return this.marcion();
    }
    if (CrumSearchResult.wikiCheckbox.checked) {
      // If only the Wiki checkbox is checked, then only search Wiki.
      return this.wiki();
    }
    log.fatal('This is impossible!');
  }

  /**
   * @returns
   */
  protected override unitsLimit(): number {
    return this.wiki() ? WIKI_UNITS_LIMIT : super.unitsLimit();
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
  protected override link(): string {
    return paths.copticDictionaryOnline(this.key);
  }

  /**
   *
   * @param row
   */
  public override enrich(row: HTMLTableRowElement): void {
    kellia.handle(row, SearchResult.highlighter);
  }
}

interface Xooxle {
  indexURL: string;
  tableID: string;
  searchResultType?: typeof xoox.SearchResult;
  otherCheckboxes?: [string, string][];
}

const XOOXLES: Xooxle[] = [
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
 * @returns
 */
function addTooltipDialects(): {
  button: HTMLElement;
  checkboxes: HTMLInputElement[];
} {
  const button: HTMLElement = document.getElementById(id.DIALECTS_BUTTON)!;
  const controls = Object.values(dial.DIALECTS).map(
    (d: dial.Dialect): ddial.Control => d.control(true)
  );
  tool.addTooltip(
    button,
    controls.map((d: ddial.Control): HTMLLabelElement => d.label),
    [],
    'click'
  );
  return { button, checkboxes: controls.map((d) => d.checkbox) };
}

/**
 * Attach the explanatory tooltips that hang off each form checkbox.
 */
function addCheckboxTooltips(): void {
  const examples: HTMLAnchorElement = html.anchor(
    'https://docs.google.com/document/d/1bj275wUb_-zXxJmeLjj986XICpaVm7QWaoN2U8FLQ3k',
    'examples'
  );
  const cheatSheet: HTMLAnchorElement = html.anchor(
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet',
    'cheat sheet'
  );

  const tooltips: [string, (Node | string)[]][] = [
    [id.FULL_WORD_CHECKBOX, ['Force match at word boundaries']],
    [id.CASE_SENSITIVE_CHECKBOX, ['Case-sensitive']],
    [
      id.REGEX_CHECKBOX,
      ['Use regular expressions (', examples, ', ', cheatSheet, ' )'],
    ],
    [id.MARCION_CHECKBOX, ['Only search the summary']],
    // TODO: (#503) Drop the progress note once the wiki is fully populated.
    [id.WIKI_CHECKBOX, ['Only search the full text (93% complete)']],
  ];

  for (const [checkbox, content] of tooltips) {
    const label: HTMLLabelElement = document.querySelector<HTMLLabelElement>(
      `label[for="${checkbox}"]`
    )!;
    tool.addTooltip(label, content, [cls.EXPLAIN_CHECKBOX]);
  }
}

/**
 * @returns
 */
function addListDialects(): HTMLInputElement[] {
  const controls: ddial.Control[] = Object.values(dial.DIALECTS).map(
    (d: dial.Dialect): ddial.Control => d.control(false)
  );

  document
    .querySelector(`#${id.DIALECTS} #${id.CHECKBOXES}`)!
    .append(...controls.map((d: ddial.Control): HTMLLabelElement => d.label));

  return controls.map((d: ddial.Control): HTMLInputElement => d.checkbox);
}

/**
 * Initialise the digital lexicon view: wire dialect controls and
 * tooltips, build the Xooxle search engines, the help panel, and the
 * report-link header — then start listening for query-change events.
 */
export async function init(): Promise<void> {
  // We have a tooltip element bearing the dialects (intended for small
  // screens).
  const { button: dialectsButton, checkboxes: tooltipCheckboxes } =
    addTooltipDialects();
  // We also have a second dialect list outside the tooltip (intended to be
  // shown on large screens).
  const listCheckboxes: HTMLInputElement[] = addListDialects();
  addCheckboxTooltips();

  const manager: dial.Manager = new dial.Manager();

  if (manager.setToDefaultIfUnset()) {
    // In order to alert the user to the fact that dialect selection has
    // changed, we make sure the dialect list is visible.
    // NOTE: This step should precede the construction of the highlighter, so
    // that the selected dialects will be visible to the highlighter during its
    // initialization.
    // It should also follow registration of event listeners, so that clicking
    // on the button will actually show the dialects.
    dialectsButton.click();
  }

  const isActive = (): boolean => mode.active(mode.DIGITAL);
  const highlighter: high.Highlighter = new high.Highlighter(
    manager,
    [...tooltipCheckboxes, ...listCheckboxes],
    isActive
  );
  SearchResult.init(manager, highlighter);

  // Initialize searchers. Ownership of the search box, `?query=` URL
  // parameter, and search-box keyboard propagation lives in
  // `docs/crum/query.ts`; each `Xooxle` listens there for `querychange`
  // events rather than wiring its own input listener.
  await Promise.all(
    XOOXLES.map(async (xooxle: Xooxle): Promise<void> => {
      const json: xoox.XooxleRaw = (await fetch(xooxle.indexURL).then(
        (raw: Response) => raw.json()
      )) as xoox.XooxleRaw;
      const form: xoox.Form = new xoox.Form({
        searchBoxID: id.SEARCH_BOX,
        fullWordCheckboxID: id.FULL_WORD_CHECKBOX,
        caseSensitiveCheckboxID: id.CASE_SENSITIVE_CHECKBOX,
        regexCheckboxID: id.REGEX_CHECKBOX,
        // TODO: (#0) The message box gets written. Since multiple Xooxle
        // instances are allowed to coexist on the same page, we should create
        // several boxes, otherwise they could override each other!
        messageBoxID: id.MESSAGE_BOX,
        resultsTableID: xooxle.tableID,
        scrollTargetID: id.title(xooxle.tableID),
        boxes: xooxle.otherCheckboxes,
      });
      const x = new xoox.Xooxle(json, form, xooxle.searchResultType);

      document.addEventListener(query.EVENT, (): void => {
        x.search();
      });
      x.search();

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
  const devHighlighter: dev.Highlighter = new dev.Highlighter(isActive);
  help.makeHelpPanel(highlighter, devHighlighter);

  // Add event listener for reports.
  // TODO: (#203) This belongs in the (future) header module.
  html.linkify(document.getElementById(id.REPORTS)!, head.reports());

  // TODO: (#203) Implement in the `header` package.
  crum.handleDeveloper(devHighlighter);
}
