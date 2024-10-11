#!/bin/bash
# Extract images from the PDF file `boek.pdf`.
# P.S. *Boek* means *book* in Dutch.
magick -density 100 -colorspace sRGB boek.pdf %d.jpg
mogrify -normalize -level 10%,90% -sharpen 0x1 *.jpg
