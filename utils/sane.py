"""Validation and error checking helpers."""

import collections
import typing
from collections import abc

from utils import log


def verify_unique[T](arr: abc.Iterable[T], message: str) -> None:
    dupes = [
        item for item, count in collections.Counter(arr).items() if count > 1
    ]
    if dupes:
        log.fatal(message, "duplicate elements:", dupes)


def verify_all_belong_to_set[T](
    arr: abc.Iterable[T],
    accepted: set[T] | dict[T, typing.Any],
    message: str,
) -> None:
    for x in arr:
        if x in accepted:
            continue
        log.fatal(message, x, "does not belong to the set", accepted)


def verify_equal_sets[T](
    s1: abc.Iterable[T],
    s2: abc.Iterable[T],
    message: str,
) -> None:
    s1, s2 = list(s1), list(s2)
    verify_unique(s1, "Not a set!")
    verify_unique(s2, "Not a set!")
    s1, s2 = set(s1), set(s2)
    diff = s1.difference(s2)
    if diff:
        log.throw(message, diff, "present in the former but not the latter")

    diff = s2.difference(s1)
    if diff:
        log.throw(message, diff, "present in the latter but not the former")


def assert_one[T](s: set[T]) -> T:
    assert len(s) == 1
    return next(iter(s))
