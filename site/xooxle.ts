const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
const resultList = document.getElementById('resultList') as HTMLUListElement;

class Result {
  constructor(
    readonly path: string,
    readonly title: string,
    readonly text: string,
  ) { }
  match(query: string): boolean {
    return this.text.toLowerCase().includes(query.toLowerCase());
  }
}

// Load the JSON File.
async function loadFileMap(): Promise<Result[]> {
  let resp: Response;
  try {
    resp = await fetch('index.json', { mode: 'cors' });
  } catch {
    // NOTE: `fetch` fails locally due to CORS. We return a dummy value in
    // order to support local testing.
    resp = new Response('[{"path": "1.html", "title": "ⲟⲩⲱⲓⲛⲓ", "text": "light" }]');
  }

  const json = await resp.json().then((resp) => resp as object[]);

  return Array.from(json)
    .map((dict: object) => Object.assign(new Result('', '', ''), dict));
}

// Function to search for files containing the search query
// Function to display the search results.
function displayResults(query: string, results: Result[]): void {
  resultList.innerHTML = ''; // Clear previous results.

  if (results.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = 'No matching files found';
    resultList.appendChild(li);
    return;
  }

  results.forEach((res) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${res.path}#:~:text=${query}">${res.path.replace('.html', '')}</a> ${res.title}`;
    resultList.appendChild(li);
  });
}

// Event listener for the search button.
function search() {
  const query = searchBox.value.trim();

  if (!query) {
    alert('Please enter a search query');
    return;
  }

  void loadFileMap().then((results) => {
    results = results.filter((res) => res.match(query));
    displayResults(query, results);
  });
}

searchButton.addEventListener('click', search);
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchButton.click();
  }
});
