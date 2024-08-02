#!/bin/bash

WORK_DIR="/Users/pgirgis/git_tree/coptic/tmp/"
mkdir "${WORK_DIR}"
MIRROR="aws/mirror/crum"

cp \
  flashcards/data/output/html/a_coptic_dictionary__all_dialects/* \
  "${WORK_DIR}"

cp \
  flashcards/data/output/html/a_coptic_dictionary__bohairic/* \
  "${WORK_DIR}"

# Delete obsolete files.
find "${MIRROR}" -type f -not -name ".*" | while read -r DEST; do
  BASENAME="$(basename "${DEST}")"
  SRC="${WORK_DIR}/${BASENAME}"
  if [ ! -f "${SRC}" ]; then
    # The source file no longer exists.
    # TODO: Delete from AWS, and from the mirror.
    :
  fi
done

# Notice that we omit hidden files.
find "${WORK_DIR}" -type f -not -name ".*" | while read -r SRC; do
  BASENAME="$(basename "${SRC}")"
  DEST="${MIRROR}/${BASENAME}"
  if [ -f "${DEST}" ] && [ -z "$(diff "${SRC}" "${DEST}")" ]; then
    rm "${SRC}"
    continue
  fi
  # TODO: Copy the file to AWS and the mirror.
  # N.B. Set the `Content-Type` header to `text/html; charset=utf-8`.
  :
done

date +%s > aws/TIMESTAMP
git add aws/TIMESTAMP
