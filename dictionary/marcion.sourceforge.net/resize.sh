SRC="data/img"
WIDTH="300"
DST="data/img-${WIDTH}"

for FILE in $(ls "${SRC}"); do
  convert "${SRC}/${FILE}" -resize "${WIDTH}x" "${DST}/${FILE}"
done
