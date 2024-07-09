#!/bin/bash

find . -type f -name README.md | grep --invert obsolete | grep --invert '^\./archive/' | grep '^[^/]*/[^/]*/[^/]*/'
