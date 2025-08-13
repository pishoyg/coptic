"""String helpers."""

import typing


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


_bracket_map: dict[str, str] = {")": "(", "]": "[", "}": "{", ">": "<"}
_opening_brackets: set[str] = set(_bracket_map.values())


def are_brackets_balanced(s: str) -> bool:
    stack = []
    for char in s:
        if char in _opening_brackets:
            stack.append(char)
            continue
        if char in _bracket_map:
            if not stack or _bracket_map[char] != stack.pop():
                return False

    return not stack
