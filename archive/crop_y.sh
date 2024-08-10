# Crop out the bottom part of an image, keeping only the given proportion of
# the original height.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

# TODO: Use named args instead of positional args.
FILE="${1}"
NUMER="${2}"
DENOM="${3}"

# The default proportion is 17/20 of the original.
if [ -z ${NUMER} ]; then
  NUMER="17"
fi
if [ -z ${DENOM} ]; then
  DENOM="20"
fi

DIMENSIONS="$(magick identify "${FILE}" | awk '{ print $3 }')"
WIDTH="$(echo "${DIMENSIONS}" | grep -oE '^[[:digit:]]+')"
HEIGHT="$(echo "${DIMENSIONS}" | grep -oE '[[:digit:]]+$')"
HEIGHT="$(("${HEIGHT}" / "${DENOM}" * "${NUMER}"))"

DIRNAME="$(dirname "${FILE}")"
BASENAME="$(basename "${FILE}")"
STEM="${BASENAME##*.}"
EXT="${BASENAME%.*}"
DEST="${DIRNAME}/${STEM}_${WIDTH}x${HEIGHT}.${EXT}"
magick "${FILE}" -crop "${WIDTH}x${HEIGHT}+0+0" "${DEST}"
open "${DEST}"
