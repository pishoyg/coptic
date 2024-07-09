# TODO: Add a flag to make it possible to skip the images that already exist in
# the output.
SRC="dictionary/marcion.sourceforge.net/data/img"
WIDTH="300"
DST="dictionary/marcion.sourceforge.net/data/img-${WIDTH}"

process() {
  FILE="$1"
  magick "${SRC}/${FILE}" -resize "${WIDTH}x" "${DST}/${FILE/.png/.jpg}"
}

mkdir -p "${DST}"

for FILE in $(ls "${SRC}"); do
  process "${FILE}"
done
