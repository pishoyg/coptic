SRC="dictionary/marcion.sourceforge.net/data/img"
WIDTH="300"
DST="dictionary/marcion.sourceforge.net/data/img-${WIDTH}"

for FILE in $(ls "${SRC}"); do
  magick "${SRC}/${FILE}" -resize "${WIDTH}x" "${DST}/${FILE/.png/.jpg}"
done
