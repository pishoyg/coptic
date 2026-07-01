#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

if (( "$#" == 0 )); then
  exit
fi

# NOTE: `${TODO_ISSUES}`, `todo_issue_closed`, and the TODO format live in
# `env/todo.sh` (sourced above via `.env`), so this hook and the `todo` command
# stay in sync.
TODO="$(_grep "TODO(:) (?!\(${TODO_ISSUES}\))" --perl-regexp --color=always "${@}")"
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

# Extract every issue number referenced by a valid TODO, including those inside
# comma-separated lists like `(#12,#34)`.
ISSUES="$(_grep "TODO(:) \(${TODO_ISSUES}\)" --only-matching --extended-regexp "${@}" \
  | _grep --only-matching --extended-regexp '[0-9]+' | sort | uniq)"
for ISSUE in ${ISSUES}; do
  # #0 is a pseudo-issue; it has no GitHub issue to resolve.
  if [[ "${ISSUE}" == "0" ]]; then
    continue
  fi
  if [[ "$(todo_issue_closed "${ISSUE}")" == "true" ]]; then
    echo -e "${RED}Issue ${YELLOW}#${ISSUE} ${RED}is closed, but is assigned a TODO!"
    echo -e "${RED}Run ${YELLOW}todo ${ISSUE}${RED} to find TODO's assigned to this issue."
    exit 1
  fi
done
