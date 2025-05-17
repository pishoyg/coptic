#!/bin/bash
# Crop the Dawoud scans in parallel.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

readonly INPUT="dictionary/copticocc.org/data/dawoud-D100"
readonly OUTPUT="docs/dawoud/"

export OUTPUT  # Make OUTPUT available to subprocesses.

process_file() {
  local FILE="$1"
  local ID
  ID="$(basename "${FILE}" | grep -oE '^[0-9]+')"

  if [[ ${ID} -ge 85 ]]; then
    if [ $((ID % 2)) -eq 0 ]; then
      TARGET="725x1014+100+75"
    else
      TARGET="725x1014+0+75"
    fi
  else
    if [ $((ID % 2)) -eq 0 ]; then
      TARGET="725x1014+75+75"
    else
      TARGET="725x1014+25+75"
    fi
  fi

  magick "${FILE}" -crop "${TARGET}" "${OUTPUT}/${ID}.jpg"
}

export -f process_file

find "${INPUT}" -type f -print0 | xargs -0 -P "$(nproc)" -I {} bash -c 'process_file "$@"' _ {}
