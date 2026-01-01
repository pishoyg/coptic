"""This package defines the logic to build a Xooxle index.

Index Content:

    The Xooxle index contains searchable data, and some search metadata
    (parameters) about a searchable corpus of HTML documents.
    Our index builder will read a list of documents, and for each document, an
    entry will be added to the data field of the produced index. The entry is a
    key-value store bearing information about the document, including the
    document path and its content.

    The Xooxle search engine can then use the built index to:
    - Search the content of each entry.
    - Create a URL from the path to point the user to how to view the document
      that this content was extracted from.
    The path is plain text, but the content fields are HTML.

HTML Reduction:

    In order to facilitate search and rendering, this HTML retained from the
    content is intentionally simplified. We remove most tags and retain the
    text. However, it's possible to retain some features from the original HTML.
    The features (tags and classes) that get retained are parameterized, but we
    have some default value.

    For example, we normally retain the tags that are mere styling tags, such as
    <b>, <i>, <strong>, and <em>.

    If it's desirable to retain some classes, we retain them, but we convert
    their tags to <span> tags! So `<tr class="word">` gets converted to `<span
    class="word">` if the `word` class is desired to be retained.

    We include <br> tags in the output corresponding to newlines, in a limited
    set of cases, far more restrictive than the HTML standard. This means that
    our output might appear compressed, or might lack newlines.
    See below for more details about the reduction logic.

Metadata:

    See Xooxle documentation for the metadata documentation, and more
    information about the required structure.

Rationale:

1. HTML reduction allows us to keep a small search index, which speeds up
   index loading and search time.
2. Given that the searchable content shows as a list of search results,
   complex HTML structures can be overwhelming.
3. Nevertheless, some (basic) styling is desirable in the search results
   page, which is why we retain some of the features.

Concurrency

    In our experimentation, ProcessPoolExecutor was initially found to be
    roughly 5 times faster than ThreadPoolExecutor. At that point, users were
    required to provide a directory of HTML files to index.
    Later on, we started supporting a generator object, which allows us to
    receive content dynamically, without it being persisted to files.
    In our first use case with a generator object, ProcessPoolExecutor was found
    to be around 20 times slower than ThreadPoolExecutor!
    While we're not certain that this is the culprit, the user used a cache
    implementation that wasn't process-friendly, and the generator object was
    provided from a module that relied heavily on static-scope initialization,
    which get duplicated to each process!
    It was concluded that some generator implementation can be problematic with
    ProcessPoolExecutor, and we opted for using ThreadPoolExecutor instead to
    make our module more versatile, thus sacrificing performance in case where
    ProcessPoolExecutor can be much faster!
    ProcessPoolExecutor may indeed be optimal, not just when the input is
    provided in the form of a directory of HTML files, but also when the input
    is a "friendly" generator object, although we don't have a concrete
    definition of that yet, as our understanding of concurrency primitives is
    still limited.
"""

import os
import pathlib
import re
import typing
from collections.abc import Generator, Iterable

import bs4

from flashcards import deck
from utils import concur, ensure, file, orth, page
from xooxle import clean
from xooxle import constants as const

# _KEY is the name of the key field in the output. This must match the name
# expected by the Xooxle search logic.
_KEY: str = "KEY"
# _EXTENSION is the extension of the files that we are building an index for.
_EXTENSION: str = ".html"
_TAG_RE: re.Pattern[str] = re.compile("<.*?>")


BLOCK_ELEMENTS_DEFAULT: set[str] = {
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

RETAIN_TAGS_DEFAULT: set[str] = {
    "b",
    "i",
    "strong",
    "em",
    "sup",
    "ins",
    "del",
}

SPACE_ELEMENTS_DEFAULT: set[str] = {
    "td",
}


Line: typing.TypeAlias = tuple[str, str]
Unit: typing.TypeAlias = list[Line]
Field: typing.TypeAlias = list[Unit]


class Metadata(typing.TypedDict):
    """Represents the metadata object with its layer structure."""

    layers: list[list[str]]


class Index(typing.TypedDict):
    """A JSON Xooxle Index"""

    data: list[dict[str, list[list[Line]] | str]]
    metadata: Metadata


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
        block_classes: set[str] | None = None,
        unit_tags: set[str] | None = None,
    ) -> None:
        # _name is name of the field.
        self._name: str = name
        ensure.ensure(self._name != _KEY, _KEY, "is a reserved field name!")
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
        self._block_classes: set[str] = block_classes or set()
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
        parts = self._balance_lines(parts)
        parts = clean.clean(parts)
        return "".join(parts)

    def _close(self, tag: str) -> str:
        return f"</{clean.tag_name(tag)}>"

    def _balance_lines(self, stream: Iterable[str]) -> Generator[str]:
        """Make sure every unit and line in the stream has balanced tags.

        For example, consider the following input:
            <span class="wiki">
            hello
            <br>
            world
            </span>

        The output stream should look like this:
            <span class="wiki">
            hello
            </span>
            <br>
            <span class="wiki">
            world
            </span>

        Args:
            stream: A stream of Xooxle tokens.

        Yields:
            A stream of Xooxle tokens where every unit and line is guaranteed to
            have balanced tags.
        """
        stack: list[str] = []
        for token in stream:

            if token in [const.UNIT_DELIMITER, page.LINE_BREAK]:
                yield from map(self._close, reversed(stack))
                yield token
                yield from stack
                continue

            yield token

            if clean.closing_tag(token):
                clean.verify_balanced(stack.pop(), token)
            elif clean.opening_tag(token):
                stack.append(token)

        ensure.ensure(
            not stack,
            "The input stream is not balanced! Remaining tags:",
            stack,
        )

    def _get_tag_html(self, child: bs4.Tag) -> Generator[str]:
        if child.name in self._unit_tags:
            yield const.UNIT_DELIMITER
        elif child.name in self._block_elements:
            yield page.LINE_BREAK
        elif child.name in self._space_elements:
            yield " "

        classes: list[str | None] = child.get_attribute_list("class")
        if self._block_classes.intersection(classes):
            yield page.LINE_BREAK

        # Gather attributes to retain
        attrs: dict[str, str] = {}
        for key in self._retain_attributes:
            val: str | list[str] | None = child.get(key)
            if val is None:
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

        if self._block_classes.intersection(classes):
            yield page.LINE_BREAK

        if child.name in self._unit_tags:
            yield const.UNIT_DELIMITER
        elif child.name in self._block_elements:
            yield page.LINE_BREAK
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


class Xooxle:
    """A Xooxle index."""

    def __init__(
        self,
        source: str | typing.Callable[[], Generator[deck.Note]],
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
        self._source: str | typing.Callable[[], Generator[deck.Note]] = source
        self._extract: list[Selector] = extract
        self._captures: list[Capture] = captures
        self._output: str | pathlib.Path = output
        self._layers: list[list[str]] = layers or [
            [cap.name for cap in self._captures],
        ]

    def _iter_dir(self, source: str) -> Generator[tuple[str, str]]:
        assert os.path.isdir(source)
        # Recursively search for all HTML files.
        for root, _, files in os.walk(source):
            for f in files:
                if not f.endswith(_EXTENSION):
                    continue
                path = os.path.join(root, f)
                yield path, file.read(path)

    def iter_input(self) -> Generator[tuple[str, str]]:
        if isinstance(self._source, str):
            yield from self._iter_dir(self._source)
            return

        for note in self._source():
            yield note.key, note.html

    def _is_comment(self, elem: bs4.PageElement) -> bool:
        return isinstance(elem, bs4.element.Comment)

    def line(self, html: str) -> Line:
        return (html, orth.clean_diacritics(_TAG_RE.sub("", html)))

    def unit(self, html: str) -> Unit:
        if not html:
            return []
        return list(map(self.line, html.split(page.LINE_BREAK)))

    def field(self, html: str) -> Field:
        if not html:
            return []
        return list(map(self.unit, html.split(const.UNIT_DELIMITER)))

    def process_file(self, pair: tuple[str, str]) -> dict[str, Field | str]:
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

        # NOTE: We no longer allow duplicate content in the output.
        # If an element has been selected once, it's no longer available in the
        # entry and can't be retrieved in the future.
        # This implies that the order of captures matters!

        # NOTE: During index build, we create a delimiter-separated HTML, which
        # we split below into units and lines. This is due to historical
        # reasons, as we used to export the delimiter-separated HTML in the
        # past, but this is no longer the case since #605, to achieve which we
        # opted for simply resplitting the string at the final stage, although
        # this may be suboptimal.
        data: dict[str, Field] = {
            cap.name: self.field(cap.excise(entry)) for cap in self._captures
        }
        data = {k: v for k, v in data.items() if v}
        return {_KEY: key} | data

    def build(self) -> None:
        with concur.thread_pool_executor() as executor:
            data: Iterable[dict[str, Field | str]] = executor.map(
                self.process_file,
                self.iter_input(),
            )
        json: Index = {
            "data": list(data),
            "metadata": {
                "layers": self._layers,
            },
        }

        self.validate(json)
        file.write(file.json_dumps(json), self._output)

    def validate(self, json: Index) -> None:
        keys: list[str] = [
            field for layer in json["metadata"]["layers"] for field in layer
        ] + [_KEY]
        entry: dict[str, str | Field]
        for entry in json["data"]:
            ensure.members(entry.keys(), keys)
