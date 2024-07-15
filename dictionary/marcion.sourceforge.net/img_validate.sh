#!/bin/bash

IMG="dictionary/marcion.sourceforge.net/data/img/"
IMG_300="dictionary/marcion.sourceforge.net/data/img-300/"

img_extensions () {
  ls "${IMG}" | grep -o '\..*' | tr '[:upper:]' '[:lower:]' | sort
}

valid_img_extensions () {
  echo .avif .gif .jpeg .jpg .png .webp | tr ' ' '\n' | sort
}

img_stems () {
  ls "${IMG}" | grep -oE '^[^.]+' | sort
}

img_300_stems () {
  ls "${IMG_300}" | grep -oE '^[^.]+' | sort
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
  echo "You might want to run convert_resize.sh, or delete some images from"
  echo " the destination that are no longer in the source directory."
  exit 1
fi
