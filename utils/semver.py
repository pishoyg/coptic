"""Semantic versioning helpers."""

# TODO: (#0) There must be a library for this. We shouldn't have to implement it
# manually!

import re

_INTEGER_RE = re.compile("[0-9]+")


def _sort_key(s: str) -> list[str | int]:
    """Construct a sort key for a string representing a semantic version.

    Args:
        s: A string.

    Returns:
        The semantic versioning sort key.
    """
    return list(map(int, _INTEGER_RE.findall(s)))


def lt(a: str, b: str) -> bool:
    return _sort_key(a) < _sort_key(b)
