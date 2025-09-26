#!/usr/bin/env python3
"""Analyze the structure of the KELLIA dataset."""

import collections
import pathlib
import re
import typing
from collections import abc

import bs4

from utils import ensure, file, log

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
INPUT_XML: pathlib.Path = (
    _SCRIPT_DIR
    / "data"
    / "raw"
    / "v1.2"
    / "Comprehensive_Coptic_Lexicon-v1.2-2020.xml"
)
OUTPUT: pathlib.Path = _SCRIPT_DIR / "data" / "output" / "analysis.json"

MAX_LIST_LEN: int = 10
LIST_ELEMENT_CLOSING_QUOTE: re.Pattern[str] = re.compile(r'",\s+')
ORDER: list[str] = [
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
ORDER_DICT: dict[str, int] = {name: idx for idx, name in enumerate(ORDER)}


def format_set(s: abc.Iterable[str]) -> list[str]:
    s = sorted(s)  # Sort so the output will be deterministic.
    if len(s) > MAX_LIST_LEN:
        return [f"{len(s)} DISTINCT VALUES"] + s[: MAX_LIST_LEN - 2] + ["..."]
    return s


def prettify(d: dict[str, typing.Any]) -> str:
    od: collections.OrderedDict[str, typing.Any] = collections.OrderedDict()
    for k in ORDER:
        od[k] = d[k]
    ensure.equal_sets(d.keys(), od.keys())
    del d
    return LIST_ELEMENT_CLOSING_QUOTE.sub('", ', file.json_dumps(od))


# TODO: (#0) Add statistics. Count the tags, attributes, children, attribute
# values, ... etc.
def analyze(soup: bs4.BeautifulSoup | bs4.Tag) -> str:
    all_tag_names: set[str] = {
        tag.name for tag in soup.descendants if isinstance(tag, bs4.Tag)
    }

    # tag_properties maps a tag name to its observed properties.
    tag_properties: dict[str, dict[str, list[str]]] = {}
    for name in all_tag_names:
        # attrs maps an attribute name to a set of all observed attribute
        # values.
        attrs: dict[str, set[str]] = {}
        # children stores all observed names of child tags.
        children: set[str] = set()
        # strings stores all observed values of string children.
        strings: set[str] = set()
        tag: bs4.Tag
        for tag in soup.find_all(name):
            for key, value in tag.attrs.items():
                if key not in attrs:
                    attrs[key] = set()
                attrs[key].add(value)
            for c in tag.children:
                if isinstance(c, bs4.Tag):
                    children.add(c.name)
                    continue
                if isinstance(c, bs4.NavigableString):
                    s = str(c).strip()
                    if s:
                        strings.add(s)
                    del s
                    continue
                log.fatal("Unknown child type:", c)
        tag_properties[name] = {}
        if attrs:
            tag_properties[name] = {k: format_set(v) for k, v in attrs.items()}
        if strings:
            tag_properties[name]["STRINGS"] = format_set(strings)
        if children:
            tag_properties[name]["CHILDREN"] = sorted(
                children,
                key=ORDER_DICT.__getitem__,
            )
    return prettify(tag_properties)


def main():
    soup: bs4.BeautifulSoup = bs4.BeautifulSoup(
        file.read(INPUT_XML),
        "lxml-xml",
    )
    assert soup.body
    file.write(analyze(soup.body), OUTPUT)


if __name__ == "__main__":
    main()
