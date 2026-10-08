---
name: transpile-before-pipelines
description: TypeScript pipeline scripts import transpiled docs/ JavaScript, so transpile before running a pipeline
metadata:
  type: project
---

`dictionary/marcion_sourceforge_net/{pisaxo,wiki}.ts` import the *transpiled*
JavaScript of the `docs/` modules (e.g. `../../docs/crum/cls.js`), not their
TypeScript sources. An edit to a `.ts` file has no effect on a pipeline run
until `make transpile` runs, and nothing reports the mismatch: the pipeline
silently runs the stale logic, and a newly added constant comes out as
`undefined` (e.g. `class="undefined"` in generated output).

**Why:** the `docs/` JavaScript is checked in and only regenerated when
someone transpiles, so it lags behind every TypeScript edit until then.

**How to apply:** after editing TypeScript, run `make transpile` BEFORE
running any pipeline, and grep the regenerated output for `undefined`. Not
`make javascript`: it refuses any dirty non-JavaScript file, runs Playwright,
and creates a commit.
