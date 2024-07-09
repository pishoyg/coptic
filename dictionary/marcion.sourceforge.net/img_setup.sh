#!/bin/sh

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
  magick "${SRC}/${FILE}" -resize "${WIDTH}x" "${DST}/${FILE/.png/.jpg}"
done
