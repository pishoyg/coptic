'use strict';
const searchBox = document.getElementById('searchBox');
const fullWordCheckbox = document.getElementById('fullWordCheckbox');
const regexCheckbox = document.getElementById('regexCheckbox');
const messageBox = document.getElementById('message');
const HIGHLIGHT_COLOR = '#f0d4fc';
const RESULTS_TO_UPDATE_DISPLAY = 5;
const TAG_REGEX = /<\/?[^>]+>/g;
class Candidate {
  constructor(path, fieldHTML) {
    this.path = path;
    this.fieldHTML = fieldHTML;
    this.fieldText = {};
    Object.entries(fieldHTML).forEach(([name, html]) => {
      this.fieldText[name] = html.replace(TAG_REGEX, '');
    });
  }
  search(regex) {
    return Object.entries(this.fieldHTML).map(([name, html]) => {
      const text = this.fieldText[name];
      const match = text.match(regex);
      if (match?.index === undefined) {
        return { match: false, name: name, html: html, word: '' };
      }
      return {
        match: true,
        name: name,
        html: Candidate.highlightAllMatches(html, text, regex),
        word: Candidate.getMatchFullWords(text, match.index, match[0]),
      };
    }).reduce((record, field_search) => (record[field_search.name] = field_search, record), {});
  }
  static findAllMatches(text, regex) {
    const matches = new Set();
    let match;
    // Loop through all matches in the line
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[0]);
      text = text.substring(match.index + match[0].length);
    }
    return matches;
  }
  static highlightOneMatch(html, target) {
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
      for (const c of target) {
        while (j < html.length && html[j] === '<') {
          j = html.indexOf('>', j) + 1;
        }
        if (j >= html.length) {
          match = false;
          break;
        }
        if (html[j] !== c) {
          match = false;
          break;
        }
        ++j;
      }
      if (match) {
        result += `<span style="background-color: ${HIGHLIGHT_COLOR};">${html.slice(i, j)}</span>`;
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
  static highlightAllMatches(html, text, regex) {
    const matches = Candidate.findAllMatches(text, regex);
    matches.forEach((m) => {
      html = Candidate.highlightOneMatch(html, m);
    });
    return html;
  }
  static getMatchFullWords(text, matchStart, match) {
    let start = matchStart;
    let end = matchStart + match.length;
    // Unicode-aware boundary expansion
    const isWordChar = (char) => /\p{L}|\p{N}/u.test(char);
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
// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap = (async function () {
  return (await fetch('xooxle.json')
    .then(async (resp) => await resp.json())).map((xooxle) => {
    return {
      data: xooxle.data.map((record) => {
        const path = record['path'];
        delete record['path'];
        return new Candidate(path, record);
      }),
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
  // idx_to_bottom is a set of hidden table rows that represent break points in
  // the results table.
  //
  // These rows are used to divide the column into sections.
  // Results with matches in their first column will be added right on top of
  // the first hidden row. Results with matches in their second column will be
  // added right on top of the second hidden row, etc.
  //
  // This allows us to avoid having to re-render the entire table on each
  // match, while making it possible to sort the results by some criterion (the
  // criterion being the index of the column of first match). We do so based on
  // the assumption that the earlier columns contain more relevant data, and
  // thus are more interesting to the user.
  //
  // Notice that we use those rows or break points as bottoms for the sections,
  // rather than tops, because we want results to expand downwards rather than
  // upwards, to avoid jitter at the top of the table, which is the area that
  // the user will be looking at.
  const idx_to_bottom = xooxle.params.field_order.map(() => {
    const tr = document.createElement('tr');
    tr.style.display = 'none';
    resultTable.appendChild(tr);
    return tr;
  });
  for (const res of xooxle.data) {
    if (abortController.signal.aborted) {
      return;
    }
    // field_searches is ordered based on the field_order parameter.
    const field_searches = (() => {
      try {
        const record = res.search(regex);
        return xooxle.params.field_order.map((name) => record[name]);
        ;
      }
      catch {
        messageBox.innerHTML = '<em>Invalid regular expression!</em>';
        return null;
      }
    })();
    if (field_searches === null) {
      continue;
    }
    if (!Object.values(field_searches).some((fs) => fs.match)) {
      continue;
    }
    ++count;
    // Create a new row for the table
    const row = document.createElement('tr');
    const viewCell = document.createElement('td');
    viewCell.classList.add('view');
    if (xooxle.params.view) {
      // Get the word of the first field that has a match.
      const word = field_searches.find((fs) => fs.match).word;
      const a = document.createElement('a');
      a.href = `${xooxle.params.path_prefix + (xooxle.params.retain_extension
        ? res.path
        : res.path.replace('.html', ''))}#:~:text=${encodeURIComponent(word)}`;
      a.target = '_blank';
      a.textContent = localStorage.getItem('dev') === 'true' ? res.path.replace('.html', '') : 'view';
      viewCell.appendChild(a);
    }
    row.appendChild(viewCell);
    field_searches.forEach((fs) => {
      const cell = document.createElement('td');
      cell.innerHTML = fs.html;
      row.appendChild(cell);
    });
    idx_to_bottom[field_searches.findIndex((fs) => fs.match)].insertAdjacentElement('beforebegin', row);
    // TODO: Remove the dependency on the HTML structure.
    const collapsible = resultTable.parentElement.parentElement;
    if (collapsible.style.maxHeight) {
      collapsible.style.maxHeight = collapsible.scrollHeight.toString() + 'px';
    }
    if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
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
    const td = tr.firstElementChild;
    td.prepend(' ');
    td.prepend(small);
  });
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
// Prevent other elements in the page from picking up a `keyup` event on the
// search box.
searchBox.addEventListener('keyup', (event) => { event.stopPropagation(); });
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
// Prevent pressing Enter from submitting the form, thus resetting everything!
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
});
