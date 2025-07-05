#!/bin/bash

# Script to optimize black and white book scans to PNG monochrome using ImageMagick (magick)
#
# This script iterates through all JPEG files in a specified input directory,
# converts them to 1-bit (pure black and white) PNG format, and
# saves the optimized versions to a specified output directory.
#
# Output Format: PNG
# Processing Mode: Monochrome (1-bit black and white)
#
# Usage:
#   ./optimize_scans.sh <input_directory> <output_directory> ...<magick args>
#
# Arguments:
#   <input_directory>:  The path to the directory containing your original JPEG scans.
#   <output_directory>: The path where the optimized PNG files will be saved.
#                       This directory will be created if it does not exist.
#   ...<magick args>:   Additional arguments to pass to `magick`.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

# --- Argument Parsing ---
INPUT_DIR="$1"
OUTPUT_DIR="$2"

usage() {
  echo "Usage: $0 <input_directory> <output_directory> ...<magick args>"
}

# --- Validate Arguments ---
if [ -z "$INPUT_DIR" ]; then
    echo "Error: Input directory not specified."
    usage
    exit 1
fi

if [ -z "$OUTPUT_DIR" ]; then
    echo "Error: Output directory not specified."
    usage
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Loop through all JPEG files in the specified input directory
# Note: Using find here is more robust than globbing for directories
# and allows for files with spaces in names more easily if IFS is set.
# For simplicity, keeping glob here, but be mindful of filenames with spaces if they cause issues.
while IFS= read -r -d '' IMG_FILE; do
    # Extract just the filename from the full path
    FILENAME=$(basename "$IMG_FILE")
    # Remove .jpeg or .jpg extension to form base name for output
    OUTPUT_FILE_BASE="${FILENAME%.jpeg}"
    OUTPUT_FILE_BASE="${OUTPUT_FILE_BASE%.jpg}"

    # Construct the full path for the output file
    OUTPUT_FILE="$OUTPUT_DIR/${OUTPUT_FILE_BASE}.png"

    echo "Processing '$IMG_FILE'..."

    # ImageMagick command:
    # -strip: Removes all metadata (EXIF, comments, etc.)
    # -define jpeg:fancy-upsampling=off: Can slightly reduce size for some JPEGs
    # -monochrome: Converts the image to pure 1-bit black and white.
    #              This is crucial for optimal PNG compression for text documents.
    magick "$IMG_FILE" \
        -strip \
        -define jpeg:fancy-upsampling=off \
        -monochrome \
        "${@:3}" \
        "$OUTPUT_FILE"
done < <(find "$INPUT_DIR" -maxdepth 1 -type f \( -iname "*.jpeg" -o -iname "*.jpg" \) -print0 | sort -zV)
