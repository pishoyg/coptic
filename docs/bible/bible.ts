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
const CLICK_DELAY_MS = 500;
// TODO: (#0) It's probably cleaner to export a separate mapping for this use
// case, instead of reusing Crum's mapping.
const MAPPING: Record<string, string> = Object.values(map.MAPPING).reduce<
  Record<string, string>
>((acc: Record<string, string>, book: map.Book): Record<string, string> => {
  // Retain the first abbreviation encountered. It's more canonical.
  acc[book.path] ??= book.abb;
  return acc;
}, {});

const KEY_RE = /^(.*?)_(\d+[ab]?|[a-f])\.html(?:#v(\d+))?$/;

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

/*
 * Reduce the likelihood of collision by including four words on each side of
 * the match in the text fragment.
 */
const FRAGMENT_CONTEXT = 4;

/**
 * Bible-specific search result. The candidate key is a relative URL
 * (e.g. `genesis_1.html#v1`).
 */
class SearchResult extends xoox.SearchResult {
  private static manager: dial.Manager;

  /**
   * @param manager - The dialect manager used by bucket sorting.
   */
  public static init(manager: dial.Manager): void {
    SearchResult.manager = manager;
  }

  /**
   * @returns The relative URL to the verse page.
   */
  protected override link(): string {
    return this.key;
  }

  /**
   * @returns
   */
  public override filter(): boolean {
    // TODO: (#445) `active()` re-reads localStorage (and splits the stored
    // string) on every candidate. Since `filter` runs once per candidate, this
    // repeats ~31k times per search. Cache the active set once per search pass.
    const active: dial.Code[] | undefined = SearchResult.manager.active();
    if (!dial.partial(active)) {
      return true;
    }
    return this.results.some(
      (r: xoox.FieldSearchResult): boolean =>
        r.match && active.includes(r.name as dial.Code)
    );
  }

  /**
   * @returns
   */
  public override fragment(): string | undefined {
    return this.key.includes('#')
      ? undefined
      : super.fragment(FRAGMENT_CONTEXT);
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

    return `${abbreviation} ${chapter}${verse ? `:${verse}` : ''}`;
  }

  /**
   * @returns - Empty key => all results compare equal => the stable sort
   * preserves the candidates' scriptural (book/chapter/verse) order, which is
   * what we want for the Bible rather than relevance ranking.
   */
  public override compareKey(): number[] {
    return [];
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
 * If the URL has a `?book=` parameter, expand that book's collapsible and
 * scroll to it.
 */
function maybeGoToBook(): void {
  const book: string | null = browser.getParam(BOOK_PARAM);
  if (!book) {
    return;
  }
  const elem: HTMLElement | null = document.getElementById(book);
  if (!elem) {
    log.error(book, 'not found!');
    return;
  }
  elem.scrollIntoView();
  // Scroll first, wait a bit, then click.
  // TODO: (#0) Scrolling takes time, because it's smooth by default for the
  // whole website (see the shared CSS). Ideally, the timeout used here should
  // be the time it takes for the browser to scroll to the element. We should be
  // able to retrieve this value from the CSS.
  setTimeout(elem.click.bind(elem), CLICK_DELAY_MS);
}

/**
 * Wire the search box: restore its value from the `?query=` URL parameter,
 * mirror keystrokes back to the URL, trigger a fresh search on every
 * keystroke, and suppress form submit so pressing Enter doesn't clear the
 * form.
 *
 * @param x - The Xooxle search engine to drive.
 * @param manager
 * @param highlighter
 */
function wireSearchBox(
  x: xoox.Xooxle,
  manager: dial.Manager,
  highlighter: high.Highlighter
): void {
  const box: HTMLInputElement = document.getElementById(
    ID.SEARCH_BOX
  ) as HTMLInputElement;
  const initial: string | null = browser.getParam(paths.QUERY_PARAM);
  if (initial) {
    box.value = initial;
  }

  box.addEventListener('input', (): void => {
    // Delete the book parameter in case it's present. A URL with both the
    // query and book parameter wouldn't render properly.
    browser.setParams({ [paths.QUERY_PARAM]: box.value, [BOOK_PARAM]: null });

    // NOTE: Setting dialects triggers a search (see below), in which case this
    // listener would be triggering search twice. This is OK since calls get
    // debounced and deduplicated by Xooxle.
    if (manager.partial()) {
      if (/\p{Script=Greek}/u.exec(box.value)) {
        highlighter.toggle('G', true);
      }
      if (/\p{Script=Latin}/u.exec(box.value)) {
        highlighter.toggle('E', true);
      }
    }

    x.search();
  });

  document.addEventListener(ddial.EVENT, () => {
    // Since dialect selection affects the subset of fields that gets searched,
    // we need to rerun the search query whenever dialects are set.
    x.search();
  });

  // Run a first search to honour an initial query restored from the URL.
  x.search();
}

/**
 *
 */
async function main(): Promise<void> {
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

  maybeGoToBook();

  const manager: dial.Manager = new dial.Manager();
  const highlighter: high.Highlighter = new high.Highlighter(manager, [
    ...addTooltipDialects(),
    ...addListDialects(),
  ]);
  SearchResult.init(manager);

  const json: xoox.XooxleRaw = (await fetch('bible.json').then(
    (raw: Response) => raw.json()
  )) as xoox.XooxleRaw;

  const form: xoox.Form = new xoox.Form({
    searchBoxID: ID.SEARCH_BOX,
    fullWordCheckboxID: ID.FULL_WORD_CHECKBOX,
    caseSensitiveCheckboxID: ID.CASE_SENSITIVE_CHECKBOX,
    regexCheckboxID: ID.REGEX_CHECKBOX,
    messageBoxID: ID.MESSAGE_BOX,
    resultsTableID: ID.RESULTS,
    scrollTargetID: ID.RESULTS,
  });

  const x: xoox.Xooxle = new xoox.Xooxle(json, form, SearchResult);
  wireSearchBox(x, manager, highlighter);
}

await main();
