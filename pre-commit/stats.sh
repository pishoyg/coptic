#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

if (( $(date +%s) - $(tail -n 1 data/stats.tsv | cut --fields 2) >= 86400 ));
then
  echo -e "${RED}Run ${YELLOW}\`make stats\`${RED}.${RESET}"
  exit 1;
fi
