import * as collapse from './collapse.js';
import * as browser from './browser.js';
import * as logger from './logger.js';
import * as orth from './orth.js';
import * as coptic from './coptic.js';
import * as greek from './greek.js';

// KEY is the name of the field that bears the word key. The key can be used to
// generate an HREF to open the word page.
const KEY = 'KEY';

/**
 * UNIT_LIMIT determines the behavior of the fields that should be split into
 * units.
 * If the number of units in a field is at most UNIT_LIMIT, the field will
 * always be produced whole.
 * Otherwise:
 * - If there are units with matches, matching units will be produced
 *   (regardless of their number).
 * - If there are no units with matches, the first UNIT_LIMIT units will be
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

const TAG_REGEX = /<\/?[^>]+>/g;

/**
 * CLS is a name space for classes used in the file. It helps pinpoint them and
 * group them in one place, in case this information is needed when writing CSS
 * or other modules.
 */
export const enum CLS {
  // VIEW is the class of the view table cells.
  VIEW = 'view',
  // ERROR is the class of the error message.
  ERROR = 'error',
  // COUNTER is the class of the result counters in the view cells.
  COUNTER = 'counter',
  DEV = 'dev',
  NO_DEV = 'no-dev',
  // MATCH is the class of text matching a given search query.
  MATCH = 'match',
  // VIEW_FOR_MORE is the class of the message "view for more", displayed in
  // large fields that have been cropped.
  VIEW_FOR_MORE = 'view-for-more',
  MATCH_SEPARATOR = 'match-separator',
}

/**
 * UNIT_DELIMITER is the string that separates a units field into units.
 * TODO: (#0) This is not a clean way to separate units! The index building
 * pipeline should export an index with the units already separated, and the
 * Xooxle engine should read it as such.
 */
const UNIT_DELIMITER = `<hr class="${CLS.MATCH_SEPARATOR}">`;

/**
 * LONG_UNITS_FIELD_MESSAGE is the message shown at the end of a units field,
 * if the field gets truncated.
 */
const LONG_UNITS_FIELD_MESSAGE = `<br><span class="${CLS.VIEW_FOR_MORE}">... (<em>view</em> for full context)</span>`;

const orthographer: orth.Orthographer = new orth.Orthographer(
  new Set<string>([...coptic.DIACRITICS, ...greek.DIACRITICS])
);

/**
 * _Form stores Form parameters.
 */
export interface _Form {
  searchBoxID: string;
  fullWordCheckboxID: string;
  regexCheckboxID: string;
  messageBoxID: string;
  resultsTableID: string;
  collapsibleID: string;
}

/**
 * _Param defines the form query parameters.
 */
enum _Param {
  QUERY = 'query',
  FULL = 'full',
  REGEX = 'regex',
}

/**
 * Form represents a search form containing the HTML elements that the user
 * interacts with to initiate and control search.
 */
export class Form {
  // Input fields:
  private readonly searchBox: HTMLInputElement;
  private readonly fullWordCheckbox: HTMLInputElement;
  private readonly regexCheckbox: HTMLInputElement;
  // Output fields:
  private readonly messageBox: HTMLElement;
  private readonly tbody: HTMLTableSectionElement;
  private readonly collapsible: collapse.Collapsible;

  /**
   * Construct the form object.
   * Populate form elements from query parameters.
   * Add listeners to populate query parameters whenever form elements are
   * updated.
   *
   * @param form - Form parameters.
   */
  constructor(form: _Form) {
    this.searchBox = document.getElementById(
      form.searchBoxID
    ) as HTMLInputElement;

    this.fullWordCheckbox = document.getElementById(
      form.fullWordCheckboxID
    ) as HTMLInputElement;

    this.regexCheckbox = document.getElementById(
      form.regexCheckboxID
    ) as HTMLInputElement;

    this.messageBox = document.getElementById(form.messageBoxID)!;

    this.tbody = document
      .getElementById(form.resultsTableID)!
      .querySelector('tbody')!;

    this.collapsible = new collapse.Collapsible(
      document.getElementById(form.collapsibleID)!
    );

    // Populate the form once from the query parameters.
    this.populateFromParams();

    // Add event listeners to update query parameters from the form fields.
    this.searchBox.addEventListener('input', () => {
      this.populateParams(_Param.QUERY, this.searchBox.value);
    });

    this.fullWordCheckbox.addEventListener('click', () => {
      this.populateParams(_Param.FULL, this.fullWordCheckbox.checked);
    });

    this.regexCheckbox.addEventListener('click', () => {
      this.populateParams(_Param.REGEX, this.regexCheckbox.checked);
    });
  }

  /**
   * Populate form fields from query parameters in the URL.
   */
  private populateFromParams() {
    // Populate form values using query parameters.
    const url = new URL(window.location.href);
    this.searchBox.value = url.searchParams.get(_Param.QUERY) ?? '';
    this.fullWordCheckbox.checked =
      url.searchParams.get(_Param.FULL) === 'true';
    this.regexCheckbox.checked = url.searchParams.get(_Param.REGEX) === 'true';
  }

  /**
   * Update the given URL parameter.
   *
   * @param name
   * @param value
   */
  private populateParams(name: _Param, value: string | boolean) {
    const url = new URL(window.location.href);
    if (!value) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, String(value));
    }
    window.history.replaceState('', '', url.toString());
  }

  /**
   * @returns The <tbody> element holding the results.
   */
  get resultsTBody() {
    return this.tbody;
  }

  /**
   * Focus on the search box.
   */
  focus() {
    this.searchBox.focus();
  }

  /**
   * Add a search box input listener.
   * @param listener
   */
  addSearchBoxInputListener(listener: () => void) {
    this.searchBox.addEventListener('input', listener);
  }

  /**
   * @param listener
   */
  addCheckboxClickListener(listener: () => void) {
    this.fullWordCheckbox.addEventListener('click', listener);
    this.regexCheckbox.addEventListener('click', listener);
  }

  /**
   * @returns The query expression, constructed from the input fields.
   */
  queryExpression(): string {
    let query: string = orthographer.cleanDiacritics(
      orth.normalize(this.searchBox.value)
    );
    if (!query) {
      return '';
    }

    if (!this.regexCheckbox.checked) {
      // Escape all the special characters in the string, in order to search
      // for raw matches.
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    if (this.fullWordCheckbox.checked) {
      // Using Unicode-aware word boundaries: `\b` doesn't work for non-ASCII
      // so we use `\p{L}` (letter) and `\p{N}` (number) to match words in any
      // Unicode script.
      query = `(?<=^|[^\\p{L}\\p{N}])(${query})(?=$|[^\\p{L}\\p{N}])`;
    }

    return query;
  }

  /**
   * Append a row to the results table.
   *
   * @param row - The row to append.
   */
  result(row: HTMLTableRowElement): void {
    this.tbody.append(row);
  }

  /**
   * Update the height of the collapsible element.
   * The collapsible element is height-restricted. We need to regularly update
   * its height whenever new content is added.
   *
   * NOTE: This is an expensive operation. Don't perform it repeatedly in
   * time-sensitive applications.
   */
  expand(): void {
    this.collapsible.updateHeight();
  }

  /**
   * Show the given message in the form's message field.
   *
   * @param message
   */
  message(message: string): void {
    const el = document.createElement('div');
    el.classList.add(CLS.ERROR);
    el.textContent = message;
    this.messageBox.replaceChildren(el);
  }

  /**
   * Clear output fields.
   */
  clearOutputFields(): void {
    this.tbody.replaceChildren();
    this.messageBox.replaceChildren();
  }
}

/**
 * Aggregate search results.
 */
abstract class AggregateResult {
  protected abstract readonly results: AggregateResult[];
  // Memos are used to memorize previously computed values, so we can avoid
  // computing them repeatedly.
  private matchMemo: boolean | null = null;
  private boundaryTypeMemo: BoundaryType | null = null;
  private fragmentWordMemo: string | undefined | null = null;

  /**
   * @returns The boundary type.
   */
  boundaryType(): BoundaryType {
    // The BoundaryType enum is implemented in such a way that the boundary type
    // of an aggregated result is the minimum of the boundary types of all
    // results.
    return (this.boundaryTypeMemo ??= Math.min(
      ...this.results.map((r) => r.boundaryType())
    ));
  }

  /**
   * @returns The fragment word.
   */
  fragmentWord(): string | undefined {
    // We simply return the fragment of the first result that possesses one.
    return (this.fragmentWordMemo ??= this.results
      .find((r) => r.fragmentWord())
      ?.fragmentWord());
  }

  /**
   * @returns Whether this result has a match.
   */
  get match(): boolean {
    // We have a match if any of the results has a match.
    return (this.matchMemo ??= this.results.some((r) => r.match));
  }
}

/**
 * Candidate represents one search candidate from the index. In the results
 * display, each candidate occupies its own row.
 */
class Candidate {
  // key bears the candidate key.
  readonly key: string;
  // fields bears the candidate's searchable fields.
  readonly fields: Field[];

  /**
   * @param record - The candidate data.
   * @param fields - The fields metadata.
   */
  public constructor(record: Record<string, string>, fields: string[]) {
    this.key = record[KEY]!;
    // NFD splits characters into their base character and separate
    // diacritical marks.
    this.fields = fields.map(
      (name) => new Field(name, orth.normalize(record[name]!))
    );
  }

  /**
   *
   * @param regex - Regular expression to search.
   * @returns The search result.
   */
  public search(regex: RegExp): SearchResult {
    return new SearchResult(this, regex);
  }
}

/**
 * SearchResult represents the search result of one candidate from the index.
 */
export class SearchResult extends AggregateResult {
  protected readonly results: FieldSearchResult[];
  /**
   * @param candidate
   * @param regex
   */
  constructor(
    private readonly candidate: Candidate,
    regex: RegExp
  ) {
    super();
    this.results = this.candidate.fields.map((f: Field) => f.search(regex));
  }

  /**
   *
   * @returns
   */
  get key(): string {
    return this.candidate.key;
  }

  /**
   * viewCell constructs the first cell in the row for this result, bearing the
   * anchor to the result (if available).
   *
   * @param hrefFmt - Format string of the HREF pointing to the result page.
   * @param total - Total number of results.
   * @returns The view table cell element.
   */
  private viewCell(
    hrefFmt: string | undefined,
    total: number
  ): HTMLTableCellElement {
    const viewCell = document.createElement('td');
    viewCell.classList.add(CLS.VIEW);

    const counter = document.createElement('span');
    counter.classList.add(CLS.COUNTER);
    counter.innerHTML = `? / ${total.toString()}`;
    counter.append(' ');
    viewCell.append(counter);

    const dev = document.createElement('span');
    dev.classList.add(CLS.DEV);
    dev.textContent = this.key;

    if (!hrefFmt) {
      viewCell.prepend(dev);
      return viewCell;
    }

    // There is an href. We create a link, and add the 'view' text.
    const a = document.createElement('a');
    a.href =
      hrefFmt.replace(`{${KEY}}`, this.key) +
      `#:~:text=${encodeURIComponent(this.fragmentWord()!)}`;
    a.target = '_blank';

    const noDev = document.createElement('span');
    noDev.classList.add(CLS.NO_DEV);
    noDev.textContent = 'view';

    a.append(noDev, dev);

    viewCell.prepend(a);

    return viewCell;
  }

  /**
   * row constructs the row in the results table that corresponds to this
   * result. This consists of the cell bearing the key and anchor, along with
   * the other cells containing the highlighted search fields.
   *
   * @param hrefFmt - A string that can be used to construct the HREF pointing
   * to this result by replacing the substring "{KEY}" with the candidate key.
   *
   * For example:
   *   hrefFmt = "https://remnqymi.com/{KEY}.html"
   *   key = "1"
   * will result in the constructed HREF being:
   *   https://remnqymi.com/1.html
   *
   * @param total - Total number of results - used to display the index of the
   * current result.
   *
   * @returns
   */
  row(hrefFmt: string | undefined, total: number): HTMLTableRowElement {
    const row = document.createElement('tr');

    row.append(
      this.viewCell(hrefFmt, total),
      ...this.results.map((sr: FieldSearchResult) => {
        const cell: HTMLTableCellElement = document.createElement('td');
        cell.innerHTML = sr.highlight();
        return cell;
      })
    );

    return row;
  }

  /**
   * Construct a key used to compare search results.
   *
   * @returns the comparison key.
   */
  compareKey(): number[] {
    // Results are sorted based on the boundary type.
    // See the BoundaryType enum for the order.
    const boundary: BoundaryType = this.boundaryType();
    // Within all the candidates having a match with a given boundary type, we
    // sort based on the index of the first field possessing a match with that
    // boundary type.
    // A candidate with a full-word match in the first field should rank higher
    // than a candidate with a full-word match in the second field.
    const boundaryIndex: number = this.results.findIndex(
      (res) => res.boundaryType() === boundary
    );
    // Lastly, we sort based on the index of the first match, regardless of the
    // boundary type of that match.
    // Results are sorted based on the first column that has a match.
    // We do so based on the assumption that the earlier columns contain more
    // relevant data. So a result with a match in the 1st column is likely
    // more interesting to the user than a result with a match in the 2nd
    // column, so it should show first.
    const firstMatchIndex: number = this.results.findIndex((res) => res.match);
    return [boundary, boundaryIndex, firstMatchIndex];
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
  readonly units: Unit[];
  /**
   * @param name - The name of the field.
   * The name is currently unused, but it may become used as part of #445,
   * because we intend to use it to filter out search results, using Xooxle's
   * 'admit' parameter.
   * @param html - The HTML content of the field.
   */
  constructor(
    readonly name: string,
    html: string
  ) {
    this.units = html.split(UNIT_DELIMITER).map((html) => new Unit(html));
  }

  /**
   * @param regex - Regex to search.
   * @returns Search result.
   */
  search(regex: RegExp): FieldSearchResult {
    return new FieldSearchResult(this, regex);
  }
}

/**
 * FieldSearchResult represents the search result of one field.
 */
class FieldSearchResult extends AggregateResult {
  protected readonly results: UnitSearchResult[];
  /**
   * @param field
   * @param regex
   */
  constructor(field: Field, regex: RegExp) {
    super();
    this.results = field.units.map((unit) => unit.search(regex));
  }

  /**
   * @returns The field's HTML content, with matches highlighted.
   */
  highlight(): string {
    // If there are no matches, we limit the number of units in the output.
    // If there are matches:
    // - If there are only few units, we show all of them regardless of
    //   whether they have matches or not.
    // - If there are many units, we show those that have matches, even if
    //   their number exceeds the limit, because we need to show all matches.
    const results: UnitSearchResult[] = !this.match
      ? this.results.slice(0, UNITS_LIMIT)
      : this.results.length <= UNITS_LIMIT
        ? this.results
        : this.results.filter((r) => r.match);

    const truncated: boolean = results.length < this.results.length;

    return (
      results
        .map((r: UnitSearchResult): string => r.highlight())
        .join(UNIT_DELIMITER) + (truncated ? LONG_UNITS_FIELD_MESSAGE : '')
    );
  }
}

/**
 * Unit is a unit in a field. Fields usually consist of a single unit, but
 * humongous fields can be broken up into units. Units are searched separately;
 * and, if there are too many, won't all be included in the display during a
 * search.
 */
class Unit {
  readonly lines: Line[];

  /**
   * @param html - The HTML content of the unit.
   */
  constructor(html: string) {
    this.lines = html.split(LINE_BREAK).map((l: string) => new Line(l));
  }

  /**
   * @param regex - The regular expression to search.
   * @returns Search result.
   */
  search(regex: RegExp): UnitSearchResult {
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
  constructor(unit: Unit, regex: RegExp) {
    super();
    this.results = unit.lines.map((l) => l.search(regex));
  }

  /**
   * @returns The HTML content of the unit, with matches highlighted.
   */
  highlight(): string {
    // The unit was split into lines using LINE_BREAK as a delimiter, so we
    // rebuild it using LINE_BREAK.
    return this.results.map((r) => r.highlight()).join(LINE_BREAK);
  }
}

/**
 * BoundaryType represents the boundary type of a match.
 * NOTE: The enum values are sorted such that the more significant matches have
 * lower values, to aid in sorting by priority.
 * Full-word matches come first, followed by prefix matches, then suffix
 * matches, then mid-word matches.
 */
enum BoundaryType {
  FULL_WORD = 0,
  PREFIX = 1,
  SUFFIX = 2,
  MID_WORD = 3,
}

interface Match {
  /**
   * The start index of the match.
   */
  readonly start: number;
  /**
   * The end index of the match.
   */
  readonly end: number;
  /**
   * The match type.
   */
  readonly boundaryType: BoundaryType;
}

/**
 * Line represents a line in a unit. Units are broken into lines because we
 * don't want any search queries to spill over multiple lines.
 */
class Line {
  readonly text: string;

  /**
   * @param html - The HTML content of the line.
   */
  constructor(readonly html: string) {
    // We obtain the text by deleting all tags.
    // We also get rid of diacritics because we want to ignore them during
    // search.
    // We search the text for matches. When we get back to searching the HTML
    // for the matches, we ignore the diacritics in that step as well.
    this.text = orthographer.cleanDiacritics(html.replaceAll(TAG_REGEX, ''));
  }

  /**
   * @param regex - The regex to search.
   * @returns The search result.
   */
  search(regex: RegExp): LineSearchResult {
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
  matches(regex: RegExp): Match[] {
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
        const boundaryType: BoundaryType =
          before && after
            ? BoundaryType.FULL_WORD
            : before
              ? BoundaryType.PREFIX
              : after
                ? BoundaryType.SUFFIX
                : BoundaryType.MID_WORD;

        return { start, end, boundaryType };
      })
      .filter((m) => m !== undefined);
  }
}

/**
 * HTMLBuilder generates HTML for search results, highlighting matches as
 * dictated.
 *
 * Matches are not allowed to be nested, but are allowed to be contiguous.
 * Nested matches will produce unpredictable behaviour!
 * The builder will attempt simplify the output by removing superfluous opening
 * and closing tags whenever possible.
 */
class HTMLBuilder {
  private readonly builder: string[] = [];

  /**
   * open stores whether a match is currently open.
   */
  private open = false;

  /**
   * @returns Whether the match is currently closed.
   */
  private get closed(): boolean {
    return !this.open;
  }

  /**
   * A match opening tag.
   * Each of the (potentially several) pieces of text making up a match will be
   * surrounded by an opening and a closing tag.
   */
  private static readonly opening = `<span class="${CLS.MATCH}">`;

  /**
   * A match closing tag.
   * Each of the (potentially several) pieces of text making up a match will be
   * surrounded by an opening and a closing tag.
   */
  private static readonly closing = '</span>';

  /**
   * The closing tag is not distinguishable enough, so we use this placeholder
   * first, substituting it for the actual closing tag later on.
   */
  private static readonly closingPlaceholder = 'CLOSING_TAG';

  /**
   * Start a match.
   */
  openMatch(): void {
    if (this.open) {
      console.error('Warning: The match is already open!');
    }
    this.open = true;
    if (
      this.builder[this.builder.length - 1] === HTMLBuilder.closingPlaceholder
    ) {
      // Open a match by un-closing the previous match.
      this.builder.pop();
    } else {
      // Open a match by pushing an opening tag.
      this.builder.push(HTMLBuilder.opening);
    }
  }

  /**
   * End a match.
   */
  closeMatch(): void {
    if (this.closed) {
      console.error('Warning: The match is already closed!');
    }
    this.open = false;
    if (this.builder[this.builder.length - 1] === HTMLBuilder.opening) {
      // Close the match by popping the opening tag. This is an empty match.
      this.builder.pop();
    } else {
      // Close a match by pushing a closing tag.
      this.builder.push(HTMLBuilder.closingPlaceholder);
    }
  }

  /**
   * @param t
   */
  pushText(t: string | undefined): void {
    if (!t) {
      return;
    }
    this.builder.push(t);
  }

  /**
   * @param t
   */
  pushTag(t: string): void {
    if (this.open) {
      this.closeMatch();
      this.builder.push(t);
      this.openMatch();
    } else {
      this.builder.push(t);
    }
  }

  /**
   * @returns
   */
  build(): string {
    return this.builder
      .map((s) =>
        s === HTMLBuilder.closingPlaceholder ? HTMLBuilder.closing : s
      )
      .join('');
  }
}

/**
 * LineSearchResult represents the search result of one line.
 */
class LineSearchResult {
  private readonly matches: Match[];

  /**
   *
   * @param line - The line to search.
   * @param regex - The regex to search.
   */
  constructor(
    private readonly line: Line,
    regex: RegExp
  ) {
    this.matches = line.matches(regex);
  }

  /**
   *
   * @returns The text content of the line.
   */
  private get text(): string {
    return this.line.text;
  }

  /**
   *
   * @returns The HTML content of the line.
   */
  private get html(): string {
    return this.line.html;
  }

  /**
   *
   * @returns Whether this search result has a match.
   */
  get match(): boolean {
    return !!this.matches.length;
  }

  /**
   * @returns A word that can be used as a URL fragment.
   */
  fragmentWord(): string | undefined {
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
   * @returns The HTML content of the line, with matches highlighted.
   */
  highlight(): string {
    if (!this.match) {
      // No highlighting needed.
      return this.html;
    }

    const builder: HTMLBuilder = new HTMLBuilder();

    let htmlPos = 0,
      textPos = 0,
      matchIdx = 0,
      match: Match | undefined = this.matches[matchIdx];

    const nextMatch = (): void => {
      match = this.matches[++matchIdx];
    };

    while (htmlPos <= this.html.length) {
      if (this.html[htmlPos] === '<') {
        // If we encounter a tag, add them to the output without accounting for
        // it in the search.
        const end = this.html.indexOf('>', htmlPos) + 1;
        builder.pushTag(this.html.slice(htmlPos, end));
        htmlPos = end;
        continue;
      }

      if (orthographer.isDiacritic(this.html[htmlPos])) {
        // This is a diacritic. It was ignored during search, and is not part of
        // the match. Yield without accounting for it in the text.
        builder.pushText(this.html[htmlPos++]);
        continue;
      }

      // This index in the HTML corresponds to a text character.
      if (textPos === match?.start) {
        // A match starts at the given position. Open the match.
        builder.openMatch();
      } else if (textPos === match?.end) {
        // A match ends at the given position. Close the match.
        builder.closeMatch();
        nextMatch();
        // Check if the new match starts at the same position.
        // We need to do this during this iteration, as this is the only time we
        // process this text position.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (textPos === match?.start) {
          builder.openMatch();
        }
      }
      ++textPos;
      builder.pushText(this.html[htmlPos++]);
    }

    return builder.build();
  }

  /**
   * @returns The boundary type of this match.
   */
  boundaryType(): BoundaryType {
    return Math.min(...this.matches.map((m) => m.boundaryType));
  }
}

/**
 * _Index represents the JSON structure of a Xooxle index.
 */
export interface _Index {
  readonly data: Record<string, string>[];
  readonly metadata: {
    /** fields is the list of fields in the output. For each
     * search result from the data, a row will be added to the table.
     * The first cell in the row will contain the index of the result, and
     * potentially the HREF to the result page. The following cells will contain
     * other fields from the result, in this order.
     */
    readonly fields: string[];
  };
}

/**
 * BucketSorter allows search results to be sorted into buckets.
 */
export class BucketSorter {
  readonly numBuckets: number;

  /**
   * @param numBuckets - Total number of buckets. The default is one bucket
   * that contains all results, thus there is no sorting.
   */
  constructor(numBuckets = 1) {
    this.numBuckets = Math.max(1, Math.round(numBuckets));
  }

  /**
   * bucket returns the bucket that a given search result belongs to. This
   * should fall in the range [0, numBuckets-1].
   * Results will be sorted in the output based on the bucket that they belong
   * to.
   *
   * @param _res - Search result.
   * @param _row - Table row.
   * @returns Bucket number.
   */
  bucket(_res: SearchResult, _row: HTMLTableRowElement): number {
    // The default is to put all results in the first bucket.
    return 0;
  }

  /**
   * validBucket wraps bucket, and ensures results are valid.
   * It is implemented as an arrow function rather than a method in order to
   * prevent child classes from overriding it.
   *
   * @param res - The search result.
   * @param row - The HTML row representing this result.
   * @returns
   */
  validBucket = (res: SearchResult, row: HTMLTableRowElement): number => {
    const b = Math.round(this.bucket(res, row));
    if (b < 0) {
      console.error('Invalid bucket', b);
      return 0;
    }
    if (b >= this.numBuckets) {
      console.error('Invalid bucket', b);
      return this.numBuckets - 1;
    }
    return b;
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
   * @param hrefFmt - An optional format string for generating a URL to this
   * result's page. The HREF will be generated based on the KEY field of the
   * candidate by substituting the string `{KEY}`.
   * If absent, no HREF will be generated.
   * @param bucketSorter - An optional bucket sorter.
   * @param admit - An optional search result filter.
   * @param prepublish - An optional lambda to apply to HTML rows before
   * insertion in the table.
   */
  constructor(
    index: _Index,
    private readonly form: Form,
    private readonly hrefFmt?: string,
    private readonly bucketSorter: BucketSorter = new BucketSorter(),
    private readonly admit: (res: SearchResult) => boolean = () => true,
    private readonly prepublish?: (row: HTMLTableRowElement) => void
  ) {
    this.candidates = index.data.map(
      (record) => new Candidate(record, index.metadata.fields)
    );

    // Make the page responsive to user input.
    // We need debounce timeout for search box input, because users typically
    // type several letters consecutively.
    // We don't need to do the same for checkbox events, because those events
    // typically trigger as singletons.
    this.form.addSearchBoxInputListener(
      this.search.bind(this, INPUT_DEBOUNCE_TIMEOUT)
    );
    this.form.addCheckboxClickListener(this.search.bind(this, 0));

    // Handle the search query once upon loading, in case the form picked up a
    // query from the URL parameters.
    this.search(0);

    // Focus on the form, so the user can search right away.
    this.form.focus();
  }

  /**
   * Handle the search query, debouncing with the given timeout.
   *
   * @param timeout - How long to wait before starting search.
   */
  private search(timeout: number) {
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
  private async searchAux() {
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
        this.form.message('Internal error! Please send us an email!');
      }
    }
  }

  /**
   * Search candidates for the given regex, adding results to display, and
   * aborting if an abort signal is received.
   *
   * @param regex - Regex to search.
   * @param abortController - Abort controller for this search.
   */
  private async searchAuxAux(regex: RegExp, abortController: AbortController) {
    // TODO: (#0) We append random characters in order to avoid having timers
    // with identical names. This is not ideal. Let's supply an index name as
    // part of the metadata, and use that for logging instead.
    const name = `time-to-first-yield-${Array.from({ length: 2 }, () =>
      String.fromCharCode(97 + Math.floor(Math.random() * 26))
    ).join('')}`;
    logger.time(name);

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
    // will be looking at.
    const bucketSentinels: Element[] = Array.from(
      { length: this.bucketSorter.numBuckets },
      () => {
        const tr = document.createElement('tr');
        tr.style.display = 'none';
        this.form.result(tr);
        return tr;
      }
    );

    // Search is a cheap operation that we can afford to do on all candidates in
    // the beginning.
    const results: SearchResult[] = this.candidates
      .map((can) => can.search(regex))
      .filter((res) => res.match && this.admit(res))
      .sort(searchResultCompare);

    for (const [count, result] of results.entries()) {
      if (abortController.signal.aborted) {
        return;
      }

      // Create a new row for the table
      // NOTE: Creating the row DOM (which involves parsing plain HTML) is a
      // somewhat expensive operation, so we can't afford to do it for all
      // candidates before updating display.
      // Instead, we create a number of rows, and then yield to the browser to
      // allow display update.
      const row = result.row(this.hrefFmt, results.length);
      this.prepublish?.(row);

      bucketSentinels[
        this.bucketSorter.validBucket(result, row)
      ]!.insertAdjacentElement('beforebegin', row);

      if (count % RESULTS_TO_UPDATE_DISPLAY == RESULTS_TO_UPDATE_DISPLAY - 1) {
        if (count <= RESULTS_TO_UPDATE_DISPLAY) {
          // This is the first display update. Log time.
          logger.timeEnd(name);
        }
        // Expand the results table to accommodate the recently added results.
        this.form.expand();
        // Allow the browser to update the display, receive user input, ...
        await browser.yieldToBrowser();
      }
    }

    // Update the numbers in the view cell.
    // We couldn't have put the numbers there in the beginning, because, due to
    // bucket sorting, we couldn't know for sure where each result is going to
    // end up.
    let i = 0;
    [...this.form.resultsTBody.getElementsByClassName(CLS.COUNTER)].forEach(
      (counter) => {
        counter.innerHTML = `${(++i).toString()} / ${results.length.toString()}`;
      }
    );

    // Expand the results table to accommodate the last batch of results.
    this.form.expand();
  }
}
