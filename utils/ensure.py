"""Validation and error checking helpers."""

import collections
import pathlib
from collections import abc

from utils import log


def ensure(cond: object, *args: object, strict: bool = True) -> None:
    """Assert! If the condition is not satisfied, report an error.

    Args:
        cond: The condition to evaluate. If true, do nothing.
        *args: Arguments to print.
        strict: If true, throw an error if the condition is not met. Otherwise,
            simply log an error message.
    """
    if not cond:
        if strict:
            log.fatal(*args)
        else:
            log.error(*args)


def unique[T](
    arr: abc.Iterable[T],
    *message: object,
    strict: bool = True,
) -> None:
    dupes = [
        item for item, count in collections.Counter(arr).items() if count > 1
    ]
    ensure(not dupes, *message, dupes, "are duplicates!", strict=strict)


def members[T](
    arr: abc.Iterable[T],
    known: abc.Container[T],
    *message: object,
    strict: bool = True,
) -> None:
    unknown: list[T] = [x for x in arr if x not in known]
    ensure(
        not unknown,
        *message,
        unknown,
        "are not members of",
        known,
        strict=strict,
    )


def equal_sets[T](
    s1: abc.Iterable[T],
    s2: abc.Iterable[T],
    *message: object,
    strict: bool = True,
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
        strict=strict,
    )
    diff = s2.difference(s1)
    ensure(
        not diff,
        *message,
        diff,
        "present in the latter but not the former",
        strict=strict,
    )


def singleton[T](arr: abc.Iterable[T]) -> T:
    ensure(arr, "iterable is empty!")
    it: abc.Iterator[T] = iter(arr)
    first: T = next(it)
    while True:
        try:
            cur: T = next(it)
            ensure(
                first == cur,
                arr,
                "is not a singleton! Found several elements:",
                first,
                ",",
                cur,
            )
        except StopIteration:
            break
    return first


_bracket_map: dict[str, str] = {")": "(", "]": "[", "}": "{", ">": "<"}
_opening_brackets: set[str] = set(_bracket_map.values())


def brackets_balanced(s: str, *message: object, strict: bool = True) -> None:
    stack: list[str] = []
    for idx, char in enumerate(s):
        if char in _opening_brackets:
            stack.append(char)
            continue
        if char in _bracket_map:
            ensure(
                stack and _bracket_map[char] == stack.pop(),
                *message,
                "unbalanced bracket at position",
                idx,
                s[:idx],
                char,
                s[idx + 1 :],
                strict=strict,
            )

    ensure(
        not stack,
        *message,
        "unclosed brackets:",
        stack,
        "in",
        s,
        strict=strict,
    )


def child_path(child: str | pathlib.Path, parent: str | pathlib.Path) -> None:
    child = pathlib.Path(child).resolve()
    parent = pathlib.Path(parent).resolve()
    try:
        _ = child.relative_to(parent)
    except ValueError:
        log.fatal(child, "doesn't seem to be a child of", parent)
