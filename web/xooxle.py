# This package defines the logic to build a Xooxle index.

# Index Content
#
# The Xooxle index contains searchable data, and some search metadata
# (parameters) about a searchable corpus of HTML documents.
# Our index builder will read a list of documents, and for each document, an
# entry will be added to the data field of the produced index. The entry is a
# key-value store bearing information about the document, including the
# document path and its content. Xooxle can then:
# - Search the content of each entry.
# - Use the path to point the user to how to view the document that this content
#   was extracted from.
# The path is plain text, but the content fields are HTML.

# HTML Reduction
#
# In order to facilitate search and rendering, this HTML retained from
# the content is intentionally simplified. We remove most tags and retain the
# text. However, it's possible to retain some features from the original HTML.
# The features (tags and classes) that get retained are parameterized, but we
# have some default value.
# For example, we normally retain the tags that are mere styling tags, such
# as <b>, <i>, <strong>, and <em>.
# If it's desirable to retain some classes, we retain them, but we convert
# their tags to <span> tags! So `<tr class="word">` gets converted to `<span
# class="word">` if the `word` class is desired to be retained.
# We include <br> tags in the output corresponding to newlines, in a limited
# set of cases, far more restrictive than the HTML standard. This means that
# our output might appear compressed, or might lack newlines.
# See below for more details about the reduction logic.

# Metadata
#
# See Xooxle documentation for the metadata documentation, and more
# information about the required structure.

# Text Extraction
#
# Our text extraction implementation is somewhat hacky. The output may
# contain superfluous newlines, which later get cleaned up. It may fail to
# parse HTML special space character entities.

# Rationale:
#
# 1. HTML reduction allows us to keep a small search index, which speeds up
#    index loading and search time.
# 2. Given that the searchable content shows as a list of search results,
#    complex HTML structures can be overwhelming.
# 3. Nevertheless, some (basic) styling is desirable in the search results
#    page, which is why we retain some of the features.

# Concurrency
#
# In our experimentation, ProcessPoolExecutor was initially found to be roughly
# 5 times faster than ThreadPoolExecutor. At that point, users were required to
# provide a directory of HTML files to index.
# Later on, we started supporting a generator object, which allows us to receive
# content dynamically, without it being persisted to files.
# In our first use case with a generator object, ProcessPoolExecutor was found
# to be around 20 times slower than ThreadPoolExecutor!
# While we're not certain that this is the culprit, the user used a cache
# implementation that wasn't process-friendly, and the generator object was
# provided from a module that relied heavily on static-scope initialization,
# which get duplicated to each process!
# It was concluded that some generator implementation can be problematic with
# ProcessPoolExecutor, and we opted for using ThreadPoolExecutor instead to make
# our module more versatile, thus sacrificing performance in case where
# ProcessPoolExecutor can be much faster!
# ProcessPoolExecutor may indeed be optimal, not just when the input is provided
# in the form of a directory of HTML files, but also when the input is a
# "friendly" generator object, although we don't have a concrete definition of
# that yet, as our understanding of concurrency primitives is still limited.
# TODO: (#221) Understand concurrency primitives better, and optimize the
# performance.

import os
import re
from collections.abc import Generator, Iterable, Iterator
from itertools import groupby
from typing import Callable

import bs4

import utils

# KEY is the name of the key field in the output. This must match the name
# expected by the Xooxle search logic.
KEY = "KEY"
# UNIT_DELIMITER is the delimiter used to separate the units of the output text, if
# such separation is desired for a given field.
UNIT_DELIMITER = '<hr class="match-separator">'
LINE_BREAK = "<br>"

_TAG_RE = re.compile(r"^</?(\w+)")
# EXTENSION is the extension of the files that we are building an index for.
_EXTENSION = ".html"

BLOCK_ELEMENTS_DEFAULT = {
    # Each table row goes to a block.
    "table",
    "thead",
    "tbody",
    "tr",
    # Each figure caption goes to a block.
    "figure",
    "figcaption",
    "img",
    # A division creates a new block.
    "div",
    # A horizontal line or line break create a block.
    "hr",
    "br",
}

RETAIN_TAGS_DEFAULT = {
    "b",
    "i",
    "strong",
    "em",
}

SPACE_ELEMENTS_DEFAULT = {
    "td",
}


class selector:
    def __init__(self, kwargs: dict, force: bool = True) -> None:
        self._kwargs = kwargs
        self._force = force

    def find_all(
        self,
        soup: bs4.Tag,
    ) -> list[bs4.Tag | bs4.NavigableString]:
        found = soup.find_all(**self._kwargs)
        assert found or not self._force, self._kwargs
        return found

    def find(
        self,
        soup: bs4.Tag,
    ) -> bs4.Tag | bs4.NavigableString | None:
        """Unlike BeautifulSoup.find, this method forces exactly one element
        matching the query to be present."""
        found = soup.find_all(**self._kwargs)
        assert len(found) <= 1
        assert found or not self._force
        return found[0] if found else None

    def select(self, soup: bs4.BeautifulSoup) -> bs4.Tag | None:
        assert isinstance(soup, bs4.Tag)
        elem = self.find(soup)
        assert elem or not self._force
        if elem is None:
            return None
        assert isinstance(elem, bs4.Tag)
        return elem


class capture:
    def __init__(
        self,
        name: str,
        _selector: selector,
        retain_classes: set[str] = set(),
        retain_tags: set[str] = RETAIN_TAGS_DEFAULT,
        retain_elements_for_classes: set[str] = set(),
        block_elements: set[str] = BLOCK_ELEMENTS_DEFAULT,
        space_elements: set[str] = SPACE_ELEMENTS_DEFAULT,
        unit_tags: set[str] = set(),
    ) -> None:
        # _name is name of the field.
        self._name: str = name
        # _selector is the selector that extracts the content.
        self._selector: selector = _selector
        # _retain_classes is the HTML classes to retain in the output.
        self._retain_classes: set[str] = retain_classes
        # _retain_tags is the list of HTML tags to retain in the output.
        self._retain_tags: set[str] = retain_tags
        # _retain_elements_for_classes is a list of HTML classes whose elements
        # (tags) should be retained in the output, but we don't retain the
        # classes themselves. Notice that the tags still get converted to spans,
        # unless they are in _retain_tags.
        self._retain_elements_for_classes: set[str] = (
            retain_elements_for_classes
        )
        # _block_elements is the list of HTML tags that result in newlines in
        # the output.
        self._block_elements: set[str] = block_elements
        # _space_elements is the list of HTML tags that result in spaces in
        # the output.
        self._space_elements: set[str] = space_elements
        # _units is a list of HTML tags that produce `UNIT_DELIMITER` delimiters
        # in the output. You can use this delimiter to separate the text into
        # meaningful units.
        self._unit_tags: set[str] = unit_tags

    def excise(self, soup: bs4.BeautifulSoup) -> str:
        """Find an element in the soup using the selector, extract it from the
        soup, then return its text."""
        tag = self._selector.select(soup)
        if not tag:
            return ""
        tag.extract()
        return self.get_simplified_html(tag)

    def get_simplified_html(self, tag: bs4.Tag) -> str:
        """Get the text from the given tag."""
        parts: Iterable[str] = self._get_children_simplified_html(tag)
        parts = cleaner.clean(parts)
        return "".join(parts)

    def _get_children_simplified_html(self, tag: bs4.Tag) -> Generator[str]:
        for child in tag.children:
            if isinstance(child, bs4.NavigableString):
                yield from self._get_navigable_string_text(child)
            elif isinstance(child, bs4.Tag):
                yield from self._get_tag_html(child)

    def _get_tag_html(self, child: bs4.Tag) -> Generator[str]:
        if child.name in self._unit_tags:
            yield UNIT_DELIMITER
        elif child.name in self._block_elements:
            yield LINE_BREAK
        elif child.name in self._space_elements:
            yield " "

        child_classes = child.get_attribute_list("class")
        classes = self._retain_classes.intersection(child_classes)

        if (
            child.name in self._retain_tags
            or classes
            or any(
                c in child_classes for c in self._retain_elements_for_classes
            )
        ):
            # We need to retain the tag and/or some of its classes.
            # If we're only retaining the classes, we convert it to <span>.
            # If we're retaining the tag name, we keep it as-is.
            name = child.name if child.name in self._retain_tags else "span"

            yield (
                f'<{name} class="{" ".join(sorted(classes))}">'
                if classes
                else f"<{name}>"
            )
            yield from self._get_children_simplified_html(child)
            yield f"</{name}>"
        else:
            # Neither the tag name nor any of its classes need retention, we
            # simply process the children.
            yield from self._get_children_simplified_html(child)

        if child.name in self._unit_tags:
            yield UNIT_DELIMITER
        elif child.name in self._block_elements:
            yield LINE_BREAK
        elif child.name in self._space_elements:
            yield " "

    def _get_navigable_string_text(
        self,
        child: bs4.NavigableString,
    ) -> Generator[str]:
        raw: str = str(child)
        del child
        if not raw:
            return
        if raw.isspace():
            yield " "
            return
        if raw[0].isspace():
            yield " "
        yield " ".join(raw.split())
        if raw[-1].isspace():
            yield " "


class cleaner:
    IterOfIters = Iterable[Iterable[str]]

    @staticmethod
    def clean(tokens: Iterable[str]) -> Generator[str]:
        # _clean cleans each unit, remove empty units and redundant unit
        # delimiters.
        units: cleaner.IterOfIters
        units = cleaner.split_iterable(tokens, cleaner._is_unit_delimiter)
        units = map(cleaner._clean_unit, units)
        yield from cleaner.join_non_empty(units, [UNIT_DELIMITER])

    @staticmethod
    def _clean_unit(unit: Iterable[str]) -> Generator[str]:
        # _clean_unit cleans each line, remove empty lines and redundant line
        # breaks.
        lines: cleaner.IterOfIters
        lines = cleaner.split_iterable(unit, cleaner._is_line_break)
        lines = map(cleaner._clean_line, lines)
        yield from cleaner.join_non_empty(lines, [LINE_BREAK])

    @staticmethod
    def _clean_line(line: Iterable[str]) -> Generator[str]:
        # _clean_line deletes excess whitespace and empty tags.
        parts: cleaner.IterOfIters
        parts = cleaner.split_iterable(line, str.isspace)
        line = cleaner.join_non_empty(parts, [" "])
        del parts
        # Perform additional tag-aware cleanup.
        line = cleaner._strip(line)
        line = cleaner._filter_empty_tags(line)
        yield from line

    @staticmethod
    def _strip(line: Iterable[str]) -> Iterator[str]:
        # Strip beginning of line.
        line = cleaner._strip_beginning_of_line(line)
        # Strip end of line.
        line = reversed(list(line))
        line = cleaner._strip_beginning_of_line(line)
        line = reversed(list(line))
        # Return.
        return line

    @staticmethod
    def _strip_beginning_of_line(line: Iterable[str]) -> Generator[str]:
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

    @staticmethod
    def _filter_empty_tags(line: Iterable[str]) -> list[str]:
        stack: list[str] = []
        for token in line:
            if not token.startswith("</"):
                stack.append(token)
                continue
            # This is a closing tag.
            assert stack  # We must have an opening tag.
            stack_top = stack[-1]
            if not stack_top.startswith("<") or stack_top.startswith("</"):
                # The stack top doesn't have an opening tag.
                stack.append(token)
                continue
            match = _TAG_RE.match(token)
            assert match
            cur = match.group(1)
            match = _TAG_RE.match(stack_top)
            assert match
            prev = match.group(1)
            del stack_top
            if cur == prev:
                stack.pop()
                continue
            stack.append(token)
        return stack

    @staticmethod
    def _is_unit_delimiter(token: str) -> bool:
        return token == UNIT_DELIMITER

    @staticmethod
    def _is_line_break(token: str) -> bool:
        return token == LINE_BREAK

    @staticmethod
    def split_iterable(
        iterable: Iterable[str],
        is_delimiter: Callable[[str], bool],
    ) -> Generator[Iterable[str]]:
        for is_delimiter_group, group in groupby(iterable, is_delimiter):
            if is_delimiter_group:
                continue
            yield group

    @staticmethod
    def join_non_empty(
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


class index:
    def __init__(
        self,
        input: str | Generator[tuple[str, str]],
        extract: list[selector],
        captures: list[capture],
        output: str,
        include: Callable[[str], bool] | None = None,
    ) -> None:
        """
        Args:
            input: Input path - a directory to search for HTML files, or a
                generator of [key, content] pairs.

            output: Output JSON file.

            include: an optional filter that takes the key as a parameter.

            extract: List of kwargs queries that will be passed to
                `soup.find_all` and extracted from the tree.

            capture: List of kwargs queries that will be passed to
                `soup.find_all`. and capture from the tree.
        """

        self._input: str | Generator[tuple[str, str]] = input
        self._include: Callable[[str], bool] | None = include
        self._extract: list[selector] = extract
        self._captures: list[capture] = captures
        self._output: str = output

    def iter_input(self) -> Generator[tuple[str, str]]:
        if isinstance(self._input, Generator):
            for key, content in self._input:
                if self._include and not self._include(key):
                    continue
                yield key, content
            return

        assert isinstance(self._input, str)
        assert os.path.isdir(self._input)
        # Recursively search for all HTML files.
        for root, _, files in os.walk(self._input):
            for file in files:
                if not file.endswith(_EXTENSION):
                    continue
                if self._include and not self._include(file):
                    continue
                path = os.path.join(root, file)
                yield path, utils.read(path)

    def _is_comment(self, elem: bs4.PageElement) -> bool:
        return isinstance(elem, bs4.element.Comment)

    def process_file(self, _tuple: tuple[str, str]) -> dict[str, str]:
        path, content = _tuple
        del _tuple
        entry = bs4.BeautifulSoup(content, "html.parser")
        # Extract all comments.
        for comment in entry.find_all(text=self._is_comment):
            _ = comment.extract()
        # Extract all unwanted content.
        for selector in self._extract:
            for element in selector.find_all(entry):
                element.extract()

        # Construct the entry for this file.
        if isinstance(self._input, str):
            key = os.path.relpath(path, self._input)[: -len(_EXTENSION)]
        else:
            key = path

        return {KEY: key} | {
            # NOTE: We no longer allow duplicate content in the output.
            # If an element has been selected once, delete it!
            # This implies that the order of captures matters!
            cap._name: cap.excise(entry)
            for cap in self._captures
        }

    def build(self) -> None:
        with utils.ThreadPoolExecutor() as executor:
            data: Iterable[dict[str, str]] = executor.map(
                self.process_file,
                self.iter_input(),
            )
        json = {
            "data": list(data),
            "params": {
                "fields": [
                    {"name": c._name, "units": bool(c._unit_tags)}
                    for c in self._captures
                ],
            },
        }

        utils.write(utils.json_dumps(json), self._output)
