#!/bin/bash

set -o nounset

if [ -n "$(git -C "${SITE_DIR}" status --short)" ]; then
  echo "Git repo is dirty. This should be done in a standalone commit."
  exit 1
fi

CRUM_DIR="${SITE_DIR}/crum"

rm -r "${CRUM_DIR:?}"/*

cp -r \
  flashcards/data/output/html/a_coptic_dictionary__all_dialects/* \
  "${CRUM_DIR}"

cp -r \
  flashcards/data/output/html/a_coptic_dictionary__bohairic/* \
  "${CRUM_DIR}"

git -C "${SITE_DIR}" add --all
git -C "${SITE_DIR}" commit -m "AUTOMATED COMMIT"
git -C "${SITE_DIR}" push
