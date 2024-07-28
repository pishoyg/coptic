#!/bin/bash

IMG_DIR="dictionary/marcion.sourceforge.net/data/img"
WIDTH="300"
IMG_300_DIR="dictionary/marcion.sourceforge.net/data/img-300"
IMG_SOURCES_DIR="dictionary/marcion.sourceforge.net/data/img-sources"

SKIP_EXISTING=false
MANUAL_SOURCES=false
while [ $# -gt 0 ]; do
  case $1 in
  --skip_existing)
    SKIP_EXISTING=true
    ;;
  --manual_sources)
    MANUAL_SOURCES=true
    ;;
  --help)
    echo "Convert images, populating ${IMG_300_DIR}."
    echo "Flags:"
    echo "  --skip_existing: skip existing images. You should only use this"
    echo "      flag if there are no modified images in ${IMG_DIR}."
    echo "  --manual: For all images missing a source file, add a new file"
    echo "      with the content set to 'manual'."
    echo "Note: This script doesn't look at file modification timestamps."
    echo "It does NOT convert images or populate sources for files based on"
    echo "their timestamps, but rather based on their mere existence or"
    echo "absence. This is intentional, because we don't consider timestamps"
    echo "to be trustworthy, so we require manual intervention in such"
    echo "situations. In other words, you might have to manually delete the"
    echo "artefacts in order for this script to generate replacements."
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

# Write 'manual' for the missing sources.
if ${MANUAL_SOURCES}; then
  find "dictionary/marcion.sourceforge.net/data/img" -type f \
    | while read -r FILE; do

    SOURCE_FILE="${FILE%.*}.txt"
    SOURCE_FILE="${SOURCE_FILE/img/img-sources}"
    if [ ! -f "${SOURCE_FILE}" ]; then
      echo "manual" > "${SOURCE_FILE}"
    fi
  done
fi
