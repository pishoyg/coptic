'use strict';
const searchBox = document.getElementById('searchBox');
const fullWordCheckbox = document.getElementById('fullWordCheckbox');
const regexCheckbox = document.getElementById('regexCheckbox');
const messageBox = document.getElementById('message');
const HIGHLIGHT_COLOR = '#f0d4fc';
const RESULTS_TO_UPDATE_DISPLAY = 5;
// TODO: (#229) Use a smarter heuristic to show context. Instead of splitting
// into lines, split into meaningful search units.
class Result {
  constructor(path, text, fields) {
    this.path = path;
    this.text = text;
    this.fields = fields;
  }
  match(regex) {
    const match = this.text.match(regex);
    if (match?.index === undefined) {
      return [null, null];
    }
    const word = this.getMatchFullWords(match.index, match[0]);
    const matchedLines = [];
    this.text.split('\n').forEach((line) => {
      const highlightedLine = this.highlightAllMatches(line, regex);
      if (highlightedLine === line) {
        return;
      }
      matchedLines.push(highlightedLine);
    });
    return [word, matchedLines.join('<hr color="#E0E0E0">')];
  }
  highlightAllMatches(line, regex) {
    let result = '';
    let match;
    // Loop through all matches in the line
    while ((match = regex.exec(line)) !== null) {
      // Append the text before the match and the highlighted match
      result += line.substring(0, match.index);
      result += `<span style="background-color: ${HIGHLIGHT_COLOR};">${match[0]}</span>`;
      // Trim the already processed part of the line
      line = line.substring(match.index + match[0].length);
    }
    // Append the remaining part of the line after the last match
    result += line;
    return result;
  }
  getMatchFullWords(matchStart, match) {
    let start = matchStart;
    let end = matchStart + match.length;
    // Unicode-aware boundary expansion
    const isWordChar = (char) => /\p{L}|\p{N}/u.test(char);
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
}
// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap = (async function () {
  const xooxles = await fetch('xooxle.json')
    .then(async (resp) => await resp.json());
  return xooxles.map((xooxle) => {
    const results = xooxle.data.map((record) => {
      const path = record['path'];
      delete record['path'];
      const text = record['text'];
      delete record['text'];
      return new Result(path, text, record);
    });
    return {
      data: results,
      metadata: xooxle.metadata,
      params: xooxle.params,
    };
  });
})();
// Event listener for the search button.
let currentAbortController = null;
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
  let query = searchBox.value.trim();
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
    messageBox.innerHTML = '<em>Invalid regular expression!</em>';
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
  for (const res of xooxle.data) {
    if (abortController.signal.aborted) {
      return;
    }
    let matchedWord, matchedLines;
    try {
      [matchedWord, matchedLines] = res.match(regex);
    }
    catch {
      alert('invalid regular expression');
      break;
    }
    if (matchedWord === null || matchedLines === null) {
      continue;
    }
    ++count;
    // Create a new row for the table
    const row = document.createElement('tr');
    const viewCell = document.createElement('td');
    viewCell.innerHTML = `${String(count)}.`;
    if (xooxle.params.view) {
      viewCell.innerHTML += `<a href="${xooxle.params.path_prefix +
                (xooxle.params.retain_extension ? res.path : res.path.replace('.html', ''))}#:~:text=${encodeURIComponent(matchedWord)}" target="_blank">
      view</a>`;
    }
    row.appendChild(viewCell);
    Object.entries(res.fields).forEach(([key, value]) => {
      const cell = document.createElement('td');
      const raw = xooxle.metadata[key].raw;
      cell.innerHTML = raw ? value : value.replaceAll('\n', '<br>');
      row.appendChild(cell);
    });
    const matchesCell = document.createElement('td');
    matchesCell.innerHTML = matchedLines;
    row.appendChild(matchesCell);
    resultTable.appendChild(row);
    // TODO: Remove the dependency on the HTML structure.
    const collapsible = resultTable.parentElement.parentElement;
    if (collapsible.style.maxHeight) {
      collapsible.style.maxHeight = collapsible.scrollHeight.toString() + 'px';
    }
    if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}
let debounceTimeout = null;
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
      if (searchBox.value.trim()) {
        url.searchParams.set('query', searchBox.value.trim());
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
searchBox.addEventListener('input', () => { handleSearchQuery(100); });
fullWordCheckbox.addEventListener('click', () => { handleSearchQuery(0); });
regexCheckbox.addEventListener('click', () => { handleSearchQuery(0); });
// Check if a query is passed in the query parameters.
{
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
window.addEventListener('pageshow', () => {
  handleSearchQuery(0);
  searchBox.focus();
});
// Handle dialect highlighting.
// TODO: (#230) This is Crum-specific, and doesn't apply to all Xooxle pages.
// Remove from this file, and insert in a Crum-specific file.
// NOTE: We keep this in a separate scope to reduce the likelihood of it mixing
// with other pieces of logic.
{
  const sheet = window.document.styleSheets[0];
  const spellingRuleIndex = sheet.cssRules.length;
  const undialectedRuleIndex = sheet.cssRules.length + 1;
  const punctuationRuleIndex = sheet.cssRules.length + 2;
  function addOrReplaceRule(index, rule) {
    if (index < sheet.cssRules.length) {
      sheet.deleteRule(index);
    }
    sheet.insertRule(rule, index);
  }
  function updateDialectCSS(active) {
    const query = active === null ? '' : active.map((d) => `.${d}`).join(',');
    addOrReplaceRule(spellingRuleIndex, query
      ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: 0.3;}`
      : `.spelling, .dialect {opacity: ${String(active === null ? 1.0 : 0.3)};}`);
    addOrReplaceRule(undialectedRuleIndex, `.spelling:not(.S,.Sa,.Sf,.A,.sA,.B,.F,.Fb,.O,.NH,.Ak,.M,.L,.P,.V,.W,.U) { opacity: ${String(active === null || query !== '' ? 1.0 : 0.3)}; }`);
    addOrReplaceRule(punctuationRuleIndex, `.dialect-parenthesis, .dialect-comma, .spelling-comma, .type { opacity: ${String(active === null ? 1.0 : 0.3)}; }`);
  }
  const dialectCheckboxes = document.querySelectorAll('.dialect-checkbox');
  // When we first load the page, 'd' dictates the set of active dialects and
  // hence highlighting. We load 'd' from the local storage, and we update the
  // boxes to match this set. Then we update the CSS.
  window.addEventListener('pageshow', () => {
    const d = localStorage.getItem('d');
    const active = d === null ? null : d === '' ? [] : d.split(',');
    Array.from(dialectCheckboxes).forEach((box) => {
      box.checked = active?.includes(box.name) ?? false;
    });
    updateDialectCSS(active);
  });
  // When we click a checkbox, it is the boxes that dictate the set of active
  // dialects and highlighting. So we use the boxes to update 'd', and then
  // update highlighting.
  dialectCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      const active = Array.from(dialectCheckboxes)
        .filter((box) => box.checked)
        .map((box) => box.name);
      localStorage.setItem('d', active.join(','));
      updateDialectCSS(active);
    });
  });
  function reset(event) {
    localStorage.removeItem('d');
    dialectCheckboxes.forEach((box) => { box.checked = false; });
    updateDialectCSS(null);
    searchBox.focus();
    // Prevent clicking the button from submitting the form, thus resetting
    // everything!
    event.preventDefault();
  }
  document.getElementById('reset').addEventListener('click', reset);
  // Prevent pressing Enter from submitting the form, thus resetting everything!
  searchBox.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  });
  // Collapse logic.
  Array.prototype.forEach.call(document.getElementsByClassName('collapse'), (collapse) => {
    collapse.addEventListener('click', function () {
      // TODO: Remove the dependency on the HTML structure.
      const collapsible = collapse.nextElementSibling;
      collapsible.style.maxHeight = collapsible.style.maxHeight ? '' : collapsible.scrollHeight.toString() + 'px';
    });
    collapse.click();
  });
}
