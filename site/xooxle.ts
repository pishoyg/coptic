const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;
const resultTable = document.getElementById('resultTable')!.querySelector('tbody')!;

const HIGHLIGHT_COLOR = '#f0d4fc';

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

  match(query: string, fullWord: boolean, useRegex: boolean):
    [string | null, string | null] {
    if (!useRegex) {
      // Escape all the special characters in the string, in order to search
      // for raw matches.
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (fullWord) {
      // Using Unicode-aware word boundaries: `\b` doesn't work for non-ASCII
      // so we use `\p{L}` (letter) and `\p{N}` (number) to match words in any
      // Unicode script.
      query = `(?<=^|[^\\p{L}\\p{N}])${query}(?=$|[^\\p{L}\\p{N}])`;
    }
    try {
      // NOTE: We can't use the `g` flag (for global) to retrieve all regex
      // matches, because there are some limitations regarding supporting
      // regular expressions using both `u` and `g` flags.
      const regex = new RegExp(query, 'iu'); // Case-insensitive and Unicode-aware.
      const match = this.text.match(regex);
      if (match?.index === undefined) {
        return [null, null];
      }
      // With `fullWord`, we already force matching to be restricted to full
      // words, so there is nothing that we need to do expand our match to fall
      // on word boundaries, it's already the case.
      // Otherwise, we have to expand our boundaries.
      const word = fullWord ? match[0] :
        this.getMatchFullWords(match.index, match[0]);

      const matchedLines: string[] = [];
      this.text.split('\n').forEach((line: string) => {
        const highlightedLine = this.highlightAllMatches(line, regex);
        if (highlightedLine === line) {
          return;
        }
        matchedLines.push(highlightedLine);
      });
      return [word, matchedLines.join('<hr color="#E0E0E0">')];
    } catch {
      alert('Invalid regular expression');
      return [null, null];
    }
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

  const query = searchBox.value.trim();
  const fullWord = fullWordCheckbox.checked;
  const useRegex = regexCheckbox.checked;

  if (!query) {
    resultTable.innerHTML = ''; // Clear previous results.
    return;
  }

  const xooxle = await fileMap;

  resultTable.innerHTML = ''; // Clear previous results.

  let found = false;

  for (const res of xooxle.data) {
    if (abortController.signal.aborted) {
      return;
    }

    const [matchedWord, matchedLines] = res.match(query, fullWord, useRegex);
    if (matchedWord === null || matchedLines === null) {
      continue;
    }
    found = true;

    // Create a new row for the table
    const row = document.createElement('tr');

    const viewCell = document.createElement('td');
    viewCell.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
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

    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!found && !abortController.signal.aborted) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.setAttribute('colspan', '2');
    cell.textContent = 'No matching files found.';
    row.appendChild(cell);
    resultTable.appendChild(row);
  }
}

let debounceTimeout: number | null = null;

function handleSearchQuery(timeout = 100) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    // Call the async function after the timeout.
    // Use void to ignore the returned promise.
    void search();
  }, timeout);
}

searchBox.addEventListener('input', () => { handleSearchQuery(100); });
searchBox.addEventListener('keypress', () => { handleSearchQuery(100); });
fullWordCheckbox.addEventListener('click', () => { handleSearchQuery(0); });
regexCheckbox.addEventListener('click', () => { handleSearchQuery(0); });

// Handle dialect highlighting.
// TODO: (#230) This is Crum-specific, and doesn't apply to all Xooxle pages.
// Remove from this file, and insert in a Crum-specific file.
const dialectCheckboxes = document.querySelectorAll<HTMLInputElement>(
  '.dialect-checkbox');
const sheet = window.document.styleSheets[0]!;

const spellingRuleIndex = sheet.cssRules.length;
const initSpellingRule = '.spelling, .dialect { opacity: 1.0; }';
sheet.insertRule(initSpellingRule, spellingRuleIndex);

const undialectedRuleIndex = sheet.cssRules.length;
const undialectedQuery = '.spelling:not(.S,.Sa,.Sf,.A,.sA,.B,.F,.Fb,.O,.NH)';
const initUndialectedRule = `${undialectedQuery} { opacity: 1.0; }`;
sheet.insertRule(initUndialectedRule, undialectedRuleIndex);

const punctuationQuery = '.dialect-parenthesis, .dialect-comma, .spelling-comma';
const punctuationRuleIndex = sheet.cssRules.length;
const initPuncutationRule = `${punctuationQuery} { opacity: 1.0; }`;
sheet.insertRule(initPuncutationRule, punctuationRuleIndex);

function replaceRule(index: number, rule: string) {
  sheet.deleteRule(index);
  sheet.insertRule(rule, index);
}

function updateDialectHighlighting(init = false) {
  if (init) {
    console.log(initSpellingRule, initUndialectedRule, initSpellingRule);
    replaceRule(spellingRuleIndex, initSpellingRule);
    replaceRule(undialectedRuleIndex, initUndialectedRule);
    replaceRule(punctuationRuleIndex, initPuncutationRule);
    return;
  }
  const enabled: string[] = Array.from(dialectCheckboxes)
    .filter((box: HTMLInputElement) => box.checked)
    .map((box) => box.name);
  const query: string = enabled.map((d) => `.${d}`).join(',');
  // The 'd' parameter is not used in this script. It's used in the pages of
  // individual words for dialect highlighting.
  localStorage.setItem('d', enabled.join(','));
  const spellingRule = query
    ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: 0.3;}`
    : '.spelling, .dialect {opacity: 0.3;}';
  replaceRule(spellingRuleIndex, spellingRule);
  replaceRule(undialectedRuleIndex,
    `${undialectedQuery} { opacity: ${String(query ? 1.0 : 0.3)}; }`);
  replaceRule(punctuationRuleIndex,
    '.dialect-parenthesis, .dialect-comma, .spelling-comma { opacity: 0.3; }');
}

dialectCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('click', () => { updateDialectHighlighting(false); });
});

window.addEventListener('pageshow', (): void => {
  // Handle dialect highlighting, in case it changed on another page.
  const d = localStorage.getItem('d');
  if (d === null) {
    dialectCheckboxes.forEach((box) => {
      box.checked = false;
    });
    updateDialectHighlighting(true);
  }
  else {
    const active: Set<string> = new Set<string>(
      d === '' ? [] : d.split(',')
    );
    dialectCheckboxes.forEach((box) => {
      box.checked = active.has(box.name);
    });
    updateDialectHighlighting(false);
  }
  // Handle the search query.
  handleSearchQuery(0);
  // Focus on the search box.
  searchBox.focus();
});
