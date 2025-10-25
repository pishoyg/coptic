#!/usr/bin/env python3
"""Analyze the structure of the KELLIA dataset."""

import pathlib
import typing
from collections import abc, defaultdict

import bs4

from utils import ensure, file, log

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_INPUT_XML: pathlib.Path = (
    _SCRIPT_DIR
    / "data"
    / "raw"
    / "v1.2"
    / "Comprehensive_Coptic_Lexicon-v1.2-2020.xml"
)
_OUTPUT: pathlib.Path = _SCRIPT_DIR / "data" / "output" / "analysis.yaml"

_MAX_LIST_LEN: int = 10
_ORDER: list[str] = [
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
        # strings stores all observed values of string children.
        self.strings: set[str] = set()

    def summary(self) -> Summary:
        props: dict[str, Sample | list[str]] = {
            k: _sample(v) for k, v in self.attrs.items()
        }
        if self.strings:
            assert "STRINGS" not in props
            props["STRINGS"] = _sample(self.strings)
        if self.children:
            # Always include all children.
            assert "CHILDREN" not in props
            props["CHILDREN"] = sorted(
                self.children,
                key=lambda x: _ORDER_DICT[x],
            )
        return props


# TODO: (#0) Add statistics. Count the tags, attributes, children, attribute
# values, ... etc.
def _analyze(soup: bs4.BeautifulSoup | bs4.Tag) -> abc.Iterable[TagProperties]:
    # tags maps a tag name to its observed properties.
    tag_properties: dict[str, TagProperties] = {
        name: TagProperties(name) for name in _ORDER
    }

    tag: bs4.Tag
    for tag in soup.find_all():
        ensure.ensure(tag.name in tag_properties, "unknown child:", tag.name)
        props: TagProperties = tag_properties[tag.name]

        for key, value in tag.attrs.items():
            props.attrs[str(key)].add(value)

        for child in tag.children:
            if isinstance(child, bs4.Tag):
                props.children.add(child.name)
                continue

            if isinstance(child, bs4.NavigableString):
                s = str(child).strip()
                if s:
                    props.strings.add(s)
                continue

            log.fatal(f"Unknown child type: {type(child)} under <{tag.name}>")

    return tag_properties.values()


def main():
    soup: bs4.BeautifulSoup = bs4.BeautifulSoup(
        file.read(_INPUT_XML),
        "lxml-xml",
    )
    assert soup.body
    summary: list[dict[str, Summary]] = [
        {tag.name: tag.summary()} for tag in _analyze(soup.body)
    ]
    file.write(file.yaml_dump_all(summary), _OUTPUT)


if __name__ == "__main__":
    main()
