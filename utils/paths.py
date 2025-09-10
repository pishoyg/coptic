"""Path constants and helpers."""

import os

from utils import ensure

DOMAIN: str = "remnqymi.com"
URL: str = f"https://{DOMAIN}"
# TODO: (#298) Stop using email.
EMAIL: str = "remnqymi@gmail.com"
JSON_KEYFILE_NAME: str = "google_cloud_keyfile.json"


def directory(*parts: str) -> str:
    d: str = os.path.join(*parts)
    ensure.ensure(os.path.isdir(d), d, "is not a directory or may not exist!")
    return os.path.normpath(d)


def file(*parts: str) -> str:
    f: str = os.path.join(*parts)
    ensure.ensure(os.path.isfile(f), f, "is not a file or may not exist!")
    return os.path.normpath(f)


SITE_DIR: str = directory(os.environ["SITE_DIR"])
LEXICON_DIR: str = directory(SITE_DIR, "crum")
CRUM_JS: str = file(LEXICON_DIR, "main.js")
CRUM_EXPLANATORY_DIR: str = directory(LEXICON_DIR, "explanatory")
CRUM_SCAN_DIR: str = directory(LEXICON_DIR, "crum")
DAWOUD_DIR: str = directory(SITE_DIR, "dawoud")
BIBLE_DIR: str = directory(SITE_DIR, "bible")  # dead: disable

# Anki is not persisted to source control (and unlikely to ever be), so the
# directory is not guaranteed to exist.
ANKI_DIR: str = os.path.join(LEXICON_DIR, "anki/coptic.apkg")

ICON: str = file(SITE_DIR, "img/icon/icon-circle.png")

DROPDOWN_CSS: str = file(SITE_DIR, "dropdown.css")
SHARED_CSS: str = file(SITE_DIR, "style.css")


def server(path: str) -> str:
    """Construct a path to the given file, from the perspective of the server.

    Args:
        path: Target path.

    Returns:
        A path that can be used to lead to the target on the server.
    """
    path = os.path.normpath(path)
    ensure.child_path(path, SITE_DIR)
    return "/" + os.path.relpath(path, SITE_DIR)


MARCION: str = directory("dictionary/marcion_sourceforge_net/")
ANDREAS: str = directory("dictionary/stmacariusmonastery_org/")
COPTICSITE: str = directory("dictionary/copticsite_com/")
KELLIA: str = directory("dictionary/kellia_uni_goettingen_de/")
STSHENOUDA: str = directory("bible/")
FLASHCARDS: str = directory("flashcards/")
KEYBOARD: str = directory("keyboard/")
MORPHOLOGY: str = directory("morphology/")


def crum_url(key: str | int, deriv_key: str | int | None = None) -> str:
    root_url: str = f"{URL}{server(LEXICON_DIR)}/{key}.html"
    if not deriv_key:
        return root_url
    return f"{root_url}#drv{deriv_key}"
