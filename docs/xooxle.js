import * as collapse from './collapse.js';
import * as logger from './logger.js';
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
// Our currently index building algorithm results in HTML with a simplified
// structure, with only <span> tags, styling tags, or <br> tags. Styling tags
// don't affect the output text, and are simply ignored during text search.
// Line breaks, however, require special handling.
const LINE_BREAK = '<br>';
// RESULTS_TO_UPDATE_DISPLAY specifies how often (every how many results) we
// should yield to let the browser update the display during search.
const RESULTS_TO_UPDATE_DISPLAY = 5;
const TAG_REGEX = /<\/?[^>]+>/g;
// CHROME_WORD_CHARS is a list of characters that are considered word characters
// in Chrome.
// See https://github.com/pishoyg/coptic/issues/286 for context.
const CHROME_WORD_CHARS = new Set(["'"]);
var CLS;
(function (CLS) {
  // VIEW is the class of the view table cells.
  CLS['VIEW'] = 'view';
  // ERROR is the class of the error message.
  CLS['ERROR'] = 'error';
  // COUNTER is the class of the result counters in the view cells.
  CLS['COUNTER'] = 'counter';
  CLS['DEV'] = 'dev';
  CLS['NO_DEV'] = 'no-dev';
  // MATCH is the class of text matching a given search query.
  CLS['MATCH'] = 'match';
  // VIEW_FOR_MORE is the class of the message "view for more", displayed in
  // large fields that have been cropped.
  CLS['VIEW_FOR_MORE'] = 'view-for-more';
})(CLS || (CLS = {}));
// UNIT_DELIMITER is the string that separates a units field into units.
const UNIT_DELIMITER = '<hr class="match-separator">';
// LONG_UNITS_FIELD_MESSAGE is the message shown at the end of a units field,
// if the field gets truncated.
const LONG_UNITS_FIELD_MESSAGE = `<br><span class="${'view-for-more' /* CLS.VIEW_FOR_MORE */}">... (<em>view</em> for full context)</span>`;
// Form represents a search form containing the HTML elements that the user
// interacts with to initiate and control search.
/**
 *
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
  // Search parameter names.
  static query = 'query';
  static full = 'full';
  static regex = 'regex';
  /**
   *
   * @param form
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
    this.populateFromParams();
  }
  /**
   *
   */
  queryExpression() {
    let query = this.searchBox.value;
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
  populateFromParams() {
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
  result(row) {
    this.tbody.appendChild(row);
  }
  /**
   *
   */
  expand() {
    this.collapsible.updateHeight();
  }
  /**
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
   *
   */
  clear() {
    this.tbody.replaceChildren();
    this.messageBox.replaceChildren();
  }
}
/**
 *
 */
async function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
// Candidate represents one search candidate from the index. In the results
// display, each candidate occupies its own row.
/**
 *
 */
class Candidate {
  // key bears the candidate key.
  key;
  fields;
  /**
   *
   * @param record
   * @param fields
   */
  constructor(record, fields) {
    this.key = record[KEY];
    this.fields = fields.map((name) => new Field(name, record[name]));
  }
  /**
   *
   * @param regex
   */
  search(regex) {
    return new SearchResult(this, regex);
  }
}
// SearchResult represents the search result of one candidate from the index.
/**
 *
 */
class SearchResult {
  candidate;
  results;
  /**
   *
   * @param candidate
   * @param regex
   */
  constructor(candidate, regex) {
    this.candidate = candidate;
    this.results = this.candidate.fields.map(
      (field) => new FieldSearchResult(field, regex)
    );
  }
  /**
   *
   */
  get key() {
    return this.candidate.key;
  }
  /**
   *
   */
  get match() {
    return this.results.some((result) => result.match);
  }
  /**
   *
   */
  fragmentWord() {
    return this.results.find((r) => r.fragmentWord())?.fragmentWord();
  }
  // viewCell constructs the first cell in the row for this result, bearing the
  // anchor to the result (if available).
  /**
   *
   * @param hrefFmt
   */
  viewCell(hrefFmt) {
    const viewCell = document.createElement('td');
    viewCell.classList.add('view' /* CLS.VIEW */);
    const counter = document.createElement('span');
    counter.classList.add('counter' /* CLS.COUNTER */);
    counter.innerHTML = '? / ?';
    counter.append(' ');
    viewCell.append(counter);
    const dev = document.createElement('span');
    dev.classList.add('dev' /* CLS.DEV */);
    dev.textContent = this.key;
    if (!hrefFmt) {
      viewCell.prepend(dev);
      return viewCell;
    }
    // There is an href. We create a link, and add the 'view' text.
    const a = document.createElement('a');
    a.href =
      hrefFmt.replace(`{${KEY}}`, this.key) +
      `#:~:text=${encodeURIComponent(this.fragmentWord())}`;
    a.target = '_blank';
    const noDev = document.createElement('span');
    noDev.classList.add('no-dev' /* CLS.NO_DEV */);
    noDev.textContent = 'view';
    a.appendChild(noDev);
    a.appendChild(dev);
    viewCell.prepend(a);
    return viewCell;
  }
  // row constructs the row in the results table that corresponds to this
  // result. This consists of the cell bearing the key and anchor, along with
  // the other cells containing the highlighted search fields.
  /**
   *
   * @param hrefFmt
   */
  row(hrefFmt) {
    const row = document.createElement('tr');
    row.appendChild(this.viewCell(hrefFmt));
    this.results.forEach((sr) => {
      const cell = document.createElement('td');
      cell.innerHTML = sr.highlight();
      row.appendChild(cell);
    });
    return row;
  }
  // firstMatchField returns the index of the first field containing a match.
  /**
   *
   */
  firstMatchField() {
    return this.results.findIndex((result) => result.match);
  }
}
// Field represents a search field within a candidate. In the display, while
// candidate occupies a table row, each field occupies a cell within that row.
/**
 *
 */
class Field {
  name;
  units;
  /**
   *
   * @param name
   * @param html
   */
  constructor(name, html) {
    this.name = name;
    this.units = html.split(UNIT_DELIMITER).map((html) => new Unit(html));
  }
  /**
   *
   * @param regex
   */
  search(regex) {
    return new FieldSearchResult(this, regex);
  }
}
// FieldSearchResult represents the search result of one field.
/**
 *
 */
class FieldSearchResult {
  field;
  results;
  /**
   *
   * @param field
   * @param regex
   */
  constructor(field, regex) {
    this.field = field;
    this.results = field.units.map((unit) => unit.search(regex));
  }
  /**
   *
   */
  get units() {
    return this.field.units;
  }
  /**
   *
   */
  get match() {
    return this.results.some((result) => result.match);
  }
  // highlight returns the field's HTML content, with matches highlighted.
  /**
   *
   */
  highlight() {
    let results = this.results;
    if (!this.match) {
      // If there are no matches, we limit the number of units in the output.
      results = results.slice(0, UNITS_LIMIT);
    } else if (this.units.length > UNITS_LIMIT) {
      // If there are matches:
      // - If there are only few units, we show all of them regardless of
      //   whether they have matches or not.
      // - If there are many units, we show those that have matches, even if
      //   their number exceeds the limit, because we need to show all matches.
      results = results.filter((result) => result.match);
    }
    const output = results.map((r) => r.highlight());
    return (
      output.join(UNIT_DELIMITER) +
      (output.length < this.units.length ? LONG_UNITS_FIELD_MESSAGE : '')
    );
  }
  // fragmentWord returns a word that can be used as a fragment in the URL to
  // highlight the first matching word.
  /**
   *
   */
  fragmentWord() {
    return this.results.find((r) => r.match)?.fragmentWord();
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
  html;
  lines;
  /**
   *
   * @param html
   */
  constructor(html) {
    this.html = html;
    this.lines = html.split(LINE_BREAK).map((l) => new Line(l));
  }
  /**
   *
   * @param regex
   */
  search(regex) {
    return new UnitSearchResult(this, regex);
  }
}
// UnitSearchResult represents the search result of one unit.
/**
 *
 */
class UnitSearchResult {
  unit;
  results;
  /**
   *
   * @param unit
   * @param regex
   */
  constructor(unit, regex) {
    this.unit = unit;
    this.results = this.unit.lines.map((l) => l.search(regex));
  }
  /**
   *
   */
  get match() {
    return this.results.some((r) => r.match);
  }
  /**
   *
   */
  highlight() {
    return this.results.map((r) => r.highlight()).join(LINE_BREAK);
  }
  /**
   *
   */
  fragmentWord() {
    return this.results.find((r) => r.match)?.fragmentWord();
  }
}
/**
 *
 */
class Line {
  html;
  text;
  /**
   *
   * @param html
   */
  constructor(html) {
    this.html = html;
    this.text = html.replaceAll(TAG_REGEX, '');
  }
  /**
   *
   * @param regex
   */
  search(regex) {
    return new LineSearchResult(this, regex);
  }
  /**
   *
   * @param regex
   */
  matches(regex) {
    return (
      [...this.text.matchAll(regex)]
        // We need to filter out the empty string, because it could cause
        // trouble during highlighting.
        .filter((match) => match[0])
        .map((match) => ({
          start: match.index,
          end: match.index + match[0].length,
        }))
    );
  }
}
/**
 *
 */
class LineSearchResult {
  line;
  static opening = `<span class="${'match' /* CLS.MATCH */}">`;
  static closing = '</span>';
  matches;
  /**
   *
   * @param line
   * @param regex
   */
  constructor(line, regex) {
    this.line = line;
    this.matches = line.matches(regex);
  }
  /**
   *
   */
  get text() {
    return this.line.text;
  }
  /**
   *
   */
  get html() {
    return this.line.html;
  }
  /**
   *
   */
  get match() {
    return !!this.matches.length;
  }
  /**
   *
   * @param char
   */
  static isWordChar(char) {
    // Unicode-aware boundary expansion
    if (!char) {
      return false;
    }
    return /\p{L}|\p{N}/u.test(char) || CHROME_WORD_CHARS.has(char);
  }
  /**
   *
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
    while (LineSearchResult.isWordChar(this.text[start - 1])) {
      start--;
    }
    // Expand right: Move the end index right until a word boundary is found.
    while (LineSearchResult.isWordChar(this.text[end])) {
      end++;
    }
    // Return the expanded substring.
    return this.text.substring(start, end);
  }
  /**
   *
   */
  highlight() {
    const builder = [];
    // i represents the index in the HTML.
    // j tracks the index in the text.
    // idx tracks the match index.
    // cur tracks the current match.
    // match tracks whether we currently have a match.
    let i = 0,
      j = 0,
      idx = 0,
      cur = this.matches[idx],
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
      if (cur?.start === j) {
        // A match starts at the given position. Yield an opening tag.
        match = true;
        builder.push(LineSearchResult.opening);
      } else if (cur?.end === j) {
        // A match ends at the given position. Yield a closing tag.
        builder.push(LineSearchResult.closing);
        idx += 1;
        cur = this.matches[idx];
        match = false;
      }
      if (i < this.html.length) {
        builder.push(this.html[i]);
      }
      j += 1;
      i += 1;
    }
    return builder.join('');
  }
}
/**
 *
 */
export class Xooxle {
  form;
  hrefFmt;
  data;
  metadata;
  debounceTimeout = null;
  currentAbortController = null;
  /**
   * @param index - JSON index object.
   * @param form - Form containing search elements.
   * @param hrefFmt - a format string for generating a URL to this result's
   * page. The HREF will be generated based on the KEY field of the candidate
   * by substituting the string `{KEY}`.
   * If absent, no HREF will be generated.
   */
  constructor(index, form, hrefFmt) {
    this.form = form;
    this.hrefFmt = hrefFmt;
    this.data = index.data.map(
      (record) => new Candidate(record, index.metadata.fields)
    );
    this.metadata = index.metadata;
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
  search(timeout) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      // Call the async function after the timeout.
      // Use void to ignore the returned promise.
      void this.searchAux();
      this.form.populateParams();
    }, timeout);
  }
  /**
   *
   */
  async searchAux() {
    // TODO: We append random characters in order to avoid having timers with
    // identical names. This is not ideal. Let's supply an index name as part of
    // the metadata, and use that for logging instead.
    const name = `search-${Array.from({ length: 2 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')}`;
    logger.time(name);
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    const abortController = new AbortController();
    this.currentAbortController = abortController;
    this.form.clear();
    const expression = this.form.queryExpression();
    if (!expression) {
      return;
    }
    try {
      const regex = new RegExp(expression, 'iug'); // Case-insensitive and Unicode-aware.
      await this.searchAuxAux(regex, abortController);
    } catch (err) {
      if (err instanceof SyntaxError) {
        this.form.message('Invalid regular expression!');
      } else {
        this.form.message('Internal error! Please send us an email!');
      }
    }
    logger.timeEnd(name);
  }
  /**
   *
   * @param regex
   * @param abortController
   */
  async searchAuxAux(regex, abortController) {
    let count = 0;
    // columnSentinels is a set of hidden table rows that represent sentinels
    // (anchors / break points) in the results table.
    //
    // The sentinels are used to divide the table into sections.
    // Matching results will be added right on top of the sentinels, so that
    // each sentinel represents the (hidden) bottom row of a section.
    // Results with a (first) match in their n^th column will be added on top of
    // the n^th sentinel. (By first match, we mean that a result containing a
    // match in the 1st and 2nd column, for example, will be added on top of the
    // 1st, not the 2nd, sentinel.)
    // We do so based on the assumption that the earlier columns contain more
    // relevant data. So a result with a match in the 1st column is likely more
    // interesting to the user than a result with a match in the 2nd column,
    // so it should show first.
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
    const columnSentinels = this.metadata.fields.map(() => {
      const tr = document.createElement('tr');
      tr.style.display = 'none';
      this.form.result(tr);
      return tr;
    });
    for (const res of this.data) {
      const result = res.search(regex);
      if (!result.match) {
        continue;
      }
      ++count;
      // Create a new row for the table
      const row = result.row(this.hrefFmt);
      if (abortController.signal.aborted) {
        return;
      }
      columnSentinels[result.firstMatchField()].insertAdjacentElement(
        'beforebegin',
        row
      );
      // Expand the results table to accommodate the recently added results.
      this.form.expand();
      if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
        await yieldToBrowser();
      }
    }
    let i = 0;
    [
      ...this.form.tbody.getElementsByClassName('counter' /* CLS.COUNTER */),
    ].forEach((counter) => {
      counter.innerHTML = `${(++i).toString()} / ${count.toString()}`;
    });
  }
}
