'use strict';
const searchBox = document.getElementById('searchBox');
const fullWordCheckbox = document.getElementById('fullWordCheckbox');
const regexCheckbox = document.getElementById('regexCheckbox');
const messageBox = document.getElementById('message');
// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap = (async function () {
  // NOTE: Due to this `fetch`, trying to open the website as a local file in
  // the browser may not work. You have to serve it through a server.
  return (await fetch('xooxle.json')
    .then(async (resp) => await resp.json())).map((xooxle) => ({
    data: xooxle.data.map(record => new Candidate(record, xooxle.params.fields)),
    params: xooxle.params,
  }));
})();
// Event listener for the search button.
let currentAbortController = null;
let debounceTimeout = null;
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
// LONG_UNITS_FIELD_MESSAGE is the message shown at the end of a units field,
// if the field gets truncated.
const LONG_UNITS_FIELD_MESSAGE = '<br><span class="view-for-more">... (<em>view</em> for full context)</span>';
// Our currently index building algorithm results in HTML with a simplified
// structure, with only <span> tags, styling tags, or <br> tags. Styling tags
// don't affect the output text, and are simply ignored during text search.
// Line breaks, however, require special handling.
const LINE_BREAK = '<br>';
const RESULTS_TO_UPDATE_DISPLAY = 5;
const TAG_REGEX = /<\/?[^>]+>/g;
const CHROME_WORD_CHARS = new Set([
  '\'',
]);
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
function htmlToText(html) {
  return html
    .replaceAll(LINE_BREAK, '\n')
    .replaceAll(UNIT_DELIMITER, '\n')
    .replace(TAG_REGEX, '');
}
class Candidate {
  constructor(record, fields) {
    this.key = record[KEY];
    this.search_fields = fields.map((field) => ({
      field: field,
      html: record[field.name],
      text: htmlToText(record[field.name]),
    }));
  }
  search(regex) {
    return this.search_fields.map((sf) => {
      const match = sf.text.match(regex);
      if (match?.index === undefined) {
        return {
          match: false,
          field: sf.field,
          html: sf.field.units
            ? Candidate.chopUnits(sf.html.split(UNIT_DELIMITER))
            : sf.html,
          word: '',
        };
      }
      return {
        match: true,
        field: sf.field,
        html: Candidate.highlightAllMatches(sf.html, sf.text, regex, sf.field.units),
        word: Candidate.getMatchFullWordsForTextFragments(sf.text, match.index, match[0]),
      };
    });
  }
  // TODO: (#230) This should be a method of the SearchableField type. Same
  // below.
  static findAllMatchingSubstrings(text, regex) {
    const matches = new Set();
    let match;
    // Loop through all matches in the text.
    while ((match = regex.exec(text)) !== null) {
      if (!match[0]) {
        // The regex matched the empty string! This would result in an infinite
        // loop! Throw an exception!
        throw new Error('Empty string matched by regex!');
      }
      matches.add(match[0]);
      text = text.substring(match.index + match[0].length);
    }
    return matches;
  }
  static isBoundary(str, i, i_plus_1) {
    // Return true if there is a boundary between `str[i]` and `str[i_plus_1]`.
    // This function assumes that i_plus_1 = i + 1.
    // The reason we still ask the user to pass the two indices is to make it
    // easier for them to decide where exactly they expect the boundary to be.
    if (i - 1 < 0 || i_plus_1 >= str.length) {
      return true;
    }
    if (isWordChar(str[i]) && isWordChar(str[i_plus_1])) {
      return false;
    }
    return true;
  }
  static highlightSubstring(html, target) {
    // TODO: This part of the code should be blind to the checkboxes.
    const fullWord = fullWordCheckbox.checked;
    /* Highlight all occurrences of `target` in `html`.
         * if `fullWord` is true, only highlight the full-word occurrences.
         * */
    if (!target) {
      return html;
    }
    let result = '';
    let i = 0;
    while (i <= html.length - target.length) {
      // If we stopped at a tag, add it to the output without searching it.
      while (i < html.length && html[i] === '<') {
        const k = html.indexOf('>', i) + 1;
        result += html.slice(i, k);
        i = k;
      }
      if (i >= html.length) {
        break;
      }
      // Search html at index i.
      // We attempt to have j point at the end of the match.
      let j = i;
      let match = true;
      // segments is the list of segments that we will push to the result (if we
      // end up having a match). Each segment is either:
      // - An HTML (closing or opening) tag.
      // - A piece of text.
      const segments = [];
      // last_push_end is the index of the end of the last pushed segment.
      let last_push_end = i;
      if (fullWord && !Candidate.isBoundary(html, i - 1, i)) {
        // This is not a full-word occurrence.
        match = false;
      }
      for (const c of target) {
        while (j < html.length && html[j] === '<') {
          // We have encountered a tag. Push the matching text first (if
          // non-empty). Then push the tag segment.
          if (j !== last_push_end) {
            segments.push(html.slice(last_push_end, j));
            last_push_end = j;
          }
          j = html.indexOf('>', j) + 1;
          const tag = html.slice(last_push_end, j);
          if (tag == LINE_BREAK) {
            // We don't allow a match to span multiple lines.
            match = false;
            break;
          }
          segments.push(tag);
          last_push_end = j;
        }
        if (j >= html.length) {
          match = false;
        }
        if (html[j] !== c) {
          match = false;
        }
        if (!match) {
          break;
        }
        ++j;
      }
      if (match && fullWord && !Candidate.isBoundary(html, j - 1, j)) {
        match = false;
      }
      if (match) {
        // Push the last piece of text. It's guaranteed to be non-empty, because
        // our matching algorithm always stops within a text, not a tag.
        segments.push(html.slice(last_push_end, j));
        last_push_end = j;
        // Surround all the text (non-tag) segments with <span class="match">
        // tags.
        result += segments.map((s) => s.startsWith('<') ? s : `<span class="match">${s}</span>`).join('');
        i = j;
      }
      else {
        result += html[i];
        i++;
      }
    }
    // Append any remaining characters after the last match
    result += html.slice(i);
    return result;
  }
  static chopUnits(units) {
    /* chopUnits joins at most UNITS_LIMIT units together. If we can't
         * accommodate all units, appends a message indicating the fact that more
         * content is available.
         * */
    if (!units.length) {
      return '';
    }
    if (units.length <= UNITS_LIMIT) {
      return units.join(UNIT_DELIMITER);
    }
    return units.slice(0, UNITS_LIMIT).join(UNIT_DELIMITER)
            + LONG_UNITS_FIELD_MESSAGE;
  }
  static highlightAllMatches(html, text, regex, units_field) {
    /*
         * Args:
         *   units_field: If true, split the input into units, and:
         *   - If the number of units is small (below a certain limit), output all
         *     units, with the matches highlighted.
         *   - If there are many units, output only the units with matches,
         *     separated by a delimiter. (If we opt for this, then the output will
         *     contain the units with matches, regardless of their number. They
         *     could be fewer or more numerous than the limit.)
         */
    if (units_field) {
      // TODO: Memorize the HTML and text of each unit, to speed up this
      // computation. This method should probably be polymorphic depending on
      // the field type (currently units or non-units).
      // TODO: Read a list of strings, instead of a single delimiter
      // separated string!
      // TODO: We only retain the units that have matches, and we detect that
      // by whether the unit has changed. Use a cleaner check to filter the
      // units that have matches.
      const units = html.split(UNIT_DELIMITER);
      if (units.length <= UNITS_LIMIT) {
        // The number of units is small enough to display them all.
        return Candidate.highlightAllMatches(html, text, regex, false);
      }
      const units_with_matches = units
        .map(unit => Candidate.highlightAllMatches(unit, htmlToText(unit), regex, false))
        .filter((h, idx) => units[idx] !== h);
      if (units_with_matches.length) {
        return units_with_matches.join(UNIT_DELIMITER)
                    + LONG_UNITS_FIELD_MESSAGE;
      }
      return Candidate.chopUnits(units);
    }
    // TODO: Use the regex directly for highlighting, instead of using raw
    // strings.
    const matches = Candidate.findAllMatchingSubstrings(text, regex);
    matches.forEach((m) => {
      html = Candidate.highlightSubstring(html, m);
    });
    return html;
  }
  static getMatchFullWordsForTextFragments(text, matchStart, match) {
    /* Expand the match left and right such that it contains full words, for
         * text fragment purposes.
         * See
         * https://developer.mozilla.org/en-US/docs/Web/URI/Fragment/Text_fragments
         * for information about text fragments.
         * Notice that browsers don't treat them uniformly, and we try to obtain a
         * match that will work on most browsers.
         * */
    let start = matchStart;
    let end = matchStart + match.length;
    const isWordChar = isWordCharInChrome;
    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && isWordChar(text[start - 1])) {
      start--;
    }
    // Expand right: Move the end index right until a word boundary is found.
    while (end < text.length && isWordChar(text[end])) {
      end++;
    }
    // Return the expanded substring.
    return text.substring(start, end);
  }
}
function errorMessage() {
  const message = regexCheckbox.checked ? 'Invalid regular expression!' : 'Internal error! Please send us an email!';
  return `<span class="error">${message}</div>`;
}
async function search() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  const abortController = new AbortController();
  currentAbortController = abortController;
  const xooxles = await fileMap;
  function clear() {
    xooxles.forEach((xooxle) => {
      document.getElementById(xooxle.params.result_table_name).querySelector('tbody').innerHTML = '';
    });
  }
  let query = searchBox.value;
  if (!query) {
    clear();
    return;
  }
  if (!regexCheckbox.checked) {
    // Escape all the special characters in the string, in order to search
    // for raw matches.
    query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  if (fullWordCheckbox.checked) {
    // Using Unicode-aware word boundaries: `\b` doesn't work for non-ASCII
    // so we use `\p{L}` (letter) and `\p{N}` (number) to match words in any
    // Unicode script.
    query = `(?<=^|[^\\p{L}\\p{N}])${query}(?=$|[^\\p{L}\\p{N}])`;
  }
  let regex;
  try {
    // NOTE: We can't use the `g` flag (for global) to retrieve all regex
    // matches, because there are some limitations regarding supporting
    // regular expressions using both `u` and `g` flags.
    regex = new RegExp(query, 'iu'); // Case-insensitive and Unicode-aware.
    messageBox.innerHTML = '';
  }
  catch {
    clear();
    messageBox.innerHTML = errorMessage();
    return;
  }
  clear(); // Clear previous results.
  xooxles.forEach((xooxle) => {
    void searchOneDictionary(regex, xooxle, abortController);
  });
}
async function searchOneDictionary(regex, xooxle, abortController) {
  let count = 0;
  const resultTable = document.getElementById(xooxle.params.result_table_name).querySelector('tbody');
  // column_sentinels is a set of hidden table rows that represent sentinels
  // (anchors / break points) in the results table.
  //
  // The sentinels are used to divide the table into sections.
  // Matching results will be added right on top of the sentinels, so that each
  // sentinel represents the (hidden) bottom row of a section.
  // Results with a (first) match in their n^th column will be added on top of
  // the n^th sentinel. (By first match, we mean that a result containing a
  // match in the 1st and 2nd column, for example, will be added on top of the
  // 1st, not the 2nd, sentinel.)
  // We do so based on the assumption that the earlier columns contain more
  // relevant data. So a result with a match in the 1st column is likely more
  // interesting to the user than a result with a match in the 2nd column, so it
  // should show first.
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
  const column_sentinels = xooxle.params.fields.map(() => {
    const tr = document.createElement('tr');
    tr.style.display = 'none';
    resultTable.appendChild(tr);
    return tr;
  });
  for (const res of xooxle.data) {
    if (abortController.signal.aborted) {
      return;
    }
    // field_searches is ordered based on the fields parameter.
    const search_results = (() => {
      try {
        return res.search(regex);
      }
      catch {
        messageBox.innerHTML = errorMessage();
        return null;
      }
    })();
    if (search_results === null) {
      // Searching the current candidate has failed. The same will likely happen
      // with future candidates. Abort.
      return;
    }
    if (!Object.values(search_results).some((sr) => sr.match)) {
      continue;
    }
    ++count;
    // Create a new row for the table
    const row = document.createElement('tr');
    // Add the view cell.
    const viewCell = document.createElement('td');
    const viewTable = document.createElement('table');
    const viewRow = document.createElement('tr');
    const viewIndexCell = document.createElement('td');
    viewTable.classList.add('view-table');
    viewIndexCell.classList.add('view-index');
    viewIndexCell.innerHTML = '&nbsp;';
    viewRow.appendChild(viewIndexCell);
    viewTable.appendChild(viewRow);
    viewCell.appendChild(viewTable);
    if (xooxle.params.href_fmt) {
      // Get the word of the first field that has a match.
      const word = search_results.find((sr) => sr.match).word;
      const a = document.createElement('a');
      a.href = xooxle.params.href_fmt.replace(`{${KEY}}`, res.key) + `#:~:text=${encodeURIComponent(word)}`;
      a.target = '_blank';
      a.textContent = localStorage.getItem('dev') === 'true' ? res.key : 'view';
      const viewLinkCell = document.createElement('td');
      viewLinkCell.appendChild(a);
      viewRow.appendChild(viewLinkCell);
    }
    row.appendChild(viewCell);
    // Add the content cells.
    search_results.forEach((sr) => {
      const cell = document.createElement('td');
      cell.innerHTML = sr.html;
      row.appendChild(cell);
    });
    // Insert the row in the correct position.
    column_sentinels[search_results.findIndex((sr) => sr.match)].insertAdjacentElement('beforebegin', row);
    // TODO: Remove the dependency on the HTML structure.
    const collapsible = resultTable.parentElement.parentElement;
    if (collapsible.style.maxHeight) {
      collapsible.style.maxHeight = collapsible.scrollHeight.toString() + 'px';
    }
    if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  // Add the indices to the view cell.
  let counter = 0;
  resultTable.childNodes.forEach((node) => {
    const tr = node;
    if (tr.style.display === 'none') {
      // This is one of the sentinel rows. Nothing to do here!
      return;
    }
    const small = document.createElement('small');
    small.classList.add('very-light');
    small.innerHTML = `${(++counter).toString()} / ${count.toString()}`;
    const td = tr
      .firstElementChild // <td>
      ?.firstElementChild // <table class="view-table">
      ?.firstElementChild // <tr>
      ?.firstElementChild;
    td.innerHTML = ''; // Clear the previous placeholder.
    td.prepend(small);
  });
}
function handleSearchQuery(timeout) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    // Call the async function after the timeout.
    // Use void to ignore the returned promise.
    try {
      void search();
    }
    finally {
      // Update the URL.
      const url = new URL(window.location.href);
      if (searchBox.value) {
        url.searchParams.set('query', searchBox.value);
      }
      else {
        url.searchParams.delete('query');
      }
      if (fullWordCheckbox.checked) {
        url.searchParams.set('full', String(fullWordCheckbox.checked));
      }
      else {
        url.searchParams.delete('full');
      }
      if (regexCheckbox.checked) {
        url.searchParams.set('regex', String(regexCheckbox.checked));
      }
      else {
        url.searchParams.delete('regex');
      }
      window.history.replaceState('', '', url.toString());
    }
  }, timeout);
}
// Check if a query is passed in the query parameters.
function executeQueryParameters() {
  let found = false;
  const url = new URL(window.location.href);
  const query = url.searchParams.get('query');
  if (query) {
    found = true;
    searchBox.value = query;
  }
  const fullWord = url.searchParams.get('full');
  if (fullWord !== null) {
    found = true;
    fullWordCheckbox.checked = fullWord === 'true';
  }
  const useRegex = url.searchParams.get('regex');
  if (useRegex !== null) {
    found = true;
    regexCheckbox.checked = useRegex === 'true';
  }
  if (found) {
    handleSearchQuery(0);
  }
}
function maybeRecommendChrome() {
  if (navigator.userAgent.toLowerCase().includes('chrome')) {
    // We are on Chrome already!
    return;
  }
  if (Math.random() >= 0.5) {
    return;
  }
  const elem = document.getElementById('use-chrome');
  if (!elem) {
    return;
  }
  elem.style.display = 'block';
}
function xooxleMain() {
  // We intentionally recommend Chrome first thing because, if we're on a
  // different browser, and we try to do something else first, the code might
  // break by the time we get to the recommendation.
  maybeRecommendChrome();
  executeQueryParameters();
  // Prevent other elements in the page from picking up key events on the
  // search box.
  searchBox.addEventListener('keyup', (event) => { event.stopPropagation(); });
  searchBox.addEventListener('keydown', (event) => { event.stopPropagation(); });
  searchBox.addEventListener('keypress', (event) => { event.stopPropagation(); });
  // Make the page responsive to user input.
  searchBox.addEventListener('input', () => { handleSearchQuery(100); });
  fullWordCheckbox.addEventListener('click', () => { handleSearchQuery(0); });
  regexCheckbox.addEventListener('click', () => { handleSearchQuery(0); });
  window.addEventListener('pageshow', () => {
    handleSearchQuery(0);
    searchBox.focus();
  });
}
xooxleMain();
