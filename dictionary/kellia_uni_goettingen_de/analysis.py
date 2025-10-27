#!/usr/bin/env python3
"""Analyze the structure of the KELLIA dataset."""

import itertools
import pathlib
import typing
import xml.etree.ElementTree as ET
from collections import abc, defaultdict

from dictionary.kellia_uni_goettingen_de import kellia
from utils import ensure, file

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_OUTPUT: pathlib.Path = _SCRIPT_DIR / "data" / "output" / "analysis.yaml"

_MAX_LIST_LEN: int = 11


class Set:
    """Set represents an ordered set of strings."""

    def __init__(self) -> None:
        self.d: defaultdict[str, int] = defaultdict(int)
        self.sum: int = 0

    def add(self, val: str) -> None:
        self.d[val] += 1
        self.sum += 1

    def __iter__(self) -> abc.Iterator[str]:
        return iter(self.d)

    def __lt__(self, other: object) -> bool:
        assert isinstance(other, Set)
        return self.sum < other.sum

    def __bool__(self) -> bool:
        return bool(self.d)

    def sample(self) -> dict[str, typing.Any]:
        """Return a sample of the elements.

        Returns:
            A dictionary containing a structured summary of the set content.
        """
        items: abc.Iterable[tuple[str, int]] = self.d.items()
        # Sort in descending order by count.
        items = sorted(items, key=lambda kv: kv[1], reverse=True)
        # Slice.
        items = itertools.islice(items, _MAX_LIST_LEN)
        # We return a complex object in order to create neat, readable
        # structure. Each item in the list is a dictionary containing the single
        # entry – the key being the key, and the value being the count.
        entries: list[dict[str, int] | str] = [{k: v} for k, v in items]
        if len(entries) < len(self.d):
            entries.append("…")
        return {
            "TOTAL": sum(self.d.values()),
            f"{len(self.d)} DISTINCT VALUES": entries,
        }


class TagProperties:
    """TagProperties tracks observed tag properties."""

    def __init__(self) -> None:
        self.count: int = 0
        # attrs maps an attribute name to a set of all observed attribute
        # values.
        self.attrs: defaultdict[str, Set] = defaultdict(Set)
        # children stores all observed names of child tags.
        self.children: Set = Set()
        # texts stores all observed values of the tag text.
        self.texts: Set = Set()

    def add_sample(self, elem: ET.Element) -> None:
        self.count += 1
        for key, value in elem.attrib.items():
            self.attrs[_name(key)].add(value)

        for child in elem:
            self.children.add(_name(child.tag))

        txt: str = elem.text.strip() if elem.text else ""
        if txt:
            self.texts.add(txt)

        # No element is allowed to have a tail.
        tail: str = elem.tail.strip() if elem.tail else ""
        ensure.ensure(not tail, "element", elem, "has a tail:", tail)

    def summary(self):
        props: dict[str, typing.Any] = {"TOTAL": self.count}
        if self.attrs:
            props["ATTRIBUTES"] = {
                k: v.sample()
                for k, v in sorted(
                    self.attrs.items(),
                    key=lambda kv: kv[1],
                    reverse=True,
                )
            }

        if self.texts:
            props["TEXTS"] = self.texts.sample()

        if self.children:
            props["CHILDREN"] = self.children.sample()

        return props


def _name(name: str) -> str:
    return name.replace(kellia.XML_NS, "xml:").replace(kellia.TEI_NS, "")


def _analyze() -> dict[str, TagProperties]:
    # props maps a tag name to its observed properties.
    # The dictionary will retain the same order observed in the input.
    props: defaultdict[str, TagProperties] = defaultdict(TagProperties)

    elem: ET.Element
    for elem in kellia.body_element().iter():
        if kellia.deprecated(elem):
            continue

        props[_name(elem.tag)].add_sample(elem)

    return props


def main():
    file.write(
        file.yaml_dump_all(
            {name: tag.summary()} for name, tag in _analyze().items()
        ).replace("\n---\n", "\n\n---\n"),
        _OUTPUT,
    )


if __name__ == "__main__":
    main()
