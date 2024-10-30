import os
import typing

import bs4
import pandas as pd

import utils

# NOTE: Our text extraction implementation is somewhat hacky. The output may
# contain superfluous newlines. It may fail to parse HTML special space
# character entities. This function is expected to be revisited in the future
# if our HTML output changes.
# NOTE: We get to decide what is a block element and what is an inline
# element. There is no canonical list, but the following list includes the
# tags that are generally agreed to represent inline tags. It works for our
# current use case.
_INLINE_ELEMENTS = {
    "a",
    "span",
    "em",
    "strong",
    "u",
    "i",
    "font",
    "mark",
    "label",
    "s",
    "sub",
    "sup",
    "tt",
    "bdo",
    "button",
    "cite",
    "del",
    "b",
    "a",
    "font",
    # NOTE: `td` is generally considered a block element, but we treat it
    # as an inline element for our purposes.
    "td",
}
_NEWLINE_ELEMENTS = {
    "br",
    "hr",
}

_RETAIN_TAGS_DEFAULT = {
    "b",
    "i",
    "string",
    "em",
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

    def select(self, soup: pd.Series | bs4.Tag) -> bs4.Tag | None:
        assert isinstance(soup, bs4.Tag)
        elem = self.find(soup)
        assert elem or not self._force
        if elem is None:
            return None
        assert isinstance(elem, bs4.Tag)
        return elem


def _get_text(
    tag: bs4.Tag,
    retain_classes: set[str],
    retain_tags: set[str],
) -> str:
    def __get_text(tag: bs4.Tag) -> typing.Generator:
        for child in tag.children:
            if isinstance(child, bs4.Tag):
                if child.name in retain_tags or retain_classes.intersection(
                    child.get_attribute_list("class"),
                ):
                    # We need to retain this tag.
                    name = child.name if child.name in retain_tags else "span"
                    if child.has_attr("class"):
                        yield f'<{name} class="{
                                " ".join(child.get_attribute_list("class"))
                        }">'
                    else:
                        yield f"<{name}>"
                    # Mangle the child to make sure it doesn't get picked up
                    # again, but its children should.
                    child.name = "RANDOM"
                    child.attrs = {}
                    yield from __get_text(child)
                    yield f"</{name}>"
                    continue
                # If the tag is a block type tag, then yield new lines before
                # and after.
                is_block_element = child.name not in _INLINE_ELEMENTS
                if is_block_element:
                    yield "\n"
                yield from (
                    ["\n"]
                    if child.name in _NEWLINE_ELEMENTS
                    else __get_text(child)
                )
                if is_block_element:
                    yield "\n"
            elif isinstance(child, bs4.NavigableString):
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
                yield s

    return "".join(__get_text(tag))


def _clean_text(text: str) -> str:
    lines: list[str] = text.split("\n")
    lines = [ln.strip() for ln in lines]
    lines = list(filter(None, lines))
    lines = [" ".join(line.split()) for line in lines]
    text = "<br>".join(lines)
    return text


def _clean_html(tag: bs4.Tag) -> str:
    for comments in tag.findAll(
        text=lambda text: isinstance(text, bs4.Comment),
    ):
        comments.extract()
    return " ".join(str(tag).split())


class capture:
    def __init__(
        self,
        name: str,
        _selector: selector,
        retain_classes: set[str] = set(),
        retain_tags: set[str] = _RETAIN_TAGS_DEFAULT,
    ) -> None:
        self.name: str = name
        self.selector: selector = _selector
        self.retain_classes: set[str] = retain_classes
        self.retain_tags: set[str] = retain_tags


class subindex:
    def __init__(
        self,
        input: str,
        extract: list[selector],
        captures: list[capture],
        result_table_name: str,
        view: bool,
        path_prefix: str,
        retain_extension: bool,
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
        self._view = view
        self._path_prefix: str = path_prefix
        self._retain_extension: bool = retain_extension

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
                if not file.endswith(".html"):
                    continue
                path = os.path.join(root, file)
                yield path, bs4.BeautifulSoup(utils.read(path), "html.parser")

    def build(self) -> dict:
        data: list[dict[str, str]] = []

        # Recursively search for all HTML files.
        for path, entry in self.iter_input():
            # Parse the HTML content.
            # TODO: (#230) Don't require a path parameter.
            datum = {
                "path": os.path.relpath(path, self._input),
            }

            for selector in self._extract:
                for element in selector.find_all(entry):
                    element.extract()

            for cap in self._captures:
                elem: bs4.Tag | None = None
                elem = cap.selector.select(entry)
                if not elem:
                    datum[cap.name] = ""
                    continue

                datum[cap.name] = _clean_text(
                    _get_text(elem, cap.retain_classes, cap.retain_tags),
                )
                # We no longer allow duplicate content in the output. If an
                # element has been selected once, delete it!
                elem.extract()

            data.append(datum)

        return {
            "data": data,
            "params": {
                "view": self._view,
                "path_prefix": self._path_prefix,
                "retain_extension": self._retain_extension,
                "result_table_name": self._result_table_name,
                "field_order": [c.name for c in self._captures],
            },
        }


class index:
    def __init__(self, output: str, *indexes: subindex) -> None:
        self._output: str = output
        self._indexes = indexes

    def build(self) -> None:
        json = [index.build() for index in self._indexes]
        utils.write(utils.json_dumps(json), self._output)
