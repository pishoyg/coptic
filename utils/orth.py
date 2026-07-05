"""Orthography utilities"""

import unicodedata


def normalize(text: str) -> str:
    return unicodedata.normalize("NFD", text)


def clean_diacritics(text: str) -> str:
    return "".join(
        c for c in normalize(text) if unicodedata.category(c) != "Mn"
    )


def is_astral_combining_mark(char: str) -> bool:
    """Whether `char` is a non-BMP (astral) combining mark, e.g. U+1D165.

    Such characters break the front-end's diacritic-free highlighting:
    `orth.translation` (docs/orth.ts) scans one UTF-16 code unit at a time and
    sees only the mark's surrogate halves, neither of which is a mark, so it
    keeps the character instead of stripping it like `cleanDiacritics` does. The
    Xooxle index builder rejects these; see #760.

    Args:
        char: The character to examine.

    Returns:
        Whether `char` is a non-BMP (astral) combining mark, e.g. U+1D165.
    """
    return ord(char) > 0xFFFF and unicodedata.category(char).startswith("M")
