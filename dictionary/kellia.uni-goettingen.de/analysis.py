#!/usr/bin/env python3
# TODO: (#51) Read this file for inspiration:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py.
# TODO: There are some typos in the data. Fix at the origin.
import collections
import pathlib
import re

import bs4

import utils

_SCRIPT_DIR = pathlib.Path(__file__).parent
INPUT_XML = (
    _SCRIPT_DIR
    / "data"
    / "raw"
    / "v1.2"
    / "Comprehensive_Coptic_Lexicon-v1.2-2020.xml"
)
OUTPUT = _SCRIPT_DIR / "data" / "output" / "analysis.json"

MAX_LIST_LEN = 10
LIST_ELEMENT_CLOSING_QUOTE = re.compile(r'",\s+')
ORDER = [
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


def sort_children(children: list[str]) -> list[str]:
    name_to_idx = {name: idx for idx, name in enumerate(ORDER)}

    def key(name: str) -> int:
        return name_to_idx[name]

    return sorted(children, key=key)


def format_set(st: set) -> list:
    s = list(st)
    del st
    if len(s) > MAX_LIST_LEN:
        return [f"{len(s)} DISTINCT VALUES"] + s[: MAX_LIST_LEN - 2] + ["..."]
    return s


def prettify(d: dict) -> str:
    od = collections.OrderedDict()
    for k in ORDER:
        od[k] = d[k]
    assert set(d.keys()) == set(od.keys())
    del d
    out = utils.json_dumps(od)
    out = LIST_ELEMENT_CLOSING_QUOTE.sub('", ', out)
    return out


# TODO: Add statistics. Count the tags, attributes, children, attribute values,
# ... etc.
def analyze(soup: bs4.BeautifulSoup | bs4.Tag) -> str:
    all_tag_names = {
        tag.name for tag in soup.descendants if isinstance(tag, bs4.Tag)
    }

    tree: dict[str, dict[str, list[str]]] = {}
    for name in all_tag_names:
        attrs: dict[str, set[str]] = {}
        children = set()
        strings = set()
        for tag in soup.find_all(name):
            for key, value in tag.attrs.items():
                if key not in attrs:
                    attrs[key] = set()
                attrs[key].add(value)
            for c in tag.children:
                if isinstance(c, bs4.Tag):
                    children.add(c.name)
                elif isinstance(c, bs4.NavigableString):
                    c = str(c).strip()
                    if c:
                        strings.add(c)
                else:
                    raise ValueError(f"Unknown child type: {c}")
        tree[name] = {}
        if attrs:
            tree[name] = {k: format_set(v) for k, v in attrs.items()}
        if strings:
            tree[name]["STRINGS"] = format_set(strings)
        if children:
            tree[name]["CHILDREN"] = sort_children(list(children))
    return prettify(tree)


def main():
    with open(INPUT_XML) as f:
        soup = bs4.BeautifulSoup(f, "lxml-xml")
    # We only care about the body.
    assert soup.body
    analysis = analyze(soup.body)
    with open(OUTPUT, "w") as f:
        f.write(analysis)


if __name__ == "__main__":
    main()
