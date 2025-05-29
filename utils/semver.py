"""Semantic versioning helpers."""

# TODO: Get rid of this file!

import os
import re

_INTEGER_RE = re.compile("[0-9]+")


def _semver_sort_key(file_path: str) -> list[str | int]:
    """Construct a sort key for file path with a semantic version basename."""
    file_path = os.path.basename(file_path)
    return list(map(int, _INTEGER_RE.findall(file_path))) + [
        file_path,
    ]


def sort_semver(file_paths: list[str]) -> list[str]:
    return sorted(file_paths, key=_semver_sort_key)
