#!/bin/bash
set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.
set -o pipefail  # Exit if any subcommand fails.

# Input parameters.
readonly PREFIX="https://coptot.manuscriptroom.com/images/webfriendly/800000/crum_"
readonly START=1
readonly END=844

# Output parameters.
readonly DEST="docs/crum/crum"

# Working directory.
readonly TMP_DIR="/tmp/crum"

mkdir -p "${DEST}"

# shellcheck disable=SC2016
seq "${START}" "${END}" | xargs -P 10 -I{} bash -c '
  NUM="$1"
  TMP="$2/${NUM}.jpg"
  OUT="$3/$(( ${NUM} + 20 )).jpg"
  curl --silent --fail "${4}$(printf "%03d" "${NUM}").jpg" -o "${TMP}"
  magick "${TMP}" -resize 50% -interlace JPEG -strip -quality 5 -crop "1830x2760+170+40" "${OUT}"
  rm -f "${TMP}"
  echo "Wrote ${OUT}!"
' _ {} "${TMP_DIR}" "${DEST}" "${PREFIX}"

rm -rf "${TMP_DIR}"
