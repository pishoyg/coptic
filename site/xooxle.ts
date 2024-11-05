const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;
const messageBox = document.getElementById('message')!;

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
// UNIT_SEPARATOR is the string that separates a units field into units.
const UNIT_DELIMITER = '<hr class="match-separator">';
// LONG_UNITS_FIELD_MESSAGE is the message shown at the end of a units field,
// if the field gets truncated.
const LONG_UNITS_FIELD_MESSAGE = '<br><span class="view-for-more">... (<em>view</em> for more)</span>';

const RESULTS_TO_UPDATE_DISPLAY = 5;
const TAG_REGEX = /<\/?[^>]+>/g;

interface Field {
  readonly name: string;
  readonly units: boolean;
}

interface Params {
  // result_table_name is the ID of the table containing the results in the HTML
  // page. Xooxle will retrieve the element using this ID, and will populated
  // with the results encountered.
  readonly result_table_name: string,
  // href_fmt is a format string for generating a URL to this result's page.
  // The HREF will be generated based on the KEY field of the candidate by
  // substituting the string `{KEY}`.
  // If href_fmt is zero (the empty string), no HREF will be generated.
  readonly href_fmt: string,
  // fields is the list of fields in the output. For each
  // search result from the data, a row will be added to the table.
  // The first cell in the row will contain the index of the result, and
  // potentially the HREF to the result page. The following cells will contain
  // other fields from the result, in this order.
  // TODO: Document the behavior about whether fields present in the input but
  // absent from this list get searched or not. Consider ensuring that it's
  // possible to search a field that doesn't necessarily show in the output.
  // This may be a desirable use case.
  readonly fields: Field[],
}

interface Xooxle {
  // data contains our candidate search results.
  readonly data: Candidate[];
  // params bears the search parameters.
  readonly params: Params;
}

interface SearchResult {
  // field bears the field metadata.
  readonly field: Field;
  // match indicates whether a match has been found.
  readonly match: boolean;
  // html bears the HTML content of the field, with the matches highlighted.
  readonly html: string;
  // word bears a full matching word.
  readonly word: string;
}

interface SearchableField {
  // field bears the field metadata.
  readonly field: Field;
  // html bears the HTML content of each searchable field.
  readonly html: string;
  // text bears the plain text content of each searchable field.
  readonly text: string;
}

class Candidate {
  // key bears the candidate key.
  readonly key: string;
  private readonly search_fields: SearchableField[];

  public constructor(
    record: Record<string, string>,
    fields: Field[],
  ) {
    this.key = record[KEY]!;
    this.search_fields = fields.map((field: Field) => (
      {
        field: field,
        html: record[field.name]!,
        text: record[field.name]!.replace(TAG_REGEX, ''),
      } as SearchableField
    ));
  }

  public search(regex: RegExp): SearchResult[] {
    return this.search_fields.map(
      (sf: SearchableField): SearchResult => {
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
          html: Candidate.highlightAllMatches(
            sf.html,
            sf.text,
            regex,
            sf.field.units,
          ),
          word: Candidate.getMatchFullWords(sf.text, match.index, match[0]),
        };
      });
  }

  // TODO: (#230) This should be a method of the SearchableField type. Same
  // below.
  private static findAllMatches(text: string, regex: RegExp): Set<string> {
    const matches = new Set<string>();
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
      // segments is the list of segments that we will push to the result (if we
      // end up having a match). Each segment is either:
      // - An HTML (closing or opening) tag.
      // - A piece of text.
      const segments: string[] = [];
      // last_push_end is the index of the end of the last pushed segment.
      let last_push_end = i;

      for (const c of target) {
        while (j < html.length && html[j] === '<') {
          // We have encountered a tag. Push the matching text first (if
          // non-empty). Then push the tag segment.
          if (j !== last_push_end) {
            segments.push(html.slice(last_push_end, j));
            last_push_end = j;
          }
          j = html.indexOf('>', j) + 1;
          segments.push(html.slice(last_push_end, j));
          last_push_end = j;
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
        // Push the last piece of text. It's guaranteed to be non-empty, because
        // our matching algorithm always stops within a text, not a tag.
        segments.push(html.slice(last_push_end, j));
        last_push_end = j;
        // Surround all the text (non-tag) segments with <span class="match">
        // tags.
        result += segments.map(
          (s: string) => s.startsWith('<') ? s : `<span class="match">${s}</span>`
        ).join('');
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

  private static chopUnits(units: string[]): string {
    if (!units.length) {
      return '';
    }
    if (units.length <= UNITS_LIMIT) {
      return units.join(UNIT_DELIMITER);
    }
    return units.slice(0, UNITS_LIMIT).join(UNIT_DELIMITER)
      + LONG_UNITS_FIELD_MESSAGE;
  }

  private static highlightAllMatches(
    html: string, text: string, regex: RegExp, units_field: boolean): string {
    /*
     * Args:
     *   units_field: If true, split the input into units, and output only
     *   the units with matches, separated by a delimiter.
     */

    if (units_field) {
      // TODO: Memorize the HTML and text of each unit, to speed up this
      // computation. This method should probably be polymorphic depending on
      // the field type (currently units or non-units).
      // TODO: Read a list of strings, instead of a delimiter-separated string!
      // We only retain the units that have matches, and we detect that by
      // whether the unit has changed.
      // TODO: Use a cleaner check to filter the units that have matches.
      const units = html.split(UNIT_DELIMITER);
      if (units.length <= UNITS_LIMIT) {
        // The number of units is small enough to display them all.
        // We first replace the unit delimiters with line breaks, to make sure
        // units won't be compacted into the same line.
        return Candidate.highlightAllMatches(
          html, text, regex, false);
      }

      const units_with_matches: string[] = units
        .map(unit => Candidate.highlightAllMatches(
          unit, unit.replace(TAG_REGEX, ''), regex, false))
        .filter((h, idx) => units[idx] !== h);
      if (units_with_matches.length) {
        return units_with_matches.join(UNIT_DELIMITER)
          + LONG_UNITS_FIELD_MESSAGE;
      }

      return Candidate.chopUnits(units);
    }

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
  interface xooxle {
    readonly data: Record<string, string>[];
    readonly params: Params;
  }

  // NOTE: Due to this `fetch`, trying to open the website as a local file in
  // the browser may not work. You have to serve it through a server.
  return (await fetch('xooxle.json')
    .then(async (resp) => await resp.json() as xooxle[])).map(
    (xooxle: xooxle) => ({
      data: xooxle.data.map(
        record => new Candidate(record, xooxle.params.fields)),
      params: xooxle.params,
    } as Xooxle)
  );
})();

// Event listener for the search button.
let currentAbortController: AbortController | null = null;

function errorMessage(): string {
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
      document.getElementById(
        xooxle.params.result_table_name)!.querySelector('tbody')!.innerHTML = '';
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

  let regex: RegExp;
  try {
    // NOTE: We can't use the `g` flag (for global) to retrieve all regex
    // matches, because there are some limitations regarding supporting
    // regular expressions using both `u` and `g` flags.
    regex = new RegExp(query, 'iu'); // Case-insensitive and Unicode-aware.
    messageBox.innerHTML = '';
  } catch {
    clear();
    messageBox.innerHTML = errorMessage();
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

  // idx_to_bottom is a set of hidden table rows that represent break points in
  // the results table.
  //
  // These rows are used to divide the table into sections.
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
  const idx_to_bottom: Element[] = xooxle.params.fields.map(() => {
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
    const search_results: SearchResult[] | null = (() => {
      try {
        return res.search(regex);
      } catch {
        messageBox.innerHTML = errorMessage();
        return null;
      }
    })();

    if (search_results === null) {
      // Searching the current candidate has failed. The same will likely happen
      // with future candidates. Abort.
      return;
    }

    if (!Object.values(search_results).some((sr: SearchResult) => sr.match)) {
      continue;
    }

    ++count;

    // Create a new row for the table
    const row = document.createElement('tr');

    const viewCell = document.createElement('td');
    viewCell.classList.add('view');
    if (xooxle.params.href_fmt) {
      // Get the word of the first field that has a match.
      const word: string = search_results.find(
        (sr: SearchResult) => sr.match)!.word;
      const a = document.createElement('a');
      a.href = xooxle.params.href_fmt.replace(
        `{${KEY}}`, res.key) + `#:~:text=${encodeURIComponent(word)}`;
      a.target = '_blank';
      a.textContent = localStorage.getItem('dev') === 'true' ? res.key : 'view';
      viewCell.appendChild(a);
    }
    row.appendChild(viewCell);

    search_results.forEach((sr: SearchResult) => {
      const cell = document.createElement('td');
      cell.innerHTML = sr.html;
      row.appendChild(cell);
    });

    idx_to_bottom[search_results.findIndex((sr) => sr.match)]!.insertAdjacentElement('beforebegin', row);

    // TODO: Remove the dependency on the HTML structure.
    const collapsible = resultTable.parentElement!.parentElement!;
    if (collapsible.style.maxHeight) {
      collapsible.style.maxHeight = collapsible.scrollHeight.toString() + 'px';
    }

    if (count % RESULTS_TO_UPDATE_DISPLAY == 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  let counter = 0;
  resultTable.childNodes.forEach((node: ChildNode) => {
    const tr = node as HTMLTableRowElement;
    if (tr.style.display === 'none') {
      // This is one of the sentinel rows. Nothing to do here!
      return;
    }
    const small = document.createElement('small');
    small.classList.add('very-light');
    small.innerHTML = `${(++counter).toString()} / ${count.toString()}`;
    const td = tr.firstElementChild as HTMLTableCellElement;
    td.prepend(' ');
    td.prepend(small);
  });
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
      if (searchBox.value) {
        url.searchParams.set('query', searchBox.value);
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
// Prevent other elements in the page from picking up key events on the
// search box.
searchBox.addEventListener('keyup', (event: KeyboardEvent) => { event.stopPropagation(); });
searchBox.addEventListener('keydown', (event: KeyboardEvent) => { event.stopPropagation(); });
searchBox.addEventListener('keypress', (event: KeyboardEvent) => { event.stopPropagation(); });
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
