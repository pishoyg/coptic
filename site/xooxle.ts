const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;
const messageBox = document.getElementById('message')!;

const HIGHLIGHT_COLOR = '#f0d4fc';
const RESULTS_TO_UPDATE_DISPLAY = 5;

interface Params {
  readonly view: boolean,
  readonly path_prefix: string,
  readonly retain_extension: boolean,
  readonly result_table_name: string,
}

interface Field {
  readonly raw: boolean;
}

interface Xooxle {
  readonly data: Result[];
  readonly metadata: Record<string, Field>;
  readonly params: Params;
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
const fileMap: Promise<Xooxle[]> = (async function(): Promise<Xooxle[]> {
  // NOTE: Due to this `fetch`, trying to open the website as a local file in
  // the browser may not work. You have to serve it through a server.
  interface xooxle {
    readonly data: Record<string, string>[];
    readonly metadata: Record<string, Field>;
    readonly params: Params;
  }

  const xooxles = await fetch('xooxle.json')
    .then(async (resp) => await resp.json() as xooxle[]);
  return xooxles.map((xooxle) => {
    const results = xooxle.data.map(
      (record: Record<string, string>): Result => {
        const path = record['path']!;
        delete record['path'];
        const text = record['text']!;
        delete record['text'];
        return new Result(path, text, record);
      });
    return {
      data: results,
      metadata: xooxle.metadata,
      params: xooxle.params,
    } as Xooxle;
  });
})();

// Event listener for the search button.
let currentAbortController: AbortController | null = null;

async function search() {
  if (currentAbortController) {
    currentAbortController.abort();
  }

  const abortController = new AbortController();
  currentAbortController = abortController;

  const xooxles = await fileMap;

  function clear() {
    xooxles.forEach((xooxle) => {
      document.getElementById(
        xooxle.params.result_table_name)!.querySelector('tbody')!.innerHTML = '';
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

  let regex: RegExp;
  try {
    // NOTE: We can't use the `g` flag (for global) to retrieve all regex
    // matches, because there are some limitations regarding supporting
    // regular expressions using both `u` and `g` flags.
    regex = new RegExp(query, 'iu'); // Case-insensitive and Unicode-aware.
    messageBox.innerHTML = '';
  } catch {
    clear();
    messageBox.innerHTML = '<em>Invalid regular expression!</em>';
    return;
  }

  clear(); // Clear previous results.

  xooxles.forEach((xooxle) => {
    void searchOneDictionary(regex, xooxle, abortController);
  });
}

async function searchOneDictionary(
  regex: RegExp,
  xooxle: Xooxle,
  abortController: AbortController,
) {
  let count = 0;
  const resultTable = document.getElementById(xooxle.params.result_table_name)!.querySelector('tbody')!;

  for (const res of xooxle.data) {
    if (abortController.signal.aborted) {
      return;
    }

    let matchedWord: string | null, matchedLines: string | null;
    try {
      [matchedWord, matchedLines] = res.match(regex);
    } catch {
      messageBox.innerHTML = '<em>Invalid regular expression!</em>';
      return;
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
      viewCell.innerHTML += ` <a href="${
        xooxle.params.path_prefix +
        (xooxle.params.retain_extension ? res.path : res.path.replace('.html', ''))
      }#:~:text=${encodeURIComponent(matchedWord)}" target="_blank">${
        localStorage.getItem('dev') === 'true' ?
          res.path.replace('.html', '') : 'view'
      }</a>`;
    }
    row.appendChild(viewCell);

    Object.entries(res.fields).forEach(([key, value]: [string, string]) => {
      const cell = document.createElement('td');
      const raw = xooxle.metadata[key]!.raw;
      // TODO: (#230) If the value is non-raw (meaning that it's plain text,
      // rather than raw HTML), then we should escape its special characters.
      // For example, `&` needs to be replaced with `&amp;`.
      // TODO: (#230) Consider getting rid of the `raw` parameter, and
      // populating `<br>` tags at the source. This needs some planning.
      cell.innerHTML = raw ? value : value.replaceAll('\n', '<br>');
      row.appendChild(cell);
    });

    const matchesCell = document.createElement('td');
    matchesCell.innerHTML = matchedLines;
    row.appendChild(matchesCell);

    resultTable.appendChild(row);

    // TODO: Remove the dependency on the HTML structure.
    const collapsible = resultTable.parentElement!.parentElement!;
    if (collapsible.style.maxHeight) {
      collapsible.style.maxHeight = collapsible.scrollHeight.toString() + 'px';
    }

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
      if (searchBox.value.trim()) {
        url.searchParams.set('query', searchBox.value.trim());
      } else {
        url.searchParams.delete('query');
      }
      if (fullWordCheckbox.checked) {
        url.searchParams.set('full', String(fullWordCheckbox.checked));
      } else {
        url.searchParams.delete('full');
      }
      if (regexCheckbox.checked) {
        url.searchParams.set('regex', String(regexCheckbox.checked));
      } else {
        url.searchParams.delete('regex');
      }
      window.history.replaceState('', '', url.toString());
    }
  }, timeout);
}

searchBox.addEventListener('input', () => { handleSearchQuery(100); });
// Prevent other elements in the page from picking up a `keyup` event on the
// search box.
searchBox.addEventListener('keyup', (event: KeyboardEvent) => { event.stopPropagation(); });
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

window.addEventListener('pageshow', (): void => {
  handleSearchQuery(0);
  searchBox.focus();
});

// Prevent pressing Enter from submitting the form, thus resetting everything!
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
});
