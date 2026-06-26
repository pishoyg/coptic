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


def balanced[T](
    tokens: abc.Iterable[T],
    is_opening: abc.Callable[[T], bool],
    is_closing: abc.Callable[[T], bool],
    key: abc.Callable[[T], object],
    *message: object,
) -> None:
    """Verify that opening and closing tokens nest correctly, using a stack.

    An opening token and a closing token correspond iff `key` maps them to
    equal values. Tokens that are neither opening nor closing are ignored.

    Args:
        tokens: The stream of tokens to check (e.g. characters, or HTML tags).
        is_opening: Whether a token opens a new scope (pushed onto the stack).
        is_closing: Whether a token closes the innermost open scope.
        key: Maps a token to the value used to match an opening token against
            its closing token.
        *message: Extra context prepended to error messages.
    """
    stack: list[object] = []
    for idx, token in enumerate(tokens):
        if is_opening(token):
            stack.append(key(token))
        elif is_closing(token):
            ensure(
                stack and stack.pop() == key(token),
                *message,
                "unbalanced closing token",
                token,
                "at position",
                idx,
            )

    ensure(not stack, *message, "unclosed tokens:", stack)


_bracket_map: dict[str, str] = {"(": ")", "[": "]", "{": "}", "<": ">"}
_closing_brackets: set[str] = set(_bracket_map.values())


def brackets_balanced(s: str, *message: object) -> None:
    balanced(
        s,
        lambda char: char in _bracket_map,
        lambda char: char in _closing_brackets,
        # An opening bracket maps to its matching closing bracket; a closing
        # bracket maps to itself. We use the closing bracket as a key.
        lambda char: _bracket_map.get(char, char),
        *message,
    )


def child_path(child: str | pathlib.Path, parent: str | pathlib.Path) -> None:
    child = pathlib.Path(child).resolve()
    parent = pathlib.Path(parent).resolve()
    try:
        _ = child.relative_to(parent)
    except ValueError:
        log.fatal(child, "doesn't seem to be a child of", parent)
