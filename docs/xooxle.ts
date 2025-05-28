import * as collapse from './collapse.js';
import * as utils from './utils.js';
import * as logger from './logger.js';
import * as orth from './orth.js';
import * as coptic from './coptic.js';
import * as greek from './greek.js';

// KEY is the name of the field that bears the word key. The key can be used to
// generate an HREF to open the word page.
const KEY = 'KEY';

// UNIT_LIMIT determines the behavior of the fields that should be split into
// units.
// If the number of units in a field is at most UNIT_LIMIT, the field will
// always be produced whole.
// Otherwise:
// - If there are units with matches, matching units will be produced
//   (regardless of their number).
// - If there are no units with matches, the first UNIT_LIMIT units will be
//   produced.
// - In either case, a message will be shown indicating that more content is
//   available.
const UNITS_LIMIT = 5;

/** Our currently index building algorithm results in HTML with a simplified
 * structure, with only <span> tags, styling tags, or <br> tags. Styling tags
 * don't affect the output text, and are simply ignored during text search.
 * Line breaks, however, require special handling.
 */
const LINE_BREAK = '<br>';

// RESULTS_TO_UPDATE_DISPLAY specifies how often (every how many results) we
// should yield to let the browser update the display during search.
// A higher value implies:
// - A less responsive UI, because our JavaScript will yield less often.
// A lower value implies:
// - A higher likelihood of jittery bucket sorting becoming visible to the user.
//   If we rush to update display after sorting a small number of candidates,
//   there is a higher chance our next batch of candidates will contain a
//   candidate that needs to go on top (which is the area of the results table
//   that is visible to the user), which introduces jitter. But if we sort a
//   higher number of candidates in the first round, then upcoming batches are
//   less likely to contain a candidate that needs to go in the first bucket.
const RESULTS_TO_UPDATE_DISPLAY = 20;

const TAG_REGEX = /<\/?[^>]+>/g;

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

// UNIT_DELIMITER is the string that separates a units field into units.
// TODO: This is not a clean way to separate units! Your index should be built
// with units already separated.
const UNIT_DELIMITER = '<hr class="match-separator">';

/** LONG_UNITS_FIELD_MESSAGE is the message shown at the end of a units field,
 * if the field gets truncated.
 */
const LONG_UNITS_FIELD_MESSAGE = `<br><span class="${CLS.VIEW_FOR_MORE}">... (<em>view</em> for full context)</span>`;

const orthographer: orth.Orthographer = new orth.Orthographer(
  new Set<string>([...coptic.DIACRITICS, ...greek.DIACRITICS])
);

// _Form stores Form parameters.
export interface _Form {
  searchBoxID: string;
  fullWordCheckboxID: string;
  regexCheckboxID: string;
  messageBoxID: string;
  resultsTableID: string;
  collapsibleID: string;
}

/**
 * Form represents a search form containing the HTML elements that the user
 * interacts with to initiate and control search.
 */
export class Form {
  // Input fields:
  readonly searchBox: HTMLInputElement;
  readonly fullWordCheckbox: HTMLInputElement;
  readonly regexCheckbox: HTMLInputElement;
  // Output fields:
  private readonly messageBox: HTMLElement;
  readonly tbody: HTMLTableSectionElement;
  private readonly collapsible: collapse.Collapsible;

  // Search parameter names.
  private static readonly query = 'query';
  private static readonly full = 'full';
  private static readonly regex = 'regex';

  /**
   *
   * @param form
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

    this.populateFromParams();
  }

  /**
   * @returns
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
   *
   */
  private populateFromParams() {
    // Populate form values using query parameters.
    const url = new URL(window.location.href);
    this.searchBox.value = url.searchParams.get(Form.query) ?? '';
    this.fullWordCheckbox.checked = url.searchParams.get(Form.full) === 'true';
    this.regexCheckbox.checked = url.searchParams.get(Form.regex) === 'true';
  }

  /**
   *
   */
  populateParams() {
    // Populate query parameters using form values.
    const url = new URL(window.location.href);

    if (this.searchBox.value) {
      url.searchParams.set(Form.query, this.searchBox.value);
    } else {
      url.searchParams.delete(Form.query);
    }

    if (this.fullWordCheckbox.checked) {
      url.searchParams.set(Form.full, String(this.fullWordCheckbox.checked));
    } else {
      url.searchParams.delete(Form.full);
    }

    if (this.regexCheckbox.checked) {
      url.searchParams.set(Form.regex, String(this.regexCheckbox.checked));
    } else {
      url.searchParams.delete(Form.regex);
    }

    window.history.replaceState('', '', url.toString());
  }

  /**
   *
   * @param row
   */
  result(row: HTMLTableRowElement): void {
    this.tbody.appendChild(row);
  }

  /**
   * NOTE: This is an expensive operation. Don't perform it repeatedly in
   * time-sensitive applications.
   */
  expand(): void {
    this.collapsible.updateHeight();
  }

  /**
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
   *
   */
  clear(): void {
    this.tbody.replaceChildren();
    this.messageBox.replaceChildren();
  }
}

/**
 * TODO: Calculating the aggregation results seems a bit expensive, especially
 * for operations that need to be queried repeatedly (such as `match` and
 * `boundaryType`). Consider memorizing them.
 */
abstract class ResultAggregator {
  protected abstract readonly results: ResultAggregator[];

  /**
   * @returns
   */
  boundaryType(): BoundaryType {
    // The BoundaryType enum is implemented in such a way that the boundary type
    // of an aggregated result is the minimum of the boundary types of all
    // results.
    return Math.min(...this.results.map((r) => r.boundaryType()));
  }

  /**
   * @returns
   */
  fragmentWord(): string | undefined {
    // We simply return the fragment of the first result that possesses one.
    return this.results
      .find((r) => r.match && r.fragmentWord())
      ?.fragmentWord();
  }

  /**
   * @returns
   */
  get match(): boolean {
    // We have a match if any of the results has a match.
    return this.results.some((r) => r.match);
  }
}

// Candidate represents one search candidate from the index. In the results
// display, each candidate occupies its own row.
/**
 *
 */
class Candidate {
  // key bears the candidate key.
  readonly key: string;
  readonly fields: Field[];

  /**
   *
   * @param record
   * @param fields
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
   * @param regex
   * @returns
   */
  public search(regex: RegExp): SearchResult {
    return new SearchResult(this, regex);
  }
}

// SearchResult represents the search result of one candidate from the index.
/**
 *
 * @returns
 */
export class SearchResult extends ResultAggregator {
  protected readonly results: FieldSearchResult[];
  /**
   *
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

  // viewCell constructs the first cell in the row for this result, bearing the
  // anchor to the result (if available).
  /**
   *
   * @param hrefFmt
   * @param total - Total number of results.
   * @returns
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

    a.appendChild(noDev);
    a.appendChild(dev);

    viewCell.prepend(a);

    return viewCell;
  }

  /**
   * row constructs the row in the results table that corresponds to this
   * result. This consists of the cell bearing the key and anchor, along with
   * the other cells containing the highlighted search fields.
   *
   * @param hrefFmt
   * @param total - Total number of results.
   * @returns
   */
  row(hrefFmt: string | undefined, total: number): HTMLTableRowElement {
    const row = document.createElement('tr');

    row.appendChild(this.viewCell(hrefFmt, total));

    this.results.forEach((sr: FieldSearchResult) => {
      const cell: HTMLTableCellElement = document.createElement('td');
      cell.innerHTML = sr.highlight();
      row.appendChild(cell);
    });

    return row;
  }

  /**
   * @returns the comparison key.
   */
  compareKey(): number[] {
    return [
      // Results are sorted based on the boundary type. Full-word matches should
      // come first, followed by prefix matches, then suffix matches, then
      // within-word matches.
      this.boundaryType(),
      // Results are sorted based on the first column that has a match.
      // We do so based on the assumption that the earlier columns contain more
      // relevant data. So a result with a match in the 1st column is likely
      // more interesting to the user than a result with a match in the 2nd
      // column, so it should show first.
      this.results.findIndex((result) => result.match),
    ];
  }
}

/**
 * @param a
 * @param b
 * @returns
 */
function searchResultCompare(a: SearchResult, b: SearchResult): number {
  const aKey = a.compareKey();
  const bKey = b.compareKey();

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
   *
   * @param name
   * @param html
   */
  constructor(
    readonly name: string,
    html: string
  ) {
    this.units = html.split(UNIT_DELIMITER).map((html) => new Unit(html));
  }

  /**
   *
   * @param regex
   * @returns
   */
  search(regex: RegExp): FieldSearchResult {
    return new FieldSearchResult(this, regex);
  }
}

/**
 * FieldSearchResult represents the search result of one field.
 */
class FieldSearchResult extends ResultAggregator {
  protected readonly results: UnitSearchResult[];
  /**
   *
   * @param field
   * @param regex
   */
  constructor(field: Field, regex: RegExp) {
    super();
    this.results = field.units.map((unit) => unit.search(regex));
  }

  // highlight returns the field's HTML content, with matches highlighted.
  /**
   *
   * @returns
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
      : this.results.length > UNITS_LIMIT
        ? this.results.filter((r) => r.match)
        : this.results;

    const truncated: boolean = results.length < this.results.length;

    return (
      results
        .map((r: UnitSearchResult): string => r.highlight())
        .join(UNIT_DELIMITER) + (truncated ? LONG_UNITS_FIELD_MESSAGE : '')
    );
  }
}

// Unit is a unit in a field. Fields usually consist of a single unit, but
// humongous fields can be broken up into units. Units are searched separately;
// and, if there are too many, won't all be included in the display during a
// search.
/**
 *
 */
class Unit {
  readonly lines: Line[];
  /**
   *
   * @param html
   */
  constructor(html: string) {
    this.lines = html.split(LINE_BREAK).map((l: string) => new Line(l));
  }

  /**
   *
   * @param regex
   * @returns
   */
  search(regex: RegExp): UnitSearchResult {
    return new UnitSearchResult(this, regex);
  }
}

// UnitSearchResult represents the search result of one unit.
/**
 *
 */
class UnitSearchResult extends ResultAggregator {
  protected readonly results: LineSearchResult[];
  /**
   *
   * @param unit
   * @param regex
   */
  constructor(unit: Unit, regex: RegExp) {
    super();
    this.results = unit.lines.map((l) => l.search(regex));
  }

  /**
   *
   * @returns
   */
  highlight(): string {
    return this.results.map((r) => r.highlight()).join(LINE_BREAK);
  }
}

enum BoundaryType {
  FULL_WORD = 0,
  PREFIX = 1,
  SUFFIX = 2,
  WITHIN = 3,
}

interface Match {
  readonly start: number;
  readonly end: number;
  readonly boundaryType: BoundaryType;
}

/**
 * Line represents a line in a unit. Units are broken into lines because we
 * don't want any search queries to spill over multiple lines.
 */
class Line {
  readonly text: string;
  /**
   *
   * @param html
   */
  constructor(readonly html: string) {
    this.text = orthographer.cleanDiacritics(html).replaceAll(TAG_REGEX, '');
  }

  /**
   *
   * @param regex
   * @returns
   */
  search(regex: RegExp): LineSearchResult {
    return new LineSearchResult(this, regex);
  }

  /**
   *
   * @param regex
   * @returns
   */
  matches(regex: RegExp): Match[] {
    return (
      [...this.text.matchAll(regex)]
        // We need to filter out the empty string, because it could cause
        // trouble during highlighting.
        .filter((match) => match[0])
        .map(this.getMatch.bind(this))
    );
  }

  /**
   *
   * @param match
   * @returns
   */
  private getMatch(match: RegExpMatchArray): Match {
    const start: number = match.index!;
    const end: number = match.index! + match[0].length;
    return { start, end, boundaryType: this.boundaryType(start, end) };
  }

  /**
   * @param start
   * @param end
   * @returns
   */
  private boundaryType(start: number, end: number): BoundaryType {
    const before = !orth.isWordChar(this.text[start - 1]);
    const after = !orth.isWordChar(this.text[end]);
    if (before && after) {
      return BoundaryType.FULL_WORD;
    }
    if (before) {
      return BoundaryType.PREFIX;
    }
    if (after) {
      return BoundaryType.SUFFIX;
    }
    return BoundaryType.WITHIN;
  }
}

/**
 *
 */
class LineSearchResult {
  private static readonly opening = `<span class="${CLS.MATCH}">`;
  private static readonly closing = '</span>';
  private readonly matches: Match[];
  /**
   *
   * @param line
   * @param regex
   */
  constructor(
    private readonly line: Line,
    regex: RegExp
  ) {
    this.matches = line.matches(regex);
  }

  /**
   *
   * @returns
   */
  private get text(): string {
    return this.line.text;
  }

  /**
   *
   * @returns
   */
  private get html(): string {
    return this.line.html;
  }

  /**
   *
   * @returns
   */
  get match(): boolean {
    return !!this.matches.length;
  }

  /**
   *
   * @returns
   */
  fragmentWord(): string {
    /* Expand the match left and right such that it contains full words, for
     * text fragment purposes.
     * See
     * https://developer.mozilla.org/en-US/docs/Web/URI/Fragment/Text_fragments
     * for information about text fragments.
     * Notice that browsers don't treat them uniformly, and we try to obtain a
     * match that will work on most browsers.
     * */
    const match = this.matches.values().next().value;
    if (!match) {
      console.error(
        'Attempting to get a fragment word from a non-matching unit!'
      );
      return '';
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
   *
   * @returns
   */
  highlight(): string {
    if (!this.match) {
      return this.html;
    }
    const builder: string[] = [];
    // i represents the index in the HTML.
    // j tracks the index in the text.
    // idx tracks the match index.
    // cur tracks the current match.
    // match tracks whether we currently have a match.
    let i = 0,
      j = 0,
      idx = 0,
      cur: Match | undefined = this.matches[idx],
      match = false;

    while (i <= this.html.length) {
      // If we encounter tags, add them to the output without searching them.
      if (this.html[i] === '<') {
        // If we encounter tags during a match, we need to close the
        // highlighting tag and reopen it, otherwise it might overlap, and
        // <span> elements might get arbitrarily closed and opened.
        if (match) builder.push(LineSearchResult.closing);
        while (this.html[i] === '<') {
          const k = this.html.indexOf('>', i) + 1;
          builder.push(this.html.slice(i, k));
          i = k;
        }
        if (match) builder.push(LineSearchResult.opening);
      }
      if (orthographer.isDiacritic(this.html[i])) {
        // This is a diacritic. It was ignored during search, and is not part of
        // the match. Yield without accounting for it in the text.
        builder.push(this.html[i++]!);
        continue;
      }

      if (cur?.start === j) {
        // A match starts at the given position. Yield an opening tag.
        match = true;
        builder.push(LineSearchResult.opening);
      } else if (cur?.end === j) {
        // A match ends at the given position. Yield a closing tag.
        builder.push(LineSearchResult.closing);
        cur = this.matches[++idx];
        match = false;
      }

      if (i < this.html.length) {
        builder.push(this.html[i]!);
      }
      j += 1;
      i += 1;
    }

    return builder.join('');
  }

  /**
   *
   */
  boundaryType(): BoundaryType {
    return Math.min(...this.matches.map((m) => m.boundaryType));
  }
}

export interface _Index {
  readonly data: Record<string, string>[];
  readonly metadata: {
    // fields is the list of fields in the output. For each
    // search result from the data, a row will be added to the table.
    // The first cell in the row will contain the index of the result, and
    // potentially the HREF to the result page. The following cells will contain
    // other fields from the result, in this order.
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
   * @param res
   * @param row
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
 *
 */
export class Xooxle {
  private readonly candidates: Candidate[];
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentAbortController: AbortController | null = null;

  /**
   * @param index - JSON index object.
   * @param form - Form containing search elements.
   * @param hrefFmt - a format string for generating a URL to this result's
   * page. The HREF will be generated based on the KEY field of the candidate
   * by substituting the string `{KEY}`.
   * If absent, no HREF will be generated.
   * @param bucketSorter - A bucket sorter.
   * @param admit - A search result filter.
   */
  constructor(
    index: _Index,
    private readonly form: Form,
    private readonly hrefFmt?: string,
    private readonly bucketSorter: BucketSorter = new BucketSorter(),
    private readonly admit: (res: SearchResult) => boolean = () => true
  ) {
    this.candidates = index.data.map(
      (record) => new Candidate(record, index.metadata.fields)
    );

    // Make the page responsive to user input.
    this.form.searchBox.addEventListener('input', this.search.bind(this, 100));
    this.form.fullWordCheckbox.addEventListener(
      'click',
      this.search.bind(this, 0)
    );
    this.form.regexCheckbox.addEventListener(
      'click',
      this.search.bind(this, 0)
    );

    // Handle the search query once upon loading.
    this.search(0);
    // Finally, focus on the form, so the user can search right away.
    this.form.searchBox.focus();
  }

  /**
   *
   * @param timeout
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
   *
   */
  private async searchAux() {
    // If there is an ongoing search, abort it.
    this.currentAbortController?.abort();
    const abortController: AbortController = new AbortController();
    this.currentAbortController = abortController;

    // Populate query parameters from the form.
    this.form.populateParams();

    // Clear output fields in the form, since we're starting a new search.
    this.form.clear();

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
   *
   * @param regex
   * @param abortController
   */
  private async searchAuxAux(regex: RegExp, abortController: AbortController) {
    // TODO: We append random characters in order to avoid having timers with
    // identical names. This is not ideal. Let's supply an index name as part of
    // the metadata, and use that for logging instead.
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
        await utils.yieldToBrowser();
      }
    }

    let i = 0;
    [...this.form.tbody.getElementsByClassName(CLS.COUNTER)].forEach(
      (counter) => {
        counter.innerHTML = `${(++i).toString()} / ${results.length.toString()}`;
      }
    );

    this.form.expand();
  }
}
