import * as logger from './logger.js';
// TODO: (#230): The following IDs should be provided by the calling script,
// instead of being hardcoded.
const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
const MESSAGE_BOX_ID = 'message';
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
// UNIT_DELIMITER is the string that separates a units field into units.
const UNIT_DELIMITER = '<hr class="match-separator">';
// Text matching a given text will be wrapped in `<span class="MATCH_CLASS">`
// tags.
const MATCH_CLASS = 'match';
// LONG_UNITS_FIELD_MESSAGE is the message shown at the end of a units field,
// if the field gets truncated.
const LONG_UNITS_FIELD_MESSAGE =
  '<br><span class="view-for-more">... (<em>view</em> for full context)</span>';
// Our currently index building algorithm results in HTML with a simplified
// structure, with only <span> tags, styling tags, or <br> tags. Styling tags
// don't affect the output text, and are simply ignored during text search.
// Line breaks, however, require special handling.
const LINE_BREAK = '<br>';
const RESULTS_TO_UPDATE_DISPLAY = 5;
const TAG_REGEX = /<\/?[^>]+>/g;
const CHROME_WORD_CHARS = new Set(["'"]);
export class Form {
  static searchBox = document.getElementById(SEARCH_BOX_ID);
  static fullWordCheckbox = document.getElementById(FULL_WORD_CHECKBOX_ID);
  static regexCheckbox = document.getElementById(REGEX_CHECKBOX_ID);
  // TODO: The message box gets written. Since multiple Xooxle instances are
  // allowed to coexist on the same page, we should create several boxes,
  // otherwise they could override each other!
  static messageBox = document.getElementById(MESSAGE_BOX_ID);
  // Search parameter names.
  static query = 'query';
  static full = 'full';
  static regex = 'regex';
  queryExpression() {
    let query = Form.searchBox.value;
    if (!query) {
      return '';
    }
    if (!Form.regexCheckbox.checked) {
      // Escape all the special characters in the string, in order to search
      // for raw matches.
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (Form.fullWordCheckbox.checked) {
      // Using Unicode-aware word boundaries: `\b` doesn't work for non-ASCII
      // so we use `\p{L}` (letter) and `\p{N}` (number) to match words in any
      // Unicode script.
      query = `(?<=^|[^\\p{L}\\p{N}])(${query})(?=$|[^\\p{L}\\p{N}])`;
    }
    return query;
  }
  populateFromParams() {
    // Populate form values using query parameters.
    const url = new URL(window.location.href);
    Form.searchBox.value = url.searchParams.get(Form.query) ?? '';
    Form.fullWordCheckbox.checked = url.searchParams.get(Form.full) === 'true';
    Form.regexCheckbox.checked = url.searchParams.get(Form.regex) === 'true';
  }
  populateParams() {
    // Populate query parameters using form values.
    const url = new URL(window.location.href);
    if (Form.searchBox.value) {
      url.searchParams.set(Form.query, Form.searchBox.value);
    } else {
      url.searchParams.delete(Form.query);
    }
    if (Form.fullWordCheckbox.checked) {
      url.searchParams.set(Form.full, String(Form.fullWordCheckbox.checked));
    } else {
      url.searchParams.delete(Form.full);
    }
    if (Form.regexCheckbox.checked) {
      url.searchParams.set(Form.regex, String(Form.regexCheckbox.checked));
    } else {
      url.searchParams.delete(Form.regex);
    }
    window.history.replaceState('', '', url.toString());
  }
  message(message) {
    const el = document.createElement('div');
    el.classList.add('error');
    el.textContent = message;
    Form.messageBox.replaceChildren(el);
  }
  clearMessage() {
    Form.messageBox.replaceChildren();
  }
}
function isWordChar(char) {
  // Unicode-aware boundary expansion
  return /\p{L}|\p{N}/u.test(char);
}
function isWordCharInChrome(char) {
  // isWordCharInChrome returns whether this character is considered a word
  // character in Chrome.
  // See https://github.com/pishoyg/coptic/issues/286 for context.
  return isWordChar(char) || CHROME_WORD_CHARS.has(char);
}
function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
export class Index {
  data;
  params;
  tbody;
  collapsible;
  /*
   * @param index: JSON index object.
   * @param tableID: ID of the <table> element that will be used to populate
   * the results.
   * @param collapsibleID: ID of the element that, when clicked, hides the
   * results table.
   */
  constructor(index, tableID, collapsibleID) {
    this.data = index.data.map(
      (record) => new Candidate(record, index.params.fields)
    );
    this.params = index.params;
    this.tbody = document.getElementById(tableID).querySelector('tbody');
    this.collapsible = document.getElementById(collapsibleID);
  }
  async search(regex, abortController) {
    let count = 0;
    // column_sentinels is a set of hidden table rows that represent sentinels
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
    const column_sentinels = this.params.fields.map(() => {
      const tr = document.createElement('tr');
      tr.style.display = 'none';
      this.tbody.appendChild(tr);
      return tr;
    });
    for (const res of this.data) {
      const result = res.search(regex);
      if (!result.match) {
        continue;
      }
      ++count;
      // Create a new row for the table
      const row = result.row(this.params.href_fmt);
      if (abortController.signal.aborted) {
        return;
      }
      column_sentinels[result.firstMatchField()].insertAdjacentElement(
        'beforebegin',
        row
      );
      if (this.collapsible.style.maxHeight) {
        this.collapsible.style.maxHeight =
          this.collapsible.scrollHeight.toString() + 'px';
      }
      // TODO: The number of results to update the display should vary based on
      // the total number of results, otherwise you might end up yielding too
      // often. Consider using a heuristic based on the number of results, and
      // the time since the last yield.
      if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
        await yieldToBrowser();
      }
    }
    let i = 0;
    this.tbody.querySelectorAll('.counter').forEach((counter) => {
      counter.innerHTML = `${(++i).toString()} / ${count.toString()}`;
    });
  }
  clear() {
    this.tbody.innerHTML = '';
  }
}
export async function index(url, tableID, collapsibleID) {
  const raw = await fetch(url);
  const json = await raw.json();
  return new Index(json, tableID, collapsibleID);
}
class Candidate {
  // key bears the candidate key.
  key;
  fields;
  constructor(record, fields) {
    this.key = record[KEY];
    this.fields = fields.map((field) => new Field(field, record[field.name]));
  }
  search(regex) {
    return new SearchResult(this, regex);
  }
}
class SearchResult {
  candidate;
  results;
  match;
  constructor(candidate, regex) {
    this.candidate = candidate;
    this.results = this.candidate.fields.map(
      (field) => new FieldSearchResult(field, regex)
    );
    this.match = this.results.some((result) => result.match);
  }
  get key() {
    return this.candidate.key;
  }
  fragmentWord() {
    return this.results.find((r) => r.fragmentWord())?.fragmentWord();
  }
  viewCell(href_fmt) {
    const viewCell = document.createElement('td');
    viewCell.classList.add('view');
    const counter = document.createElement('span');
    counter.classList.add('counter');
    counter.innerHTML = '? / ?';
    counter.append(' ');
    viewCell.append(counter);
    const dev = document.createElement('span');
    dev.classList.add('dev');
    dev.textContent = this.key;
    if (!href_fmt) {
      viewCell.prepend(dev);
      return viewCell;
    }
    // There is an href. We create a link, and add the 'view' text.
    const a = document.createElement('a');
    a.href =
      href_fmt.replace(`{${KEY}}`, this.key) +
      `#:~:text=${encodeURIComponent(this.fragmentWord())}`;
    a.target = '_blank';
    const noDev = document.createElement('span');
    noDev.classList.add('no-dev');
    noDev.textContent = 'view';
    a.appendChild(noDev);
    a.appendChild(dev);
    viewCell.prepend(a);
    return viewCell;
  }
  row(href_fmt) {
    const row = document.createElement('tr');
    row.appendChild(this.viewCell(href_fmt));
    this.results.forEach((sr) => {
      const cell = document.createElement('td');
      cell.innerHTML = sr.highlighted();
      row.appendChild(cell);
    });
    return row;
  }
  firstMatchField() {
    return this.results.findIndex((result) => result.match);
  }
}
class Field {
  units;
  name;
  constructor(field, html) {
    // TODO: Read a list of strings, instead of a single delimiter
    // separated string!
    this.name = field.name;
    const arr = field.units ? html.split(UNIT_DELIMITER) : [html];
    this.units = arr.map((html) => new Unit(html));
  }
  search(regex) {
    return new FieldSearchResult(this, regex);
  }
}
class FieldSearchResult {
  field;
  results;
  match;
  constructor(field, regex) {
    this.field = field;
    this.results = field.units.map((unit) => unit.search(regex));
    this.match = this.results.some((result) => result.match);
  }
  get name() {
    return this.field.name;
  }
  get units() {
    return this.field.units;
  }
  highlighted() {
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
  fragmentWord() {
    return this.results.find((r) => r.match)?.fragmentWord();
  }
}
class Unit {
  html;
  lines;
  constructor(html) {
    this.html = html;
    this.lines = html.split(LINE_BREAK).map((l) => new Line(l));
  }
  search(regex) {
    return new UnitSearchResult(this, regex);
  }
}
class UnitSearchResult {
  unit;
  results;
  match;
  constructor(unit, regex) {
    this.unit = unit;
    this.results = this.unit.lines.map((l) => l.search(regex));
    this.match = this.results.some((r) => r.match);
  }
  highlight() {
    return this.results.map((r) => r.highlight()).join(LINE_BREAK);
  }
  fragmentWord() {
    return this.results.find((r) => r.match)?.fragmentWord();
  }
}
class Line {
  html;
  text;
  constructor(html) {
    this.html = html;
    this.text = html.replaceAll(TAG_REGEX, '');
  }
  search(regex) {
    return new LineSearchResult(this, regex);
  }
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
class LineSearchResult {
  line;
  matches;
  constructor(line, regex) {
    this.line = line;
    this.matches = line.matches(regex);
  }
  get text() {
    return this.line.text;
  }
  get html() {
    return this.line.html;
  }
  get match() {
    return !!this.matches.length;
  }
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
    const isWordChar = isWordCharInChrome;
    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && isWordChar(this.text[start - 1])) {
      start--;
    }
    // Expand right: Move the end index right until a word boundary is found.
    while (end < this.text.length && isWordChar(this.text[end])) {
      end++;
    }
    // Return the expanded substring.
    return this.text.substring(start, end);
  }
  highlight() {
    const builder = [];
    // i represents the index in the HTML.
    // j tracks the index in the text.
    // idx tracks the match index.
    // cur tracks the current match.
    let i = 0,
      j = 0,
      idx = 0,
      cur = this.matches[idx];
    while (i <= this.html.length) {
      // If we stopped at a tag, add it to the output without searching it.
      while (this.html[i] === '<') {
        const k = this.html.indexOf('>', i) + 1;
        builder.push(this.html.slice(i, k));
        i = k;
      }
      if (cur?.start === j) {
        // A match starts at the given position. Yield an opening tag.
        builder.push(`<span class="${MATCH_CLASS}">`);
      } else if (cur?.end === j) {
        // A match ends at the given position. Yield a closing tag.
        builder.push('</span>');
        idx += 1;
        cur = this.matches[idx];
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
export class Xooxle {
  index;
  form;
  debounceTimeout = null;
  currentAbortController = null;
  constructor(index, form) {
    this.index = index;
    this.form = form;
    // Make the page responsive to user input.
    Form.searchBox.addEventListener(
      'input',
      this.handleSearchQuery.bind(this, 100)
    );
    Form.fullWordCheckbox.addEventListener(
      'click',
      this.handleSearchQuery.bind(this, 0)
    );
    Form.regexCheckbox.addEventListener(
      'click',
      this.handleSearchQuery.bind(this, 0)
    );
    this.handleSearchQuery(0);
    Form.searchBox.focus();
  }
  handleSearchQuery(timeout) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      // Call the async function after the timeout.
      // Use void to ignore the returned promise.
      void this.search();
      this.form.populateParams();
    }, timeout);
  }
  async search() {
    logger.time('search');
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    const abortController = new AbortController();
    this.currentAbortController = abortController;
    this.index.clear();
    this.form.clearMessage();
    const expression = this.form.queryExpression();
    if (!expression) {
      return;
    }
    try {
      const regex = new RegExp(expression, 'iug'); // Case-insensitive and Unicode-aware.
      await this.index.search(regex, abortController);
    } catch (err) {
      if (err instanceof SyntaxError) {
        this.form.message('Invalid regular expression!');
      } else {
        this.form.message('Internal error! Please send us an email!');
      }
    }
    logger.timeEnd('search');
  }
}
