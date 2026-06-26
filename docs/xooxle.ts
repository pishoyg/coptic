/** Package xooxle defines the Xooxle engine core logic. */
/* eslint-disable max-lines */
import * as browser from './browser.js';
import * as log from './logger.js';
import * as orth from './orth.js';
import * as cls from './cls.js';
import * as str from './str.js';
import * as tool from './tooltip.js';
import * as dev from './dev.js';
import * as pagination from './pagination.js';

// KEY is the name of the field that bears the word key. The key can be used to
// generate an HREF to open the word page.
const KEY = 'KEY';

/**
 * UNITS_LIMIT determines the behavior of the fields that should be split into
 * units.
 * If the number of units in a field is at most UNITS_LIMIT, the field will
 * always be produced whole.
 * Otherwise:
 * - If there are units with matches, matching units will be produced
 *   (regardless of their number).
 * - If there are no units with matches, the first UNITS_LIMIT units will be
 *   produced.
 * - If some units end up not showing, a message will be shown indicating that
 *   more content is available.
 */
const UNITS_LIMIT = 5;

/**
 * LINE_BREAK is used to separate the unit into lines that get searched
 * separately. We do this in order to prevent a match from spanning several
 * lines.
 * Our HTML content should be minimal. As of the time of writing, it only
 * contains styling tags (<i> and <b>), <span> tags, <br> tags, and unit
 * separators.
 *
 * We also know that line-break tags in our index are always in the form <br>,
 * and never <br/> (although the latter is more preferred).
 */
const LINE_BREAK = '<br>';

/**
 * RESULTS_TO_UPDATE_DISPLAY specifies how often (every how many results) we
 * should yield to let the browser update the display during search.
 * A higher value implies:
 * - A less responsive UI, because our JavaScript will yield less often.
 * A lower value implies:
 * - A higher likelihood of jittery bucket sorting becoming visible to the user.
 *   If we rush to update display after sorting a small number of candidates,
 *   there is a higher chance our next batch of candidates will contain a
 *   candidate that needs to go on top (which is the area of the results table
 *   that is visible to the user), which introduces jitter. But if we sort a
 *   higher number of candidates in the first round, then upcoming batches are
 *   less likely to contain a candidate that needs to go in the first bucket.
 */
const RESULTS_TO_UPDATE_DISPLAY = 20;

/**
 * INPUT_DEBOUNCE_TIMEOUT is the timeout we use to debounce input events.
 */
const INPUT_DEBOUNCE_TIMEOUT = 200;

/**
 * FRAGMENT_CONTEXT is the default number of context words we include in the
 * prefix and suffix of a text fragment.
 * Some context is necessary to disambiguate matches: a text fragment directive
 * with no prefix or suffix highlights only the first occurrence of its text in
 * the page, so repeated identical matches would otherwise all collapse onto the
 * same spot.
 */
const FRAGMENT_CONTEXT = 4;

/**
 * EVENT is the name of the event that Xooxle dispatches on `document` whenever
 * a new search starts. Consumers can listen for it to perform per-search setup.
 */
export const EVENT = 'xooxle-search';

/**
 * PER_PAGE is the maximum number of results to display per page.
 */
const PER_PAGE: number = ((): number => {
  /* eslint-disable no-magic-numbers */
  if (browser.firefox() || browser.smallScreen()) {
    // Firefox tends to perform poorly compared to Chromium-based browsers, so
    // we use a smaller page size.[1]
    // We also reduce the page size on less powerful devices. We use the size of
    // the screen as a rough indicator of how powerful the device is.
    //
    // [1] As of the time of writing, Analytics shows that the population
    // of users who visit our website from Firefox is actually quite small. But
    // it's nonzero. We also received requests to improve experience on Firefox
    // from VIPs.
    return 10;
  }

  if (dev.get()) {
    // Disable pagination in developer mode.
    return Number.MAX_SAFE_INTEGER;
  }

  return 20;
  /* eslint-enable no-magic-numbers */
})();

/**
 * CLS is a name space for classes used in the file. It helps pinpoint them and
 * group them in one place, in case this information is needed when writing CSS
 * or other modules.
 */
export const enum CLS {
  // VIEW is the class of the view table cells.
  VIEW = 'view',
  // VIEW_VIEW is the class of the word "view" in the view cell.
  VIEW_VIEW = 'view-view',
  // KEY is the class of a search result key.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  KEY = 'key',
  // ERROR is the class of the error message.
  ERROR = 'error',
  // COUNTER is the class of the result counters in the view cells.
  COUNTER = 'counter',
  // MATCH is the class of text matching a given search query.
  MATCH = 'match',
  // VIEW_FOR_MORE is the class of the message "view for more", displayed in
  // large fields that have been cropped.
  VIEW_FOR_MORE = 'view-for-more',
  // MATCH_SEPARATOR is the class of unit separators.
  MATCH_SEPARATOR = 'match-separator',
}

/**
 * UNIT_DELIMITER is the string that separates units.
 */
const UNIT_DELIMITER = `<hr class="${CLS.MATCH_SEPARATOR}">`;

/**
 * FormParams stores Form parameters.
 */
export interface FormParams {
  searchBoxID: string;
  fullWordCheckboxID: string;
  caseSensitiveCheckboxID: string;
  regexCheckboxID: string;
  messageBoxID: string;
  resultsTableID: string;
  // scrollTargetID is the ID of the element that pagination clicks should
  // scroll to. If unset, the results table is used.
  scrollTargetID?: string;
  boxes?: [string, string][] | undefined;
}

/**
 * _Param defines the form query parameters.
 */
enum Param {
  QUERY = 'query',
  FULL = 'full',
  CASE = 'case',
  REGEX = 'regex',
}

interface Checkbox {
  param: string;
  box: HTMLInputElement;
}

/**
 * Form represents a search form containing the HTML elements that the user
 * interacts with to initiate and control search.
 */
export class Form {
  // Input fields:
  public readonly searchBox: HTMLInputElement;

  private readonly fullWordCheckbox: Checkbox;
  private readonly caseSensitiveCheckbox: Checkbox;
  private readonly regexCheckbox: Checkbox;
  private readonly otherCheckBoxes: Checkbox[];

  // Output fields:
  private readonly messageBox: HTMLElement;
  public readonly table: HTMLTableElement;
  private readonly tbody: HTMLTableSectionElement;
  public readonly numColumns: number;
  public readonly scrollTarget: HTMLElement;
  public readonly paginationContainer: HTMLDivElement;

  /**
   * Construct the form object.
   * Populate form elements from query parameters.
   * Add listeners to populate query parameters whenever form elements are
   * updated.
   *
   * @param form - Form parameters.
   */
  public constructor(form: FormParams) {
    this.searchBox = document.getElementById(
      form.searchBoxID
    ) as HTMLInputElement;

    this.fullWordCheckbox = {
      box: document.getElementById(form.fullWordCheckboxID) as HTMLInputElement,
      param: Param.FULL,
    };

    this.caseSensitiveCheckbox = {
      box: document.getElementById(
        form.caseSensitiveCheckboxID
      ) as HTMLInputElement,
      param: Param.CASE,
    };

    this.regexCheckbox = {
      box: document.getElementById(form.regexCheckboxID) as HTMLInputElement,
      param: Param.REGEX,
    };

    this.messageBox = document.getElementById(form.messageBoxID)!;

    this.table = document.getElementById(
      form.resultsTableID
    ) as HTMLTableElement;
    this.tbody = this.table.querySelector('tbody')!;
    this.numColumns = this.table
      .querySelector('thead')!
      .querySelectorAll('th').length;

    this.scrollTarget = form.scrollTargetID
      ? document.getElementById(form.scrollTargetID)!
      : this.table;

    // Pagination renders outside the results table, as its sibling.
    this.paginationContainer = document.createElement('div');
    this.paginationContainer.classList.add(pagination.CLS.CONTAINER);
    this.table.insertAdjacentElement('afterend', this.paginationContainer);

    this.otherCheckBoxes =
      form.boxes?.map(
        ([id, param]: [string, string]): Checkbox => ({
          box: document.getElementById(id) as HTMLInputElement,
          param,
        })
      ) ?? [];

    // Populate the form once from the query parameters.
    this.populateFromParams();

    this.addEventListeners();
  }

  /**
   * @returns
   */
  private get checkboxes(): Checkbox[] {
    return [
      this.fullWordCheckbox,
      this.caseSensitiveCheckbox,
      this.regexCheckbox,
      ...this.otherCheckBoxes,
    ];
  }

  /**
   * Add event listeners to update query parameters from the form fields.
   *
   * The search box's `input` event, the form's `submit` event, and the
   * `?query=` URL parameter are owned by `docs/crum/query.ts` — see the
   * comment at the top of that file for the rationale.
   */
  private addEventListeners(): void {
    this.checkboxes.forEach((box: Checkbox): void => {
      box.box.addEventListener('click', () => {
        browser.setParam(box.param, box.box.checked);
      });
    });
  }

  /**
   * Populate form fields from query parameters in the URL.
   *
   * The `?query=` parameter is restored by `query.ts`; this method only
   * handles the lexicon-specific boolean parameters.
   */
  private populateFromParams(): void {
    const params = new URLSearchParams(window.location.search);
    this.checkboxes.forEach((box: Checkbox): void => {
      if (params.get(box.param)) {
        box.box.checked = true;
      }
    });
  }

  /**
   * @returns The <tbody> element holding the results.
   */
  public get resultsTBody(): HTMLTableSectionElement {
    return this.tbody;
  }

  /**
   * @returns
   */
  public get regexEnabled(): boolean {
    return this.regexCheckbox.box.checked;
  }

  /**
   * @param listener
   */
  public addCheckboxClickListener(listener: () => void): void {
    this.checkboxes.forEach((box: Checkbox): void => {
      box.box.addEventListener('click', listener);
    });
  }

  /**
   * @returns The query expression, constructed from the input fields.
   */
  public regex(): RegExp | undefined {
    let query: string = orth.cleanDiacritics(this.searchBox.value);
    if (!query) {
      return undefined;
    }

    if (!this.regexCheckbox.box.checked) {
      query = str.escape(query);
    }

    if (this.fullWordCheckbox.box.checked) {
      // NOTE: It's important to wrap `query` in parentheses, to prevent its
      // content from corrupting the boundary regexes. See #318.
      // Additionally, in Xooxle, digits are considered word boundaries. This is
      // useful because, otherwise, a numeric superscript or subscript that
      // immediately follows a word would be considered part of the word,
      // causing a match to be missed.
      query = str.bounded(query, true, true);
    }

    return new RegExp(
      query,
      this.caseSensitiveCheckbox.box.checked ? 'ug' : 'iug'
    );
  }

  /**
   * Append a row to the results table.
   *
   * @param row - The row to append.
   */
  public result(row: HTMLTableRowElement): void {
    this.tbody.append(row);
  }

  /**
   * Show the given message in the form's message field.
   *
   * @param message
   */
  public message(message: string): void {
    const el = document.createElement('div');
    el.classList.add(CLS.ERROR);
    el.textContent = message;
    this.messageBox.append(el);
  }

  /**
   * Clear output fields.
   */
  public clearOutputFields(): void {
    this.tbody.replaceChildren();
    this.paginationContainer.replaceChildren();
    this.messageBox.replaceChildren();
    /* Enrichers wire many tooltips into the search results; those popovers
     * live under <body>, so they survive the tbody clear above. Sweep them. */
    tool.cleanupOrphans();
  }
}

interface Result {
  textLength: number;
  matches: Match[];
  boundary(): Boundary;
  match: boolean;
  fragment(context: number): string[];
  distance(): number;
}

/**
 * Aggregate search results.
 */
abstract class AggregateResult implements Result {
  protected abstract readonly results: Result[];

  // Memos are used to memorize previously computed values, so we can avoid
  // computing them repeatedly.
  // NOTE: We only memorize a subset of the fields. This subset is selected
  // based on which fields could potentially be read repeatedly.
  private textLengthMemo: number | null = null;
  private matchesMemo: Match[] | null = null;
  private matchMemo: boolean | null = null;

  /**
   * @returns The total length of the text, without building the full string.
   */
  public get textLength(): number {
    return (this.textLengthMemo ??= this.results.reduce(
      (sum: number, r: Result) => sum + r.textLength,
      0
    ));
  }

  /**
   * @returns The matches, with offsets in the diacritic-free search-text space
   * (the same space as `textLength`). Consumers that operate on the rendered
   * DOM must translate these offsets into the rendered-DOM space via
   * `orth.translation`, since the rendered HTML may
   * contain diacritics that the search text does not.
   */
  public get matches(): Match[] {
    return (this.matchesMemo ??= this.matchesAux());
  }

  /**
   * @returns
   */
  private matchesAux(): Match[] {
    let precedingTextLength = 0;
    const matches: Match[] = [];
    this.results.forEach((r) => {
      matches.push(...r.matches.map((m) => m.shift(precedingTextLength)));
      precedingTextLength += r.textLength;
    });
    return matches;
  }

  /**
   * @returns The boundary type.
   *
   * NOTE: As of the time of writing, the boundary needs to be computed only
   * once, so we don't memorize it.
   */
  public boundary(): Boundary {
    // The Boundary enum values are ordered in such a way that the boundary
    // type of an aggregated result is the minimum of the boundary types of all
    // results.
    return AggregateResult.boundary(
      ...this.results.map((r: Result) => r.boundary())
    );
  }
  /**
   * boundary computes an aggregate boundary from a list of boundaries.
   */
  public static boundary = Math.min;

  /**
   * @returns Whether this result has a match.
   */
  public get match(): boolean {
    // We have a match if any of the results has a match.
    return (this.matchMemo ??= this.results.some((r: Result) => r.match));
  }

  /**
   * @param context
   * @returns The text fragments for all matches, in document order.
   *
   * NOTE: As of the time of writing, the fragment needs to be computed only
   * once, so we don't memorize it.
   */
  public fragment(context: number): string[] {
    return this.results.flatMap((r: Result): string[] => r.fragment(context));
  }

  /**
   * @returns Minimum distance from the beginning of line to a match.
   *
   * NOTE: As of the time of writing, the distance needs to be computed only
   * once, so we don't memorize it.
   */
  public distance(): number {
    return Math.min(...this.results.map((r: Result) => r.distance()));
  }
}

/**
 * Candidate represents one search candidate from the index. In the results
 * display, each candidate occupies its own row.
 */
export class Candidate {
  // key bears the candidate key.
  public readonly key: string;
  // layers bears the candidate's searchable fields.
  public readonly layers: Field[][];

  /**
   * @param record - The candidate data.
   * @param layers - The layer and field metadata.
   */
  public constructor(record: CandidateRaw, layers: string[][]) {
    this.key = record[KEY];
    this.layers = layers.map(
      // NOTE: Our Xooxle index builder is guaranteed to produce a
      // normalized tree.[1] The text content is also guaranteed to be free of
      // any superfluous space, and to be NFD-normalized.
      // Thus, no normalization is needed when constructing the field.
      // [1] https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
      (layer: string[]): Field[] =>
        layer.map(
          (field: string): Field =>
            new Field(field, record[field] as FieldRaw | undefined)
        )
    );
  }
}

/**
 * SearchResult represents the search result of one candidate from the index.
 */
export class SearchResult extends AggregateResult {
  protected readonly results: FieldSearchResult[];

  private compareKeyMemo: number[] | null = null;

  /**
   * @param candidate - The candidate this result represents.
   * @param regex - The query being searched.
   * @param layer - The index of the matched layer within the candidate.
   */
  public constructor(
    private readonly candidate: Candidate,
    private readonly regex: RegExp,
    public readonly layer: number
  ) {
    super();
    this.results = candidate.layers[layer]!.map(
      (f: Field): FieldSearchResult => f.search(this.regex, this.unitsLimit())
    );
  }

  /**
   * @returns The key of the candidate this result represents.
   */
  public get key(): string {
    return this.candidate.key;
  }

  /**
   * @returns The maximum number of units to display in a field. Override this
   * method to customize the limit.
   */
  protected unitsLimit(): number {
    return UNITS_LIMIT;
  }

  /**
   * viewCell constructs the first cell in the row for this result, bearing the
   * anchor to the result (if available).
   *
   * @param href
   * @param total - Total number of results.
   * @returns The view table cell element.
   */
  private viewCell(
    href: string | undefined,
    total: number
  ): HTMLTableCellElement {
    const td: HTMLTableCellElement = document.createElement('td');
    td.classList.add(CLS.VIEW);

    const counter: HTMLSpanElement = document.createElement('span');
    counter.classList.add(CLS.COUNTER);
    counter.textContent = `? / ${total.toString()}`;
    td.append(counter);

    const key: HTMLSpanElement = document.createElement('span');
    key.classList.add(CLS.KEY, cls.LINK);
    key.textContent = this.key;
    td.prepend(key);

    if (!href) {
      return td;
    }

    // Clicking anywhere on the cell opens the page.
    td.addEventListener('click', browser.open.bind(browser, href, true));

    const view: HTMLAnchorElement = document.createElement('a');
    view.classList.add(cls.LINK, CLS.VIEW_VIEW);
    view.textContent = this.view();
    td.prepend(view);

    return td;
  }

  /**
   * Return the text used in the `view` cell.
   * @returns
   */
  protected view(): string {
    return 'view';
  }

  /**
   * row constructs the row in the results table that corresponds to this
   * result. This consists of the cell bearing the key and anchor, along with
   * the other cells containing the highlighted search fields.
   *
   * @param total - Total number of results - used to display the index of the
   * current result.
   *
   * @param numColumns
   * @returns
   */
  public row(total: number, numColumns: number): HTMLTableRowElement {
    const colSpan: number = Math.round(numColumns / this.results.length);
    const cells: HTMLTableCellElement[] = this.results.map(
      (r: FieldSearchResult): HTMLTableCellElement => r.cell(colSpan)
    );

    const row: HTMLTableRowElement = document.createElement('tr');
    row.append(...cells);
    // Capture the initial text.
    const text = (): string => orth.cleanDiacritics(row.textContent);
    const originalText: string | undefined = dev.play(text);
    // We can not enrich a highlighted HTML, but we can highlight an enriched
    // HTML. Enrichment is more complex, and often relies on the HTML
    // maintaining its original structure. Highlighting, on the other hand, only
    // operates by modifying text nodes in the tree.
    // See #541 for more context.
    this.enrich(row);
    this.highlight(row);

    dev.play(() => {
      // Verify that enrichment and highlighting haven't altered the text
      // content of the row, which would corrupted the highlighting algorithm.
      const finalText: string = text();
      log.ensure(
        finalText === originalText,
        'Text content has changed! Original:',
        originalText,
        'Final:',
        finalText
      );
    });

    // We refrain from adding any extra content, such as the view-for-more
    // message or the view cell, until enrichment and highlighting have been
    // done.
    const href: string | undefined = this.href();
    if (this.results.some((r) => r.cropped)) {
      cells[cells.length - 1]?.append(...this.viewForMore(href));
    }
    row.prepend(this.viewCell(href, total));
    return row;
  }

  /**
   *
   * @param root
   */
  private *walk(root: HTMLElement): Generator<Text> {
    const walker: TreeWalker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      (node: Node): number =>
        node.nodeType === Node.ELEMENT_NODE
          ? // Skip this node, but proceed to process its children.
            NodeFilter.FILTER_SKIP
          : // This is a text node.
            NodeFilter.FILTER_ACCEPT
    );

    while (walker.nextNode()) {
      yield walker.currentNode as Text;
    }
  }

  /**
   *
   * @param row
   */
  public highlight(row: HTMLTableRowElement): void {
    // Since the matches were obtained on the diacritic-free text,
    // while the HTMl is constructed with text that potentially contains
    // diacritics, we need to translate all matches accordingly.
    const translation: orth.Translation = orth.translation(row.textContent);

    // Reverse the order of the matches.
    // We `.pop()` from the end, so we're processing matches in ascending order.
    // We do this because `Array.pop()` is O(1), while `Array.shift()` is O(N).
    // Also keep in mind that `Array.reverse()` is in-place, so we avoid running
    // it on `this.matches` to avoid altering it.
    const matches: Match[] = this.matches
      .map((m) => m.translate(translation))
      .reverse();

    // match stores the match currently being processed.
    let match: Match | undefined = matches.pop();
    // idx stores a global character offset.
    let idx = 0;

    // Store all nodes in an array before processing them. Otherwise, the node
    // replacements that we perform below could corrupt the walker state and
    // prematurely terminate the loop.
    for (const node of [...this.walk(row)]) {
      if (!node.nodeValue) {
        // This node has no text!
        continue;
      }

      if (!match) {
        // There are no matches left.
        return;
      }

      // start and end define the range that the current node occupies in the
      // global text.
      const start: number = idx;
      const end: number = idx + node.nodeValue.length;
      // Update idx to point to the end of this node, which should be the start
      // of the next node.
      idx = end;

      if (match.start >= end) {
        // This nod doesn't have a match. It doesn't overlap with the current
        // match.
        continue;
      }

      // We have an overlap: match.start < end AND match.end > start.
      // Build the fragment
      const fragment: DocumentFragment = document.createDocumentFragment();

      // nodeIdx maintains the invariant that `node.nodeValue[nodeIdx]` hasn't
      // been accounted for in the output yet, and still needs to be added to
      // the fragment (potentially after being broken up into parts with some
      // parts being surrounded by `CLS.MATCH` spans).
      let nodeIdx = 0;
      // Loop *while* we have a match that overlaps with this node
      while (match && match.start < end) {
        // Add any pre-match text from this node.
        fragment.append(node.nodeValue.substring(nodeIdx, match.start - start));

        // Add the match text, wrapped in a span.
        const span = document.createElement('span');
        span.classList.add(CLS.MATCH);
        span.append(
          node.nodeValue.substring(match.start - start, match.end - start)
        );
        fragment.appendChild(span);
        nodeIdx = match.end - start;

        if (match.end > end) {
          // This match carries over to the next node. Push a new match object
          // that starts with the start of the next node, as if the original
          // match object was broken up into two several pieces with each piece
          // lying entirely within a node.
          // NOTE: The boundary type in the match constructed below is
          // inaccurate. This is currently irrelevant, because we will only use
          // the indices, and this match object will be discarded with the
          // boundary type never being used.
          matches.push(new Match(end, match.end, match.boundary));
        }

        // Get the next match.
        match = matches.pop();
      }

      // Add any remaining text from this node (after the last match).
      fragment.append(node.nodeValue.substring(nodeIdx));

      // Normalize the fragment. Get rid of empty text nodes, and merge
      // consecutive text nodes.
      fragment.normalize();
      node.replaceWith(fragment);
    }
  }

  /**
   *
   * @param _row
   */
  protected enrich(_row: HTMLTableRowElement): void {
    // This method can be overridden by children to enrich the HTML before
    // addition to the search results table.
  }

  /**
   * TODO: (#0) This heuristic was conceived by experimentation. Its optimality
   * is unproven, and we should perhaps revisit it.
   *
   * @returns
   */
  protected compareKeyAux(): number[] {
    const boundaries: Boundary[] = this.results.map(
      (r: FieldSearchResult): Boundary => r.boundary()
    );
    const boundary: Boundary = AggregateResult.boundary(...boundaries);
    return [
      this.layer,
      // Results are sorted based on the boundary type.
      // See the Boundary enum for the order.
      boundary,
      // Within all the candidates having a match with a given boundary type, we
      // sort based on the index of the first field possessing a match with that
      // boundary type.
      // A candidate with a full-word match in the first field should rank
      // higher than a candidate with a full-word match in the second field.
      boundaries.findIndex((b: Boundary) => b === boundary),
      // Afterwards, we prioritize results that start at the beginning of the
      // line.
      // This is very useful, especially for prepositions:
      // The line "ϧⲁϫⲉⲛ" contains the definition for the preposition ϧⲁϫⲉⲛ.
      // The line "― ϧⲁϫⲉⲛ" simply tells that the verb can be used with this
      // preposition.
      // If a user searches for "ϧⲁϫⲉⲛ", they're probably interested in the
      // former.
      this.distance() ? 1 : 0,
      // Afterwards, we rank based on the number of matches in the text.
      // Notice that we revert the sign, so the larger numbers will appear
      // first.
      // NOTE: Grok suggested using match density (number of matches / total
      // number of words in the text) instead of the absolute number of matches,
      // but we dismissed the suggestion.
      -this.matches.length,
      // Afterwards, we sort based on the index of the first match, regardless
      // the boundary type of that match.
      // Results are sorted based on the first column that has a match.
      // We do so based on the assumption that the earlier columns contain more
      // relevant data. So a result with a match in the 1st column is likely
      // more interesting to the user than a result with a match in the 2nd
      // column, so it should show first.
      this.results.findIndex((res) => res.match),
      // Lastly, we rank based on the index of the first match in the field
      // text.
      // A result that has a field with a match closer to the beginning of the
      // text should rank higher than a result with a match in the middle or
      // towards the end of the text.
      Math.min(
        ...this.results.map(
          (r) => r.matches[0]?.start ?? Number.MAX_SAFE_INTEGER
        )
      ),
    ];
  }

  /**
   * Construct a key used to compare search results.
   *
   * @returns the comparison key.
   */
  public compareKey(): number[] {
    return (this.compareKeyMemo ??= this.compareKeyAux());
  }

  /**
   * Build a link to a page that gives more information about this search
   * result. By default, no page is provided. Override this method in order to
   * provide pages.
   *
   * @returns
   */
  protected link(): string | undefined {
    return undefined;
  }

  /**
   * @returns The number of context words to include in the prefix and suffix
   * of each text fragment. Override this method to customize the context (for
   * example, to disable context entirely on pages whose HTML we don't own).
   */
  protected fragmentContext(): number {
    return FRAGMENT_CONTEXT;
  }

  /**
   *
   * @returns
   */
  private href(): string | undefined {
    const link: string | undefined = this.link();
    if (!link) {
      return undefined;
    }
    const fragments: string[] = this.fragment(this.fragmentContext());
    if (!fragments.length) {
      return link;
    }
    return `${link}#:~:text=${fragments.join('&text=')}`;
  }

  /**
   * Build text fragments for every match on this result's destination page,
   * which renders all of the candidate's layers from the matched one onward
   * (earlier layers didn't match, so they contribute nothing).
   *
   * The matched layer is already searched in `this.results`; the unit crop only
   * ever drops non-matching units, which carry no fragments, so those results
   * yield every fragment and we reuse them via `super.fragment`. They come
   * first, so the matched layer's leading match anchors the browser's scroll.
   * The following layers aren't displayed, hence not yet searched, so we search
   * them on demand — the same crop keeps every match either way.
   *
   * @param context - Words of surrounding context per fragment.
   * @returns The text fragments, in page order.
   */
  public override fragment(context: number): string[] {
    return [
      ...super.fragment(context),
      ...this.candidate.layers
        .slice(this.layer + 1)
        .flatMap((layer: Field[]): string[] =>
          layer.flatMap((field: Field): string[] =>
            field.search(this.regex, this.unitsLimit()).fragment(context)
          )
        ),
    ];
  }

  /**
   * Filter the result. By default, all results are admitted. Override this
   * method to implement a custom filter.
   *
   * @returns True if the result should be included in the output, false
   * otherwise.
   */
  public filter(): boolean {
    return true;
  }

  /**
   * bucket returns the bucket that a given search result belongs to. This
   * should fall in the range [0, numBuckets-1].
   * Results will be sorted in the output based on the bucket that they belong
   * to.
   * By default, all results belong to one bucket. Override this method, along
   * with numBuckets, in order to provide a custom bucket sorter.
   *
   * @param _row - Table row.
   * @returns Bucket number.
   */
  public bucket(_row: HTMLTableRowElement): number {
    return 0;
  }

  /**
   * Total number of buckets for bucket sorting. By default, we have one bucket
   * that all results belong to (in other words, there is no bucket sorting).
   * Override this method in order to implement custom sorting.
   *
   * @returns Total number of buckets.
   */
  public static numBuckets(): number {
    return 1;
  }

  /**
   * @param href
   */
  private *viewForMore(href: string | undefined): Generator<Node | string> {
    yield document.createElement('br');
    const span: HTMLSpanElement = document.createElement('span');
    span.classList.add(CLS.VIEW_FOR_MORE);
    span.append('...');
    if (!href) {
      yield span;
      return;
    }

    const a: HTMLAnchorElement = document.createElement('a');
    a.textContent = 'view for full context';
    a.href = href;
    a.target = '_blank';
    span.append(a);
    yield span;
  }
}

/**
 * Compare two search results for priority.
 *
 * @param a - First result.
 * @param b - Second result.
 * @returns
 *   -1 if a < b
 *   0 if a == b
 *   1 if a > b
 */
function searchResultCompare(a: SearchResult, b: SearchResult): number {
  const ak: number[] = a.compareKey();
  const bk: number[] = b.compareKey();

  // The two arrays are guaranteed to be of equal length, but we use the minimum
  // for protectionism.
  for (let i = 0; i < ak.length && i < bk.length; ++i) {
    if (ak[i] !== bk[i]) {
      return ak[i]! - bk[i]!;
    }
  }

  return 0;
}

/**
 * Field represents a search field within a candidate. In the display, while
 * candidate occupies a table row, each field occupies a cell within that row.
 */
class Field {
  public readonly units: Unit[];
  /**
   * @param name
   * @param field
   */
  public constructor(
    public readonly name: string,
    field?: FieldRaw
  ) {
    this.units = field?.map((unit: UnitRaw): Unit => new Unit(unit)) ?? [];
  }

  /**
   * @param regex - Regex to search.
   * @param unitsLimit - Maximum number of units to display.
   * @returns Search result.
   */
  public search(regex: RegExp, unitsLimit: number): FieldSearchResult {
    return new FieldSearchResult(this, regex, unitsLimit);
  }
}

export type { FieldSearchResult };

/**
 * FieldSearchResult represents the search result of one field.
 */
class FieldSearchResult extends AggregateResult {
  protected readonly results: UnitSearchResult[];
  public readonly cropped: boolean;
  public readonly name: string;

  /**
   * @param field
   * @param regex
   * @param unitsLimit
   */
  public constructor(field: Field, regex: RegExp, unitsLimit: number) {
    super();
    this.name = field.name;
    const results = field.units.map((unit) => unit.search(regex));
    // If there are no matches, we limit the number of units in the output.
    // If there are matches:
    // - If there are only few units, we show all of them regardless of
    //   whether they have matches or not.
    // - If there are many units, we show those that have matches, even if
    //   their number exceeds the limit, because we need to show all matches.
    //   We always show the first result, because its content is usually
    //   important.
    this.results = !results.some((r) => r.match)
      ? results.slice(0, unitsLimit)
      : results.length <= unitsLimit
        ? results
        : [...results.slice(0, 1), ...results.slice(1).filter((r) => r.match)];
    this.cropped = this.results.length < results.length;
  }

  /**
   * @param colSpan
   * @returns
   */
  public cell(colSpan: number): HTMLTableCellElement {
    const td: HTMLTableCellElement = document.createElement('td');
    td.innerHTML = this.results
      .map((r: UnitSearchResult): string => r.html())
      .join(UNIT_DELIMITER);
    td.colSpan = colSpan;
    td.classList.add(this.name);
    return td;
  }
}

/**
 * Unit is a unit in a field. Fields usually consist of a single unit, but
 * humongous fields can be broken up into units. Units are searched separately;
 * and, if there are too many, won't all be included in the display during a
 * search.
 */
class Unit {
  public readonly lines: Line[];

  /**
   * @param unit
   */
  public constructor(unit: UnitRaw) {
    this.lines = unit.map((line: LineRaw) => new Line(line));
  }

  /**
   * @param regex - The regular expression to search.
   * @returns Search result.
   */
  public search(regex: RegExp): UnitSearchResult {
    return new UnitSearchResult(this, regex);
  }
}

/**
 * UnitSearchResult represents the search result of one unit.
 */
class UnitSearchResult extends AggregateResult {
  protected readonly results: LineSearchResult[];

  /**
   * @param unit - The unit to search.
   * @param regex - The regex to search.
   */
  public constructor(unit: Unit, regex: RegExp) {
    super();
    this.results = unit.lines.map((l) => l.search(regex));
  }

  /**
   * @returns The HTML content of the unit, with matches highlighted.
   */
  public html(): string {
    return this.results.map((r) => r.html).join(LINE_BREAK);
  }
}

/**
 * BoundaryType represents the boundary type of a match.
 * NOTE: The enum values are sorted such that the more significant matches have
 * lower values, to aid in sorting by priority.
 * Full-word matches come first, followed by prefix matches, then suffix
 * matches, then mid-word matches.
 * If a user searches for "ⲟⲩⲱ", the the following results should show in this
 * order:
 * - ⲟⲩⲱ
 * - ⲟⲩⲱⲓⲛⲓ
 * - ⲣⲁⲟⲩⲱ
 * - ϣⲟⲩⲱⲟⲩ
 */
enum Boundary {
  // The search query matches a full-word.
  FULL_WORD,
  // The search query matches the start of a word.
  PREFIX,
  // The search query matches the end of the word.
  SUFFIX,
  // The search query falls within a word.
  MID_WORD,
}

/**
 * Range is a half-open character range [start, end) within a line's text.
 */
interface Range {
  start: number;
  end: number;
}

/**
 *
 */
class Match {
  /**
   *
   * @param start
   * @param end
   * @param boundary
   */
  public constructor(
    public readonly start: number,
    public readonly end: number,
    public readonly boundary: Boundary
  ) {}

  /**
   *
   * @param len
   * @returns
   */
  public shift(len: number): Match {
    return new Match(this.start + len, this.end + len, this.boundary);
  }

  /**
   *
   * @param translation
   * @returns
   */
  public translate(translation: number[]): Match {
    const start: number = translation[this.start]!;
    const end: number = translation[this.end]!;
    if (start === this.start && end === this.end) {
      // Match is immutable (all fields are readonly), so it's safe to return
      // `this` directly.
      return this;
    }
    return new Match(start, end, this.boundary);
  }
}

/**
 * Line represents a line in a unit. Units are broken into lines because we
 * don't want any search queries to spill over multiple lines.
 */
class Line {
  public readonly html: string;
  public readonly text: string;

  /**
   * @param line
   */
  public constructor(line: LineRaw) {
    [this.html, this.text] = line;
    // We obtain the text by deleting all tags.
    // We also get rid of diacritics. When it comes to search, we search a
    // diacritic-free query against the diacritic-free text created here. This
    // ensures that diacritics have no effect on search results, which is
    // currently desirable (#253).
    // When it comes to highlighting, if the search step indicated that the
    // text[i:j] contains a match and needs to be highlighted, the highlighter
    // accounts for the fact that the HTML may contain diacritics that were not
    // taken into consideration when that i and j were calculated.
    //
    // This preprocessing is now performed during index construction. We can
    // readily use the `text` field, which is expected to have been obtained as
    // described above.
  }

  /**
   * @param regex - The regex to search.
   * @returns The search result.
   */
  public search(regex: RegExp): LineSearchResult {
    return new LineSearchResult(this, regex);
  }

  /**
   * Search the text of this line for this regex.
   * NOTE: As of the time of writing, this is (unsurprisingly) one of Xooxle's
   * most expensive operations. Much of the search time is spent performing
   * regex search.
   *
   * @param regex - The regex to search.
   * @returns A list of matches.
   */
  public matches(regex: RegExp): Match[] {
    // Collect raw match ranges, merging contiguous ones.
    const ranges: Range[] = [];
    for (const match of this.text.matchAll(regex)) {
      // NOTE: We need to filter out the empty string, because it could cause
      // trouble during highlighting.
      if (!match[0]) {
        continue;
      }

      const cur: Range = {
        start: match.index,
        end: match.index + match[0].length,
      };

      const last: Range | undefined = ranges[ranges.length - 1];
      if (last?.end === cur.start) {
        last.end = cur.end;
      } else {
        ranges.push(cur);
      }
    }

    return ranges.map(({ start, end }: Range): Match => {
      const before = !orth.isWordChar(this.text[start - 1]);
      const after = !orth.isWordChar(this.text[end]);
      const boundary: Boundary =
        before && after
          ? Boundary.FULL_WORD
          : before
            ? Boundary.PREFIX
            : after
              ? Boundary.SUFFIX
              : Boundary.MID_WORD;
      return new Match(start, end, boundary);
    });
  }
}

/**
 * LineSearchResult represents the search result of one line.
 */
class LineSearchResult implements Result {
  public readonly matches: Match[];

  /**
   *
   * @param line - The line to search.
   * @param regex - The regex to search.
   */
  public constructor(
    private readonly line: Line,
    regex: RegExp
  ) {
    this.matches = line.matches(regex);
  }

  /**
   * @returns
   */
  public get text(): string {
    return this.line.text;
  }

  /**
   * @returns The text length, without touching the underlying string.
   */
  public get textLength(): number {
    return this.line.text.length;
  }

  /**
   *
   * @returns The HTML content of the line.
   */
  public get html(): string {
    return this.line.html;
  }

  /**
   * @returns
   */
  public get match(): boolean {
    return !!this.matches.length;
  }

  /**
   * @param context
   * @returns
   */
  public fragment(context: number): string[] {
    // Expand each match to full words, merging overlapping ranges as we go.
    // Word expansion can make the ranges of distinct matches overlap (for
    // example, two matches that fall within the same word), and we want a
    // single fragment to cover each merged span rather than emitting redundant,
    // overlapping fragments. The matches are sorted ascending, so the ranges
    // are too, and a linear merge suffices.
    const ranges: Range[] = [];
    for (const match of this.matches) {
      const range: Range = this.range(match);
      const last = ranges[ranges.length - 1];
      if (last && range.start <= last.end) {
        last.end = Math.max(last.end, range.end);
      } else {
        ranges.push(range);
      }
    }

    return ranges.map(({ start, end }: Range): string =>
      browser.fragment(
        this.text.substring(start, end),
        this.text.substring(this.traverseContext(start, context, -1), start),
        this.text.substring(end, this.traverseContext(end, context, 1))
      )
    );
  }

  /**
   * @param match
   * @returns
   */
  private range(match: Match): Range {
    const range: Range = {
      start: this.scan(match.start, -1, orth.isWordCharForFragments),
      end: this.scan(match.end, 1, orth.isWordCharForFragments),
    };

    // See https://issues.chromium.org/u/1/issues/527930352
    // Extend a fragment's end forward off a boundary that Chromium can't
    // anchor.
    //
    // Chromium silently drops a text fragment whose `textStart` ends on a
    // spacing diacritic presentation form such as U+FE76 (see
    // `orth.isSpacingDiacritic`): its word-boundary check won't place a
    // boundary next to one. Word expansion happily produces such an edge for
    // a token like `ﻣﹶ` (whose final character is the isolated fatha), so
    // here we absorb the following word(s) until the final character is a
    // normal word character — `ﻣﹶ` becomes `ﻣﹶ بحري`, which Chromium
    // highlights. If no following word exists (end of line) we leave the
    // range unchanged, as a best effort.
    //
    // This is a Chromium-only quirk; other engines anchor `ﻣﹶ` correctly, so
    // we skip the adjustment there and keep the tighter highlight.
    //
    // There is deliberately no symmetric `anchorStart`. The rejection is
    // asymmetric: Chromium refuses a boundary *after* a base-attached
    // diacritic but accepts one *before* a diacritic, so a `textStart` that
    // begins with one still matches. Word expansion can only rest `start` on
    // a diacritic that a non-word char precedes (an "orphan" not attached to
    // a base letter), which is exactly the leading position Chromium
    // tolerates — so the start never needs adjusting.
    //
    // NOTE: our search text is NFD-normalized with combining marks stripped,
    // so precomposed letters (e.g. "é" → "e") never reach this check; the
    // only survivors whose NFKD form re-introduces a combining mark — and
    // hence the only characters `orth.isSpacingDiacritic` can match here — are
    // these compatibility spacing forms.
    if (browser.chromium()) {
      while (
        range.end < this.text.length &&
        orth.isSpacingDiacritic(this.text[range.end - 1]!)
      ) {
        range.end = this.traverseContext(range.end, 1, 1);
      }
    }

    return range;
  }

  /**
   * moves an index in a specific direction (step) as long as the
   * predicate returns true for the current character.
   * @param idx
   * @param step
   * @param predicate
   * @returns
   */
  private scan(
    idx: number,
    step: number,
    predicate: (char: string) => boolean
  ): number {
    // When moving left (-1), we look at the character before the cursor
    // (idx - 1).
    // When moving right (1), we look at the character at the cursor (idx).
    if (step < 0) {
      --idx;
    }

    while (idx >= 0 && idx < this.text.length && predicate(this.text[idx]!)) {
      idx += step;
    }

    // Restore the delta.
    if (step < 0) {
      ++idx;
    }
    return idx;
  }

  /**
   * Repeats the "Skip Separators -> Consume Word" logic 'count' times.
   * @param idx
   * @param count
   * @param step
   * @returns
   */
  private traverseContext(idx: number, count: number, step: number): number {
    while (count--) {
      // 1. Skip whitespace / delimiters.
      idx = this.scan(idx, step, (c) => !orth.isWordCharForFragments(c));
      // 2. Consume the word.
      idx = this.scan(idx, step, orth.isWordCharForFragments);
    }
    return idx;
  }

  /**
   * @returns
   */
  public distance(): number {
    return this.matches[0]?.start ?? Number.MAX_SAFE_INTEGER;
  }

  /**
   * @returns The boundary type.
   */
  public boundary(): Boundary {
    return AggregateResult.boundary(...this.matches.map((m) => m.boundary));
  }
}

type LineRaw = [string, string];
type UnitRaw = LineRaw[];
type FieldRaw = UnitRaw[];
interface CandidateRaw {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  KEY: string;
  [fieldName: string]: string | FieldRaw;
}

/**
 * XooxleRaw represents the JSON structure of a Xooxle index.
 */
export interface XooxleRaw {
  readonly data: CandidateRaw[];
  readonly metadata: {
    /** layers is the list of layers in the output.
     * A layer consists of a list of field names.
     * For each search result from the data, layers will be searched until one
     * layer yields a match.
     * A row will be added to the table for the first matching layer, if any.
     * The first cell in the row will contain the index of the result, and
     * potentially the HREF to the result page. The following cells will contain
     * other fields from the layer, in the order given in this field.
     */
    readonly layers: string[][];
  };
}

/**
 * Xooxle search engine
 */
export class Xooxle {
  /**
   * The list of searchable candidates in this Xooxle index.
   */
  private readonly candidates: Candidate[];

  /**
   * A setTimeout object, used to debounce search triggers.
   */
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * An abort controller, used to abort ongoing searches whenever a new search
   * starts.
   */
  private currentAbortController: AbortController | null = null;

  /**
   * currentPage is the current page number in the search results.
   */
  private currentPage = 0;

  /**
   * pagination renders the navigation bar. Navigating re-runs the search for
   * the target page and scrolls the scroll target into view.
   */
  private readonly pagination: pagination.Pagination;

  /**
   * @param index - JSON index object.
   * @param form - Form containing HTML input and output elements.
   * @param searchResultType
   */
  public constructor(
    index: XooxleRaw,
    private readonly form: Form,
    private readonly searchResultType: typeof SearchResult = SearchResult
  ) {
    this.candidates = index.data.map(
      (record) => new Candidate(record, index.metadata.layers)
    );
    this.pagination = new pagination.Pagination(
      this.form.paginationContainer,
      PER_PAGE,
      (page: number): void => {
        this.currentPage = page;
        void this.searchAux();
        this.form.scrollTarget.scrollIntoView({ block: 'start' });
      }
    );
    this.addEventListeners();

    dev.play(() => {
      index.metadata.layers.forEach((layer: string[]): void => {
        // The number of columns must be divisible by the number of fields in a
        // layer. This way, all fields will have the same colspan. For example,
        // with 6 columns and 3 fields, each field will have a colspan of 2.
        log.ensure(
          this.numColumns % layer.length === 0,
          'One of the layers has',
          layer.length,
          'fields, which is not a divisor of the number of columns in the table:',
          this.numColumns
        );
      });
    });
  }

  /**
   * @returns
   */
  private get numColumns(): number {
    // Account for the `view` column.
    return this.form.numColumns - 1;
  }

  /**
   * Wire the listeners owned by this `Xooxle`. Search-box input is owned
   * by `docs/crum/query.ts`, which calls `Xooxle.search()` on every
   * keystroke; this method only wires the checkbox click handlers.
   */
  private addEventListeners(): void {
    // Checkbox clicks re-run search synchronously. They fire as singletons,
    // so no debounce is needed.
    this.form.addCheckboxClickListener(this.search.bind(this, 0));
  }

  /**
   * Handle the search query, debouncing with the given timeout.
   *
   * @param timeout - How long to wait before starting search.
   */
  public search(timeout = INPUT_DEBOUNCE_TIMEOUT): void {
    this.currentPage = 0;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      // Call the async function after the timeout.
      // Use void to ignore the returned promise.
      void this.searchAux();
    }, timeout);
  }

  /**
   * Handle the search query, aborting any ongoing search.
   */
  private async searchAux(): Promise<void> {
    // Announce that a new search is starting.
    document.dispatchEvent(new Event(EVENT));

    // If there is an ongoing search, abort it.
    this.currentAbortController?.abort();
    const abortController: AbortController = new AbortController();
    this.currentAbortController = abortController;

    // Clear output fields in the form, since we're starting a new search.
    this.form.clearOutputFields();

    try {
      const regex: RegExp | undefined = this.form.regex();
      if (!regex) {
        return;
      }
      await this.searchAuxAux(regex, abortController);
    } catch (err) {
      if (err instanceof SyntaxError) {
        this.form.message('Invalid regular expression!');
      } else {
        log.error(err);
        this.form.message('Internal error! Please file a report!');
      }
    }
  }

  /**
   * @returns
   */
  private bucketSentinels(): HTMLTableRowElement[] {
    // Create a two-D array, where the first dimension is the layer, and the
    // second is the bucket.
    return Array.from({ length: this.searchResultType.numBuckets() }, () => {
      const tr: HTMLTableRowElement = document.createElement('tr');
      tr.style.display = 'none';
      this.form.result(tr);
      return tr;
    });
  }

  /**
   * @param regex
   * @returns
   */
  private results(regex: RegExp): SearchResult[] {
    return (
      this.candidates
        .flatMap((can: Candidate): SearchResult[] => {
          for (const idx of can.layers.keys()) {
            const result = new this.searchResultType(can, regex, idx);
            if (result.match && result.filter()) {
              // This layer has a match. Return a result representing this
              // layer.
              return [result];
            }
          }
          // None of the layers has a match. Return no results.
          return [];
        })
        // Besides bucket sorting, we can perform some generic sorting at this
        // step.
        .sort(searchResultCompare)
    );
  }

  /**
   * Search candidates for the given regex, adding results to display, and
   * aborting if an abort signal is received.
   *
   * @param regex - Regex to search.
   * @param abortController - Abort controller for this search.
   */
  private async searchAuxAux(
    regex: RegExp,
    abortController: AbortController
  ): Promise<void> {
    // Search is a cheap operation that we can afford to do on all candidates in
    // the beginning.
    const results: SearchResult[] = this.results(regex);

    // NOTE: Pagination limits the power of bucket sorting. Bucket sorting
    // (see the longer note below) only reorders results *within* the slice
    // that is rendered on the current page — it cannot pull a result out of a
    // later page into an earlier one. So a candidate that would belong to a
    // high-priority bucket but falls on, say, page 3 after generic sorting
    // stays on page 3: the user sees lower-priority bucket matches on page 1
    // even though better matches exist further down. In the pre-pagination
    // world, bucket sorting operated on the entire result set and could
    // freely promote any result to the top; with pagination it can only
    // shuffle results inside a single page.
    const start = this.currentPage * PER_PAGE;
    const end = start + PER_PAGE;
    const pageResults = results.slice(start, end);

    // bucketSentinels is a set of hidden table rows that represent sentinels
    // (anchors / break points) in the results table.
    //
    // The sentinels are used to divide the table into buckets.
    // Matching results will be added right on top of the sentinels, so that
    // each sentinel represents the (hidden) bottom row of a section.
    //
    // This allows us to achieve some form of result sorting, without actually
    // having to retrieve all results, sort them, and then render them. We can
    // start showing results immediately after one match, thus maintaining
    // Xooxle's high responsiveness and speed.
    //
    // We also insert rows in the table, without displacing or recreating the
    // other rows, thus reducing jitter.
    // We use the sentinels as bottoms for the sections, rather than tops,
    // because we want results to expand downwards rather than upwards, to
    // avoid jitter at the top of the table, which is the area that the user
    // would be looking at.
    //
    // NOTE: There are two phases of sorting – generic sorting, and bucket
    // sorting:
    // 1. Generic sorting applies to all Xooxle instances, and can be performed
    //    on any search result object. It doesn't require parsing the result's
    //    internal HTML, thus it's cheap and quick, and we can afford to perform
    //    it on all candidates early on.
    // 2. Bucket sorting uses the DOM object constructed from the result's
    //    internal HTML, which makes it quite expensive to perform, so we do it
    //    on small batches of results because we can't sort all candidates at
    //    the very beginning.
    //    As of the time of writing, a default bucket sorter groups all results
    //    into the same bucket, but individual Xooxle instances can override the
    //    behavior and provide their custom bucket sorters.
    // In the final result display, bucket sorting will have priority over
    // generic sorting. In other words, results get grouped into buckets by the
    // bucket sorter. Within each bucket, the results will be sorted by the
    // generic sorter.
    const bucketSentinels: HTMLTableRowElement[] = this.bucketSentinels();

    // NOTE: We considered using an IntersectionObserver, since some search
    // results are huge. But we dismissed it because we aren't interested in
    // that particular use case. Most users would be looking up a single word.
    for (const [count, result] of pageResults.entries()) {
      if (abortController.signal.aborted) {
        return;
      }

      try {
        // Create a new row for the table
        // NOTE: Creating the row DOM (which involves parsing plain HTML) is a
        // somewhat expensive operation, so we can't afford to do it for all
        // candidates before updating display.
        // Instead, we create a number of rows, and then yield to the browser to
        // allow display update.
        const row: HTMLTableRowElement = result.row(
          results.length,
          this.numColumns
        );

        bucketSentinels[result.bucket(row)]!.insertAdjacentElement(
          'beforebegin',
          row
        );
      } catch (err) {
        log.error('While processing', result.key, 'encountered error:', err);
        this.form.message(
          `Error processing ${result.key}! Please file a report!`
        );
      }

      if (count % RESULTS_TO_UPDATE_DISPLAY === RESULTS_TO_UPDATE_DISPLAY - 1) {
        // Allow the browser to update the display, receive user input, ...
        await browser.yieldToBrowser();
      }
    }

    this.pagination.render(this.currentPage, results.length);

    // Update the numbers in the view cell.
    // We couldn't have put the numbers there in the beginning, because, due to
    // bucket sorting, we couldn't know for sure where each result is going to
    // end up.
    let i = start;
    this.form.resultsTBody
      .querySelectorAll(`.${CLS.COUNTER}`)
      .forEach((counter: Element) => {
        counter.textContent = `${(++i).toString()} / ${results.length.toString()}`;
      });
  }
}
