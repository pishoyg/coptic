#!/bin/bash

export RESET='\033[0m'
export BLACK='\033[0;30m'
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[0;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[0;37m'

# Echo a message, coloring it with the color indicated in the first argument.
# NOTE: Provide the color name, not value.
# Example:
#   color "RED" "error message"  # Valid invocation.
#   color "${RED}" "error message"  # Doesn't work as expected!
color () {
  echo -e "${!1}${*:2}${RESET}"
}
