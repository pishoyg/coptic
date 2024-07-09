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

# TODO: Add a flag to make it possible to skip the images that already exist in
# the output.
SRC="dictionary/marcion.sourceforge.net/data/img"
WIDTH="300"
DST="dictionary/marcion.sourceforge.net/data/img-${WIDTH}"

# Delete obsolete images.
for FILE in $(ls "${DST}"); do
 if [ ! -f "${SRC}/${FILE}" ] && [ ! -f "${SRC}/${FILE/.jpg/.png}" ]; then
   rm "${DST}/${FILE}"
 fi
done

mkdir -p "${DST}"

for FILE in $(ls "${SRC}"); do
  if ${SKIP_EXISTING} && [ -f "${DST}/${FILE/.png/.jpg}" ]; then
    continue
  fi
  magick "${SRC}/${FILE}" -resize "${WIDTH}x" "${DST}/${FILE/.png/.jpg}"
done
