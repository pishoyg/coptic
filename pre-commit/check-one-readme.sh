#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

if (( "$#" == 0 )); then
  exit
fi

for FILE in "${@}"; do
  BASENAME="$(basename "${FILE}")"
  if [[ "${BASENAME}" == "README.md" ]]; then
    echo -e "${PURPLE}Only the README.md at the root is allowed."\
      "Please delete ${RED}${FILE}${PURPLE}.${RESET}"
    exit 1
  fi
done
