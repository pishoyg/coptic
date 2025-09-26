"""Orthography utilities"""

import unicodedata


def normalize(text: str) -> str:
    return unicodedata.normalize("NFD", text)
