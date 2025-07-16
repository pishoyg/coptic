/** Package xooxle defines the Xooxle engine core logic. */
/* eslint-disable max-lines */
import * as collapse from './collapse.js';
import * as browser from './browser.js';
import * as logger from './logger.js';
import * as orth from './orth.js';
import * as coptic from './coptic.js';
import * as greek from './greek.js';
import * as dev from './dev.js';
import * as cls from './cls.js';
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
export var CLS;
(function (CLS) {
  // VIEW is the class of the view table cells.
  CLS['VIEW'] = 'view';
  // ERROR is the class of the error message.
  CLS['ERROR'] = 'error';
  // COUNTER is the class of the result counters in the view cells.
  CLS['COUNTER'] = 'counter';
  // MATCH is the class of text matching a given search query.
  CLS['MATCH'] = 'match';
  // VIEW_FOR_MORE is the class of the message "view for more", displayed in
  // large fields that have been cropped.
  CLS['VIEW_FOR_MORE'] = 'view-for-more';
  // MATCH_SEPARATOR is the class of unit separators.
  CLS['MATCH_SEPARATOR'] = 'match-separator';
})(CLS || (CLS = {}));
/**
 * UNIT_DELIMITER is the string that separates a units field into units.
 * TODO: (#0) This is not a clean way to separate units! The index building
 * pipeline should export an index with the units already separated, and the
 * Xooxle engine should read it as such.
 */
const UNIT_DELIMITER = `<hr class="${'match-separator' /* CLS.MATCH_SEPARATOR */}">`;
const orthographer = new orth.Orthographer(
  new Set([...coptic.DIACRITICS, ...greek.DIACRITICS])
);
/**
 * _Param defines the form query parameters.
 */
var Param;
(function (Param) {
  Param['QUERY'] = 'query';
  Param['FULL'] = 'full';
  Param['REGEX'] = 'regex';
})(Param || (Param = {}));
/**
 * Form represents a search form containing the HTML elements that the user
 * interacts with to initiate and control search.
 */
export class Form {
  // Input fields:
  searchBox;
  fullWordCheckbox;
  regexCheckbox;
  // Output fields:
  messageBox;
  tbody;
  collapsible;
  form;
  /**
   * Construct the form object.
   * Populate form elements from query parameters.
   * Add listeners to populate query parameters whenever form elements are
   * updated.
   *
   * @param form - Form parameters.
   */
  constructor(form) {
    this.searchBox = document.getElementById(form.searchBoxID);
    this.fullWordCheckbox = document.getElementById(form.fullWordCheckboxID);
    this.regexCheckbox = document.getElementById(form.regexCheckboxID);
    this.messageBox = document.getElementById(form.messageBoxID);
    this.tbody = document
      .getElementById(form.resultsTableID)
      .querySelector('tbody');
    this.collapsible = new collapse.Collapsible(
      document.getElementById(form.collapsibleID)
    );
    if (form.formID) {
      this.form = document.getElementById(form.formID);
    }
    // Populate the form once from the query parameters.
    this.populateFromParams();
    this.addEventListeners();
  }
  /**
   * Add event listeners to update query parameters from the form fields.
   */
  addEventListeners() {
    this.searchBox.addEventListener('input', () => {
      this.populateParams(Param.QUERY, this.searchBox.value);
    });
    this.fullWordCheckbox.addEventListener('click', () => {
      this.populateParams(Param.FULL, this.fullWordCheckbox.checked);
    });
    this.regexCheckbox.addEventListener('click', () => {
      this.populateParams(Param.REGEX, this.regexCheckbox.checked);
    });
    // Prevent form submission. Otherwise, pressing Enter while the search box
    // is focused could clear all input fields!
    this.form?.addEventListener('submit', browser.preventDefault);
  }
  /**
   * Populate form fields from query parameters in the URL.
   */
  populateFromParams() {
    // Populate form values using query parameters.
    const url = new URL(window.location.href);
    this.searchBox.value = url.searchParams.get(Param.QUERY) ?? '';
    this.fullWordCheckbox.checked = url.searchParams.get(Param.FULL) === 'true';
    this.regexCheckbox.checked = url.searchParams.get(Param.REGEX) === 'true';
  }
  /**
   * Update the given URL parameter.
   *
   * @param name
   * @param value
   */
  populateParams(name, value) {
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
  addSearchBoxInputListener(listener) {
    this.searchBox.addEventListener('input', listener);
  }
  /**
   * @param listener
   */
  addCheckboxClickListener(listener) {
    this.fullWordCheckbox.addEventListener('click', listener);
    this.regexCheckbox.addEventListener('click', listener);
  }
  /**
   * @param listener
   */
  addCheckboxKeyListener(listener) {
    this.searchBox.addEventListener('keyup', listener);
    this.searchBox.addEventListener('keydown', listener);
    this.searchBox.addEventListener('keypress', listener);
  }
  /**
   * @returns The query expression, constructed from the input fields.
   */
  queryExpression() {
    let query = orthographer.cleanDiacritics(
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
  result(row) {
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
  expand() {
    this.collapsible.adjustHeightIfVisible();
  }
  /**
   * Show the given message in the form's message field.
   *
   * @param message
   */
  message(message) {
    const el = document.createElement('div');
    el.classList.add('error' /* CLS.ERROR */);
    el.textContent = message;
    this.messageBox.replaceChildren(el);
  }
  /**
   * Clear output fields.
   */
  clearOutputFields() {
    this.tbody.replaceChildren();
    this.messageBox.replaceChildren();
  }
}
/**
 * Aggregate search results.
 */
class AggregateResult {
  // Memos are used to memorize previously computed values, so we can avoid
  // computing them repeatedly.
  matchMemo = null;
  boundaryTypeMemo = null;
  fragmentWordMemo = null;
  numMatchesMemo = null;
  /**
   * @returns The boundary type.
   */
  boundaryType() {
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
  fragmentWord() {
    // We simply return the fragment of the first result that possesses one.
    return (this.fragmentWordMemo ??= this.results
      .find((r) => r.fragmentWord())
      ?.fragmentWord());
  }
  /**
   * @returns Whether this result has a match.
   */
  get match() {
    // We have a match if any of the results has a match.
    return (this.matchMemo ??= this.results.some((r) => r.match));
  }
  /**
   * @returns Number of matches.
   */
  get numMatches() {
    return (this.numMatchesMemo ??= this.results
      .map((r) => r.numMatches)
      .reduce((a, b) => a + b, 0));
  }
}
/**
 * Candidate represents one search candidate from the index. In the results
 * display, each candidate occupies its own row.
 */
export class Candidate {
  // key bears the candidate key.
  key;
  // fields bears the candidate's searchable fields.
  fields;
  /**
   * @param record - The candidate data.
   * @param fields - The fields metadata.
   */
  constructor(record, fields) {
    this.key = record[KEY];
    // NFD splits characters into their base character and separate
    // diacritical marks.
    this.fields = fields.map(
      (name) => new Field(name, orth.normalize(record[name]))
    );
  }
}
/**
 * SearchResult represents the search result of one candidate from the index.
 */
export class SearchResult extends AggregateResult {
  candidate;
  results;
  /**
   * @param candidate
   * @param regex
   */
  constructor(candidate, regex) {
    super();
    this.candidate = candidate;
    this.results = this.candidate.fields.map((f) => f.search(regex));
  }
  /**
   *
   * @returns
   */
  get key() {
    return this.candidate.key;
  }
  /**
   * viewCell constructs the first cell in the row for this result, bearing the
   * anchor to the result (if available).
   *
   * @param total - Total number of results.
   * @returns The view table cell element.
   */
  viewCell(total) {
    const td = document.createElement('td');
    td.classList.add('view' /* CLS.VIEW */);
    const counter = document.createElement('span');
    counter.classList.add('counter' /* CLS.COUNTER */);
    counter.textContent = `? / ${total.toString()}`;
    td.append(counter);
    const key = document.createElement('span');
    key.classList.add(dev.CLS.DEV, cls.LINK);
    key.textContent = this.key;
    td.prepend(key);
    const href = this.href();
    if (!href) {
      return td;
    }
    // Clicking anywhere on the cell opens the page.
    td.addEventListener('click', browser.open.bind(browser, href, true));
    const view = document.createElement('a');
    view.classList.add(dev.CLS.NO_DEV, cls.LINK);
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
   * @returns
   */
  row(total) {
    const row = document.createElement('tr');
    row.append(
      this.viewCell(total),
      ...this.results.map((fsr) => {
        const cell = document.createElement('td');
        cell.append(...fsr.highlight(this.href()));
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
  compareKey() {
    const boundary = this.boundaryType();
    const boundaryIndex = this.results.findIndex(
      (res) => res.boundaryType() === boundary
    );
    return [
      // Results are sorted based on the boundary type.
      // See the BoundaryType enum for the order.
      boundary,
      // Within all the candidates having a match with a given boundary type, we
      // sort based on the index of the first field possessing a match with that
      // boundary type.
      // A candidate with a full-word match in the first field should rank
      // higher than a candidate with a full-word match in the second field.
      boundaryIndex,
      // Afterwards, we rank based on the number of matches in the text.
      // Notice that we revert the sign, so the larger numbers will appear
      // first.
      -this.numMatches,
      // Lastly, we sort based on the index of the first match, regardless
      // the boundary type of that match.
      // Results are sorted based on the first column that has a match.
      // We do so based on the assumption that the earlier columns contain more
      // relevant data. So a result with a match in the 1st column is likely
      // more interesting to the user than a result with a match in the 2nd
      // column, so it should show first.
      this.results.findIndex((res) => res.match),
    ];
  }
  /**
   * Build a link to a page that gives more information about this search
   * result. By default, no page is provided. Override this method in order to
   * provide pages.
   *
   * @returns
   */
  link() {
    return undefined;
  }
  /**
   *
   * @returns
   */
  href() {
    const link = this.link();
    if (!link) {
      return undefined;
    }
    return `${link}#:~:text=${encodeURIComponent(this.fragmentWord())}`;
  }
  /**
   * Filter the result. By default, all results are admitted. Override this
   * method to implement a custom filter.
   *
   * @returns True if the result should be included in the output, false
   * otherwise.
   */
  filter() {
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
  bucket(_row) {
    return 0;
  }
  /**
   * Total number of buckets for bucket sorting. By default, we have one bucket
   * that all results belong to (in other words, there is no bucket sorting).
   * Override this method in order to implement custom sorting.
   *
   * @returns Total number of buckets.
   */
  static numBuckets() {
    return 1;
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
function searchResultCompare(a, b) {
  const aKey = a.compareKey();
  const bKey = b.compareKey();
  // The two arrays are guaranteed to be of equal length, but we use the minimum
  // for protectionism.
  const len = Math.min(aKey.length, bKey.length);
  for (let i = 0; i < len; ++i) {
    const diff = aKey[i] - bKey[i];
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
  name;
  units;
  /**
   * @param name - The name of the field.
   * The name is currently unused, but it may become used as part of #445,
   * because we intend to use it to filter out search results, using Xooxle's
   * 'admit' parameter.
   * @param html - The HTML content of the field.
   */
  constructor(name, html) {
    this.name = name;
    this.units = html
      .split(UNIT_DELIMITER)
      .map((unitHTML) => new Unit(unitHTML));
  }
  /**
   * @param regex - Regex to search.
   * @returns Search result.
   */
  search(regex) {
    return new FieldSearchResult(this, regex);
  }
}
/**
 * FieldSearchResult represents the search result of one field.
 */
class FieldSearchResult extends AggregateResult {
  results;
  /**
   * @param field
   * @param regex
   */
  constructor(field, regex) {
    super();
    this.results = field.units.map((unit) => unit.search(regex));
  }
  /**
   * @param href
   */
  *viewForMore(href) {
    yield document.createElement('br');
    const span = document.createElement('span');
    span.classList.add('view-for-more' /* CLS.VIEW_FOR_MORE */);
    span.append('...');
    if (!href) {
      yield span;
      return;
    }
    const a = document.createElement('a');
    a.textContent = 'view for full context';
    a.href = href;
    a.target = '_blank';
    span.append(a);
    yield span;
  }
  /**
   * @param href
   * @returns The field's HTML structure, with matches highlighted.
   */
  *highlight(href) {
    // If there are no matches, we limit the number of units in the output.
    // If there are matches:
    // - If there are only few units, we show all of them regardless of
    //   whether they have matches or not.
    // - If there are many units, we show those that have matches, even if
    //   their number exceeds the limit, because we need to show all matches.
    const results = !this.match
      ? this.results.slice(0, UNITS_LIMIT)
      : this.results.length <= UNITS_LIMIT
        ? this.results
        : this.results.filter((r) => r.match);
    const content = document.createElement('div');
    content.innerHTML = results.map((r) => r.highlight()).join(UNIT_DELIMITER);
    yield content;
    if (results.length < this.results.length) {
      yield* this.viewForMore(href);
    }
  }
}
/**
 * Unit is a unit in a field. Fields usually consist of a single unit, but
 * humongous fields can be broken up into units. Units are searched separately;
 * and, if there are too many, won't all be included in the display during a
 * search.
 */
class Unit {
  lines;
  /**
   * @param html - The HTML content of the unit.
   */
  constructor(html) {
    this.lines = html.split(LINE_BREAK).map((l) => new Line(l));
  }
  /**
   * @param regex - The regular expression to search.
   * @returns Search result.
   */
  search(regex) {
    return new UnitSearchResult(this, regex);
  }
}
/**
 * UnitSearchResult represents the search result of one unit.
 */
class UnitSearchResult extends AggregateResult {
  results;
  /**
   * @param unit - The unit to search.
   * @param regex - The regex to search.
   */
  constructor(unit, regex) {
    super();
    this.results = unit.lines.map((l) => l.search(regex));
  }
  /**
   * @returns The HTML content of the unit, with matches highlighted.
   */
  highlight() {
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
var BoundaryType;
(function (BoundaryType) {
  BoundaryType[(BoundaryType['FULL_WORD'] = 0)] = 'FULL_WORD';
  BoundaryType[(BoundaryType['PREFIX'] = 1)] = 'PREFIX';
  BoundaryType[(BoundaryType['SUFFIX'] = 2)] = 'SUFFIX';
  BoundaryType[(BoundaryType['MID_WORD'] = 3)] = 'MID_WORD';
})(BoundaryType || (BoundaryType = {}));
/**
 * Line represents a line in a unit. Units are broken into lines because we
 * don't want any search queries to spill over multiple lines.
 */
class Line {
  html;
  text;
  /**
   * @param html - The HTML content of the line.
   */
  constructor(html) {
    this.html = html;
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
  search(regex) {
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
  matches(regex) {
    return Array.from(this.text.matchAll(regex))
      .map((match) => {
        // NOTE: We need to filter out the empty string, because it could cause
        // trouble during highlighting.
        if (match.index === undefined || !match[0]) {
          return undefined;
        }
        const start = match.index;
        const end = match.index + match[0].length;
        const before = !orth.isWordChar(this.text[start - 1]);
        const after = !orth.isWordChar(this.text[end]);
        const boundaryType =
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
  builder = [];
  /**
   * open stores whether a match is currently open.
   */
  open = false;
  /**
   * @returns Whether the match is currently closed.
   */
  get closed() {
    return !this.open;
  }
  /**
   * A match opening tag.
   * Each of the (potentially several) pieces of text making up a match will be
   * surrounded by an opening and a closing tag.
   */
  static OPENING = `<span class="${'match' /* CLS.MATCH */}">`;
  /**
   * A match closing tag.
   * Each of the (potentially several) pieces of text making up a match will be
   * surrounded by an opening and a closing tag.
   */
  static CLOSING = '</span>';
  /**
   * The closing tag is not distinguishable enough, so we use this placeholder
   * first, substituting it for the actual closing tag later on.
   */
  static CLOSING_PLACEHOLDER = 'CLOSING_TAG';
  /**
   * Start a match.
   */
  openMatch() {
    if (this.open) {
      logger.error('Warning: The match is already open!');
    }
    this.open = true;
    if (
      this.builder[this.builder.length - 1] === HTMLBuilder.CLOSING_PLACEHOLDER
    ) {
      // Open a match by un-closing the previous match.
      this.builder.pop();
    } else {
      // Open a match by pushing an opening tag.
      this.builder.push(HTMLBuilder.OPENING);
    }
  }
  /**
   * End a match.
   */
  closeMatch() {
    if (this.closed) {
      logger.error('Warning: The match is already closed!');
    }
    this.open = false;
    if (this.builder[this.builder.length - 1] === HTMLBuilder.OPENING) {
      // Close the match by popping the opening tag. This is an empty match.
      this.builder.pop();
    } else {
      // Close a match by pushing a closing tag.
      this.builder.push(HTMLBuilder.CLOSING_PLACEHOLDER);
    }
  }
  /**
   * @param t
   */
  pushText(t) {
    if (!t) {
      return;
    }
    this.builder.push(t);
  }
  /**
   * @param t
   */
  pushTag(t) {
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
  build() {
    return this.builder
      .map((s) =>
        s === HTMLBuilder.CLOSING_PLACEHOLDER ? HTMLBuilder.CLOSING : s
      )
      .join('');
  }
}
/**
 * LineSearchResult represents the search result of one line.
 */
class LineSearchResult {
  line;
  matches;
  /**
   *
   * @param line - The line to search.
   * @param regex - The regex to search.
   */
  constructor(line, regex) {
    this.line = line;
    this.matches = line.matches(regex);
  }
  /**
   *
   * @returns The text content of the line.
   */
  get text() {
    return this.line.text;
  }
  /**
   *
   * @returns The HTML content of the line.
   */
  get html() {
    return this.line.html;
  }
  /**
   *
   * @returns Whether this search result has a match.
   */
  get match() {
    return !!this.matches.length;
  }
  /**
   * @returns A word that can be used as a URL fragment.
   */
  fragmentWord() {
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
  highlight() {
    if (!this.match) {
      // No highlighting needed.
      return this.html;
    }
    const builder = new HTMLBuilder();
    let htmlPos = 0,
      textPos = 0,
      matchIdx = 0,
      match = this.matches[matchIdx];
    const nextMatch = () => {
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
  boundaryType() {
    return Math.min(...this.matches.map((m) => m.boundaryType));
  }
  /**
   * @returns The number of matches in this line.
   */
  get numMatches() {
    return this.matches.length;
  }
}
/**
 * Xooxle search engine
 */
export class Xooxle {
  form;
  searchResultType;
  /**
   * The list of searchable candidates in this Xooxle index.
   */
  candidates;
  /**
   * A setTimeout object, used to debounce search triggers.
   */
  debounceTimeout = null;
  /**
   * An abort controller, used to abort ongoing searches whenever a new search
   * starts.
   */
  currentAbortController = null;
  /**
   * @param index - JSON index object.
   * @param form - Form containing HTML input and output elements.
   * @param searchResultType
   */
  constructor(index, form, searchResultType = SearchResult) {
    this.form = form;
    this.searchResultType = searchResultType;
    this.candidates = index.data.map(
      (record) => new Candidate(record, index.metadata.fields)
    );
    this.addEventListeners();
    // Handle the search query once upon loading, in case the form picked up a
    // query from the URL parameters.
    this.search(0);
    // Focus on the form, so the user can search right away.
    this.form.focus();
  }
  /**
   */
  addEventListeners() {
    // Make the page responsive to user input.
    // We need debounce timeout for search box input, because users typically
    // type several letters consecutively.
    // We don't need to do the same for checkbox events, because those events
    // typically trigger as singletons.
    this.form.addSearchBoxInputListener(
      this.search.bind(this, INPUT_DEBOUNCE_TIMEOUT)
    );
    this.form.addCheckboxClickListener(this.search.bind(this, 0));
    // Prevent other elements in the page from picking up key events on the
    // search box.
    this.form.addCheckboxKeyListener(browser.stopPropagation);
  }
  /**
   * Handle the search query, debouncing with the given timeout.
   *
   * @param timeout - How long to wait before starting search.
   */
  search(timeout) {
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
  async searchAux() {
    // If there is an ongoing search, abort it.
    this.currentAbortController?.abort();
    const abortController = new AbortController();
    this.currentAbortController = abortController;
    // Clear output fields in the form, since we're starting a new search.
    this.form.clearOutputFields();
    // Construct the query expression.
    const expression = this.form.queryExpression();
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
  async searchAuxAux(regex, abortController) {
    // TODO: (#0) We append random characters in order to avoid having timers
    // with identical names. This is not ideal. Let's supply an index name as
    // part of the metadata, and use that for logging instead.
    const name = `time-to-first-yield-${Array.from({ length: 2 }, () =>
      // eslint-disable-next-line no-magic-numbers
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
    const numBuckets = this.searchResultType.numBuckets();
    const bucketSentinels = Array.from({ length: numBuckets }, () => {
      const tr = document.createElement('tr');
      tr.style.display = 'none';
      this.form.result(tr);
      return tr;
    });
    // Search is a cheap operation that we can afford to do on all candidates in
    // the beginning.
    const results = this.candidates
      .map((can) => new this.searchResultType(can, regex))
      .filter((res) => res.match && res.filter())
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
      const row = result.row(results.length);
      bucketSentinels[
        Math.min(result.bucket(row), numBuckets - 1)
      ].insertAdjacentElement('beforebegin', row);
      if (count % RESULTS_TO_UPDATE_DISPLAY === RESULTS_TO_UPDATE_DISPLAY - 1) {
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
    this.form.resultsTBody
      .querySelectorAll(`.${'counter' /* CLS.COUNTER */}`)
      .forEach((counter) => {
        counter.textContent = `${(++i).toString()} / ${results.length.toString()}`;
      });
    // Expand the results table to accommodate the last batch of results.
    this.form.expand();
  }
}
