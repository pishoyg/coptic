#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

if (( "$#" == 0 )); then
  exit
fi

# TODO: (#66) Once all existing TODO's have been assigned issues,
# change the following to an error rather than simply a warning.
TODO="$(_grep "TODO(:) (?!\(#?[0-9]+\))" --perl-regexp --color=always "${@}")"
if [ -n "${TODO}" ]; then
  echo -e "${YELLOW}Stray TODO markers found."\
    "Please add an issue number to each TODO:\n${RESET}${TODO}"
fi

TODO="$(_grep "TODO(:) \([0-9]+\)" --perl-regexp --color=always "${@}")"
if [ -n "${TODO}" ]; then
  echo -e "${RED}TODO's referencing an issue should use ${YELLOW}#${RED}:"\
    "${RESET}\n${TODO}"
  exit 1
fi

TODO="$(_grep "TODO(:) \(#[0-9]+\)" --only --extended-regexp "${@}" \
  | _grep --only --extended-regexp '[0-9]+' | sort | uniq)"
for ISSUE in ${TODO}; do
  CLOSED=$(gh issue view "${ISSUE}" --json "closed" --jq ".closed")
  if [[ "${CLOSED}" == "true" ]]; then
    echo -e "${RED}Issue ${YELLOW}#${ISSUE} ${RED}is closed, but is assigned a TODO!"
    echo -e "${RED}Run ${YELLOW}todo ${ISSUE}${RED} to find TODO's assigned to this issue."
    exit 1
  fi
done
