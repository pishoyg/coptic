#!/bin/bash
# Crop the Dawoud scans.
find dictionary/copticocc.org/data/dawoud-D100 -type f | while read -r FILE; do
  ID="$(basename "${FILE}" | grep -oE '^[0-9]+')"
  if [[ ${ID} -ge 85 ]]; then
    if [ $((ID % 2)) -eq 0 ]; then
      TARGET="725x1014+100+75"
    else
      TARGET="725x1014+0+75"
    fi
  else
    if [ $((ID % 2)) -eq 0 ]; then
      TARGET="725x1014+75+75"
    else
      TARGET="725x1014+25+75"
    fi
  fi
  magick "${FILE}" -crop "${TARGET}" "${FILE/dawoud-D100/dawoud-D100-cropped}"
done
