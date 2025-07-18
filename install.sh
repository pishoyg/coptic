#!/bin/bash

# Install required dependencies. Notify the user if certain dependencies need to
# be manually installed.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

UPDATE=false
while [ $# -gt 0 ]; do
  case $1 in
  --update)
    UPDATE=true
    ;;
  --help)
    echo -e "${BLUE}Install dependencies.${RESET}"
    echo -e "${BLUE}Pass ${GREEN}--update ${BLUE}to update instead of installing.${RESET}"
    exit
    ;;
  *)
    echo -e "${RED}Unknown flag: ${YELLOW}${1}${RED}.${RESET}"
    exit 1
    ;;
  esac
  shift
done

_install() {
  pip install --upgrade pip
  pip install -r requirements.txt
  pip install -e .
  pre-commit install

  EXIT_CODE=0

  if ! command -v npm &> /dev/null; then
    echo -e "${RED}Please install ${YELLOW}npm${RED}. See ${YELLOW}https://docs.npmjs.com/downloading-and-installing-node-js-and-npm${RED}.${RESET}"
    EXIT_CODE=1
  fi

  if command -v npm &> /dev/null; then
    npm install
    npm install --global bun
    npx playwright install
  fi

  if ! command -v tidy &> /dev/null; then
    echo -e "${RED}Please install ${YELLOW}tidy${RED} from ${YELLOW}https://www.html-tidy.org/${RED}.${RESET}"
    EXIT_CODE=1
  fi

  if ! command -v magick &> /dev/null; then
    echo -e "${RED}Please install ${YELLOW}magick${RED} from ${YELLOW}https://imagemagick.org/${RED}.${RESET}"
    EXIT_CODE=1
  fi

  if ! command -v gh &> /dev/null; then
    echo -e "${RED}Please install ${YELLOW}gh${RED} from ${YELLOW}https://cli.github.com/${RED}.${RESET}"
    EXIT_CODE=1
  fi

  if ! command -v dot &> /dev/null; then
    echo -e "${YELLOW}Consider installing ${CYAN}dot${YELLOW} from ${CYAN}https://graphviz.org/${YELLOW}.${RESET}"
  fi

  if ! command -v say &> /dev/null; then
    echo -e "${YELLOW}Consider installing ${CYAN}say${YELLOW}. This should be possible with ${CYAN}sudo apt-get install gnustep-gui-runtime${YELLOW} on Ubuntu.${RESET}"
  fi

  if [ "${EXIT_CODE}" -ne 0 ]; then
    exit "${EXIT_CODE}"
  fi
}

_update() {
  # Update pip packages.
  pip-review --local --auto

  # Update pre-commit hooks.
  pre-commit autoupdate

  # Update npm packages.
  jq -r "(.dependencies // {}) | keys[]" "package.json" | xargs npm add
  jq -r "(.devDependencies // {}) | keys[]" "package.json" | xargs npm add --dev
}

if ${UPDATE}; then
  _update
else
  _install
fi
