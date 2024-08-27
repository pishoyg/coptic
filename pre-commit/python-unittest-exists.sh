#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

if (( "$#" == 0 )); then
  exit
fi

for FILE in "$@"; do
  DIRNAME="$(dirname "${FILE}")"
  if [[ "$(basename "${DIRNAME}")" != "test" ]]; then
    TEST="${DIRNAME}/test/test_$(basename "${FILE}")"
    if [ ! -f "${TEST}" ]; then
      echo -e "${RED}Please create a unit test in"\
        "${YELLOW}${TEST}${RED} and import"\
        "${YELLOW}${FILE}${RED}.${RESET}"
      exit 1
    fi
  else
    INIT="${DIRNAME}/__init__.py"
    if [ ! -f "${INIT}" ]; then
      echo -e "${RED}You forgot ${YELLOW}${INIT}${RED}.${RESET}"
      exit 1
    fi
  fi
done
