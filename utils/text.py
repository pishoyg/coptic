"""String helpers."""

import typing


def split(line: str, *args: typing.Any) -> list[str]:
    """Split a string, discarding empty entries."""
    return list(filter(None, line.split(*args)))


def ssplit(line: str, *args: typing.Any) -> list[str]:
    """Split a string, stripping whitespace from each entry, and discarding
    empty entries."""
    return list(
        filter(None, map(lambda word: word.strip(), line.split(*args))),
    )
