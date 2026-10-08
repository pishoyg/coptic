# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

[ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ](https://remnqymi.com/) — a platform to make the Coptic language more learnable. It processes multiple dictionary sources (Crum, KELLIA, Andreas), a Bible corpus, and Anki flashcard generation into a static website hosted on GitHub Pages.

## Reports

Keep reports short. Lead with what needs the developer's attention:
decisions, risks, surprises, and anything you couldn't do or verify. Give
completion and evidence of correctness a line or two. Don't restate the diff
or list what came out fine.

## Memory

Project memory lives in `.claude/memory/`, one fact per file, indexed by
`.claude/memory/MEMORY.md` (imported below). Save knowledge about this repo
there, not in your auto-memory directory under `$HOME`, and add a one-line
pointer to the index.

Each file has this frontmatter, followed by the fact. For `feedback` and
`project`, add **Why:** and **How to apply:** lines. Link related memories
with `[[name]]`.

```markdown
---
name: <kebab-case-slug, same as the filename>
description: <one line, used to judge relevance>
metadata:
  type: feedback | project | reference
---
```

This repo is public. Anything saved in `.claude/memory/` gets committed and
published. Keep these in the user's auto-memory instead:

- Facts about the user's machine, network, or employer
- Personal preferences that aren't conventions for this repo
- Anything private, credentials, or contact details

@.claude/memory/MEMORY.md

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
| `make stats` | Collect repo statistics into `data/stats.tsv` and commit them |

Running pipelines individually (scripts must be invoked from the repo root):
```sh
./dictionary/marcion_sourceforge_net/main.py
./dictionary/kellia_uni_goettingen_de/main.py
./dictionary/stmacariusmonastery_org/main.py
./flashcards/main.py
./bible/stshenouda_org/main.py
```

Type checking and E2E tests:
```sh
npx playwright test               # E2E tests (Chromium + Mobile Chrome)
npx tsc                           # type check only
```

## Browser Checks

To inspect UI changes in `docs/` in a live browser, reuse a running dev server
(`curl -sf http://localhost:$PORT/ >/dev/null`). Only run `make server` if
nothing is listening, or start an isolated one with `PORT=8001 make server`.
For regression tests, extend the Playwright suite under `test/` instead of
relying on ad-hoc browser sessions.

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
- `bible/stshenouda_org/` — Bible corpus processing
- `flashcards/` — Anki deck generation
- `morphology/` — Morphological inflection generation
- `docs/` — Static website output (TypeScript + HTML + CSS + generated JSON/HTML)
- `xooxle/` — Search-index generation, shared by the dictionary pipelines
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
- Group all CSS class names in a `CLS` enum or `cls.ts` file
- Use `querySelector`/`querySelectorAll` (not `getElementsBy*`); use `getElementById` for ID lookups
- Prefer `element.addEventListener('click', ...)` over `element.onclick = ...`
- TypeScript is transpiled to JS via `make transpile`; never edit `.js` files directly
- Never manually commit `.js` / `.js.map` files. Generated JavaScript is committed in its own dedicated commit produced by `make javascript` — keep TypeScript edits and the regenerated JavaScript on separate commits

### Languages

- Pipelines: Python (primary); Bash only when Python would be significantly more verbose
- Frontend: TypeScript only (no direct JavaScript)

### Commit Messages

```
[#ISSUE][COMPONENT/SUBCOMPONENT] DESCRIPTION
```

Use `fix #ISSUE` to auto-close an issue. Components: `Crum`, `KELLIA`, `Andreas`, `Bible`, `Lexicon`, `Flashcards`, `Site`, `Morphology`, `Xooxle`, `platform`, `AI`, `Community`, `App`, `Keyboard`.

### Pre-commit Hooks

50+ hooks run on every commit (enforced, not optional). `make test` iterates until they all pass. Includes mypy, pylint, ruff, black, isort, tsc, eslint, stylelint, prettier, gitleaks, and more.

Generated artifacts only diff meaningfully after the formatting hooks have run on them. To run a hook on just the changed files (staged, unstaged, and untracked; some filenames contain spaces):

```sh
{ git diff -z --name-only HEAD; git ls-files -z --others --exclude-standard; } \
  | xargs -0 pre-commit run <hook> --files
```

Run the formatters by name (`prettier`, `tidy-html`, `search-tidy-html`, `tidy-xml`, `black`, `isort`, `ruff`, `format-pisaxo`) rather than every hook: `playwright` runs on any non-TypeScript change under `docs/` or `test/`.

There is exactly one `README.md` in the repo (enforced by a pre-commit hook). Technical documentation lives there.
