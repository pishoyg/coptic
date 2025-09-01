"""Path constants."""

import os

DOMAIN: str = "remnqymi.com"
URL: str = f"https://{DOMAIN}"
CRUM_URL: str = f"{URL}/crum"
# TODO: (#298) Stop using email.
EMAIL: str = "remnqymi@gmail.com"
JSON_KEYFILE_NAME: str = "google_cloud_keyfile.json"


def crum_url(key: str | int) -> str:
    return f"{CRUM_URL}/{key}.html"


SITE_DIR: str = os.environ["SITE_DIR"]
assert os.path.exists(SITE_DIR)

LEXICON_DIR: str = os.path.join(SITE_DIR, "crum")
assert os.path.exists(LEXICON_DIR)

BIBLE_DIR: str = os.path.join(SITE_DIR, "bible")
assert os.path.exists(BIBLE_DIR)

# Anki is not persisted to source control (and unlikely to ever be), so the
# directory is not guaranteed to exist.
ANKI_DIR = os.path.join(LEXICON_DIR, "anki/coptic.apkg")

CRUM = "dictionary/marcion_sourceforge_net/"
assert os.path.exists(CRUM)
ANDREAS = "dictionary/stmacariusmonastery_org/"
assert os.path.exists(ANDREAS)
COPTICSITE = "dictionary/copticsite_com/"
assert os.path.exists(COPTICSITE)
KELLIA = "dictionary/kellia_uni_goettingen_de/"
assert os.path.exists(KELLIA)
BIBLE = "bible/"
assert os.path.exists(BIBLE)
FLASHCARDS = "flashcards/"
assert os.path.exists(FLASHCARDS)
KEYBOARD = "keyboard/"
assert os.path.exists(KEYBOARD)
MORPHOLOGY = "morphology/"
assert os.path.exists(MORPHOLOGY)


# Define the shared CSS, and verify its existence in the site directory.
_SHARED_CSS_BASENAME = "style.css"
assert os.path.exists(os.path.join(SITE_DIR, _SHARED_CSS_BASENAME))
# The CSS can be imported in HTML with a path that is relative to the root
# directory of the website.
SHARED_CSS = f"/{_SHARED_CSS_BASENAME}"
