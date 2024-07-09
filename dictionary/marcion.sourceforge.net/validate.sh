#!/bin/sh

IMG="dictionary/marcion.sourceforge.net/data/img/"
IMG_300="dictionary/marcion.sourceforge.net/data/img-300/"

img_extensions () {
  ls "${IMG}" | grep -o '\..*' | tr '[:upper:]' '[:lower:]' | sort
}

img_basenames () {
  ls "${IMG}" | grep -oE '^[^.]+' | sort
}

img_300_basenames () {
  ls "${IMG-300}" | grep -oE '^[^.]+' | sort
}

# Checking for unknown image extensions:
DIFF=$(comm -23 <(img_extensions | uniq) <(echo .avif .gif .jpeg .jpg .png .webp | tr ' ' '\n' | sort))

if [ ! -z "${DIFF}" ]; then
  echo "Unknown extensions:"
  echo "${DIFF}"
  exit 1
fi

# Check that all images are converted.
DIFF=$(comm -3 <(img_basenames) <(img_300_basenames))
if [ ! -z "${DIFF}" ]; then
  echo "Images that are not converted:"
  echo "${DIFF}"
  exit 1
fi

# Check that there are no identical IDs.
DIFF=$(comm -3 <(img_basenames) <(img_basenames))
if [ ! -z "${DIFF}" ]; then
  echo "The following basenames are duplicate:"
  echo "${DIFF}"
  exit 1
fi
