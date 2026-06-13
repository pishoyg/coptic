#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

if (( "$#" == 0 )); then
  exit
fi

echo -e "${RED}Changes to raw data are not allowed:"\
  "${YELLOW}${*}${RESET}"
echo -e "${PURPLE}Raw data are unmodified copies from external sources."\
  "Make modifications in ${YELLOW}data/input/${PURPLE} instead.${RESET}"
echo -e "${PURPLE}If this change is intentional, skip this check by"\
  "setting ${YELLOW}SKIP=check-raw-data${PURPLE}.${RESET}"
exit 1
