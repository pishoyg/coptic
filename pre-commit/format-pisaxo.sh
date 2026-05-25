#!/bin/bash
# Format `bib.yaml`:
#   1. Drop bare `null` placeholders (`field: null` -> `field:`).
#   2. Insert a blank line before each top-level entry (`- ` at column 0).
#   3. Collapse runs of consecutive blank lines into a single blank line.
#
# Why dropping bare `null` is safe:
# The eslint rule `yml/plain-scalar` (configured for `bib.yaml` in
# `eslint.config.ts`) forces every string value in this file to be
# double-quoted. So a bare `null` at end of line is unambiguously the YAML
# null literal — never a string that happens to read "null". Replacing
# `field: null` with `field:` is parser-equivalent and merely strips a
# noisy placeholder.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.
set -o pipefail # Pipe failures propagate.

for file in "$@"; do
  tmp=$(mktemp)
  awk '
    { sub(/: null$/, ":") }
    /^$/ {
      if (!blank) print
      blank = 1
      next
    }
    /^- / {
      if (!blank) print ""
    }
    { print; blank = 0 }
  ' "$file" >"$tmp"
  mv "$tmp" "$file"
done
