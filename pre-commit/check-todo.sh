#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

if (( "$#" == 0 )); then
  exit
fi

TODO="$(_grep "TODO(:) (?!\(#?[0-9]+\))" --perl-regexp --color=always "${@}")"
if [ -n "${TODO}" ]; then
  echo -e "${RED}Stray TODO markers found!"
  echo -e "Please add an issue number to each TODO, using the format:"
  echo -e "  ${YELLOW}TODO"": (#123) Describe the task.${RESET}"
  echo -e "${RED}(Discouraged) If this is not worth an issue, assign the TODO to the pseudo-issue ""${YELLOW}#0${RED}"
  echo -e "${RESET}${TODO}"
  exit 1
fi

TODO="$(_grep "TODO(:) \(#0\)" --perl-regexp --color=always "${@}")"
if [ -n "${TODO}" ]; then
  echo -e "${YELLOW}TODO's assigned to the pseudo-issue ${CYAN}#0${YELLOW} are discouraged:"\
    "\n${RESET}${TODO}"
fi

TODO="$(_grep "TODO(:) \(#[1-9][0-9]*\)" --only --extended-regexp "${@}" \
  | _grep --only --extended-regexp '[0-9]+' | sort | uniq)"
for ISSUE in ${TODO}; do
  CLOSED=$(gh issue view "${ISSUE}" --json "closed" --jq ".closed")
  if [[ "${CLOSED}" == "true" ]]; then
    echo -e "${RED}Issue ${YELLOW}#${ISSUE} ${RED}is closed, but is assigned a TODO!"
    echo -e "${RED}Run ${YELLOW}todo ${ISSUE}${RED} to find TODO's assigned to this issue."
    exit 1
  fi
done
