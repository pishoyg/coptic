---
name: separate-data-code-output-commits
description: Code, input data (data/input/ fixes), and generated output each go in their own commits
metadata:
  type: feedback
---

Never mix code changes and source-data changes (e.g. typo fixes in a
pipeline's `data/input/`) in one commit, and never mix input data with
generated output (`docs/`, `data/output/`, the `make <pipeline>` commits)
either. A data fix that the code depends on (e.g. one a new validation would
reject) goes in its own commit before the code commit.

**Why:** The maintainer's standing rule (stated 2026-11-26, when an XML fix
had been folded into a KELLIA rendering commit).

**How to apply:** When a code change surfaces a data error, commit the data
fix separately (`[#N][COMPONENT] Fix …`), then the code, then the
regenerated output as its own `make …` commit. Applies to fixups too: don't
fold an XML fix into a code commit's fixup.
