#!/bin/bash

# NOTE: We can't simply run `mypy` for the whole repo because there is a
# bug with modules having duplicate names.
# See https://github.com/python/mypy/issues/10428.
# Instead, we define the prompt manually, to run at one subproject at a time.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

_mypy() {
  # shellcheck disable=SC2046
  mypy $(echo "${@}" | tr '\n' ' ') --check-untyped-defs
}

SUBPROJECTS=(
  "bible"
  "dictionary/copticsite.com"
  "dictionary/kellia.uni-goettingen.de"
  "dictionary/marcion.sourceforge.net"
  "flashcards"
  "morphology"
  "site"
)

# Run `mypy` once against each of the prefixes above.
NONMATCHES=$(echo "${@}" | tr ' ' '\n')
for PREFIX in "${SUBPROJECTS[@]}"; do
  MATCHES="$(echo "${@}" | tr ' ' '\n' | _grep "^${PREFIX}")"
  if [ -n "${MATCHES}" ]; then
    # NOTE: For a matching prefix, we run `mypy` against the entire subtree,
    # not just the affected files.
    _mypy "${PREFIX}"
  fi
  NONMATCHES=$(echo "${NONMATCHES}" | _grep --invert "^${PREFIX}/")
done

# Run against the affected files that didn't match any of the prefixes above.
if [ -n "${NONMATCHES}" ]; then
  _mypy "${NONMATCHES}"
fi
