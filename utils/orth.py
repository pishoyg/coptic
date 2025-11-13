"""Orthography utilities"""

import unicodedata


def normalize(text: str) -> str:
    return unicodedata.normalize("NFD", text)


def clean_diacritics(text: str) -> str:
    return "".join(
        c for c in normalize(text) if unicodedata.category(c) != "Mn"
    )
