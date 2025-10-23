"""Clean extracted HTML.

NOTE: Input and output are iterable of strings - each representing a piece
of the HTML - rather than the entire HTML combined in a single string.
Some assumptions are made about the structure of the iterable (for example,
we assume that a tag is always a standalone string).
"""

import re
import typing
from collections.abc import Generator, Iterable
from itertools import groupby
from typing import Callable

from utils import page
from xooxle import constants as const

IterOfIters = Iterable[Iterable[str]]  # pylint: disable=invalid-name


def clean(tokens: Iterable[str]) -> Generator[str]:
    """Clean each unit, remove empty units and redundant unit delimiters.

    Args:
        tokens: A list of units. A unit could be a tag, a piece of text, or
            a unit delimiter.

    Yields:
        A cleaned subsequence of the input tokens, after eliminating
        superfluous tokens.
    """
    tokens = _strip(tokens, _strip_field_start)
    units: IterOfIters
    units = _split_iterable(tokens, _is_unit_delimiter)
    units = map(_clean_unit, units)
    yield from _join_non_empty(units, [const.UNIT_DELIMITER])


def _strip_field_start(tokens: Iterable[str]) -> Generator[str]:
    found_text: bool = False
    for token in tokens:
        if not token.startswith("<") and not token.isspace():
            # This is a non-space text token.
            found_text = True
        if found_text:
            # We already encountered text. Yield this token, no matter what it
            # is.
            yield token
            continue
        if token in [page.LINE_BREAK, const.UNIT_DELIMITER] or token.isspace():
            # We have not encountered text before, and this is just a line
            # break, unit separator, or space. Continue without yielding the
            # token.
            continue
        # We have not encountered text before, but this is a non-space token.
        # Yield it.
        yield token


def _strip(
    tokens: Iterable[str],
    strip_start: typing.Callable[[Iterable[str]], Iterable[str]],
) -> Iterable[str]:
    # Strip the beginning.
    tokens = strip_start(tokens)
    # Strip the end.
    tokens = reversed(list(strip_start(reversed(list(tokens)))))
    # Return.
    return tokens


def _clean_unit(unit: Iterable[str]) -> Generator[str]:
    # _clean_unit cleans each line, remove empty lines and redundant line
    # breaks.
    lines: IterOfIters
    lines = _split_iterable(unit, _is_line_break)
    lines = map(_clean_line, lines)
    yield from _join_non_empty(lines, [page.LINE_BREAK])


def _clean_line(line: Iterable[str]) -> Generator[str]:
    # _clean_line deletes excess whitespace and empty tags.
    parts: IterOfIters
    parts = _split_iterable(line, str.isspace)
    line = _join_non_empty(parts, [" "])
    del parts
    # Perform additional tag-aware cleanup.
    line = _strip(line, _strip_line_start)
    line = _filter_empty_tags(line)
    yield from line


def _strip_line_start(line: Iterable[str]) -> Generator[str]:
    found_non_space = False
    for token in line:
        if token.startswith("<"):
            # This is a tag. Yield as is.
            yield token
            continue
        if not token.isspace():
            # This is a non-space string. Yield, and flag that we have
            # encountered a non-space string.
            yield token
            found_non_space = True
            continue
        if found_non_space:
            # This is a space string, but we have already encountered a
            # non-space string. Yield.
            yield token
            continue
        # This is a space string, and we haven't encountered a non-space
        # string yet. Do nothing.
        assert token.isspace() and not found_non_space


def _opening_tag(token: str) -> bool:
    return token.startswith("<") and not _closing_tag(token)


def _closing_tag(token: str) -> bool:
    return token.startswith("</")


def _tag_name(token: str) -> str:
    match: re.Match[str] | None = const.TAG_RE.fullmatch(token)
    assert match, token
    return match.group(1)


def _filter_empty_tags(line: Iterable[str]) -> list[str]:
    stack: list[str] = []
    for token in line:
        if not _closing_tag(token):
            # This is not a closing tag. Just add it to the stack.
            stack.append(token)
            continue
        # This is a closing tag. Check to see if the stack has a corresponding
        # opening tag on top.
        # Since the current token is a closing tag, the stack is guaranteed not
        # to be empty.
        assert stack
        stack_top: str = stack[-1]
        if not _opening_tag(token):
            # The stack top doesn't have an opening tag.
            stack.append(token)
            continue
        if _tag_name(token) == _tag_name(stack_top):
            # An opening tag is immediately followed by the corresponding
            # closing tag. Remove the opening tag from the stack, and continue.
            _ = stack.pop()
            continue
        stack.append(token)
    return stack


def _is_unit_delimiter(token: str) -> bool:
    return token == const.UNIT_DELIMITER


def _is_line_break(token: str) -> bool:
    return token == page.LINE_BREAK


def _split_iterable(
    iterable: Iterable[str],
    is_delimiter: Callable[[str], bool],
) -> Generator[Iterable[str]]:
    for is_delimiter_group, group in groupby(iterable, is_delimiter):
        if is_delimiter_group:
            continue
        yield group


def _join_non_empty(
    iterables: IterOfIters,
    delimiter: Iterable[str],
) -> Generator[str]:
    is_first_nonempty_iterable = True
    for iterable in iterables:
        iterator = iter(iterable)
        del iterable
        first_item = next(iterator, None)
        if first_item is None:
            # This iterable is empty.
            continue
        if is_first_nonempty_iterable:
            is_first_nonempty_iterable = False
        else:
            yield from delimiter
        yield first_item
        yield from iterator
