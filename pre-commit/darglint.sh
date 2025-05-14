#!/usr/bin/env bash

set -o errexit  # Exit upon encountering a failure.

source .env

if (( "$#" == 0 )); then
  exit
fi

# Store error messages from `darglint --list-errors`.
declare -A ERROR_MAP
while IFS= read -r LINE; do
    CODE="${LINE%%:*}"
    MESSAGE="${LINE#*: }"
    ERROR_MAP["$CODE"]="$MESSAGE"
done < <(darglint --list-errors)

# Run darglint, appending error messages, and colorizing output.
darglint "$@" | while IFS= read -r LINE; do
  if [ -z "${LINE}" ]; then
    echo
    continue
  fi

  PATH_PART=$(echo "$LINE" | cut -d':' -f1)
  FUNC_NAME=$(echo "$LINE" | cut -d':' -f2)
  LINE_NO=$(echo "$LINE" | cut -d':' -f3)
  ERROR_CODE=$(echo "$LINE" | cut -d':' -f4 | cut -d' ' -f2)
  ERROR_SYMBOL=$(echo "$LINE" | cut -d'-' -f2 | xargs)
  ERROR_MESSAGE="${ERROR_MAP["${ERROR_CODE}"]}"

  echo -e "${PURPLE}${PATH_PART}${RESET}:${RED}${FUNC_NAME}${RESET}:${GREEN}${LINE_NO}${RESET}: ${ERROR_CODE}: - ${BLUE}${ERROR_SYMBOL}${RESET} - ${ERROR_MESSAGE}"
done

if [ -n "$(darglint "$@")" ]; then
  exit 1
fi
