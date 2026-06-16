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
 * When the user types a character whose script matches `re` while all `codes`
 * are inactive, toggle `code ?? codes[0]` so its text becomes visible.
 */
interface ScriptToggle {
  codes: dial.Code[];
  code?: dial.Code;
  re: RegExp;
}

const SCRIPT_TOGGLES: ScriptToggle[] = [
  { codes: ['E'], re: /\p{Script=Latin}/u },
  { codes: ['G'], re: /\p{Script=Greek}/u },
  {
    // If all Coptic dialects are inactive and the user types a Coptic
    // character, toggle our favorite Coptic dialect.
    codes: dial.DIALECTS.filter((d) => d.coptic).map((d) => d.code),
    code: dial.DEFAULT,
    re: /\p{Script=Coptic}/u,
  },
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
   * The Bible index is single-layer, so unlike the base method we needn't
   * walk subsequent layers. We also ignore the caller's context and use a
   * larger fixed value (`FRAGMENT_CONTEXT`), to give text-fragment directives
   * more disambiguating context. Inactive (hidden) dialect cells are omitted,
   * so the browser doesn't scroll to or highlight text the reader can't see.
   *
   * @param _ - Context; ignored in favor of `FRAGMENT_CONTEXT`. See above.
   * @returns The text fragments for matches in active dialects.
   */
  public override fragment(_: number): string[] {
    return this.results.flatMap((r: xoox.FieldSearchResult): string[] =>
      SearchResult.inactive?.includes(r.name as dial.Code)
        ? []
        : r.fragment(FRAGMENT_CONTEXT)
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

    return `${abbreviation} ${chapter}${verse ? `:${verse}` : ''}`;
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

    const subset = !!SearchResult.inactive?.length;

    return [
      // The first element is the essential binary: 0 if the verse has visible
      // Coptic text, else 1. This sinks verses with no Coptic translation
      // (English/Greek-only) below those a Coptic learner can study. It always
      // applies.
      withText ? 0 : 1,
      // When some languages are deselected, rank by the number of active Coptic
      // dialects that match the query, then by the number that have any text.
      // When language selection is off, both are 0, so equal keys compare equal
      // and the stable sort preserves scriptural (book/chapter/verse) order —
      // what we want for the Bible by default.
      subset ? -matching : 0,
      subset ? -withText : 0,
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
  // Scroll to the book, then expand it once the scroll settles.
  // NOTE: We rely on the assumption that the book is never already at the top,
  // so `scrollIntoView` always triggers a scroll (and hence a `scrollend`).
  document.addEventListener('scrollend', elem.click.bind(elem), {
    once: true,
  });
  elem.scrollIntoView();
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

    x.search();
  });

  box.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.key.length !== 1) {
      // This is a special key.
      return;
    }

    const inactive: dial.Code[] | undefined = manager.inactive();
    if (!inactive?.length) {
      // All languages are active.
      return;
    }

    // NOTE: Setting dialects triggers a search (see below), in which case this
    // listener would be triggering search twice. This is OK since calls get
    // debounced and deduplicated by Xooxle.
    for (const toggle of SCRIPT_TOGGLES) {
      if (
        toggle.re.test(e.key) &&
        toggle.codes.every((c: dial.Code): boolean => inactive.includes(c))
      ) {
        highlighter.toggle(toggle.code ?? toggle.codes[0]!, true);
      }
    }
  });

  document.addEventListener(ddial.EVENT, () => {
    // Since dialect selection affects the subset of fields that gets searched,
    // we need to rerun the search query whenever dialects are set.
    x.search();
  });

  // Run a first search to honour an initial query restored from the URL.
  x.search();

  if (!browser.getParam(BOOK_PARAM)) {
    // If we're not scrolling to a book, focus on the search box.
    box.focus();
  }
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
