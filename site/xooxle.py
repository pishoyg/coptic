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
# 1. HTML reduction allows us to keep a small index search index, which speeds
#    up index loading and search time.
# 2. Given that the searchable content shows as a list of search results,
#    complex HTML structures can be overwhelming.
# 3. Nevertheless, some (basic) styling is desirable in the search results
#    page, which is why we retain some of the features.

# TODO: (#230) Instead of `data` being an array of key-value objects each
# containing a KEY field, make `data` a key-value object that maps keys to
# key-value objects containing the other fields.

import os
import typing

import bs4

import utils

# The sets of tags used below is expected to produce excess newlines, which
# will later get cleaned up.
BLOCK_ELEMENTS_DEFAULT = {
    # Each table cell goes to a block.
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

# EXTENSION is the extension of the files that we are building an index for.
EXTENSION = ".html"
# KEY is the name of the key field in the output. This must match the name
# expected by the Xooxle search logic.
KEY = "KEY"
# UNIT_DELIMITER is the separator used to separate the units of the output text, if
# such separation is desired for a given field.
# TODO: This is not a clean way to separate units. Use a list of strings,
# instead of a delimiter-separated string.
UNIT_DELIMITER = '<hr class="match-separator">'


class selector:
    def __init__(self, kwargs: dict, force: bool = True) -> None:
        self._kwargs = kwargs
        self._force = force

    def find_all(
        self,
        soup: bs4.Tag,
    ) -> list[bs4.Tag | bs4.NavigableString]:
        found = soup.find_all(**self._kwargs)
        assert found or not self._force
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
        block_elements: set[str] = BLOCK_ELEMENTS_DEFAULT,
        unit_tags: set[str] | None = None,
    ) -> None:
        # _name is name of the field.
        self._name: str = name
        # _selector is the selector that extracts the content.
        self._selector: selector = _selector
        # _retain_classes is the HTML classes to retain in the output.
        self._retain_classes: set[str] = retain_classes
        # _retain_tags is the list of HTML tags to retain in the output.
        self._retain_tags: set[str] = retain_tags
        # _block_elements is the list of HTML tags that result in newlines in
        # the output.
        self._block_elements: set[str] = block_elements
        # _units is a list of HTML tags that produce <!----> separators in the
        # output. You can use this separator to separate the text into
        # meaningful units.
        self._unit_tags = unit_tags

    def excise(self, soup: bs4.BeautifulSoup) -> str:
        """Find an element in the soup using the selector, extract it from the
        soup, then return its text."""
        tag = self._selector.select(soup)
        if not tag:
            return ""
        tag.extract()
        return self.get_text(tag)

    def get_text(self, tag: bs4.Tag) -> str:
        """Get the text from the given tag."""
        return self._clean_text("".join(self._get_children_text(tag)))

    def _get_children_text(self, tag: bs4.Tag) -> typing.Generator:
        for child in tag.children:
            if isinstance(child, bs4.NavigableString):
                yield self._get_navigable_string_test(child)
            elif isinstance(child, bs4.Tag):
                yield from self._get_tag_text(child)

    def _get_tag_text(self, child: bs4.Tag) -> typing.Generator:
        if child.name in self._block_elements:
            yield "\n"
        if self._unit_tags and child.name in self._unit_tags:
            yield UNIT_DELIMITER

        classes = self._retain_classes.intersection(
            child.get_attribute_list("class"),
        )
        if child.name in self._retain_tags or classes:
            # We need to retain the tag and/or some of its classes.
            # If we're only retaining the classes, we convert it to <span>.
            # If we're retaining the tag name, we keep it as-is.
            name = child.name if child.name in self._retain_tags else "span"
            if classes:
                yield f'<{name} class="{" ".join(classes)}">'
            else:
                yield f"<{name}>"
            yield from self._get_children_text(child)
            yield f"</{name}>"
        else:
            # Neither the tag name nor any of its classes need retention, we
            # simply produce the text.
            yield from self._get_children_text(child)

        if self._unit_tags and child.name in self._unit_tags:
            yield UNIT_DELIMITER
        if child.name in self._block_elements:
            yield "\n"

    def _get_navigable_string_test(self, child: bs4.NavigableString) -> str:
        # Join all strings with a space, just like you expect a browser
        # to do.
        s = " ".join(child.strings)
        # Remove excess space, again just like you would expect a
        # browser to do.
        s = " ".join(s.split())
        # Append spaces before and after, if they existed.
        raw = str(child)
        if raw[0].isspace():
            s = " " + s
        if raw[-1].isspace():
            s = s + " "
        return s

    def _clean_text(self, text: str) -> str:
        lines = text.split(UNIT_DELIMITER)
        lines = [self._clean_excess_whitespace(ln) for ln in lines]
        lines = list(filter(None, lines))
        text = UNIT_DELIMITER.join(lines)
        return text

    def _clean_excess_whitespace(self, text: str) -> str:
        lines: list[str] = text.split("\n")
        lines = [ln.strip() for ln in lines]
        lines = list(filter(None, lines))
        lines = [" ".join(line.split()) for line in lines]
        text = "<br>".join(lines)
        return text


class subindex:
    def __init__(
        self,
        input: str,
        extract: list[selector],
        captures: list[capture],
        result_table_name: str,
        href_fmt: str,
    ) -> None:
        """
        Args:
            input: Input path - a directory to search for HTML files.
            output: Output JSON file.
            extract: List of kwargs queries that will be passed to
                `soup.find_all` and extracted from the tree.
            capture: List of kwargs queries that will be passed to
                `soup.find_all`. and capture from the tree.
        """

        self._input: str = input
        self._extract: list[selector] = extract
        self._captures: list[capture] = captures
        self._result_table_name: str = result_table_name
        self._href_fmt: str = href_fmt

    def iter_input(
        self,
    ) -> typing.Generator[
        tuple[str, bs4.BeautifulSoup],
        None,
        None,
    ]:
        assert os.path.isdir(self._input)

        # Recursively search for all HTML files.
        for root, _, files in os.walk(self._input):
            for file in files:
                if not file.endswith(EXTENSION):
                    continue
                path = os.path.join(root, file)
                yield path, bs4.BeautifulSoup(utils.read(path), "html.parser")

    def build(self) -> dict:
        data: list[dict[str, str]] = []

        # Recursively search for all HTML files.
        for path, entry in self.iter_input():
            # Extract all unwanted content.
            for selector in self._extract:
                for element in selector.find_all(entry):
                    element.extract()

            # Construct the entry for this file.
            datum = {
                KEY: os.path.relpath(path, self._input)[: -len(EXTENSION)],
            } | {
                # NOTE: We no longer allow duplicate content in the output.
                # If an element has been selected once, delete it!
                # This implies that the order of captures matters!
                cap._name: cap.excise(entry)
                for cap in self._captures
            }

            data.append(datum)

        return {
            "data": data,
            "params": {
                "result_table_name": self._result_table_name,
                "href_fmt": self._href_fmt,
                "fields": [
                    {"name": c._name, "units": bool(c._unit_tags)}
                    for c in self._captures
                ],
            },
        }


class index:
    def __init__(self, output: str, *indexes: subindex) -> None:
        self._output: str = output
        self._indexes = indexes

    def build(self) -> None:
        json = [index.build() for index in self._indexes]
        utils.write(utils.json_dumps(json), self._output)
