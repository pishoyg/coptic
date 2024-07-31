#!/bin/bash

IMG_DIR="dictionary/marcion.sourceforge.net/data/img"
WIDTH="300"
IMG_300_DIR="dictionary/marcion.sourceforge.net/data/img-300"
IMG_SOURCES_DIR="dictionary/marcion.sourceforge.net/data/img-sources"

SKIP_EXISTING=false
while [ $# -gt 0 ]; do
  case $1 in
  --skip_existing)
    SKIP_EXISTING=true
    ;;
  --help)
    echo "Convert images, populating ${IMG_300_DIR}/."
    echo
    echo "In normal mode, process all images."
    echo
    echo "Flags:"
    echo "  --skip_existing: Skip existing images. You should only use this"
    echo "      flag if there are no obsolete images in ${IMG_300_DIR}/."
    echo "      Images can be obsolete if, for example, an image was modified"
    echo "      in ${IMG_DIR}/, and the generated version of the old image is"
    echo "      still present in ${IMG_300_DIR}/."
    echo "      If run with --skip_existing, this script (as the flag name suggests)"
    echo "      will generate only the absent images, but (unlike other scripts in"
    echo "      this repo) won't look at the file modification timestamps."
    echo "      It does NOT convert images based on their timestamps, but rather"
    echo "      based on their mere existence or absence."
    echo "      In other words, the script would _generate an absent file_, but"
    echo "      wouldn't _regenerate an outdated file_."
    echo "      In other words, you might have to manually delete the artefacts in"
    echo "      order for this script to generate replacements."
    echo
    echo "N.B. Although we can delete old sources, we intentionally refrain from"
    echo "populating absent sources with a default value, since now we have"
    echo "become stricter with collecting image sources."
    exit
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

# Delete obsolete images.
find "${IMG_300_DIR}" -type f | while read -r FILE; do
  BASENAME="$(basename "${FILE}")"
  if [ ! -f "${IMG_DIR}/${BASENAME}" ] && [ ! -f "${IMG_DIR}/${BASENAME/.jpg/.png}" ]; then
    rm "${FILE}"
  fi
done

# Delete obsolete sources.
find "${IMG_SOURCES_DIR}" -type f | while read -r FILE; do
  BASENAME="$(basename "${FILE}")"
  STEM="${BASENAME%.*}"
  if [ -z "$(find "${IMG_DIR}" -name "${STEM}.*")" ]; then
    rm "${FILE}"
  fi
done

# Convert images.
find "${IMG_DIR}" -type f | while read -r FILE; do
  BASENAME=$(basename "${FILE}")
  FILE_300="${IMG_300_DIR}/${BASENAME/.png/.jpg}"
  if ${SKIP_EXISTING} && [ -f "${FILE_300}" ]; then
    continue
  fi
  magick "${FILE}" -alpha remove -alpha off -background white -resize "${WIDTH}x" "${FILE_300}"
done
