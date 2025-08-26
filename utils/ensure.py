"""Validation and error checking helpers."""

import collections
from collections import abc

from utils import log


def ensure(cond: object, *args: object):
    """Assert! If the condition is not satisfied, throw an error.

    Args:
        cond: The condition to evaluate. If true, do nothing.
        *args: Arguments to print.
    """
    if not cond:
        log.fatal(*args)


def unique[T](arr: abc.Iterable[T], *message: object) -> None:
    dupes = [
        item for item, count in collections.Counter(arr).items() if count > 1
    ]
    ensure(not dupes, *message, dupes, "are duplicates!")


def members[T](
    arr: abc.Iterable[T],
    known: abc.Container[T],
    *message: object,
) -> None:
    unknown: list[T] = [x for x in arr if x not in known]
    ensure(not unknown, *message, unknown, "are not members of", known)


def equal_sets[T](
    s1: abc.Iterable[T],
    s2: abc.Iterable[T],
    *message: object,
) -> None:
    s1, s2 = list(s1), list(s2)
    unique(s1, "not a set!")
    unique(s2, "not a set!")
    s1, s2 = set(s1), set(s2)
    diff = s1.difference(s2)
    ensure(
        not diff,
        *message,
        diff,
        "present in the former but not the latter",
    )
    diff = s2.difference(s1)
    ensure(
        not diff,
        *message,
        diff,
        "present in the latter but not the former",
    )


def singleton[T](arr: abc.Iterable[T]) -> T:
    s: set[T] = set(arr)
    ensure(len(s) == 1, s, "is not a singleton!")
    return next(iter(s))


_bracket_map: dict[str, str] = {")": "(", "]": "[", "}": "{", ">": "<"}
_opening_brackets: set[str] = set(_bracket_map.values())


def brackets_balanced(s: str, *message: object):
    stack: list[str] = []
    for char in s:
        if char in _opening_brackets:
            stack.append(char)
            continue
        if char in _bracket_map:
            if not stack or _bracket_map[char] != stack.pop():
                log.fatal(*message, "unbalanced bracket", char, "in", s)

    ensure(not stack, *message, "unbalanced brackets", stack, "in", s)
