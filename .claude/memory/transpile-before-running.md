---
name: transpile-before-running
description: Pipelines, Playwright, and the site all run the transpiled docs/ JavaScript, so transpile after editing TypeScript, before running anything
metadata:
  type: project
---

Nothing in this repo runs the TypeScript in `docs/` directly. The site loads
its transpiled JavaScript, and so does everything that imports `docs/`
modules: the TypeScript pipelines (e.g.
`dictionary/marcion_sourceforge_net/{pisaxo,wiki}.ts` import
`../../docs/crum/cls.js`) and the Playwright tests (which drive the site, and
import modules such as `../docs/tooltip.js`). An edit to a `.ts` file has no
effect until `make transpile` runs, and nothing reports the mismatch: the old
logic runs silently, tests pass against it, and a newly added constant comes
out as `undefined` (e.g. `class="undefined"` in generated output).

**Why:** the `docs/` JavaScript is checked in and only regenerated when
someone transpiles, so it lags behind every TypeScript edit until then.

**How to apply:** after editing TypeScript, run `make transpile` BEFORE running
a pipeline, a Playwright test, or a browser check. After a pipeline run, grep
the output for `undefined`. Not `make javascript`: it refuses any dirty
non-JavaScript file, runs Playwright, and creates a commit.
