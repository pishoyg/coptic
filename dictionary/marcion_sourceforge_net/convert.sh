#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

show_usage() {
  echo "Usage: $0 -m|-c <FILE> [-n NUMERATOR -d DENOMINATOR]"
  echo "  -m        Maximize image to square."
  echo "  -c        Crop bottom part of image."
  echo "  -n NUMERATOR  Numerator for crop proportion (default: 17)"
  echo "  -d DENOMINATOR Denominator for crop proportion (default: 20)"
  exit 1
}

if [ "$#" -lt 2 ]; then
  show_usage
fi

# Default values for crop proportions.
NUMERATOR="17"
DENOMINATOR="20"

# Parse command-line arguments.
while getopts "mc:n:d:" opt; do
  case "${opt}" in
    m) MODE="maximize" ;;
    c) MODE="crop"; FILE="${OPTARG}" ;;
    n) NUMERATOR="${OPTARG}" ;;
    d) DENOMINATOR="${OPTARG}" ;;
    *) show_usage ;;
  esac
done
shift $((OPTIND-1))

# Ensure FILE is provided if not already set by -c.
FILE="${1:-$FILE}"

if [ -z "${FILE}" ] || [ ! -f "${FILE}" ]; then
  echo "Error: Input file is required."
  show_usage
fi

# Extract image dimensions.
DIMENSIONS="$(magick identify "${FILE}" | awk '{ print $3 }')"
WIDTH="$(echo "${DIMENSIONS}" | grep -oE '^[[:digit:]]+')"
HEIGHT="$(echo "${DIMENSIONS}" | grep -oE '[[:digit:]]+$')"

# Prepare output path.
DIRNAME="$(dirname "${FILE}")"
BASENAME="$(basename "${FILE}")"
STEM="${BASENAME%.*}"
EXT="${BASENAME##*.}"

# Perform operation based on the selected mode.
case "${MODE}" in
  maximize)
    # Maximize to square.
    TARGET="${WIDTH}"
    if (( HEIGHT > WIDTH )); then
      TARGET="${HEIGHT}"
    fi
    DEST="${DIRNAME}/${STEM}_${WIDTH}x${HEIGHT}.${EXT}"
    magick "${FILE}" -gravity "Center" -extent "${TARGET}x${TARGET}" "${DEST}"
    ;;
  crop)
    # Crop the bottom part (File 2 logic)
    HEIGHT="$((HEIGHT * NUMERATOR / DENOMINATOR))"
    DEST="${DIRNAME}/${STEM}_${WIDTH}x${HEIGHT}.${EXT}"
    magick "${FILE}" -crop "${WIDTH}x${HEIGHT}+0+0" "${DEST}"
    ;;
  *)
    show_usage
    ;;
esac

# Open the resulting file.
open "${DEST}"
