---
name: crum-scan-page-offset
description: wiki.tsv cites the printed page where a Crum headword starts; the entry may run onto later scans
metadata:
  type: reference
---

The `Crum` column of `dictionary/marcion_sourceforge_net/data/input/wiki.tsv`
gives the **printed** page and column (e.g. `385b`) where the *headword*
starts. A citation inside a long entry can sit several pages later, so an
entry's text is not confined to its cited page.

**How to apply:** to view printed page N, open `docs/crum/crum/<N+22>.png`
(the offset is `OFFSET` in `docs/crum/book.ts`), and when a citation isn't on
that page, read on through the following scans before concluding it's
missing. See also [[crum-joeis-abbreviation-sorts]].
