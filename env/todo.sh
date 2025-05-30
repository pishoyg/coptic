#!/bin/bash

source env/color.sh
source env/paths.sh

# Search for TODO's.
# NOTE: We "mangle" the regex using extra parentheses in order to prevent it
# from matching itself.
todo() {
  PATTERN="TODO(:)"
  HELP="${BLUE}Display TODO markers in the repo.
  Run ${GREEN}todo \"\${ISSUE_NUMBER}\" ${BLUE}to show TODOs for a specific issue.
  Run ${GREEN}todo \"stray\" ${BLUE}to show TODOs without an associated issue.
  Run ${GREEN}todo --help ${BLUE}to display this message.${RESET}"
  PARAM="${1}"
  if (( "$#" > 1 )); then
    echo -e "${RED}Too many parameters!${RESET}"
    echo -e "${HELP}"
    return 1
  fi
  if [[ "${PARAM}" == "--help" ]]; then
    echo -e "${HELP}"
    return 0
  fi
  # TODO: (#66) There will be no need to support stray TODO's once they have
  # been eradicated and banned.
  if [[ "${PARAM}" == "stray" ]]; then
    # Search for TODO's without an assigned issue.
    PATTERN="${PATTERN} (?!\(#[0-9]+\))"
  elif [ -n "${PARAM}" ]; then
    if ! echo "${PARAM}" | grep --quiet --extended-regexp '^[0-9]+$'; then
      echo -e "${RED}Invalid parameter.${RESET}"
      echo -e "${HELP}"
      return 1
    fi
    PATTERN="${PATTERN} \(#${PARAM}\)"
    CLOSED=$(gh issue view "${PARAM}" --json "closed" --jq ".closed")
    if [[ "${CLOSED}" == "true" ]]; then
      echo -e "${RED}Warning: Issue ${YELLOW}#${PARAM} ${RED}is closed!"\
        "See ${YELLOW}${GITHUB}/issues/${PARAM}${RED}.${RESET}"
    fi
  else
    # Search for all TODO's, making the issue number optional.
    PATTERN="${PATTERN}"' (\(#[0-9]+\))?'
  fi
  grepexx . --perl-regexp "${PATTERN}"
}
