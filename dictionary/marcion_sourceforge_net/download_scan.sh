#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

# Base URL for the images
BASE_URL="https://coptot.manuscriptroom.com/images/webfriendly/800000"

# Output directory
OUTPUT_DIR="${1}"

# Create the directory if it doesn't exist, and clear its content.
mkdir -p "${OUTPUT_DIR}"

# Counter for the output file names
COUNTER=1

# Download crum_fm_[000-021].jpg.
for i in $(seq 0 21); do
    URL="${BASE_URL}/crum_fm_$(printf "%03d" "$i").jpg"
    FILENAME="${COUNTER}.jpeg"
    echo "Downloading ${URL} to ${OUTPUT_DIR}/${FILENAME}"
    curl "${URL}" -o "${OUTPUT_DIR}/${FILENAME}"
    ((COUNTER++))
done

# Download crum_[001-844].jpg.
for i in $(seq 1 844); do
    URL="${BASE_URL}/crum_$(printf "%03d" "$i").jpg"
    FILENAME="${COUNTER}.jpeg"
    echo "Downloading ${URL} to ${OUTPUT_DIR}/${FILENAME}"
    curl "${URL}" -o "${OUTPUT_DIR}/${FILENAME}"
    ((COUNTER++))
done

# Download crum_bm_[001-109].jpg.
for i in $(seq 1 109); do
    URL="${BASE_URL}/crum_bm_$(printf "%03d" "$i").jpg"
    FILENAME="${COUNTER}.jpeg"
    echo "Downloading ${URL} to ${OUTPUT_DIR}/${FILENAME}"
    curl "${URL}" -o "${OUTPUT_DIR}/${FILENAME}"
    ((COUNTER++))
done
