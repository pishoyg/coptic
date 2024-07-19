#!/bin/bash

SKIP_EXISTING=false
while [ $# -gt 0 ]; do
  case $1 in
  --skip_existing)
    SKIP_EXISTING=true
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

SRC="dictionary/marcion.sourceforge.net/data/img"
WIDTH="300"
DST="dictionary/marcion.sourceforge.net/data/img-${WIDTH}"

# Delete obsolete images.
for FILE in "${DST}"/*; do
  BASENAME=$(basename "${FILE}")
 if [ ! -f "${SRC}/${BASENAME}" ] && [ ! -f "${SRC}/${BASENAME/.jpg/.png}" ]; then
   rm "${DST}/${BASENAME}"
 fi
done

mkdir -p "${DST}"

for FILE in "${SRC}"/*; do
  BASENAME=$(basename "${FILE}")
  if ${SKIP_EXISTING} && [ -f "${DST}/${BASENAME/.png/.jpg}" ]; then
    continue
  fi
  magick "${SRC}/${BASENAME}" -alpha remove -alpha off -background white -resize "${WIDTH}x" "${DST}/${BASENAME/.png/.jpg}"
done
