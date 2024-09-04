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
const fileMap: Promise<Result[]> = (async function(): Promise<Result[]> {
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
})();

// Event listener for the search button.
function search() {
  const query = searchBox.value.trim();

  if (!query) {
    alert('Please enter a search query');
    return;
  }

  resultList.innerHTML = ''; // Clear previous results.
  void fileMap.then((results): void => {

    let found = false;
    results.filter((res) => res.match(query)).forEach((res) => {
      found = true;
      const li = document.createElement('li');
      li.innerHTML = `<a href="${res.path}#:~:text=${query}">${res.path.replace('.html', '')}</a> ${res.title}`;
      resultList.appendChild(li);
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (found) {
      return;
    }
    const li = document.createElement('li');
    li.innerHTML = 'No matching files found';
    resultList.appendChild(li);
    return;
  });

}

searchButton.addEventListener('click', search);
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchButton.click();
  }
});
