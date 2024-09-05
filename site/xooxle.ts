const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
const resultList = document.getElementById('resultList') as HTMLUListElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;

class Result {
  readonly path!: string;
  readonly title!: string;
  readonly text!: string;

  // TODO: (#229) Find all matches, not just the first one.
  // TODO: (#229) Return the matching text in context, not just the text on its
  // own.
  match(query: string, fullWord: boolean, useRegex: boolean): string | null {
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
      if (!match) {
        return null;
      }
      if (fullWord) {
        // We already force matching to be restricted to full words, so there
        // is nothing that we need to do expand our match to fall on word
        // boundaries. This is already the case.
        return match[0];
      }
      return this.getMatchFullWords(match[0]);
    } catch (e) {
      console.error('Invalid regular expression:', e);
      return null;
    }
  }

  getMatchFullWords(match: string): string {
    // Find the index of the match within the text.
    const matchStart = this.text.indexOf(match);

    if (matchStart === -1) {
      return match; // If the match is not found, return it as-is.
    }

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
    resp = new Response(
      '[{"path": "1.html", "title": "ⲟⲩⲱⲓⲛⲓ", "text": "light" }]',
    );
  }

  return (await resp.json() as object[]).map(
    (obj) => Object.assign(new Result(), obj));
})();

// Event listener for the search button.
let currentAbortController: AbortController | null = null;

async function search() {
  // If there is an ongoing search, abort it.
  if (currentAbortController) {
    currentAbortController.abort();
  }

  // Create a new AbortController for the current search.
  const abortController = new AbortController();
  currentAbortController = abortController;

  const query = searchBox.value.trim();
  const fullWord = fullWordCheckbox.checked;
  const useRegex = regexCheckbox.checked;

  // If search is requested with an empty query, clear results and return.
  if (!query) {
    resultList.innerHTML = '';
    return;
  }

  // Wait for fileMap to resolve and get the list of results.
  const results = await fileMap;

  resultList.innerHTML = ''; // Clear previous results.

  let found = false;

  for (const res of results) {
    // Check if the search has been aborted.
    if (abortController.signal.aborted) {
      return; // Exit the function early if the search was aborted.
    }

    const matchedWord = res.match(query, fullWord, useRegex);
    if (!matchedWord) {
      continue;
    }
    found = true;
    const li = document.createElement('li');
    li.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      ${res.path.replace('.html', '')}</a> ${res.title}`;
    resultList.appendChild(li);

    // Yield to update the display incrementally.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (!found && !abortController.signal.aborted) {
    const li = document.createElement('li');
    li.innerHTML = 'No matching files found.';
    resultList.appendChild(li);
  }
}

// Wrapper function to handle the async search call.
function handleSearchClick() {
  void search(); // Call the async function and ignore the returned Promise.
}

searchButton.addEventListener('click', handleSearchClick);
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchButton.click();
  }
});
