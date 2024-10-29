const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;
const messageBox = document.getElementById('message')!;

const HIGHLIGHT_COLOR = '#f0d4fc';
const RESULTS_TO_UPDATE_DISPLAY = 5;
const TAG_REGEX = /<\/?[^>]+>/g;

interface Params {
  // result_table_name is the ID of the table containing the results in the HTML
  // page. Xooxle will retrieve the element using this ID, and will populated
  // with the results encountered.
  readonly result_table_name: string,
  // The following parameters determine the behavior of the view column in the
  // results table.
  // - view determines whether the path / key will be shown at all. If false,
  //   the view column will have a mere index.
  // - path_prefix is the prefix to be prepended to the path.
  // - retain_extension determines whether the `.html` extension will be
  //   retained.
  // For example, with the following configuration:
  //   view = true;
  //   path_prefix = 'https://www.google.com/search?q=';
  //   retain_extension = false;
  // A key / path of `hello.html` would result in the view column bearing a
  // link to 'https://www.google.com/search?q=hello'.
  readonly view: boolean,
  readonly path_prefix: string,
  readonly retain_extension: boolean,
  // field_order is the order of the fields in the results table.
  readonly field_order: string[],
}

interface Xooxle {
  // data contains our candidate search results.
  readonly data: Candidate[];
  // params bears the search parameters.
  readonly params: Params;
}

interface FieldSearch {
  // match indicates whether a match has been found.
  readonly match: boolean;
  // name bears the field name.
  readonly name: string;
  // html bears the HTML content of the field, with the matches highlighted.
  readonly html: string;
  // word bears a full matching word.
  readonly word: string;
}

class Candidate {
  // path bears a path / key for this candidate.
  readonly path: string;
  // fieldHTML bears the HTML content of each searchable field.
  private readonly fieldHTML: Record<string, string>;
  // fieldText bears the plain text content of each searchable field.
  private readonly fieldText: Record<string, string>;
  public constructor(
    path: string, fieldHTML: Record<string, string>) {
    this.path = path;
    this.fieldHTML = fieldHTML;
    this.fieldText = {};
    Object.entries(fieldHTML).forEach(([name, html]: [string, string]) => {
      this.fieldText[name] = html.replace(TAG_REGEX, '');
    });
  }

  public search(regex: RegExp): Record<string, FieldSearch> {
    return Object.entries(this.fieldHTML).map(
      ([name, html]: [string, string]): FieldSearch => {
        const text = this.fieldText[name]!;
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
      }).reduce<Record<string, FieldSearch>>(
        (record: Record<string, FieldSearch>, field_search: FieldSearch) =>
          (record[field_search.name] = field_search, record),
        {});
  }

  private static findAllMatches(text: string, regex: RegExp): Set<string> {
    const matches = new Set<string>();
    let match;

    // Loop through all matches in the line
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[0]);
      text = text.substring(match.index + match[0].length);
    }
    return matches;
  }

  private static highlightOneMatch(html: string, target: string): string {
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
      } else {
        result += html[i]!;
        i++;
      }
    }

    // Append any remaining characters after the last match
    result += html.slice(i);

    return result;
  }

  private static highlightAllMatches(
    html: string, text: string, regex: RegExp): string {
    const matches = Candidate.findAllMatches(text, regex);
    matches.forEach((m: string) => {
      html = Candidate.highlightOneMatch(html, m);
    });
    return html;
  }

  private static getMatchFullWords(
    text: string, matchStart: number, match: string
  ): string {
    let start = matchStart;
    let end = matchStart + match.length;

    // Unicode-aware boundary expansion
    const isWordChar = (char: string) => /\p{L}|\p{N}/u.test(char);

    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && isWordChar(text[start - 1]!)) {
      start--;
    }

    // Expand right: Move the end index right until a word boundary is found.
    while (end < text.length && isWordChar(text[end]!)) {
      end++;
    }

    // Return the expanded substring.
    return text.substring(start, end);
  }
}

// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap: Promise<Xooxle[]> = (async function(): Promise<Xooxle[]> {
  // NOTE: Due to this `fetch`, trying to open the website as a local file in
  // the browser may not work. You have to serve it through a server.
  interface xooxle {
    readonly data: Record<string, string>[];
    readonly params: Params;
  }

  return (await fetch('xooxle.json')
    .then(async (resp) => await resp.json() as xooxle[])).map(
    (xooxle: xooxle) => {
      return {
        data: xooxle.data.map(
          (record: Record<string, string>): Candidate => {
            const path = record['path']!;
            delete record['path'];
            return new Candidate(path, record);
          }),
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

    // field_searches is ordered based on the field_order parameter.
    const field_searches: FieldSearch[] | null = (() => {
      try {
        const record = res.search(regex);
        return xooxle.params.field_order.map((name) => record[name]!);;
      } catch {
        messageBox.innerHTML = '<em>Invalid regular expression!</em>';
        return null;
      }
    })();

    if (field_searches === null) {
      continue;
    }

    if (!Object.values(field_searches).some((fs: FieldSearch) => fs.match)) {
      continue;
    }

    ++count;

    // Create a new row for the table
    const row = document.createElement('tr');

    const viewCell = document.createElement('td');
    viewCell.classList.add('view');
    viewCell.innerHTML = `${String(count)}.`;
    if (xooxle.params.view) {
      // Get the word of the first field that has a match.
      const word: string = field_searches.find(
        (fs: FieldSearch) => fs.match)!.word;
      viewCell.innerHTML += ` <a href="${xooxle.params.path_prefix +
        (xooxle.params.retain_extension ? res.path : res.path.replace('.html', ''))
      }#:~:text=${encodeURIComponent(word)}" target="_blank">${localStorage.getItem('dev') === 'true' ?
        res.path.replace('.html', '') : 'view'
      }</a>`;
    }
    row.appendChild(viewCell);

    field_searches.forEach((fs: FieldSearch) => {
      const cell = document.createElement('td');
      cell.innerHTML = fs.html;
      row.appendChild(cell);
    });

    // TODO: (#229) We want to sort results based on relevance. However, we
    // don't want to first retrieve all results and then sort them, as they
    // would reduce responsiveness. We should continue to display results "on
    // the fly" as we find them, but insert them at locations in the table
    // based on which field has matches.
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
