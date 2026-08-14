"""Path constants and helpers."""

import os
import pathlib

from utils import ensure

DOMAIN: str = "remnqymi.com"
URL: str = f"https://{DOMAIN}"

# We don't verify the existence of the Google Cloud credentials file because
# it's not persisted to the source control.
JSON_KEYFILE_NAME: pathlib.Path = pathlib.Path("google_cloud_keyfile.json")


def directory(*parts: str | pathlib.Path) -> pathlib.Path:
    d: pathlib.Path = pathlib.Path(*parts)
    ensure.ensure(d.is_dir(), d, "is not a directory or may not exist!")
    return d


def file(*parts: str | pathlib.Path) -> pathlib.Path:
    f: pathlib.Path = pathlib.Path(*parts)
    ensure.ensure(f.is_file(), f, "is not a file or may not exist!")
    return f


# Component Directories
MARCION: pathlib.Path = directory("dictionary/marcion_sourceforge_net/")
ANDREAS: pathlib.Path = directory("dictionary/stmacariusmonastery_org/")
KELLIA: pathlib.Path = directory("dictionary/kellia_uni_goettingen_de/")
STSHENOUDA: pathlib.Path = directory("bible/")
FLASHCARDS: pathlib.Path = directory("flashcards/")
KEYBOARD: pathlib.Path = directory("keyboard/")
MORPHOLOGY: pathlib.Path = directory("morphology/")

# Component Files
WIKI_TSV: pathlib.Path = file(MARCION, "data/input/wiki.tsv")


# Site Directories
SITE_DIR: pathlib.Path = directory(os.environ["SITE_DIR"])
LEXICON_DIR: pathlib.Path = directory(SITE_DIR, "crum")
CRUM_JS: pathlib.Path = file(LEXICON_DIR, "main.js")
KELLIA_JS: pathlib.Path = file(LEXICON_DIR, "kellia_main.js")
ANDREAS_JS: pathlib.Path = file(LEXICON_DIR, "andreas_main.js")
ANDREAS_CSS: pathlib.Path = file(LEXICON_DIR, "andreas.css")
CRUM_CSS: pathlib.Path = file(LEXICON_DIR, "crum.css")
CRUM_EXPLANATORY_DIR: pathlib.Path = directory(LEXICON_DIR, "explanatory")
CRUM_SCAN_DIR: pathlib.Path = directory(LEXICON_DIR, "crum")
BIBLE_DIR: pathlib.Path = directory(SITE_DIR, "bible")

CRUM_ROOTS_ROW_NUMS: pathlib.Path = file(LEXICON_DIR, "roots.js")
CRUM_DERIVATIONS_ROW_NUMS: pathlib.Path = file(LEXICON_DIR, "derivations.js")

CRUM_HEADWORD_PAGE_MAP: pathlib.Path = file(CRUM_SCAN_DIR, "headwords.json")

# Anki is not persisted to source control.
ANKI_DIR: pathlib.Path = LEXICON_DIR / "anki/coptic.apkg"

ICON: pathlib.Path = file(SITE_DIR, "img/icon/icon-circle.png")

TOOLTIP_CSS: pathlib.Path = file(SITE_DIR, "tooltip.css")
HELP_CSS: pathlib.Path = file(SITE_DIR, "help.css")
HEADER_CSS: pathlib.Path = file(SITE_DIR, "header.css")
SHARED_CSS: pathlib.Path = file(SITE_DIR, "style.css")


def server(path: str | pathlib.Path) -> str:
    """Construct a path to the given file, from the perspective of the server.

    Args:
        path: Target path (Path or str). This is expected to be a full file path
              contained within SITE_DIR.

    Returns:
        A URL path (str) that can be used to lead to the target on the server,
        starting with '/'.
    """
    p: pathlib.Path = pathlib.Path(path)
    ensure.child_path(p, SITE_DIR)
    return f"/{p.relative_to(SITE_DIR)}"


def disk(path: str) -> pathlib.Path:
    """Construct a path to the given file on disk. Inverse of `server`.

    Args:
        path: A URL path, as seen by the server. It must start with '/'.

    Returns:
        The path (Path) of the target on disk, inside SITE_DIR.
    """
    ensure.ensure(
        path.startswith("/"),
        path,
        "is not an absolute server path!",
    )
    return file(SITE_DIR, path.removeprefix("/"))


def crum_url(key: str | int, deriv_key: str | int | None = None) -> str:
    html_file_path: pathlib.Path = LEXICON_DIR / f"{key}.html"
    root_url: str = f"{URL}{server(html_file_path)}"
    if not deriv_key:
        return root_url
    return f"{root_url}#drv{deriv_key}"


# Pages that we don't own:
CDO: str = "https://coptic-dictionary.org"


def coptic_dictionary_online(key: str) -> str:
    return f"{CDO}/entry/{key}"


def coptic_dictionary_online_query(query: str) -> str:
    return f"{CDO}/?q={query}"
