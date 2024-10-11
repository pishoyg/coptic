#!/bin/bash
# Display image sizes distribution.
magick identify dictionary/copticocc.org/data/dawoud-D100/* \
| cut --fields 3 --delimiter ' ' \
| sort \
| uniq --count
