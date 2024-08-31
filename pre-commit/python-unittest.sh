#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

source .helpers

if (( "$#" == 0 )); then
  exit
fi

for DIR in $(dirname "$@" | grep --invert "/test$" | sort | uniq); do
  python -m unittest discover "${DIR}";
done
