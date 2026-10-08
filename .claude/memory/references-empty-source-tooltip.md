---
name: references-empty-source-tooltip
description: "The `if (!this.source) return []` guard in Reference.tooltip() is intentional — don't flag it as a bug"
metadata:
  type: project
---

In `docs/crum/references.ts`, `Reference.tooltip()` returns `[]` when the
source has no title/description, suppressing the tooltip entirely — including
any prefix/postfix contribution. This is intentional and not to be flagged.

**Why:** A reference whose source is an empty placeholder in `bib.yaml` has
nothing worth showing. Emitting a tooltip that consists only of a fix gloss
(e.g. 'ostr' → 'ostracon') without identifying the source is considered worse
than no tooltip. The `TODO: (#522)` notes the guard becomes unnecessary once
every source is populated.

**How to apply:** Do not report this guard as a correctness bug or as a
regression against annotation-based glosses.
