#!/usr/bin/env bash

set -o errexit  # Exit upon encountering a failure.

source .env

if (( "$#" == 0 )); then
  exit
fi

ERROR_LIST="$(darglint --list-errors)"

# `darglint` exits non-zero when it reports findings, so guard the assignment
# against `errexit`.
OUTPUT="$(darglint "$@")" || true

if [ -z "${OUTPUT}" ]; then
  exit
fi

# Append error messages, and colorize output.
while IFS= read -r LINE; do
  if [ -z "${LINE}" ]; then
    echo
    continue
  fi

  # Lines look like `PATH:FUNC:LINE_NO: CODE: - SYMBOL`. Peel the fields off
  # from the right, so that hyphens and spaces in PATH don't confuse us.
  ERROR_SYMBOL="${LINE##*: - }"
  REST="${LINE%: - *}"
  ERROR_CODE="${REST##*: }"
  REST="${REST%: *}"
  LINE_NO="${REST##*:}"
  REST="${REST%:*}"
  FUNC_NAME="${REST##*:}"
  PATH_PART="${REST%:*}"
  ERROR_MESSAGE="$(printf '%s\n' "${ERROR_LIST}" \
    | grep -m 1 "^${ERROR_CODE}: " || true)"
  ERROR_MESSAGE="${ERROR_MESSAGE#*: }"

  echo -e "${PURPLE}${PATH_PART}${RESET}:${RED}${FUNC_NAME}${RESET}:${GREEN}${LINE_NO}${RESET}: ${ERROR_CODE}: - ${BLUE}${ERROR_SYMBOL}${RESET} - ${ERROR_MESSAGE}"
done <<< "${OUTPUT}"

exit 1
