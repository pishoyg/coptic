#!/bin/bash

# Install required dependencies. Notify the user if certain dependencies need to
# be manually installed.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

UPGRADE=false
while [ $# -gt 0 ]; do
  case $1 in
  --upgrade)
    UPGRADE=true
    ;;
  --help)
    echo -e "${BLUE}Install dependencies.${RESET}"
    echo -e "${BLUE}Pass ${GREEN}--upgrade ${BLUE}to upgrade instead of installing.${RESET}"
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
  # TODO: (#0) Drop the `<26` cap once `pip-tools` supports pip 26. pip 26
  # restructured `pip._internal`'s `DirectUrl` model (removed `.info`), which
  # crashes `pip-sync` (pip-tools 7.5.3, the latest, still reads `.info`).
  pip install --upgrade 'pip<26'
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
    npx playwright install
    npx playwright-cli install-browser
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

# TODO: (#0) Figure out a way to upgrade the following as well:
# - TypeScript target – `tsconfig.json`
# - GitHub action versions – `.github/workflows`
# - `node`
# - `nvm`
# - Other binaries installed via `_install`
# Where unfeasible to upgrade automatically, print a reminder so the user can
# upgrade them manually.
_upgrade() {
  # Upgrade pip packages. `pip-sync` uninstalls anything absent from the
  # compiled requirements, including our editable local package, so reinstall
  # it afterwards. The `<26` cap is required: see the note in `_install`.
  pip install --upgrade 'pip<26'
  pip-compile --upgrade
  pip-sync
  pip install -e .

  # Upgrade pre-commit hooks.
  pre-commit autoupdate

  # Upgrade npm packages.
  jq -r '(.dependencies // {}) | keys[] | . + "@latest"' "package.json" | xargs npm add
  jq -r '(.devDependencies // {}) | keys[] | . + "@latest"' "package.json" | xargs npm add --include=dev

  # Refresh the Playwright browser binaries, which are versioned to the
  # (just-upgraded) Playwright packages. `playwright` and `playwright-cli` ship
  # separate browser stacks, so refresh both.
  npx playwright install
  npx playwright-cli install-browser
}

if ${UPGRADE}; then
  _upgrade
else
  _install
fi
