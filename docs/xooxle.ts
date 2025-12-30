/** Package xooxle defines the Xooxle engine core logic. */
/* eslint-disable max-lines */
import * as browser from './browser.js';
import * as log from './logger.js';
import * as orth from './orth.js';
import * as cls from './cls.js';
import * as str from './str.js';
import * as drop from './dropdown.js';
import * as dev from './dev.js';

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
const INPUT_DEBOUNCE_TIMEOUT = 100;

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
 * UNIT_DELIMITER is the string that separates a units field into units.
 */
const UNIT_DELIMITER = `<hr class="${CLS.MATCH_SEPARATOR}">`;

/**
 * FormParams stores Form parameters.
 */
export interface FormParams {
  searchBoxID: string;
  fullWordCheckboxID: string;
  regexCheckboxID: string;
  messageBoxID: string;
  resultsTableID: string;
  formID?: string;
  boxes?: [string, string][] | undefined;
}

/**
 * _Param defines the form query parameters.
 */
enum Param {
  QUERY = 'query',
  FULL = 'full',
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
  private readonly searchBox: HTMLInputElement;

  private readonly fullWordCheckbox: Checkbox;
  private readonly regexCheckbox: Checkbox;
  private readonly otherCheckBoxes: Checkbox[];

  // Output fields:
  private readonly messageBox: HTMLElement;
  private readonly tbody: HTMLTableSectionElement;
  public readonly numColumns: number;
  private readonly form?: HTMLFormElement;

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

    this.regexCheckbox = {
      box: document.getElementById(form.regexCheckboxID) as HTMLInputElement,
      param: Param.REGEX,
    };

    this.messageBox = document.getElementById(form.messageBoxID)!;

    const table: HTMLTableElement = document.getElementById(
      form.resultsTableID
    ) as HTMLTableElement;
    this.tbody = table.querySelector('tbody')!;
    this.numColumns = table
      .querySelector('thead')!
      .querySelectorAll('td').length;

    if (form.formID) {
      this.form = document.getElementById(form.formID) as HTMLFormElement;
    }

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
    return [this.fullWordCheckbox, this.regexCheckbox, ...this.otherCheckBoxes];
  }

  /**
   * Add event listeners to update query parameters from the form fields.
   */
  private addEventListeners(): void {
    this.searchBox.addEventListener('input', () => {
      browser.setParam(Param.QUERY, this.searchBox.value);
    });

    this.checkboxes.forEach((box: Checkbox): void => {
      box.box.addEventListener('click', () => {
        browser.setParam(box.param, box.box.checked);
      });
    });

    // Prevent form submission. Otherwise, pressing Enter while the search box
    // is focused could clear all input fields!
    this.form?.addEventListener('submit', browser.preventDefault);
  }

  /**
   * Populate form fields from query parameters in the URL.
   */
  private populateFromParams(): void {
    // Populate form values using query parameters.
    const url = new URL(window.location.href);
    const query: string | null = url.searchParams.get(Param.QUERY);
    if (query) {
      this.searchBox.value = query;
    }
    // Boolean parameters are either true, or absent from the URL.
    this.checkboxes.forEach((box: Checkbox): void => {
      if (url.searchParams.get(box.param)) {
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
   * Focus on the search box.
   */
  public focus(): void {
    this.searchBox.focus();
  }

  /**
   * Add a search box input listener.
   * @param listener
   */
  public addSearchBoxInputListener(listener: () => void): void {
    this.searchBox.addEventListener('input', listener);
  }

  /**
   * @param listener
   */
  public addSearchBoxKeyListener(listener: (event: Event) => void): void {
    this.searchBox.addEventListener('keyup', listener);
    this.searchBox.addEventListener('keydown', listener);
    this.searchBox.addEventListener('keypress', listener);
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
  public queryExpression(): string {
    let query: string = orth.cleanDiacritics(this.searchBox.value);
    if (!query) {
      return '';
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

    return query;
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
    this.messageBox.replaceChildren(el);
  }

  /**
   * Clear output fields.
   */
  public clearOutputFields(): void {
    this.tbody.replaceChildren();
    this.messageBox.replaceChildren();
  }
}

interface Result {
  text: string;
  matches: Match[];
  boundary(): Boundary;
  match: boolean;
  fragmentWord(): string | undefined;
  distance(): number;
}

/**
 * Aggregate search results.
 */
abstract class AggregateResult implements Result {
  protected abstract readonly results: Result[];

  // Memos are used to memorize previously computed values, so we can avoid
  // computing them repeatedly.
  // TODO: (#605) Stop memorizing text.
  private textMemo: string | null = null;
  private matchesMemo: Match[] | null = null;

  /**
   * @returns
   */
  public get text(): string {
    return (this.textMemo ??= this.results.map((r) => r.text).join(''));
  }

  /**
   * @returns
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
      precedingTextLength += r.text.length;
    });
    return matches;
  }

  /**
   * @returns The boundary type.
   */
  public boundary(): Boundary {
    // The Boundary enum values are ordered in such a way that the boundary
    // type of an aggregated result is the minimum of the boundary types of all
    // results.
    return Math.min(...this.results.map((r: Result) => r.boundary()));
  }

  /**
   * @returns Whether this result has a match.
   */
  public get match(): boolean {
    // We have a match if any of the results has a match.
    return this.results.some((r: Result) => r.match);
  }

  /**
   * @returns
   */
  public fragmentWord(): string | undefined {
    return this.results.find((r: Result) => r.match)?.fragmentWord();
  }

  /**
   * @returns Minimum distance from the beginning of line to a match.
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
            new Field(record[field] as FieldRaw | undefined)
        )
    );
  }
}

/**
 * SearchResult represents the search result of one candidate from the index.
 */
export class SearchResult extends AggregateResult {
  protected readonly results: FieldSearchResult[];

  /**
   * @param key
   * @param fields
   * @param regex
   * @param layer
   */
  public constructor(
    public readonly key: string,
    fields: Field[],
    regex: RegExp,
    public readonly layer: number
  ) {
    super();
    this.results = fields.map((f: Field): FieldSearchResult => f.search(regex));
  }

  /**
   * viewCell constructs the first cell in the row for this result, bearing the
   * anchor to the result (if available).
   *
   * @param total - Total number of results.
   * @returns The view table cell element.
   */
  private viewCell(total: number): HTMLTableCellElement {
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

    const href: string | undefined = this.href();
    if (!href) {
      return td;
    }

    // Clicking anywhere on the cell opens the page.
    td.addEventListener('click', browser.open.bind(browser, href, true));

    const view: HTMLAnchorElement = document.createElement('a');
    view.classList.add(cls.LINK, CLS.VIEW_VIEW);
    view.textContent = 'view';
    td.prepend(view);

    return td;
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
      const text: string = orth.cleanDiacritics(drop.noTipTextContent(row));
      log.ensure(
        text === this.text,
        'Text content has changed! Original:',
        this.text,
        'Final:',
        text
      );
    });

    // We refrain from adding any extra content, such as the view-for-more
    // message or the view cell, until enrichment and highlighting have been
    // done.
    if (this.results.some((r) => r.cropped)) {
      cells[cells.length - 1]?.append(...this.viewForMore(this.href()));
    }
    row.prepend(this.viewCell(total));
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
      (node: Node): number => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return (node as Element).matches(`.${drop.CLS.DROPPABLE}`)
            ? // This is a tooltip, added by the enricher, and irrelevant for
              // highlighting. Skip the whole subtree.
              NodeFilter.FILTER_REJECT
            : // Otherwise, skip this node, but proceed to process its children.
              NodeFilter.FILTER_SKIP;
        }
        // This is a text node.
        return NodeFilter.FILTER_ACCEPT;
      }
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
    const translation: orth.Translation = orth.translation(
      drop.noTipTextContent(row)
    );

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
   * Construct a key used to compare search results.
   *
   * TODO: (#0) This heuristic was conceived by experimentation. Its optimality
   * is unproven, and we should perhaps revisit it.
   *
   * @returns the comparison key.
   */
  public compareKey(): number[] {
    const boundary: Boundary = this.boundary();
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
      this.results.findIndex((res) => res.boundary() === this.boundary()),
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
   *
   * @returns
   */
  private href(): string | undefined {
    const link: string | undefined = this.link();
    if (!link) {
      return undefined;
    }
    // The dash requires special handling, because it doesn't get encoded by
    // default, and it needs to be encoded in order for text fragments to work
    // correctly. See #574.
    return `${link}#:~:text=${encodeURIComponent(this.fragmentWord()!).replace('-', '%2D')}`;
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
  const aKey: number[] = a.compareKey();
  const bKey: number[] = b.compareKey();

  // The two arrays are guaranteed to be of equal length, but we use the minimum
  // for protectionism.
  const len: number = Math.min(aKey.length, bKey.length);
  for (let i = 0; i < len; ++i) {
    const diff = aKey[i]! - bKey[i]!;
    if (diff !== 0) {
      return Math.sign(diff);
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
   * @param field
   */
  public constructor(field?: FieldRaw) {
    this.units = field?.map((unit: UnitRaw): Unit => new Unit(unit)) ?? [];
  }

  /**
   * @param regex - Regex to search.
   * @returns Search result.
   */
  public search(regex: RegExp): FieldSearchResult {
    return new FieldSearchResult(this, regex);
  }
}

/**
 * FieldSearchResult represents the search result of one field.
 */
class FieldSearchResult extends AggregateResult {
  protected readonly results: UnitSearchResult[];
  public readonly cropped: boolean;

  /**
   * @param field
   * @param regex
   */
  public constructor(field: Field, regex: RegExp) {
    super();
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
      ? results.slice(0, UNITS_LIMIT)
      : results.length <= UNITS_LIMIT
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
    // The unit was split into lines using LINE_BREAK as a delimiter, so we
    // rebuild it using LINE_BREAK.
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
    if (orth.idempotent(translation)) {
      // No translation is needed!
      return structuredClone(this);
    }
    return new Match(
      translation[this.start]!,
      translation[this.end]!,
      this.boundary
    );
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
    return Array.from(this.text.matchAll(regex))
      .map((match: RegExpMatchArray): Match | undefined => {
        // NOTE: We need to filter out the empty string, because it could cause
        // trouble during highlighting.
        if (match.index === undefined || !match[0]) {
          return undefined;
        }

        const start: number = match.index;
        const end: number = match.index + match[0].length;

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
      })
      .filter((m) => m !== undefined);
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
   * @returns
   */
  public fragmentWord(): string | undefined {
    /* Expand the match left and right such that it contains full words, for
     * text fragment purposes.
     * See
     * https://developer.mozilla.org/en-US/docs/Web/URI/Fragment/Text_fragments
     * for information about text fragments.
     * Notice that browsers don't treat them uniformly, and we try to obtain a
     * match that will work on most browsers.
     * */
    const match = this.matches[0];
    if (!match) {
      // This line doesn't have a match.
      return undefined;
    }

    let start = match.start;
    let end = match.end;

    // Expand left: Move the start index left until a word boundary is found.
    while (orth.isWordCharInChrome(this.text[start - 1])) {
      start--;
    }

    // Expand right: Move the end index right until a word boundary is found.
    while (orth.isWordCharInChrome(this.text[end])) {
      end++;
    }

    // Return the expanded substring.
    return this.text.substring(start, end);
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
    return Math.min(...this.matches.map((m) => m.boundary));
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
    this.addEventListeners();

    // Handle the search query once upon loading, in case the form picked up a
    // query from the URL parameters.
    this.search();

    // Focus on the form, so the user can search right away.
    this.form.focus();

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
   */
  private addEventListeners(): void {
    // Make the page responsive to user input.
    // We need debounce timeout for search box input, because users typically
    // type several letters consecutively.
    // We don't need to do the same for checkbox events, because those events
    // typically trigger as singletons.
    this.form.addSearchBoxInputListener(
      this.search.bind(this, INPUT_DEBOUNCE_TIMEOUT)
    );
    this.form.addCheckboxClickListener(this.search.bind(this));
    // Prevent other elements in the page from picking up key events on the
    // search box.
    this.form.addSearchBoxKeyListener(browser.stopPropagation);
  }

  /**
   * Handle the search query, debouncing with the given timeout.
   *
   * @param timeout - How long to wait before starting search.
   */
  public search(timeout = 0): void {
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
    // If there is an ongoing search, abort it.
    this.currentAbortController?.abort();
    const abortController: AbortController = new AbortController();
    this.currentAbortController = abortController;

    // Clear output fields in the form, since we're starting a new search.
    this.form.clearOutputFields();

    // Construct the query expression.
    const expression: string = this.form.queryExpression();
    if (!expression) {
      return;
    }

    // TODO: (#605) Consider passing searchAuxAux to a Web Worker to improve
    // performance.
    try {
      const regex = new RegExp(
        expression,
        'iug' // Case-insensitive, Unicode-aware, and global.
      );
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
          for (const [idx, layer] of can.layers.entries()) {
            const result = new this.searchResultType(
              can.key,
              layer,
              regex,
              idx
            );
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

    // Search is a cheap operation that we can afford to do on all candidates in
    // the beginning.
    const results: SearchResult[] = this.results(regex);

    // NOTE: We considered using an IntersectionObserver, since some search
    // results are huge. But we dismissed it because we aren't interested in
    // that particular use case. Most users would be looking up a single word.
    for (const [count, result] of results.entries()) {
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

    // Update the numbers in the view cell.
    // We couldn't have put the numbers there in the beginning, because, due to
    // bucket sorting, we couldn't know for sure where each result is going to
    // end up.
    let i = 0;
    this.form.resultsTBody
      .querySelectorAll(`.${CLS.COUNTER}`)
      .forEach((counter: Element) => {
        counter.textContent = `${(++i).toString()} / ${results.length.toString()}`;
      });
  }
}
