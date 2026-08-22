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

WOFF2_URL="https://github.com/google/woff2.git"
WOFF2_DIR="woff2"

# _woff2_install clones the `woff2` encoder, or updates an existing clone, then
# builds it, along with the `brotli` submodule that it depends on.
#
# NOTE: `_install` calls this in a condition, which suspends `errexit` for the
# duration, so the exit code is that of the last command, the build. That is the
# right criterion there: `_install` promises a working encoder, not a freshly
# fetched one, and the encoder is only needed by `make woff2`, so it mustn't
# take the rest of the setup down with it. `_upgrade` calls it plainly, leaving
# `errexit` in force, so a failed fetch aborts with Git's own message.
_woff2_install() {
  if [ -d "${WOFF2_DIR}" ]; then
    # `merge` is a no-op unless `fetch` brought in new commits.
    git -C "${WOFF2_DIR}" fetch origin
    git -C "${WOFF2_DIR}" merge --ff-only
  else
    git clone --recurse-submodules "${WOFF2_URL}" "${WOFF2_DIR}"
  fi
  git -C "${WOFF2_DIR}" submodule update --init --recursive
  make -C "${WOFF2_DIR}" all
}

_install() {
  # `requirements.in` is the source of truth, so compile it into
  # `requirements.txt` rather than trusting the latter to be current. Without
  # `--upgrade`, `pip-compile` keeps every pin that still satisfies the
  # constraints, and only resolves what actually changed. `pip-sync` then
  # installs exactly that set, uninstalling anything absent from it — including
  # our editable local package, hence the reinstall below.
  #
  # NOTE: `pip-tools` is installed up front because it supplies `pip-compile`
  # and `pip-sync`, which have to run before the requirements themselves are
  # installed. It is compiled from `requirements.in` like everything else, so
  # `pip-sync` settles it on the pinned version a moment later.
  #
  # NOTE: `pip-sync` uninstalls whatever the active environment holds outside
  # the compiled requirements, so it must run inside the virtual environment
  # that `.env` creates, never against a system Python.
  #
  # TODO: (#0) Drop the `<26` cap once `pip-tools` supports pip 26. pip 26
  # restructured `pip._internal`'s `DirectUrl` model (removed `.info`), which
  # crashes `pip-sync` (pip-tools 7.5.3, the latest, still reads `.info`).
  pip install --upgrade 'pip<26' pip-tools
  pip-compile
  pip-sync
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
  fi

  if ! _woff2_install; then
    echo -e "${RED}Failed to install ${YELLOW}woff2${RED} from ${YELLOW}${WOFF2_URL}${RED}. ${YELLOW}make woff2${RED} won't work.${RESET}"
    EXIT_CODE=1
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
  # Upgrade pip packages. `--upgrade` lifts the existing pins; everything else
  # about this sequence, the `<26` cap included, works as it does in `_install`,
  # whose notes explain it.
  pip install --upgrade 'pip<26'
  pip-compile --upgrade
  pip-sync
  pip install -e .

  # Upgrade pre-commit hooks.
  pre-commit autoupdate

  # Upgrade npm packages. `--peer` restricts each bump to what the installed
  # packages' peer ranges accept, so we never request an unsatisfiable set.
  npx --yes npm-check-updates --upgrade --peer
  npm install

  # Refresh the Playwright browser binaries, which are versioned to the
  # (just-upgraded) Playwright packages.
  npx playwright install

  # Upgrade the `woff2` encoder, and rebuild it.
  _woff2_install
}

if ${UPGRADE}; then
  _upgrade
else
  _install
fi
