#!/bin/bash

source env/color.sh
source env/paths.sh

HELP="${RED}Pass an optional issue number to find its related TODO's, or nothing to find all TODO's.${RESET}"

# TODO_ISSUES is the format of the issue list assigned to a TODO – one or more
# issue numbers, each optionally prefixed with `#`, separated by commas.
# Examples: `#123`, `#12,#345`.
export TODO_ISSUES='#?[0-9]+(,#?[0-9]+)*'

# todo_pattern prints a grep pattern that matches a TODO assigned to the given
# issue number, whether it appears alone or as one entry in a comma-separated
# list.
# With no argument (or an empty one), it prints a pattern matching any TODO.
# NOTE: We intentionally mangle "TODO" using `(:)` so the pattern doesn't match
# the very lines that define it.
todo_pattern() {
  local issue="${1:-}"
  if [ -z "${issue}" ]; then
    printf '%s\n' "TODO(:)"
  else
    printf '%s\n' "TODO(:) \\((#?[0-9]+,)*#?${issue}(,#?[0-9]+)*\\)"
  fi
}

# todo_issue_closed prints "true" if the given GitHub issue is closed.
todo_issue_closed() {
  gh issue view "${1}" --json "closed" --jq ".closed"
}

# Search for TODO's.
todo() {
  if (( "$#" > 1 )); then
    echo -e "${RED}Too many parameters!${RESET}"
    echo -e "${HELP}"
    return 1
  fi

  local PARAM="${1:-}"

  if [ -n "${PARAM}" ] && ! [[ "${PARAM}" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Invalid argument: ${YELLOW}${PARAM}${RESET}"
    echo -e "${HELP}"
    # This function is intended to be sourced, so we use `return` instead of
    # `exit` to avoid terminating the shell window.
    return 1
  fi

  if [[ "${PARAM}" == "0" ]]; then
    echo -e "${CYAN}Warning: ${YELLOW}Issues assigned to the pseudo-issue ${CYAN}#0${YELLOW} are discouraged.${RESET}"
  elif [ -n "${PARAM}" ] && [[ "$(todo_issue_closed "${PARAM}")" == "true" ]]; then
    echo -e "${CYAN}Warning: ${YELLOW}Issue ${CYAN}#${PARAM} ${YELLOW}is closed!"\
      "See ${CYAN}${GITHUB}/issues/${PARAM}${YELLOW}.${RESET}"
  fi

  local PATTERN
  PATTERN="$(todo_pattern "${PARAM}")"
  grepexx . --perl-regexp "${PATTERN}"
  local MATCH_COUNT
  MATCH_COUNT=$(grepexx . --perl-regexp "${PATTERN}" | wc --lines)
  echo -e "${YELLOW}Found ${CYAN}${MATCH_COUNT} ${YELLOW}TODO(s).${RESET}"
}
