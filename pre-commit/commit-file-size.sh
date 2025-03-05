#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .env

announce () {
  echo -e "${1}Files in this batch total ${2}${SIZE}${1}.${RESET}"
}

if (( "$#" == 0 )); then
  exit
fi

SIZE="$(du --apparent-size --human-readable --summarize --total "${@}" | tail -n 1 | cut --fields 1)"
MAGNITUDE="$(echo "${SIZE}" | grep -o '[A-Z]' || true)"
COUNT="$(echo "${SIZE}" | grep --only --extended-regexp "^[0-9]+" || true)"
if [[ "${MAGNITUDE}" == "" || "${MAGNITUDE}" == "K" ]]; then
  announce "${BLUE}" "${GREEN}"
elif [[ "${MAGNITUDE}" == "M" ]] && (( COUNT < 128 )); then
  announce "${YELLOW}" "${CYAN}"
else
  announce "${RED}" "${PURPLE}"
fi
