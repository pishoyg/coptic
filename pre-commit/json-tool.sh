#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

if (( "$#" == 0 )); then
  exit
fi
for FILE in "$@"; do
  python -m json.tool --no-ensure-ascii --indent 2 \
    "${FILE}" "${FILE}";
done
