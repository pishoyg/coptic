"""Language helpers."""

import unicodedata


def is_lang(lang: str, text: str) -> bool:
    return all(lang in unicodedata.name(c, "") for c in text)


def has_lang(lang: str, text: str) -> bool:
    return any(lang in unicodedata.name(c, "") for c in text)
