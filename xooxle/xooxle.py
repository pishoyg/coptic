"""This package defines the logic to build a Xooxle index.

Index Content

The Xooxle index contains searchable data, and some search metadata
(parameters) about a searchable corpus of HTML documents.
Our index builder will read a list of documents, and for each document, an
entry will be added to the data field of the produced index. The entry is a
key-value store bearing information about the document, including the
document path and its content. Xooxle can then:
- Search the content of each entry.
- Use the path to point the user to how to view the document that this content
  was extracted from.
The path is plain text, but the content fields are HTML.

HTML Reduction

In order to facilitate search and rendering, this HTML retained from
the content is intentionally simplified. We remove most tags and retain the
text. However, it's possible to retain some features from the original HTML.
The features (tags and classes) that get retained are parameterized, but we
have some default value.
For example, we normally retain the tags that are mere styling tags, such
as <b>, <i>, <strong>, and <em>.
If it's desirable to retain some classes, we retain them, but we convert
their tags to <span> tags! So `<tr class="word">` gets converted to `<span
class="word">` if the `word` class is desired to be retained.
We include <br> tags in the output corresponding to newlines, in a limited
set of cases, far more restrictive than the HTML standard. This means that
our output might appear compressed, or might lack newlines.
See below for more details about the reduction logic.

Metadata

See Xooxle documentation for the metadata documentation, and more
information about the required structure.

Text Extraction

Our text extraction implementation is somewhat hacky. The output may
contain superfluous newlines, which later get cleaned up. It may fail to
parse HTML special space character entities.

Rationale:

1. HTML reduction allows us to keep a small search index, which speeds up
   index loading and search time.
2. Given that the searchable content shows as a list of search results,
   complex HTML structures can be overwhelming.
3. Nevertheless, some (basic) styling is desirable in the search results
   page, which is why we retain some of the features.

Concurrency

In our experimentation, ProcessPoolExecutor was initially found to be roughly
5 times faster than ThreadPoolExecutor. At that point, users were required to
provide a directory of HTML files to index.
Later on, we started supporting a generator object, which allows us to receive
content dynamically, without it being persisted to files.
In our first use case with a generator object, ProcessPoolExecutor was found
to be around 20 times slower than ThreadPoolExecutor!
While we're not certain that this is the culprit, the user used a cache
implementation that wasn't process-friendly, and the generator object was
provided from a module that relied heavily on static-scope initialization,
which get duplicated to each process!
It was concluded that some generator implementation can be problematic with
ProcessPoolExecutor, and we opted for using ThreadPoolExecutor instead to make
our module more versatile, thus sacrificing performance in case where
ProcessPoolExecutor can be much faster!
ProcessPoolExecutor may indeed be optimal, not just when the input is provided
in the form of a directory of HTML files, but also when the input is a
"friendly" generator object, although we don't have a concrete definition of
that yet, as our understanding of concurrency primitives is still limited.
TODO: (#221) Understand concurrency primitives better, and optimize the
performance.

"""

import os
import pathlib
import re
import typing
from collections.abc import Generator, Iterable, Iterator
from itertools import groupby
from typing import Callable

import bs4

from flashcards import deck
from utils import concur, ensure, file

# KEY is the name of the key field in the output. This must match the name
# expected by the Xooxle search logic.
KEY = "KEY"
# UNIT_DELIMITER is the delimiter used to separate the units of the output text,
# if such separation is desired for a given field.
UNIT_DELIMITER = '<hr class="match-separator">'
LINE_BREAK = "<br>"

_TAG_RE = re.compile(r"^</?(\w+)>")
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
    "sup",
}

SPACE_ELEMENTS_DEFAULT = {
    "td",
}

TAG_REGEX = re.compile(r"<\s*([a-zA-Z0-9]+)")
# ADMISSIBLE is used to enforce the simplified HTML structure that Xooxle search
# can support.
# TODO: (#0) Document the criteria used to decide whether a tag is admissible.
# We proposed a solution for #499 and #515 that requires the text content of a
# given piece of Xooxle HTML to be perfectly predictable, and easy to infer from
# the HTML.
# Thus, block-level elements, or elements that are capable of producing extra
# space in the output, should be banned.
# UNIT_DELIMITER and LINE_BREAK are special because Xooxle splits the HTML using
# these delimiters. Thus, they don't really end up in the searchable segments of
# the HTML.
# TODO: (#439) Given the above, and given how large some Crum entries are, you
# might want to treat <p> as a unit tag, rather than a retained tag.
ADMISSIBLE = RETAIN_TAGS_DEFAULT | {"hr", "br"} | {"span", "a"} | {"p"}


class Selector:
    """Select elements from a BeautifulSoup object based on given
    parameters."""

    def __init__(
        self,
        kwargs: dict[str, typing.Any],
        force: bool = True,
    ) -> None:
        self._kwargs: dict[str, typing.Any] = kwargs
        self._force: bool = force

    def find_all(
        self,
        soup: bs4.Tag,
    ) -> list[bs4.Tag | bs4.NavigableString]:
        found = soup.find_all(**self._kwargs)
        if self._force:
            ensure.ensure(found, "no elements found for:", self._kwargs)
        return found

    def find(
        self,
        soup: bs4.Tag,
    ) -> bs4.Tag | bs4.NavigableString | None:
        """Find an element, forcing exactly one element to match the query.

        Args:
            soup: The soup to search.

        Returns:
            The matching element.

        """
        found: list[bs4.Tag | bs4.NavigableString] = soup.find_all(
            **self._kwargs,
        )
        ensure.ensure(len(found) <= 1, "found multiple elements:", found)
        if self._force:
            ensure.ensure(found, "no elements found for:", self._kwargs)
        return found[0] if found else None

    def select(self, soup: bs4.BeautifulSoup) -> bs4.Tag | None:
        assert isinstance(soup, bs4.Tag)
        elem = self.find(soup)
        if self._force:
            assert elem
        if elem is None:
            return None
        assert isinstance(elem, bs4.Tag)
        return elem


class Capture:
    """Capture a field from an HTML."""

    def __init__(  # pylint: disable=dangerous-default-value
        self,
        name: str,
        selector: Selector,
        retain_classes: set[str] | None = None,
        retain_tags: set[str] = RETAIN_TAGS_DEFAULT,
        retain_elements_for_classes: set[str] | None = None,
        retain_attributes: set[str] | None = None,
        block_elements: set[str] = BLOCK_ELEMENTS_DEFAULT,
        space_elements: set[str] = SPACE_ELEMENTS_DEFAULT,
        unit_tags: set[str] | None = None,
    ) -> None:
        # _name is name of the field.
        self._name: str = name
        # _selector is the selector that extracts the content.
        self._selector: Selector = selector
        # _retain_classes is the HTML classes to retain in the output.
        self._retain_classes: set[str] = retain_classes or set()
        # _retain_tags is the list of HTML tags to retain in the output.
        self._retain_tags: set[str] = retain_tags
        # _retain_attributes is the list of HTML tag attributes to retain.
        self._retain_attributes: set[str] = retain_attributes or set()
        ensure.ensure(
            "class" not in self._retain_attributes,
            "Classes get special treatment!",
        )
        # _retain_elements_for_classes is a list of HTML classes whose elements
        # (tags) should be retained in the output, but we don't retain the
        # classes themselves. Notice that the tags still get converted to spans,
        # unless they are in _retain_tags.
        self._retain_elements_for_classes: set[str] = (
            retain_elements_for_classes or set()
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
        self._unit_tags: set[str] = unit_tags or set()

    @property
    def name(self) -> str:
        return self._name

    def excise(self, soup: bs4.BeautifulSoup) -> str:
        """Find an element using the selector, extract it, and return its HTML.

        Use the selector to find an element matching the query, extract it
        (remove it from the original soup), and return its simplified HTML.

        If the selector doesn't provide an element, return the empty string. To
        force a matching element to be found, configure the selector
        accordingly.

        Args:
            soup: The soup to search.

        Returns:
            The simplified HTML version of the found tag.

        """
        tag = self._selector.select(soup)
        if not tag:
            return ""
        _ = tag.extract()
        return self._get_simplified_html(tag)

    def _get_simplified_html(self, tag: bs4.Tag) -> str:
        """Get a simplified version of a tag in plain HTML.

        Args:
            tag: The tag to extract HTML from.

        Returns:
            HTML representing a simplified version of the tag.

        """
        parts: Iterable[str] = self._get_tag_html(tag)
        parts = Cleaner.clean(parts)
        return "".join(parts)

    def _get_tag_html(self, child: bs4.Tag) -> Generator[str]:
        if child.name in self._unit_tags:
            yield UNIT_DELIMITER
        elif child.name in self._block_elements:
            yield LINE_BREAK
        elif child.name in self._space_elements:
            yield " "

        classes: list[str | None] = child.get_attribute_list("class")

        # Gather attributes to retain
        attrs: dict[str, str] = {}
        for key in self._retain_attributes:
            val: str | list[str] | None = child.get(key)
            if not val:
                continue
            if isinstance(val, list):
                val = " ".join(val)
            attrs[key] = val
        retained_classes: set[str] = self._retain_classes.intersection(classes)
        if retained_classes:
            attrs["class"] = " ".join(sorted(retained_classes))
        del retained_classes

        if (
            child.name in self._retain_tags
            or attrs
            or any(c in classes for c in self._retain_elements_for_classes)
        ):
            # We need to retain the tag and/or some of its classes.
            # If we're only retaining the classes, we convert it to <span>.
            # If we're retaining the tag name, we keep it as-is.
            del classes
            name: str = (
                child.name if child.name in self._retain_tags else "span"
            )
            yield f'<{name}{
                "".join(
                f' {k}="{v}"' for k, v in sorted(attrs.items())
                )
            }>'
            del attrs
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

    def _get_children_simplified_html(self, tag: bs4.Tag) -> Generator[str]:
        for child in tag.children:
            if isinstance(child, bs4.NavigableString):
                yield from self._get_navigable_string_text(child)
            elif isinstance(child, bs4.Tag):
                yield from self._get_tag_html(child)

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


class Cleaner:
    """Clean extracted HTML.

    NOTE: Input and output are iterable of strings - each representing a piece
    of the HTML - rather than the entire HTML combined in a single string.
    Some assumptions are made about the structure of the iterable (for example,
    we assume that a tag is always a standalone string).

    """

    IterOfIters = Iterable[Iterable[str]]  # pylint: disable=invalid-name

    @staticmethod
    def clean(tokens: Iterable[str]) -> Generator[str]:
        """Clean each unit, remove empty units and redundant unit delimiters.

        Args:
            tokens: A list of units. A unit could be a tag, a piece of text, or
                a unit delimiter.

        Yields:
            A cleaned subsequence of the input tokens, after eliminating
            superfluous tokens.

        """
        units: Cleaner.IterOfIters
        units = Cleaner.split_iterable(tokens, Cleaner._is_unit_delimiter)
        units = map(Cleaner._clean_unit, units)
        yield from Cleaner.join_non_empty(units, [UNIT_DELIMITER])

    @staticmethod
    def _clean_unit(unit: Iterable[str]) -> Generator[str]:
        # _clean_unit cleans each line, remove empty lines and redundant line
        # breaks.
        lines: Cleaner.IterOfIters
        lines = Cleaner.split_iterable(unit, Cleaner._is_line_break)
        lines = map(Cleaner._clean_line, lines)
        yield from Cleaner.join_non_empty(lines, [LINE_BREAK])

    @staticmethod
    def _clean_line(line: Iterable[str]) -> Generator[str]:
        # _clean_line deletes excess whitespace and empty tags.
        parts: Cleaner.IterOfIters
        parts = Cleaner.split_iterable(line, str.isspace)
        line = Cleaner.join_non_empty(parts, [" "])
        del parts
        # Perform additional tag-aware cleanup.
        line = Cleaner._strip(line)
        line = Cleaner._filter_empty_tags(line)
        yield from line

    @staticmethod
    def _strip(line: Iterable[str]) -> Iterator[str]:
        # Strip beginning of line.
        line = Cleaner._strip_beginning_of_line(line)
        # Strip end of line.
        line = reversed(list(line))
        line = Cleaner._strip_beginning_of_line(line)
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
            match = _TAG_RE.fullmatch(token)
            assert match, token
            cur = match.group(1)
            match = _TAG_RE.fullmatch(stack_top)
            assert match
            prev = match.group(1)
            del stack_top
            if cur == prev:
                _ = stack.pop()
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


class Index:
    """A Xooxle index."""

    def __init__(
        self,
        source: str | deck.Deck,
        extract: list[Selector],
        captures: list[Capture],
        output: str | pathlib.Path,
        layers: list[list[str]] | None = None,
    ) -> None:
        """
        Args:
            source: Input path - a directory to search for HTML files, or a
                generator of [key, content] pairs.
            extract: List of selectors of elements to remove from the soup
                during preprocessing.
            captures: List of selectors of elements to capture in the output.
            output: Path to the output JSON file.
            layers: A grouping of the capture names into layers. If not
                provided, will default to a single layer containing all
                captures.
        """
        self._source: str | deck.Deck = source
        self._extract: list[Selector] = extract
        self._captures: list[Capture] = captures
        self._output: str | pathlib.Path = output
        self._layers: list[list[str]] = layers or [
            [cap.name for cap in self._captures],
        ]

    def iter_input(self) -> Generator[tuple[str, str]]:
        if isinstance(self._source, deck.Deck):
            for note in self._source.notes:
                yield note.key, note.html
            return

        assert isinstance(self._source, str)
        assert os.path.isdir(self._source)
        # Recursively search for all HTML files.
        for root, _, files in os.walk(self._source):
            for f in files:
                if not f.endswith(_EXTENSION):
                    continue
                path = os.path.join(root, f)
                yield path, file.read(path)

    def _is_comment(self, elem: bs4.PageElement) -> bool:
        return isinstance(elem, bs4.element.Comment)

    def process_file(self, pair: tuple[str, str]) -> dict[str, str]:
        path, content = pair
        del pair
        entry = bs4.BeautifulSoup(content, "html.parser")
        # Extract all comments.
        comment: bs4.Comment
        for comment in entry.find_all(text=self._is_comment):
            _ = comment.extract()
        # Extract all unwanted content.
        for selector in self._extract:
            for element in selector.find_all(entry):
                _ = element.extract()

        # Construct the entry for this file.
        if isinstance(self._source, str):
            key = os.path.relpath(path, self._source)[: -len(_EXTENSION)]
        else:
            key = path

        return {KEY: key} | {
            # NOTE: We no longer allow duplicate content in the output.
            # If an element has been selected once, delete it!
            # This implies that the order of captures matters!
            cap.name: cap.excise(entry)
            for cap in self._captures
        }

    def build(self) -> None:
        with concur.thread_pool_executor() as executor:
            data: Iterable[dict[str, str]] = executor.map(
                self.process_file,
                self.iter_input(),
            )
        json = {
            "data": list(data),
            "metadata": {
                "layers": self._layers,
            },
        }

        self.validate(json)
        file.write(file.json_dumps(json), self._output)

    def validate(self, json: dict[str, typing.Any]) -> None:
        keys: list[str] = [
            field for layer in json["metadata"]["layers"] for field in layer
        ] + [KEY]
        entry: dict[str, str]
        for entry in json["data"]:
            ensure.equal_sets(entry.keys(), keys)
            for key, value in entry.items():
                if key == KEY:
                    continue
                ensure.members(TAG_REGEX.findall(value), ADMISSIBLE)
