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

# todo_issue_closed prints "true" if the given GitHub issue is closed, and
# "false" if it is open.
# It prints nothing and returns a non-zero exit code if the issue can't be
# resolved at all, for example because it doesn't exist, or because `gh` can't
# reach GitHub. Callers must distinguish this case from "false"; treating an
# unresolvable issue as an open one silently lets bad issue numbers through.
#
# NOTE: We deliberately don't distinguish "this issue doesn't exist" from "we
# couldn't reach GitHub", even though the former is the case we care about and
# the latter makes the check unrunnable rather than failed. We don't care to
# handle an unreachable GitHub: it's rare, it's not the local machine's problem
# to paper over, and the alternative is scraping `gh`'s stderr for prose that
# isn't part of its contract. A developer stuck offline can use `--no-verify`.
todo_issue_closed() {
  local CLOSED
  CLOSED="$(gh issue view "${1}" --json "closed" --jq ".closed")" || return 1
  case "${CLOSED}" in
    true | false)
      printf '%s\n' "${CLOSED}"
      ;;
    *)
      return 1
      ;;
  esac
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
  elif [ -n "${PARAM}" ]; then
    # NOTE: We can't inline the call inside the condition below. A command
    # substitution that fails inside a condition is indistinguishable from one
    # that printed "false", so an unresolvable issue would pass for an open one.
    local CLOSED
    if ! CLOSED="$(todo_issue_closed "${PARAM}")"; then
      echo -e "${CYAN}Warning: ${YELLOW}Couldn't resolve issue ${CYAN}#${PARAM}${YELLOW}!"\
        "It may not exist. See ${CYAN}${GITHUB}/issues/${PARAM}${YELLOW}.${RESET}"
    elif [[ "${CLOSED}" == "true" ]]; then
      echo -e "${CYAN}Warning: ${YELLOW}Issue ${CYAN}#${PARAM} ${YELLOW}is closed!"\
        "See ${CYAN}${GITHUB}/issues/${PARAM}${YELLOW}.${RESET}"
    fi
  fi

  local PATTERN
  PATTERN="$(todo_pattern "${PARAM}")"
  grepexx . --perl-regexp "${PATTERN}"
  local MATCH_COUNT
  MATCH_COUNT=$(grepexx . --perl-regexp "${PATTERN}" | wc --lines)
  echo -e "${YELLOW}Found ${CYAN}${MATCH_COUNT} ${YELLOW}TODO(s).${RESET}"
}
