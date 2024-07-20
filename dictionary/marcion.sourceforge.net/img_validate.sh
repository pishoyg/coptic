#!/bin/bash

IMG="dictionary/marcion.sourceforge.net/data/img"
IMG_300="dictionary/marcion.sourceforge.net/data/img-300"

img_extensions () {
  find "${IMG}" -type f | grep -oE '\.[^.]+$' | tr '[:upper:]' '[:lower:]' | sort
}

valid_img_extensions () {
  echo .avif .gif .jpeg .jpg .png .webp | tr ' ' '\n' | sort
}

img_stems () {
  find "${IMG}" -type f -exec basename {} \; | grep -oE '^[^.]+' | sort
}

valid_img_stems () {
  img_stems | grep -oE '^[[:digit:]]+-[[:digit:]]+-[[:digit:]]+$' | grep --invert '^$'
}

img_300_stems () {
  find "${IMG_300}" -type f -exec basename {} \; | grep -oE '^[^.]+' | sort
}

# Checking for unknown image extensions:
DIFF=$(comm -23 <(img_extensions | uniq) <(valid_img_extensions))

if [ -n "${DIFF}" ]; then
  echo "Unknown extensions:"
  echo "${DIFF}"
  echo "If you're sure your script can handle those, add them to the list so"
  echo " this error will disappear."
  exit 1
fi

# Check that there are no identical IDs.
DIFF=$(comm -3 <(img_stems) <(img_stems | uniq))
if [ -n "${DIFF}" ]; then
  echo "The following basenames are duplicate:"
  echo "${DIFF}"
  exit 1
fi

# Check that all images are converted.
DIFF=$(comm -3 <(img_stems) <(img_300_stems))
if [ -n "${DIFF}" ]; then
  echo "Delta:"
  echo "${DIFF}"
  echo "You might want to run img_setup.sh, or delete some images from"
  echo " the destination that are no longer in the source directory."
  exit 1
fi

# Check that all images have valid names.
DIFF=$(comm -3 <(img_stems) <(valid_img_stems))
if [ -n "${DIFF}" ]; then
  echo "Invalid image names:"
  echo "${DIFF}"
  exit 1
fi

# Check that all images have up-to-date sources.
find "${IMG}" -type f | while read -r FILE; do
  SOURCE_FILE="${FILE%.*}.txt"
  SOURCE_FILE="${SOURCE_FILE/img/img-sources}"
  if [ ! -f "${SOURCE_FILE}" ]; then
    echo "${FILE} doesn't have a source!"
    echo "${SOURCE_FILE} doesn't exist!"
    exit 1
  fi
  if (($(date +%s -r "${FILE}") > $(date +%s -r "${SOURCE_FILE}"))); then
    echo "${FILE} has a more recent timestamp than its source!"
    echo "Update ${SOURCE_FILE}, or merely touch if the content is already up-to-date."
    exit 1
  fi
done
