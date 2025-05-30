#!/bin/bash

source env/color.sh
source env/paths.sh

HELP="${RED}Pass an optional issue number to find its related TODO's, or nothing to find all TODO's.${RESET}"

# Search for TODO's.
todo() {
  if (( "$#" > 1 )); then
    echo -e "${RED}Too many parameters!${RESET}"
    echo -e "${HELP}"
    return 1
  fi

  PATTERN="TODO(:)"  # We intentionally mangle the regex to prevent it from matching itself.
  PARAM="${1}"

  if [[ "${PARAM}" =~ ^[0-9]+$ ]]; then
    # An issue number is given. Search for TODO's assigned to this issue.
    PATTERN="${PATTERN} \(#${PARAM}\)"

    if [[ "${PARAM}" == "0" ]]; then
      echo -e "${CYAN}Warning: ${YELLOW}Issues assigned to the pseud-issue ${CYAN}#0${YELLOW} are discouraged."
    else
      # Check if the GitHub issue is closed.
      CLOSED=$(gh issue view "${PARAM}" --json "closed" --jq ".closed")
      if [[ "${CLOSED}" == "true" ]]; then
        echo -e "${CYAN}Warning: ${YELLOW}Issue ${CYAN}#${PARAM} ${YELLOW}is closed!"\
          "See ${CYAN}${GITHUB}/issues/${PARAM}${YELLOW}.${RESET}"
      fi
    fi
  elif [ -n "${PARAM}" ]; then
    echo -e "${RED}Invalid argument: ${YELLOW}${PARAM}${RESET}"
    echo -e "${HELP}"
    # This script is intended to be sourced, so we use `return` instead of
    # `exit` to avoid terminating the shell window.
    return 1
  fi
  grepexx . --perl-regexp "${PATTERN}"
  MATCH_COUNT=$(grepexx . --perl-regexp "${PATTERN}" | wc --lines)
  echo -e "${YELLOW}Found ${CYAN}${MATCH_COUNT} ${YELLOW}TODO(s).${RESET}"
}
