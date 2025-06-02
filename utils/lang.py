"""Language helpers."""

import unicodedata


def is_arabic_char(c: str) -> bool:
    return "ARABIC" in unicodedata.name(c, "")


def is_greek_char(c: str) -> bool:
    return "GREEK" in unicodedata.name(c, "")
