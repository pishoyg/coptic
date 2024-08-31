#!/bin/bash

# In order to support obfuscation, class names in TypeScript must be defined
# using a constant variable of the form 'CLS_.*'. We enforce this by
# restricting the use of string literals in TypeScript code. All string
# literals are banned, except the ones in the whitelist.
# The whitelist for each TypeScript file called "${FILE}" should live in
# "${FILE}.whitelist.txt".

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .helpers

for FILE in "${@}"; do
  FOUND=$(grep --invert "^const CLS_" "${FILE}" \
    | grep --only --extended-regexp "'[^']*'" \
    | tr -d "'" \
    | sort \
    | uniq)
  WHITELIST_FILE="${FILE}.whitelist.txt"
  ALLOWED=$(cat "${WHITELIST_FILE}")
  DIFF=$(comm -23 <(echo "${FOUND}") <(echo "${ALLOWED}" | sort | uniq))
  if [ -n "${DIFF}" ]; then
    echo -e "${RED}Unwhitelisted string literals: ${PURPLE}${DIFF}"\
      "${RED}found in ${PURPLE}${FILE}${RED}.${RESET}"
    exit 1
  fi
done
