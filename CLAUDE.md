# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

[ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ](https://remnqymi.com/) — a platform to make the Coptic language more learnable. It processes multiple dictionary sources (Crum, KELLIA, Andreas, Dawoud), a Bible corpus, and Anki flashcard generation into a static website hosted on GitHub Pages.

## Environment Setup

Run at the start of each session (activates the Python venv and exports environment variables):

```sh
source .env
```

One-time installation:
```sh
make install
```

## Common Commands

| Command | Purpose |
|---|---|
| `make test` | Run pre-commit hooks repeatedly (with `git add --all`) until they all pass |
| `make transpile` | Transpile TypeScript → JavaScript (run after editing `.ts` files) |
| `make server` | Start local dev server for the website |
| `make crum` | Run the Crum dictionary pipeline |
| `make kellia` | Run the KELLIA dictionary pipeline |
| `make andreas` | Run the Andreas dictionary pipeline |
| `make anki` | Generate the Anki flashcard package |
| `make bible` | Run the Bible pipeline |
| `make all` | Run all pipelines + test |

Running pipelines individually (scripts must be invoked from the repo root):
```sh
./dictionary/marcion_sourceforge_net/main.py
./dictionary/kellia_uni_goettingen_de/main.py
./dictionary/stmacariusmonastery_org/main.py
./flashcards/main.py
./bible/stshenouda_org/main.py
```

TypeScript unit tests and E2E tests:
```sh
bun test --preload ./bun.ts   # unit tests
npx playwright test           # E2E tests (Chromium + Mobile Chrome)
npx tsc                       # type check only
```

## Playwright MCP

The Playwright MCP server is enabled for this project (see `.claude/settings.json`), so Claude Code can drive a live browser to inspect, interact with, and screenshot the site. Typical uses: verifying UI changes after editing `.ts`/`.css`/`.html` in `docs/`, reproducing bugs, and visually confirming behavior that unit tests and `tsc` cannot catch.

- Before exercising the site, check whether a dev server is already running
  (e.g. `curl -sf http://localhost:$PORT/ >/dev/null`) and reuse it; only run
  `make server` if nothing is listening. If you need an isolated instance,
  start one on another port with `PORT=8001 make server`.
- For automated regression tests, prefer the existing Playwright suite under `test/` over ad-hoc MCP sessions.

## Architecture

### Data Flow

```
Raw Data → Python pipeline (main.py) → JSON/HTML artifacts in docs/ → Static website
```

Each dictionary source has its own pipeline directory. Pipelines are independent; run them from the repo root.

### Directory Structure

- `dictionary/marcion_sourceforge_net/` — Crum dictionary processing
- `dictionary/kellia_uni_goettingen_de/` — KELLIA/TLA dictionary processing
- `dictionary/stmacariusmonastery_org/` — Andreas dictionary processing
- `dictionary/copticocc_org/` — Dawoud dictionary
- `bible/stshenouda_org/` — Bible corpus processing
- `flashcards/` — Anki deck generation
- `morphology/` — Morphological inflection generation
- `docs/` — Static website output (TypeScript + HTML + CSS + generated JSON/HTML)
- `utils/` — Shared Python utilities (paths, logging, validation, orthography)
- `test/` — Playwright E2E tests

### Data Subdirectories

Within each pipeline's `data/` directory:
- `raw/` — Unmodified copies from external sources
- `input/` — Modified or created data (fix typos here, not in `raw/`)
- `output/` — Generated artifacts

### Path Management

All file paths are centralized:
- Python: `utils/paths.py`
- TypeScript: `docs/paths.ts`

### Python Utilities (`utils/`)

- `utils/ensure.py` — `ensure()`, `unique()`, `members()`, `equal_sets()`, `child_path()` for validated assertions
- `utils/log.py` — Color-coded logging (`info`, `warn`, `error`, `fatal`)
- `utils/paths.py` — Centralized path constants

## Code Conventions

### Error Handling

- **Assertions** for logic/sanity checks (crash without message)
- **Exceptions** for potential runtime errors from bad input (include helpful messages)

### Python

- Strict type hints everywhere; mypy enforced
- 79-character line limit
- `TODO: (#ISSUE_NUMBER)` format for all TODOs (enforced by pre-commit); use `#0` for low-priority items not worth a GitHub issue

### TypeScript

- 80-character line limit
- Group all CSS class names in a `CLS` enum
- Group event listener registrations in functions named `addEventListeners*`
- Use `querySelector`/`querySelectorAll` (not `getElementsBy*`); use `getElementById` for ID lookups
- Prefer `element.addEventListener('click', ...)` over `element.onclick = ...`
- TypeScript is transpiled to JS via `make transpile`; never edit `.js` files directly

### Languages

- Pipelines: Python (primary); Bash only when Python would be significantly more verbose
- Frontend: TypeScript only (no direct JavaScript)

### Commit Messages

```
[#ISSUE][COMPONENT/SUBCOMPONENT] DESCRIPTION
```

Use `fix #ISSUE` to auto-close an issue. Components: `Crum`, `KELLIA`, `Andreas`, `Dawoud`, `Bible`, `Lexicon`, `Site`, `Morphology`, `platform`, `Community`.

### Pre-commit Hooks

50+ hooks run on every commit (enforced, not optional). `make test` iterates until they all pass. Includes mypy, pylint, ruff, black, isort, tsc, eslint, stylelint, prettier, codespell, gitleaks, and more.

There is exactly one `README.md` in the repo (enforced by a pre-commit hook). Technical documentation lives there.
