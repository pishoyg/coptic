const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;
const resultTable = document.getElementById('resultTable')!.querySelector('tbody')!;

const HIGHLIGHT_COLOR = '#f0d4fc';
const RESULTS_TO_UPDATE_DISPLAY = 5;

interface Field {
  readonly raw: boolean;
}
interface Xooxle {
  readonly data: Result[];
  readonly metadata: Record<string, Field>;
}

// TODO: (#229) Use a smarter heuristic to show context. Instead of splitting
// into lines, split into meaningful search units.
class Result {
  readonly path: string;
  readonly text: string;
  readonly fields: Record<string, string>;
  public constructor(
    path: string, text: string, fields: Record<string, string>) {
    this.path = path;
    this.text = text;
    this.fields = fields;
  }

  match(regex: RegExp): [string | null, string | null] {
    const match = this.text.match(regex);
    if (match?.index === undefined) {
      return [null, null];
    }
    const word = this.getMatchFullWords(match.index, match[0]);

    const matchedLines: string[] = [];
    this.text.split('\n').forEach((line: string) => {
      const highlightedLine = this.highlightAllMatches(line, regex);
      if (highlightedLine === line) {
        return;
      }
      matchedLines.push(highlightedLine);
    });
    return [word, matchedLines.join('<hr color="#E0E0E0">')];
  }

  highlightAllMatches(line: string, regex: RegExp): string {
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

  getMatchFullWords(matchStart: number, match: string): string {
    let start = matchStart;
    let end = matchStart + match.length;

    // Unicode-aware boundary expansion
    const isWordChar = (char: string) => /\p{L}|\p{N}/u.test(char);

    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && isWordChar(this.text[start - 1]!)) {
      start--;
    }

    // Expand right: Move the end index right until a word boundary is found.
    while (end < this.text.length && isWordChar(this.text[end]!)) {
      end++;
    }

    // Return the expanded substring.
    return this.text.substring(start, end);
  }
}

// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap: Promise<Xooxle> = (async function(): Promise<Xooxle> {
  // NOTE: Due to this `fetch`, trying to open the website as a local file in
  // the browser may not work. You have to serve it through a server.
  interface xooxle {
    readonly data: Record<string, string>[];
    readonly metadata: Record<string, Field>;
  }

  const xooxle = await fetch('xooxle.json')
    .then(async (resp) => await resp.json() as xooxle);
  const results = xooxle.data.map((record: Record<string, string>): Result => {
    const path = record['path']!;
    delete record['path'];
    const text = record['text']!;
    delete record['text'];
    return new Result(path, text, record);
  });
  return {
    data: results,
    metadata: xooxle.metadata,
  } as Xooxle;
})();

// Event listener for the search button.
let currentAbortController: AbortController | null = null;

async function search() {
  if (currentAbortController) {
    currentAbortController.abort();
  }

  const abortController = new AbortController();
  currentAbortController = abortController;

  let query = searchBox.value.trim();
  if (!query) {
    resultTable.innerHTML = ''; // Clear previous results.
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

  let regex: RegExp;
  try {
    // NOTE: We can't use the `g` flag (for global) to retrieve all regex
    // matches, because there are some limitations regarding supporting
    // regular expressions using both `u` and `g` flags.
    regex = new RegExp(query, 'iu'); // Case-insensitive and Unicode-aware.
  } catch {
    alert('invalid regular expression');
    return;
  }

  const xooxle = await fileMap;

  resultTable.innerHTML = ''; // Clear previous results.

  let count = 0;
  for (const res of xooxle.data) {
    if (abortController.signal.aborted) {
      return;
    }

    let matchedWord: string | null, matchedLines: string | null;
    try {
      [matchedWord, matchedLines] = res.match(regex);
    } catch {
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
    viewCell.innerHTML = `${String(count)}.
      <a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      view</a>`;
    row.appendChild(viewCell);

    Object.entries(res.fields).forEach(([key, value]: [string, string]) => {
      const cell = document.createElement('td');
      const raw = xooxle.metadata[key]!.raw;
      cell.innerHTML = raw ? value : value.replaceAll('\n', '<br>');
      row.appendChild(cell);
    });

    const matchesCell = document.createElement('td');
    matchesCell.innerHTML = matchedLines;
    row.appendChild(matchesCell);

    resultTable.appendChild(row);

    if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

let debounceTimeout: number | null = null;

function handleSearchQuery(timeout: number) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    // Call the async function after the timeout.
    // Use void to ignore the returned promise.
    try {
      void search();
    } finally {
      // Update the URL.
      const url = new URL(window.location.href);
      url.searchParams.set('query', searchBox.value.trim());
      url.searchParams.set('full', String(fullWordCheckbox.checked));
      url.searchParams.set('regex', String(regexCheckbox.checked));
      window.history.replaceState('', '', url.toString());
    }
  }, timeout);
}

searchBox.addEventListener('input', () => { handleSearchQuery(100); });
fullWordCheckbox.addEventListener('click', () => { handleSearchQuery(0); });
regexCheckbox.addEventListener('click', () => { handleSearchQuery(0); });

// Handle dialect highlighting.
// TODO: (#230) This is Crum-specific, and doesn't apply to all Xooxle pages.
// Remove from this file, and insert in a Crum-specific file.
const sheet = window.document.styleSheets[0]!;

const spellingRuleIndex = sheet.cssRules.length;
const undialectedRuleIndex = sheet.cssRules.length + 1;
const punctuationRuleIndex = sheet.cssRules.length + 2;

function addOrReplaceRule(index: number, rule: string) {
  if (index < sheet.cssRules.length) {
    sheet.deleteRule(index);
  }
  sheet.insertRule(rule, index);
}

function updateDialectCSS(active: string[] | null) {
  const query: string = active === null ? '' : active.map((d) => `.${d}`).join(',');

  addOrReplaceRule(
    spellingRuleIndex,
    query
      ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: 0.3;}`
      : `.spelling, .dialect {opacity: ${String(active === null ? 1.0 : 0.3)};}`);
  addOrReplaceRule(
    undialectedRuleIndex,
    `.spelling:not(.S,.Sa,.Sf,.A,.sA,.B,.F,.Fb,.O,.NH) { opacity: ${String(active === null || query !== '' ? 1.0 : 0.3)}; }`);
  addOrReplaceRule(
    punctuationRuleIndex,
    `.dialect-parenthesis, .dialect-comma, .spelling-comma { opacity: ${String(active === null ? 1.0 : 0.3)}; }`);
}

const dialectCheckboxes = document.querySelectorAll<HTMLInputElement>(
  '.dialect-checkbox');

// When we first load the page, 'd' dictates the set of active dialects and
// hence highlighting. We load 'd' from the local storage, and we update the
// boxes to match this set. Then we update the CSS.
window.addEventListener('pageshow', (): void => {
  const d = localStorage.getItem('d');
  const active: string[] | null =
    d === null ? null : d === '' ? [] : d.split(',');
  Array.from(dialectCheckboxes).forEach((box) => {
    box.checked = active?.includes(box.name) ?? false;
  });
  updateDialectCSS(active);
  handleSearchQuery(0);
  searchBox.focus();
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

function reset(event: Event) {
  localStorage.removeItem('d');
  dialectCheckboxes.forEach((box) => { box.checked = false; });
  updateDialectCSS(null);
  searchBox.focus();
  // Prevent clicking the button from submitting the form, thus resetting
  // everything!
  event.preventDefault();
}

document.getElementById('reset')!.addEventListener('click', reset);
// Prevent pressing Enter from submitting the form, thus resetting everything!
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
});

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
