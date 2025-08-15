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


def unique[T](arr: abc.Iterable[T], *message: str) -> None:
    dupes = [
        item for item, count in collections.Counter(arr).items() if count > 1
    ]
    ensure(not dupes, *message, dupes, "are duplicates!")


def members[T](
    arr: abc.Iterable[T],
    known: abc.Container[T],
    *message: str,
) -> None:
    unknown: list[T] = [x for x in arr if x not in known]
    ensure(not unknown, *message, unknown, "are not members of", known)


def equal_sets[T](
    s1: abc.Iterable[T],
    s2: abc.Iterable[T],
    *message: str,
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


def singleton[T](s: abc.Collection[T]) -> T:
    ensure(len(s) == 1, s, "is not a singleton!")
    return next(iter(s))
