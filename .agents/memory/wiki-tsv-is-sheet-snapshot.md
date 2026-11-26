---
name: wiki-tsv-is-sheet-snapshot
description: "Crum's wiki.tsv, the Kasser TSVs, and the Marcion roots/derivations TSVs are re-downloaded from Google Sheets on every Crum pipeline run; local edits are overwritten"
metadata:
  type: project
---

`dictionary/marcion_sourceforge_net/data/input/wiki.tsv` is a snapshot of a
Google Sheet (export URL in `dictionary/marcion_sourceforge_net/main.py`).
`make crum` re-downloads it, wiping local edits and pulling in whatever the
user has edited upstream in the meantime.

**Why:** On 2026-10-05, manual Bible labels (`{Dan 3 25}{Dan 3 92}`) added
locally vanished after `make crum`, and unrelated in-progress sheet edits got
pulled into the diff.

**How to apply:** Don't edit wiki.tsv locally to fix Crum text or add manual
labels. Hand the user the exact edits to apply in the sheet. If `make crum`
pulls in unrelated upstream changes, restore them to HEAD so the commit stays
scoped.

The Kasser snapshots (`data/input/kasser/complements.tsv`,
`morphologiques.tsv`) work the same way, and `main.py` refreshes all of
them on every run, `--html` included. So do the Marcion snapshots
(`data/input/marcion/roots.tsv`, `derivations.tsv`), which `Crum.roots`
reads; only `Crum.read_roots(live=True)` (used by the helpers that write
to the sheet) reads the sheet directly. To test a local fix before the sheet has
it, pass `--notsv`.

KELLIA no longer snapshots a sheet. Its supplemental forms come from the
CDO entry snapshot in `dictionary/kellia_uni_goettingen_de/data/raw/cdo/`,
which only `make cdo` (`main.py --cdo`) refreshes; `make kellia` reads it as
is. Fixes to supplemental forms go upstream (#305).
