#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

readonly WORK_DIR="${HOME}/Desktop/print"
readonly OUTPUT_DIR="docs/dawoud"

mkdir -p "${WORK_DIR}/png"

curl \
  -L \
  -o "${WORK_DIR}/dawoud.pdf" \
  "https://drive.google.com/uc?export=download&id=1DHdrnc1M1Yb3IViIQVAXTm1bAA7w3-7W"

# Convert the PDF to PNG.
for I in {0..1055..50}; do
  END=$((I + 49))
  if [ $END -gt 1055 ]; then
    END=1055
  fi
  say "Processing pages $I to $END..."

  magick -density 600 "${WORK_DIR}/dawoud.pdf[$I-$END]" -monochrome -strip "${WORK_DIR}/png/%d.png"
done

# Crop the PNG images.
for I in {0..1055}; do
  INFILE="${WORK_DIR}/png/${I}.png"
  OUTFILE="${OUTPUT_DIR}/${I}.png"

  CROP_GEOMETRY=""
  if [ $I -le 85 ]; then
    # Crop geometry for pages 0 through 85.
    CROP_GEOMETRY="4260x6246+100+210"
  else
    # Crop geometry for pages 86 through 1055.
    if [ $(($I % 2)) -eq 0 ]; then
      CROP_GEOMETRY="4260x6246+20+210"  # Even page number.
    else
      CROP_GEOMETRY="4260x6246+190+210"  # Odd page number.
    fi
  fi

  echo -e "${BLUE}Cropping ${GREEN}${INFILE} ${BLUE}into ${GREEN}${OUTFILE}${BLUE}.${RESET}"

  magick "${INFILE}" \
    -crop "${CROP_GEOMETRY}" \
    +repage \
    -define png:color-type=0 \
    -define png:bit-depth=1 \
    "${OUTFILE}"
done
