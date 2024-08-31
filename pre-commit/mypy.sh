#!/bin/bash

# NOTE: We can't simply run `mypy` for the whole repo because there is a
# bug with modules having duplicate names.
# See https://github.com/python/mypy/issues/10428.
# Instead, we define the prompt manually, to run at one repo at a time.
# We are currently in the process of migrating from the dynamic, slow,
# tedious, `type_enforced` to `mypy`.
# For each project that gets migrated, we should add a line to execute
# `mypy` on it here.

# NOTE: To guard against developers forgetting to include their Python
# projects in this list, we also have a generic line that runs `mypy`
# against all files that don't belong to any of the projects.
# Thus, every Python file will be either part of a project (in which case
# it should be ignored by the generic prompt), or should be covered by
# the generic prompt.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .helpers

_mypy() {
  PREFIX="${1}"
  MATCHES="$(echo "${@:2}" | tr ' ' '\n' | _grep "^${PREFIX}/")"
  if [ -n "${MATCHES}" ]; then
    # shellcheck disable=SC2046
    mypy $(echo "${MATCHES}" | tr '\n' ' ')
  fi
}

# TODO: (#215) Enable `mypy` for all projects.
_mypy "bible" "${@}"
# _mypy "dictionary/copticsite.com" "${@}"
# _mypy "dictionary/kellia.uni-goettingen.de" "${@}"
# _mypy "dictionary/marcion.sourceforge.net" "${@}"
# _mypy "flashcards" "${@}"
# _mypy "morphology" "${@}"
# _mypy "site" "${@}"

NONMATCHES=$(echo "${@}" | tr ' ' '\n' \
  | _grep --invert "^bible/" \
  | _grep --invert "^dictionary/copticsite.com/" \
  | _grep --invert "^dictionary/kellia.uni-goettingen.de/" \
  | _grep --invert "^dictionary/marcion.sourceforge.net/" \
  | _grep --invert "^flashcards/" \
  | _grep --invert "^morphology/" \
  | _grep --invert "^site/")
if [ -n "${NONMATCHES}" ]; then
  # shellcheck disable=SC2046
  mypy $(echo "${NONMATCHES}" | tr '\n' ' ')
fi
