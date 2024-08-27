#!/bin/bash

# NOTE: Adding `set -o errexit` causes the script to fail, because `grep`
# returns a status code of 1 when no matches are found.
set -o nounset  # Consider an undefined variable to be an error.

if (( "$#" == 0 )); then
  exit
fi

# NOTE: We mangle the regex using extra parentheses to prevent it from
# matching itself.
DO_NOT_SUBMIT="$(grep "(DO) (NOT) (SUBMIT|COMMIT)" --extended-regexp \
  --files-with-matches --ignore-case "${@}")"
if [ -n "${DO_NOT_SUBMIT}" ]; then
  echo -e "${RED} DO-NOT-SUBMIT markers found in"\
    "${YELLOW}${DO_NOT_SUBMIT}${RED}.${RESET}"
  exit 1
fi
