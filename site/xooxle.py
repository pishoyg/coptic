import os
import typing

import bs4

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


class selector:
    def __init__(self, kwargs: dict, force: bool = True) -> None:
        self._kwargs = kwargs
        self._force = force

    def find_all(
        self,
        soup: bs4.BeautifulSoup,
    ) -> list[bs4.Tag | bs4.NavigableString]:
        found = soup.find_all(**self._kwargs)
        assert found or not self._force
        return found

    def find(
        self,
        soup: bs4.BeautifulSoup,
    ) -> bs4.Tag | bs4.NavigableString | None:
        """Unlike BeautifulSoup.find, this method forces exactly one element
        matching the query to be present."""
        found = soup.find_all(**self._kwargs)
        assert len(found) <= 1
        assert found or not self._force
        return found[0] if found else None

    def find_tag(self, soup: bs4.BeautifulSoup) -> bs4.Tag | None:
        elem = self.find(soup)
        assert elem or not self._force
        if elem is None:
            return None
        assert isinstance(elem, bs4.Tag)
        return elem


def _get_text(tag: bs4.Tag) -> str:
    def __get_text(tag: bs4.Tag) -> typing.Generator:
        for child in tag.children:
            if isinstance(child, bs4.Tag):
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
    text = "\n".join(lines)
    return text


class capture:
    def __init__(self, name: str, select: selector, raw: bool) -> None:
        self.name: str = name
        self.selector: selector = select
        self.raw: bool = raw


class subindex:
    def __init__(
        self,
        directory: str,
        extract: list[selector],
        captures: list[capture],
    ) -> None:
        """
        Args:
            directory: The directory to search for HTML files.
            output: Output JSON file.
            extract: List of kwargs queries that will be passed to
                `soup.find_all` and extracted from the tree.
            capture: List of kwargs queries that will be passed to
                `soup.find_all`. and capture from the tree.
        """

        self._directory: str = directory
        self._extract: list[selector] = extract
        self._captures: list[capture] = captures

    def build(self) -> dict:

        data: list[dict[str, str]] = []

        # Recursively search for all HTML files.
        for root, _, files in os.walk(self._directory):
            for file in files:
                if not file.endswith(".html"):
                    continue
                file_path = os.path.join(root, file)

                # Parse the HTML content.
                soup = bs4.BeautifulSoup(utils.read(file_path), "html.parser")

                for selector in self._extract:
                    for element in selector.find_all(soup):
                        element.extract()

                # Store the relative file path.
                datum = {
                    "path": os.path.relpath(file_path, self._directory),
                }
                for capture in self._captures:
                    elem: bs4.Tag | None = capture.selector.find_tag(soup)
                    if not elem:
                        datum[capture.name] = ""
                        continue
                    if capture.raw:
                        datum[capture.name] = str(elem)
                    else:
                        datum[capture.name] = _clean_text(_get_text(elem))

                data.append(datum)

        return {
            "data": data,
            "metadata": {
                capture.name: {
                    "raw": capture.raw,
                }
                for capture in self._captures
            },
        }


class index:
    def __init__(self, output: str, *indexes: subindex) -> None:
        self._output: str = output
        self._indexes = indexes

    def build(self) -> None:
        json = [index.build() for index in self._indexes]
        utils.write(utils.json_dumps(json), self._output)
