"""Path constants."""

import os

DOMAIN: str = "remnqymi.com"
URL: str = f"https://{DOMAIN}"
CRUM_URL: str = f"{URL}/crum"
# TODO: (#298) Stop using email.
EMAIL: str = "remnqymi@gmail.com"
JSON_KEYFILE_NAME: str = "google_cloud_keyfile.json"


def crum_url(key: str | int, deriv_key: str | int | None = None) -> str:
    root_url: str = f"{CRUM_URL}/{key}.html"
    if not deriv_key:
        return root_url
    return f"{root_url}#drv{deriv_key}"


SITE_DIR: str = os.environ["SITE_DIR"]
assert os.path.isdir(SITE_DIR)

LEXICON_DIR: str = os.path.join(SITE_DIR, "crum")
assert os.path.isdir(LEXICON_DIR)

CRUM_EXPLANATORY_DIR: str = os.path.join(LEXICON_DIR, "explanatory")
assert os.path.isdir(CRUM_EXPLANATORY_DIR)

CRUM_SCAN_DIR: str = os.path.join(LEXICON_DIR, "crum")
assert os.path.isdir(CRUM_SCAN_DIR)

DAWOUD_DIR: str = os.path.join(SITE_DIR, "dawoud")
assert os.path.isdir(DAWOUD_DIR)

BIBLE_DIR: str = os.path.join(SITE_DIR, "bible")
assert os.path.isdir(BIBLE_DIR)

# Anki is not persisted to source control (and unlikely to ever be), so the
# directory is not guaranteed to exist.
ANKI_DIR = os.path.join(LEXICON_DIR, "anki/coptic.apkg")

CRUM = "dictionary/marcion_sourceforge_net/"
assert os.path.isdir(CRUM)
ANDREAS = "dictionary/stmacariusmonastery_org/"
assert os.path.isdir(ANDREAS)
COPTICSITE = "dictionary/copticsite_com/"
assert os.path.isdir(COPTICSITE)
KELLIA = "dictionary/kellia_uni_goettingen_de/"
assert os.path.isdir(KELLIA)
BIBLE = "bible/"
assert os.path.isdir(BIBLE)
FLASHCARDS = "flashcards/"
assert os.path.isdir(FLASHCARDS)
KEYBOARD = "keyboard/"
assert os.path.isdir(KEYBOARD)
MORPHOLOGY = "morphology/"
assert os.path.isdir(MORPHOLOGY)


# Define the shared CSS, and verify its existence in the site directory.
_SHARED_CSS_BASENAME: str = "style.css"
CSS: str = os.path.join(SITE_DIR, _SHARED_CSS_BASENAME)
assert os.path.isfile(CSS)
# The CSS can be imported in HTML with a path that is relative to the root
# directory of the website.
CSS_REL = f"/{_SHARED_CSS_BASENAME}"
