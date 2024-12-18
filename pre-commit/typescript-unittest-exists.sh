#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .helpers

if (( "$#" == 0 )); then
  exit
fi

for FILE in "$@"; do
  DIRNAME="$(dirname "${FILE}")"
  BASENAME="$(basename "${FILE}")"
  if [[ "$(basename "${DIRNAME}")" == "test" && ${BASENAME} = *.test.ts ]]; then
    continue
  fi
  TEST="${DIRNAME}/test/${BASENAME/.ts/.test.ts}"
  if [ ! -f "${TEST}" ]; then
    echo -e "${RED}Please create a unit test in"\
      "${YELLOW}${TEST}${RED} and import"\
      "${YELLOW}${FILE}${RED}.${RESET}"
    exit 1
  fi
done
