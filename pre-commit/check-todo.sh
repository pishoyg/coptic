#!/bin/bash

# NOTE: Adding `set -o errexit` causes the script to fail, although it is not
# clear why.
set -o nounset  # Consider an undefined variable to be an error.

if (( "$#" == 0 )); then
  exit
fi

# TODO: (#66) Once all existing TODO's have been assigned issues,
# change the following to an error rather than simply a warning.
TODO="$(grep "TODO(:) (?!\(#[0-9]+\))" --perl-regexp \
  --ignore-case --color=always "${@}")"
if [ -n "${TODO}" ]; then
  echo -e "${YELLOW}Stray TODO markers found. Please add an issue"\
    "number to each TODO:\n${RESET}${TODO}"
fi
