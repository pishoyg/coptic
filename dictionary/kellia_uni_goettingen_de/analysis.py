#!/usr/bin/env python3
"""Analyze the structure of the KELLIA dataset."""

import pathlib
import typing
import xml.etree.ElementTree as ET
from collections import abc, defaultdict

from dictionary.kellia_uni_goettingen_de import kellia
from utils import file

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_OUTPUT: pathlib.Path = _SCRIPT_DIR / "data" / "output" / "analysis.yaml"

_MAX_LIST_LEN: int = 10
_ORDER: list[str] = [
    "body",
    "superEntry",
    "entry",
    "form",
    "gramGrp",
    "sense",
    "etym",
    "xr",
    "note",
    "cit",
    "gram",
    "def",
    "quote",
    "ref",
    "usg",
    "subc",
    "gen",
    "pos",
    "number",
    "oRef",
    "orth",
    "bibl",
]
_ORDER_DICT: dict[str, int] = {name: idx for idx, name in enumerate(_ORDER)}


Sample: typing.TypeAlias = dict[str, list[str]]


def _sample(s: abc.Iterable[str]) -> Sample:
    """Sample the given set of values.

    Args:
        s: Set of values.

    Returns:
        A dictionary containing one item – the key being the number of distinct
        values, and the value being a (potentially sampled) list of values.
        The values will be sorted.
    """
    # Sort so the output will be deterministic.
    s = sorted(s)
    # Return a dictionary with 1 key to create a structure:
    return {
        f"{len(s)} DISTINCT VALUES": (
            s[:_MAX_LIST_LEN] + ["…"] if len(s) > _MAX_LIST_LEN else s
        ),
    }


Summary: typing.TypeAlias = dict[str, Sample | list[str]]


class TagProperties:
    """TagProperties tracks observed tag properties."""

    def __init__(self, name: str) -> None:
        self.name: str = name
        # attrs maps an attribute name to a set of all observed attribute
        # values.
        self.attrs: defaultdict[str, set[str]] = defaultdict(set)
        # children stores all observed names of child tags.
        self.children: set[str] = set()
        # texts stores all observed values of the tag text.
        self.texts: set[str] = set()
        # tails stores all observed values of the tag tail.
        self.tails: set[str] = set()

    def add_sample(self, elem: ET.Element) -> None:
        for key, value in elem.attrib.items():
            self.attrs[_name(key)].add(value)

        for child in elem:
            self.children.add(_name(child.tag))

        txt: str = elem.text.strip() if elem.text else ""
        if txt:
            self.texts.add(txt)

        tail: str = elem.tail.strip() if elem.tail else ""
        if tail:
            self.tails.add(tail)

    def summary(self) -> Summary:
        props: dict[str, Sample | list[str]] = {
            k: _sample(v) for k, v in self.attrs.items()
        }

        if self.texts:
            assert "TEXTS" not in props
            props["TEXTS"] = _sample(self.texts)

        if self.tails:
            assert "TAILS" not in props
            props["TAILS"] = _sample(self.tails)

        if self.children:
            # Always include all children.
            assert "CHILDREN" not in props
            props["CHILDREN"] = sorted(
                self.children,
                key=lambda x: _ORDER_DICT[x],
            )

        return props


def _name(name: str) -> str:
    return name.replace(kellia.XML_NS, "xml:").replace(kellia.TEI_NS, "")


# TODO: (#0) Add statistics. Count the tags, attributes, children, attribute
# values, ... etc.
def _analyze() -> abc.Iterable[TagProperties]:
    # tags maps a tag name to its observed properties.
    tag_properties: dict[str, TagProperties] = {
        name: TagProperties(name) for name in _ORDER
    }

    elem: ET.Element
    for elem in kellia.body_element(kellia.COMPREHENSIVE).iter():
        if kellia.deprecated(elem):
            continue

        tag_properties[_name(elem.tag)].add_sample(elem)

    return tag_properties.values()


def main():
    summary: list[dict[str, Summary]] = [
        {tag.name: tag.summary()} for tag in _analyze()
    ]
    file.write(
        file.yaml_dump_all(summary).replace("\n---\n", "\n\n---\n"),
        _OUTPUT,
    )


if __name__ == "__main__":
    main()
