#!/bin/bash

# shellcheck disable=SC2034
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
RESET_COLOR="\033[0m"

color () {
  echo -e "${!1}${*:2}${RESET_COLOR}"
}

IMG_DIR="dictionary/marcion.sourceforge.net/data/img"
IMG_300_DIR="dictionary/marcion.sourceforge.net/data/img-300"
IMG_SOURCES_DIR="dictionary/marcion.sourceforge.net/data/img-sources"

VALID_EXTENSIONS=".avif .gif .jpeg .jpg .png .webp .svg"

find_basenames () {
  find "${1}" -type f -exec basename {} \; | sort
}

find_stems () {
  find_basenames "${1}" | grep -oE '^[^.]+' | sort
}

IMG_DIR_BASENAMES="$(find_basenames "${IMG_DIR}" | sort)"
IMG_DIR_STEMS="$(echo "${IMG_DIR_BASENAMES}" | grep -oE '^[^.]+')"
IMG_DIR_EXTENSIONS="$(echo "${IMG_DIR_BASENAMES}" | grep -oE '\.[^.]+$' | tr '[:upper:]' '[:lower:]' | sort | uniq)"

# Checking for unknown image extensions:
# shellcheck disable=SC2086
DIFF=$(comm -23 <(echo "${IMG_DIR_EXTENSIONS}" | uniq) <(echo ${VALID_EXTENSIONS} | tr ' ' '\n' | sort))
if [ -n "${DIFF}" ]; then
  color RED "Unknown extensions:"
  color RED "${DIFF}"
  color YELLOW "If you're sure your script can handle those, add them to the list so"
  color YELLOW " this error will disappear."
  exit 1
fi
color GREEN "Extensions are valid."

# Check that all images have valid names.
DIFF=$(comm -3 <(echo "${IMG_DIR_STEMS}") <(echo "${IMG_DIR_STEMS}" | grep -oE '^[[:digit:]]+-[[:digit:]]+-[[:digit:]]+$' | grep --invert '^$'))
if [ -n "${DIFF}" ]; then
  color RED "Invalid image names:"
  color RED "${DIFF}"
  exit 1
fi
color GREEN "Image names are valid."

# Check that there are no repeated image IDs.
DIFF=$(comm -3 <(echo "${IMG_DIR_STEMS}") <(echo "${IMG_DIR_STEMS}" | uniq))
if [ -n "${DIFF}" ]; then
  color RED "The following basenames are duplicate:"
  color RED "${DIFF}"
  exit 1
fi
color GREEN "All image ID's are unique."

# Check that the two sets of IDs of original and converted images are equal.
# This guarantees that all images have been converted, and that we don't have
# any leftover converted images that need to be cleaned up.
DIFF=$(comm -3 <(echo "${IMG_DIR_STEMS}") <(find_stems "${IMG_300_DIR}"))
if [ -n "${DIFF}" ]; then
  color RED "Delta:"
  color RED "${DIFF}"
  color RED "The set of image ID's doesn't match the set of converted image ID's."
  color YELLOW "Running img_setup.sh might help. Note: Run with '--help' first!"
  exit 1
fi
color GREEN "All images have converted versions."

# Check that the two sets of IDs of images and source files are equal.
# This guarantees that all images have sources specified, and that we don't
# have leftover sources that need to be cleaned up
DIFF=$(comm -3 <(echo "${IMG_DIR_STEMS}") <(find_stems "${IMG_SOURCES_DIR}"))
if [ -n "${DIFF}" ]; then
  color RED "Delta:"
  color RED "${DIFF}"
  color RED "The set of image ID's doesn't match the set of source ID's."
  color YELLOW "Running img_setup.sh might help."
  exit 1
fi
color GREEN "All images have sources."

# Check that the converted images are more recent than the original ones.
for BASENAME in ${IMG_DIR_BASENAMES}; do
  IMAGE="${IMG_DIR}/${BASENAME}"
  IMAGE_300="${IMG_300_DIR}/${BASENAME}"
  IMAGE_300="${IMAGE_300/.png/.jpg}"
  IMAGE_300="${IMAGE_300/.svg/.jpg}"
  if (($(date +%s -r "${IMAGE}") > $(date +%s -r "${IMAGE_300}"))); then
    color RED "${IMAGE} has a more recent timestamp than its converted version ${IMAGE_300}!"
    exit 1
  fi
done
color GREEN "Converted images are recent."

# Check that all sources are more recent than their corresponding files.
for BASENAME in ${IMG_DIR_BASENAMES}; do
  IMAGE="${IMG_DIR}/${BASENAME}"
  STEM="${BASENAME%.*}"
  IMAGE_SOURCE="${IMG_SOURCES_DIR}/${STEM}.txt"
  if (($(date +%s -r "${IMAGE}") > $(date +%s -r "${IMAGE_SOURCE}"))); then
    color RED "${IMAGE} has a more recent timestamp than its source!"
    color YELLOW "Update ${IMAGE_SOURCE}, or merely touch if the content is already up-to-date."
    exit 1
  fi
done
color GREEN "Sources are recent."
