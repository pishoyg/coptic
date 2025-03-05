#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

if (( "$#" == 0 )); then
  exit
fi

# NOTE: We mangle the regex using extra parentheses to prevent it from
# matching itself.
DO_NOT_SUBMIT="$(_grep "(DO) (NOT) (SUBMIT|COMMIT)" --extended-regexp \
  --files-with-matches --ignore-case "${@}")"
if [ -n "${DO_NOT_SUBMIT}" ]; then
  echo -e "${RED} DO-NOT-SUBMIT markers found in"\
    "${YELLOW}${DO_NOT_SUBMIT}${RED}.${RESET}"
  exit 1
fi
