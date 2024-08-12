#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

AUTO=false
while [ $# -gt 0 ]; do
  case $1 in
  --auto)
    AUTO=true
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

if [ -n "$(git -C "${SITE_DIR}" status --short)" ]; then
  echo "Git repo is dirty. This should be done in a standalone commit."
  exit 1
fi

CRUM_DIR="${SITE_DIR}/crum"
BIBLE_DIR="${SITE_DIR}/bible"

rm -r "${CRUM_DIR:?}"/*

cp -r \
  flashcards/data/output/html/a_coptic_dictionary__all_dialects/* \
  "${CRUM_DIR}"

cp -r \
  bible/stshenouda.org/data/output/html/bohairic_english \
  bible/stshenouda.org/data/output/html/bohairic \
  bible/stshenouda.org/data/output/html/sahidic \
  "${BIBLE_DIR}"

git -C "${SITE_DIR}" add --all
git -C "${SITE_DIR}" commit --fixup HEAD

if ${AUTO}; then
  git -C "${SITE_DIR}" rebase --root --autosquash
  git -C "${SITE_DIR}" push --force
else
  # shellcheck disable=SC2016
  echo -e "${GREEN}" Run "${YELLOW}" 'git -C "${SITE_DIR}" rebase --root --autosquash && git -C "${SITE_DIR}" push --force'
fi
