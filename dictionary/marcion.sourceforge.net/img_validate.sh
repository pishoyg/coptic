#!/bin/bash

IMG_DIR="dictionary/marcion.sourceforge.net/data/img"
IMG_300_DIR="dictionary/marcion.sourceforge.net/data/img-300"
IMG_SOURCES_DIR="dictionary/marcion.sourceforge.net/data/img-sources"

VALID_EXTENSIONS=".avif .gif .jpeg .jpg .png .webp"

find_basenames () {
  find "${1}" -type f -exec basename {} \; | sort
}

find_stems () {
  find_basenames "${1}" | grep -oE '^[^.]+' | sort
}

find_extensions () {
  find_basenames "${1}" | grep -oE '\.[^.]+$' | tr '[:upper:]' '[:lower:]' | sort
}

# Checking for unknown image extensions:
# shellcheck disable=SC2086
DIFF=$(comm -23 <(find_extensions "${IMG_DIR}" | uniq) <(echo ${VALID_EXTENSIONS} | tr ' ' '\n' | sort))
if [ -n "${DIFF}" ]; then
  echo "Unknown extensions:"
  echo "${DIFF}"
  echo "If you're sure your script can handle those, add them to the list so"
  echo " this error will disappear."
  exit 1
fi

# Check that all images have valid names.
DIFF=$(comm -3 <(find_stems "${IMG_DIR}") <(find_stems "${IMG_DIR}" | grep -oE '^[[:digit:]]+-[[:digit:]]+-[[:digit:]]+$' | grep --invert '^$'))
if [ -n "${DIFF}" ]; then
  echo "Invalid image names:"
  echo "${DIFF}"
  exit 1
fi

# Check that there are no repeated image IDs.
DIFF=$(comm -3 <(find_stems "${IMG_DIR}") <(find_stems "${IMG_DIR}" | uniq))
if [ -n "${DIFF}" ]; then
  echo "The following basenames are duplicate:"
  echo "${DIFF}"
  exit 1
fi

# Check that the two sets of IDs of original and converted images are equal.
# This guarantees that all images have been converted, and that we don't have
# any leftover converted images that need to be cleaned up.
DIFF=$(comm -3 <(find_stems "${IMG_DIR}") <(find_stems "${IMG_300_DIR}"))
if [ -n "${DIFF}" ]; then
  echo "Delta:"
  echo "${DIFF}"
  echo "The set of image ID's doesn't match the set of converted image ID's."
  echo "Running img_setup.sh might help. Note: Run with '--help' first!"
  exit 1
fi

# Check that the two sets of IDs of images and source files are equal.
# This guarantees that all images have sources specified, and that we don't
# have leftover sources that need to be cleaned up
DIFF=$(comm -3 <(find_stems "${IMG_DIR}") <(find_stems "${IMG_SOURCES_DIR}"))
if [ -n "${DIFF}" ]; then
  echo "Delta:"
  echo "${DIFF}"
  echo "The set of image ID's doesn't match the set of source ID's."
  echo "Running img_setup.sh might help."
  exit 1
fi

# Check that the converted images are more recent than the original ones.
find_basenames "${IMG_DIR}"| while read -r BASENAME; do
  IMAGE="${IMG_DIR}/${BASENAME}"
  IMAGE_300="${IMG_300_DIR}/${BASENAME/.png/.jpg}"
  if (($(date +%s -r "${IMAGE}") > $(date +%s -r "${IMAGE_300}"))); then
    echo "${IMAGE} has a more recent timestamp than its converted version ${IMAGE_300}!"
    exit 1
  fi
done

# Check that all sources are more recent than their corresponding files.
find_basenames "${IMG_DIR}" | while read -r BASENAME; do
  IMAGE="${IMG_DIR}/${BASENAME}"
  STEM="${BASENAME%.*}"
  IMAGE_SOURCE="${IMG_SOURCES_DIR}/${STEM}.txt"
  if (($(date +%s -r "${IMAGE}") > $(date +%s -r "${IMAGE_SOURCE}"))); then
    echo "${IMAGE} has a more recent timestamp than its source!"
    echo "Update ${IMAGE_SOURCE}, or merely touch if the content is already up-to-date."
    exit 1
  fi
done
