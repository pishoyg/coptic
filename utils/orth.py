"""Orthography utilities"""

import unicodedata

import regex

# _MARK_RE matches a mark, using the same property as `DIACRITIC_RE` in
# docs/orth.ts.
_MARK_RE: regex.Pattern[str] = regex.compile(r"\p{Mark}")


def normalize(text: str) -> str:
    return unicodedata.normalize("NFD", text)


def clean_diacritics(text: str) -> str:
    """Remove all marks from the NFD-normalized text.

    Args:
        text: The text to clean.

    Returns:
        The NFD-normalized text, with all marks removed.
    """
    return _MARK_RE.sub("", normalize(text))


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
    return ord(char) > 0xFFFF and bool(_MARK_RE.fullmatch(char))
