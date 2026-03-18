# ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ (remnqymi)

## Project Overview

This is the backing repository for **[ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ (remnqymi)](https://remnqymi.com/)**, a project designed to make the Coptic language more learnable. It features data processing pipelines to ingest, analyze, and format various Coptic language resources (such as dictionaries and the Bible) and a static frontend application to present them.

### Main Technologies
- **Python (3.13+)**: The primary language for backend data processing pipelines, morphological analysis, and flashcard generation.
- **TypeScript / Node.js**: Used for all frontend logic and interactivity on the static website. Transpiled to JavaScript via `esbuild`.
- **Make**: Used to define and execute build pipelines, tests, and utility scripts.
- **Pre-commit**: Enforces extensive code formatting and linting rules.

### Key Components & Directory Structure
- `dictionary/`: Python data pipelines for processing various Coptic dictionaries (e.g., Crum, KELLIA/TLA, Dawoud, Andreas, Marcion).
- `bible/`: Python pipelines for processing the Coptic Bible corpus (specifically from St. Shenouda the Archimandrite Coptic Society).
- `docs/`: Contains the static site assets (TypeScript, HTML, CSS, images) deployed to GitHub Pages. TypeScript files here are transpiled to JavaScript.
- `flashcards/`: Python logic for generating Anki flashcard decks from the dictionary data.
- `morphology/`: Morphological analysis pipelines.
- `utils/`: Shared Python utilities.
- `Makefile`: Defines the core workflows and pipelines.

## Building and Running

### Setup
1. **Activate the Environment**: You **must** source the environment file at the start of every terminal session before running any pipelines.
   ```bash
   source .env
   ```
2. **Install Dependencies**: Run the installation script via Make (only needed initially or when dependencies change).
   ```bash
   make install
   ```

### Common Commands
- **Run Tests**: Use Playwright to test TypeScript changes. **Do not run `make test`**, as it can run indefinitely.
  ```bash
  npx playwright test
  ```
- **Transpile TypeScript**: Compiles `.ts` files in `docs/` into `.js` using `esbuild`.
  ```bash
  make transpile
  # Or use `make javascript` to transpile, run Playwright tests, and commit the JS files.
  ```
- **Run Data Pipelines**:
  - `make crum` - Generate Crum lexicon artifacts.
  - `make kellia` - Generate KELLIA lexicon artifacts.
  - `make bible` - Run the Bible pipeline.
  - `make anki` - Generate the Anki flashcards package.
- **Serve Locally**: Start a local Python HTTP server to view the website.
  ```bash
  make server
  ```

## Development Conventions

- **Python**: Prefer Python over Bash for scripting. Use type hints extensively. Code is formatted and linted using `ruff` and `mypy`.
- **TypeScript**: Do not write raw JavaScript. All web logic should be written in TypeScript within the `docs/` directory. Minimize dependence on HTML where TypeScript behaviors can be implemented instead. Group classes in a `CLS` enum and centralize event listeners.
- **Pre-commit Hooks**: These are mandatory. You must stage your changes first (e.g., `git add .`), then keep running `pre-commit run` until all hooks pass before committing.
- **Commit Messages**: Commits must follow a specific format:
  ```text
  [#${ISSUE_NUMBER}][${COMPONENT_NAME}/${SUBCOMPONENT_NAME}] ${DESCRIPTION}
  ```
  *(e.g., `[#123][Lexicon] Fix search bug`)*
- **TODOs**: In-code `TODO` comments must be formatted with an issue number: `TODO (#123): description`. If no issue exists, use `#0`.
- **Validation**: Add excessive in-code assertions to validate assumptions. Use exceptions only for errors that may occur naturally (e.g., input data typos).
