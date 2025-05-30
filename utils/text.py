"""String helpers."""

import typing


def split(line: str, *args: typing.Any) -> list[str]:
    """Split a string, discarding empty entries.

    Args:
        line: The text to split.
        *args: Optional additional arguments to pass to the native str.split.

    Returns:
        The string parts.
    """
    return list(filter(None, line.split(*args)))


def ssplit(line: str, *args: typing.Any) -> list[str]:
    """Split string, stripping from each entry, and discarding empty entries.

    Args:
        line: The string to split.
        *args: Optional additional arguments to pass to the native str.split.

    Returns:
        The string parts.
    """
    return list(
        filter(None, map(lambda word: word.strip(), line.split(*args))),
    )
