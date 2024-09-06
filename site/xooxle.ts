const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const resultTable = document.getElementById('resultList')!.querySelector('tbody')!;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;

class Result {
  readonly path!: string;
  readonly title!: string;
  readonly text!: string;

  // TODO: (#229) Find all matches, not just the first one.
  // TODO: (#229) Return the matching text in context, not just the text on its
  // own.
  match(query: string, fullWord: boolean, useRegex: boolean):
    [string | null, string | null] {
    if (!useRegex) {
      // Escape all the special characters in the string, in order to search
      // for raw matches.
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (fullWord) {
      query = `\\b${query}\\b`;
    }
    try {
      const regex = new RegExp(query, 'i'); // Case-insensitive.
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
        // TODO: (#229) It's possible for several matches, not necessarily
        // containing the same text, to be present on the one line.
        const match = line.match(regex);
        if (match?.index === undefined) {
          return;
        }
        // Highlight the matched text by wrapping it in a span with a light
        // purple background.
        const highlightedLine = line.replace(
          match[0],
          `<span style="background-color: #f0d4fc;">${match[0]}</span>`
        );
        matchedLines.push(highlightedLine);
      });
      return [word, matchedLines.join('<br>')];
    } catch {
      alert('Invalid regular expression');
      return [null, null];
    }
  }

  getMatchFullWords(matchStart: number, match: string): string {
    let start = matchStart;
    let end = matchStart + match.length;

    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && !/\W/.test(this.text[start - 1]!)) {
      start--;
    }

    // Expand right: Move the end index right until a word boundary is found.
    while (end < this.text.length && !/\W/.test(this.text[end]!)) {
      end++;
    }

    // Return the expanded substring.
    return this.text.substring(start, end);
  }
}

// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap: Promise<Result[]> = (async function(): Promise<Result[]> {
  let resp: Response;
  try {
    resp = await fetch('index.json', { mode: 'cors' });
  } catch {
    // If fetch fails (e.g., due to CORS issues), return dummy data.
    const dummy = [
      {
        'path': '1.html',
        'title': 'ⲟⲩⲟⲉⲓⲛ, ⲟⲩⲁⲓⲛⲉ, ⲟⲩⲁⲉⲓⲛⲉ, ⲟⲩⲁⲉⲓⲛ, ⲟⲩⲱⲓⲛⲓ, ⲟⲩⲟⲓⲛ, ⲟⲩⲟⲉⲓⲛⲉ',
        'text': '(S) ⲟⲩⲟⲉⲓⲛ (ⲡ)\n(A, sA) ⲟⲩⲁⲓⲛⲉ,\nⲟⲩⲁⲉⲓⲛⲉ\n(ⲡ)\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ (ⲡ)\n(B) ⲟⲩⲱⲓⲛⲓ (ⲡ)\n(O) ⲟⲩⲟⲓⲛ (ⲡ)\n(NH)\nⲟⲩⲟⲉⲓⲛⲉ\n(ⲡ)\n(noun male)\nlight [φωσ, φωτισμοσ]\ndawn [ανατολη, ορθροσ]\nlight of eyes\nas adj [φωτεινοσ]\nlight\ndawn\nlight (of eyes)\n(S) ⲟⲩⲟⲉⲓⲛ\n(A, sA) ⲟⲩⲁ(ⲉ)ⲓⲛⲉ\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ\n(B) ⲟⲩⲱⲓⲛⲓ\n(O) ⲟⲩⲟⲓⲛ\n(NH)\nⲟⲩⲟⲉⲓⲛⲉ\n{ext codex XIII - Trimorphic Protennoia; 158; 36;\n32; ⲟⲩⲟⲉⲓⲛⲉ ⲡⲉ\nⲉϥϣⲟⲟⲡ ϩⲛ\nⲟⲩⲟⲉⲓⲛⲉ; Ext}, {codex II - The Apocryphon of\nJohn; 106; 4; 9; ⲉϥϯ ⲙⲡⲟⲩⲟⲉⲓⲛⲉ ⲛⲁⲧϣⲓⲧϥ;\nExt}\nⲁⲧⲟⲩ., ⲁⲑⲟⲩ.\nwithout light [αωρια]\nCrum:\n(S, sA)\nⲣⲙⲛⲟⲩ.\n(NH)\nⲣⲙⲟⲩ.\nman of, dweller in light\n(S, A, B, F)\nⲣ\nⲟⲩ., ⲉⲣ ⲟⲩ., ⲉⲗ ⲟⲩ.\nmake, be light, shine\nWith prep or advb:\nⲉϫⲛ- (c)\n(B)\nϩⲓϫⲉⲛ-\n(c)\n(B)\nⲛ-\n(c)\n(S)\nⲉⲃⲟⲗ\n(c)\nⲣⲉϥⲣ ⲟⲩ.\none who lights, illuminator\n[φωστηρ]\nϭⲓⲛⲣ ⲟⲩ.,\nϫⲓⲛⲉⲣ ⲟⲩ.\nshining, illumination\nCrum:\n(B)\nϯ ⲟⲩ.\ngive light [φωτιζειν]\nϫⲓ ⲟⲩ.,\nϭⲓ ⲟⲩ.\ntake, get light\n(sA)\nⲧⲣⲟⲩ.\n(verb)\nshine'
      },
    ];
    resp = new Response(JSON.stringify(dummy));
  }

  return (await resp.json() as object[]).map(
    (obj) => Object.assign(new Result(), obj));
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

  const results = await fileMap;

  resultTable.innerHTML = ''; // Clear previous results.

  let found = false;

  for (const res of results) {
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

    const pathCell = document.createElement('td');
    const titleCell = document.createElement('td');
    const linesCell = document.createElement('td');

    pathCell.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      ${res.path.replace('.html', '')}</a>`;
    titleCell.innerHTML = res.title;
    linesCell.innerHTML = matchedLines;

    row.appendChild(pathCell);
    row.appendChild(titleCell);
    row.appendChild(linesCell);

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

function handleSearchQuery() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    // Call the async function after the timeout.
    // Use void to ignore the returned promise.
    void search();
  }, 150);
}

searchBox.addEventListener('input', handleSearchQuery);
fullWordCheckbox.addEventListener('click', handleSearchQuery);
fullWordCheckbox.addEventListener('click', handleSearchQuery);
