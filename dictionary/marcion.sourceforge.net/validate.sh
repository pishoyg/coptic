#!/bin/sh

# Checking for unknown image extensions:
DIFF=$(comm -23 <( ls dictionary/marcion.sourceforge.net/data/img/ | grep -o '\..*' | tr '[:upper:]' '[:lower:]' | sort | uniq ) <( echo .avif .gif .jpeg .jpg .png .webp | tr ' ' '\n' | sort ))

if [ ! -z "${DIFF}" ]; then
  echo "Unknown extensions:"
  echo "${DIFF}"
  exit 1
fi

# Check that all images are converted.
DIFF=$(comm -23 <( ls dictionary/marcion.sourceforge.net/data/img/ | grep -oE '^[^.]+' | sort) <( ls dictionary/marcion.sourceforge.net/data/img-300/ | grep -oE '^[^.]+' | sort))
if [ ! -z "${DIFF}" ]; then
  echo "Images that are not converted:"
  echo "${DIFF}"
  exit 1
fi

# Check that there are no identical IDs.
# TODO: Implement.
