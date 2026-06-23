/** Main function for the Bible index. */

// TODO: (#445) Much of the code below is duplicated with that of Lexicon.
// Minimize duplication across the two modules.

import * as coll from '../collapse.js';
import * as log from '../logger.js';
import * as browser from '../browser.js';
import * as paths from '../paths.js';
import * as tool from '../tooltip.js';
import * as xoox from '../xooxle.js';
import * as cls from './cls.js';
import * as dial from './dialect.js';
import * as high from './highlight.js';
import * as ddial from '../dialect.js';
import * as map from '../crum/bible.js';

const BOOK_PARAM = 'book';
// TODO: (#0) It's probably cleaner to export a separate mapping for this use
// case, instead of reusing Crum's mapping.
const MAPPING: Record<string, string> = Object.values(map.MAPPING).reduce<
  Record<string, string>
>((acc: Record<string, string>, book: map.Book): Record<string, string> => {
  // Retain the first abbreviation encountered. It's more canonical.
  acc[book.path] ??= book.abb;
  return acc;
}, {});

const KEY_RE = /^(.*?)_(\d+[ab]?|[a-f])\.html(?:#v(\d+)[a-z]?)?$/;
const FRAGMENT_CONTEXT = 10;

const ID = {
  SEARCH_BOX: 'search-box',
  FULL_WORD_CHECKBOX: 'full-word-checkbox',
  CASE_SENSITIVE_CHECKBOX: 'case-sensitive-checkbox',
  REGEX_CHECKBOX: 'regex-checkbox',
  MESSAGE_BOX: 'message',
  RESULTS: 'results',
  DIALECTS: 'dialects',
  DIALECTS_BUTTON: 'dialects-button',
  CHECKBOXES: 'checkboxes',
} as const;

/**
 * A rule that reveals a hidden language when the user types its script: if the
 * form matches `predicate` while all `codes` are inactive, we should enable
 * `target` so its text becomes visible.
 */
class LanguageToggle {
  /**
   * @param codes - The dialect codes that must all be inactive for this toggle
   * to fire.
   * @param predicate - Whether the form's current state should trigger the
   * toggle (e.g. the search box contains the language's script).
   * @param target - The dialect to enable; defaults to the first of `codes`.
   */
  public constructor(
    private readonly codes: dial.Code[],
    private readonly predicate: (form: xoox.Form) => boolean,
    public readonly target: dial.Code = codes[0]!
  ) {}

  /**
   * @param form - The search form.
   * @param inactive - The currently inactive dialect codes.
   * @returns Whether `target` should be enabled: true when all `codes` are
   * inactive and the form matches the predicate.
   */
  public shouldEnable(form: xoox.Form, inactive: dial.Code[]): boolean {
    return (
      this.codes.every((c: dial.Code): boolean => inactive.includes(c)) &&
      this.predicate(form)
    );
  }
}

const LANGUAGE_TOGGLES: LanguageToggle[] = [
  // Enable English when the user types Latin letters, unless it's a regex
  // query.
  // A user who enables regex likely knows what they're doing, so we don't need
  // to do anything for them.
  new LanguageToggle(
    ['E'],
    (form: xoox.Form): boolean =>
      // Skip this toggle when regex search is enabled. Regex syntax is composed
      // of Latin characters, so typing one shouldn't be taken as intent to read
      // the English text.
      !form.regexEnabled && /\p{Script=Latin}/u.test(form.searchBox.value)
  ),
  // Enable Greek when the user types a Greek character.
  new LanguageToggle(['G'], (form: xoox.Form): boolean =>
    /\p{Script=Greek}/u.test(form.searchBox.value)
  ),
  // If the user types a Coptic letter and all Coptic dialects are disabled,
  // enable our favorite Coptic dialect.
  new LanguageToggle(
    dial.DIALECTS.filter((d) => d.coptic).map((d) => d.code),
    (form: xoox.Form): boolean =>
      /\p{Script=Coptic}/u.test(form.searchBox.value),
    dial.DEFAULT
  ),
];

/**
 * Bible-specific search result. The candidate key is a relative URL
 * (e.g. `genesis_1.html#v1`).
 */
class SearchResult extends xoox.SearchResult {
  // The inactive dialect set is computed once per search and cached.
  private static inactive: dial.Code[] | undefined;

  /**
   * @param manager - The dialect manager whose active dialect set drives
   * filtering.
   */
  public static init(manager: dial.Manager): void {
    document.addEventListener(xoox.EVENT, (): void => {
      SearchResult.inactive = manager.inactive();
    });
  }

  /**
   * @returns The relative URL to the verse page.
   */
  protected override link(): string {
    return this.key;
  }

  /**
   * We use a larger context than the base default to give text-fragment
   * directives more disambiguating context.
   *
   * @returns The number of context words per fragment.
   */
  protected override fragmentContext(): number {
    return FRAGMENT_CONTEXT;
  }

  /**
   * The Bible index is single-layer, so unlike the base method we needn't
   * walk subsequent layers. Inactive (hidden) dialect cells are omitted, so the
   * browser doesn't scroll to or highlight text the reader can't see.
   *
   * @param context - Words of surrounding context per fragment.
   * @returns The text fragments for matches in active dialects.
   */
  public override fragment(context: number): string[] {
    return this.results.flatMap((r: xoox.FieldSearchResult): string[] =>
      SearchResult.inactive?.includes(r.name as dial.Code)
        ? []
        : r.fragment(context)
    );
  }

  /**
   * @returns
   */
  public override filter(): boolean {
    return this.results.some(
      (r: xoox.FieldSearchResult): boolean =>
        r.match && !SearchResult.inactive?.includes(r.name as dial.Code)
    );
  }

  /**
   * @returns
   */
  protected override view(): string {
    const match: RegExpExecArray | null = KEY_RE.exec(this.key);
    if (!match) {
      log.error('Key has invalid format:', this.key);
      return super.view();
    }
    const [basename, chapter, verse]: [string, string, string | undefined] = [
      match[1]!,
      match[2]!,
      match[3],
    ];
    const abbreviation: string | undefined = MAPPING[basename];
    if (!abbreviation) {
      log.error('Unfamiliar basename:', basename);
      return super.view();
    }

    return `${abbreviation} ${chapter.toUpperCase()}${verse ? `:${verse}` : ''}`;
  }

  /**
   * @returns A comparison key ranking verses in the search results.
   */
  protected override compareKeyAux(): number[] {
    // active is the list of Coptic fields that are currently active.
    const active: xoox.FieldSearchResult[] = this.results.filter(
      (r: xoox.FieldSearchResult): boolean =>
        !!dial.find(r.name as dial.Code)?.coptic &&
        !SearchResult.inactive?.includes(r.name as dial.Code)
    );

    const matching: number = active.filter(
      (r: xoox.FieldSearchResult): boolean => r.match
    ).length;

    const withText: number = active.filter(
      (r: xoox.FieldSearchResult): boolean => r.textLength > 0
    ).length;

    const selection: boolean = SearchResult.inactive !== undefined;

    return [
      // The first element is the essential binary: 0 if the verse has visible
      // Coptic text, else 1. This sinks verses with no Coptic translation
      // (English/Greek-only) below those a Coptic learner can study. It always
      // applies.
      withText ? 0 : 1,
      // When at least one language is selected, rank by the number of active
      // Coptic dialects that match the query, then by the number that have any
      // text.
      // When nothing is selected, both are 0, so equal keys compare equal
      // and the stable sort preserves scriptural (book/chapter/verse) order —
      // what we want for the Bible by default.
      selection ? -matching : 0,
      selection ? -withText : 0,
    ];
  }
}

/**
 * Attach a click-triggered tooltip dropdown to the `Languages ▾` button
 * holding one checkbox per available dialect (shown on small screens).
 *
 * @returns The list of created checkboxes.
 */
function addTooltipDialects(): HTMLInputElement[] {
  const button: HTMLElement = document.getElementById(ID.DIALECTS_BUTTON)!;
  const controls: ddial.Control[] = dial.DIALECTS.map(
    (d: dial.Dialect): ddial.Control => d.control(true)
  );
  tool.addTooltip(
    button,
    controls.map((d: ddial.Control): HTMLLabelElement => d.label),
    [],
    'click'
  );
  return controls.map((d: ddial.Control): HTMLInputElement => d.checkbox);
}

/**
 * Populate the inline dialect list (shown on wide screens) with one
 * checkbox per available dialect, each rendered as the dialect's one-letter
 * key and accompanied by a hover tooltip bearing the full dialect name.
 *
 * @returns The list of created checkboxes.
 */
function addListDialects(): HTMLInputElement[] {
  const controls: ddial.Control[] = dial.DIALECTS.map(
    (d: dial.Dialect): ddial.Control => d.control(false)
  );
  document
    .querySelector(`#${ID.DIALECTS} #${ID.CHECKBOXES}`)!
    .append(...controls.map((d: ddial.Control): HTMLLabelElement => d.label));
  return controls.map((d: ddial.Control): HTMLInputElement => d.checkbox);
}

/**
 * Scroll to the first book, then click every book's title to expand its
 * collapsible.
 *
 * `books` is a list of book element IDs: the page scrolls to the first one,
 * and all of them are expanded.
 * @param books
 */
function goTo(books: string[]): void {
  // We choose to fail silently when some book IDs are invalid, because such
  // cases are not expected to occur in reality, and failures are benign.
  const elems: HTMLElement[] = books
    .map((book: string): HTMLElement | null => document.getElementById(book))
    .filter((elem: HTMLElement | null): elem is HTMLElement => elem !== null);

  // Scroll to the first book, then expand all of them once the scroll settles.
  // NOTE: We rely on the assumption that the book is never already at the top,
  // so `scrollIntoView` always triggers a scroll (and hence a `scrollend`).
  document.addEventListener(
    'scrollend',
    (): void => {
      elems.forEach((elem: HTMLElement): void => {
        elem.click();
      });
    },
    { once: true }
  );
  // Ideally, we will scroll to the element with the lowest Y position. For now,
  // we rely on the assumption that the URL is constructed with the books in
  // the same order as that of the HTML.
  elems[0]?.scrollIntoView();
}

/**
 *
 */
function handleBookTitles(): void {
  document
    .querySelectorAll<HTMLElement>(`.${cls.INDEX_BOOK_NAME}`)
    .forEach((collapse: HTMLElement): void => {
      new coll.Collapsible(
        collapse,
        // In our index, the collapsibles conveniently happen to be the
        // immediate next siblings of title elements.
        collapse.nextElementSibling as HTMLElement
      );
    });
}

/**
 * Auto-enable any language whose script is present in the search box but whose
 * dialect is currently hidden, so the matching text becomes visible.
 *
 * @param form - The search form.
 * @param manager - The dialect manager, used to read the inactive dialects.
 * @param highlighter - Used to enable a dialect when its toggle fires.
 */
function updateLanguageSelection(
  form: xoox.Form,
  manager: dial.Manager,
  highlighter: high.Highlighter
): void {
  const inactive: dial.Code[] | undefined = manager.inactive();
  if (!inactive?.length) {
    return;
  }
  // NOTE: Setting dialects triggers a search (see other listeners), in which
  // case we would be triggering search twice. This is OK since calls get
  // debounced and deduplicated by Xooxle.
  for (const toggle of LANGUAGE_TOGGLES) {
    if (toggle.shouldEnable(form, inactive)) {
      highlighter.toggle(toggle.target, true);
    }
  }
}

/**
 * Wire up the search box and dialect-selection event listeners.
 *
 * @param form
 * @param xooxle
 * @param manager
 * @param highlighter
 */
function addEventListeners(
  form: xoox.Form,
  xooxle: xoox.Xooxle,
  manager: dial.Manager,
  highlighter: high.Highlighter
): void {
  // On input to the search box: update the URL parameters, auto-enable a
  // language whose script the user just typed, and run a fresh search.
  form.searchBox.addEventListener('input', (e: Event): void => {
    // Delete the book parameter in case it's present. A URL with both the
    // query and book parameter wouldn't render properly.
    browser.setParams({
      [paths.QUERY_PARAM]: form.searchBox.value,
      [BOOK_PARAM]: null,
    });

    // Only auto-enable a language when the user adds text (typing, pasting, or
    // dropping), not when they remove it (e.g. Backspace, cut). The `insert`
    // input types are exactly the additive ones.
    if (e instanceof InputEvent && e.inputType.startsWith('insert')) {
      updateLanguageSelection(form, manager, highlighter);
    }

    xooxle.search();
  });

  // Since dialect selection affects the subset of fields that gets searched,
  // we need to rerun the search query whenever dialects are set.
  document.addEventListener(ddial.EVENT, () => {
    xooxle.search();
  });
}

/**
 *
 */
async function main(): Promise<void> {
  handleBookTitles();

  // NOTE: We scroll to the book *before* loading the index, because loading the
  // index takes a lot of time.
  const books: string[] = browser.getParamAll(BOOK_PARAM);
  if (books.length) {
    goTo(books);
  }

  const manager: dial.Manager = new dial.Manager();
  const highlighter: high.Highlighter = new high.Highlighter(manager, [
    ...addTooltipDialects(),
    ...addListDialects(),
  ]);

  SearchResult.init(manager);

  const form: xoox.Form = new xoox.Form({
    searchBoxID: ID.SEARCH_BOX,
    fullWordCheckboxID: ID.FULL_WORD_CHECKBOX,
    caseSensitiveCheckboxID: ID.CASE_SENSITIVE_CHECKBOX,
    regexCheckboxID: ID.REGEX_CHECKBOX,
    messageBoxID: ID.MESSAGE_BOX,
    resultsTableID: ID.RESULTS,
    scrollTargetID: ID.RESULTS,
  });

  // TODO: (#445) Control the query parameter through the Xooxle module.
  form.searchBox.value = browser.getParam(paths.QUERY_PARAM) ?? '';

  // The form is now populated with query parameters. Update language selection.
  updateLanguageSelection(form, manager, highlighter);

  const json: xoox.XooxleRaw = (await fetch('bible.json').then(
    (raw: Response) => raw.json()
  )) as xoox.XooxleRaw;
  const xooxle: xoox.Xooxle = new xoox.Xooxle(json, form, SearchResult);

  // Focus after reading the index, to give the user an indication that the page
  // has loaded.
  if (!books.length) {
    form.searchBox.focus();
  }

  addEventListeners(form, xooxle, manager, highlighter);

  // Run a first search to honour an initial query restored from the URL.
  // NOTE: If the URL has both a `book` and a `query` parameter, we would both
  // scroll to the book and execute a search, which would be confusing. We don't
  // account for this case because we never construct such a URL.
  xooxle.search();
}

await main();
