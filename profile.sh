#!/bin/bash
#
# Usage:
#   ./profile.sh <name> <script.py> [script_args...]
#
# NOTE: While we don't take the liberty to do that for you, if your program uses
# concurrent execution, and you want to profile the spawned tasks as well, you
# should set the SEQUENTIAL environment variable to force sequential execution,
# as cProfile is unable to profile concurrent code.
# This is assuming that your script uses our concurrency primitives, which
# respect this environment variable.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <name> <script.py> [script_args...]"
    exit 1
fi

NAME="${1}"
SCRIPT="${2}"
shift 2

# We profile the script even if it fails.
python -m cProfile -o "/tmp/${NAME}.prof" "$SCRIPT" "$@" || true
gprof2dot -f pstats "/tmp/${NAME}.prof" | dot -Tpng -o "/tmp/${NAME}.png"
open "/tmp/${NAME}.png"
