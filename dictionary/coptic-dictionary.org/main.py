# TODO: Read this file for inspiration:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py.
import argparse
import pprint

import bs4
import type_enforced

PROPERTIES = {
    "superEntry": {
        "children": {"entry"},
    },
    "entry": {
        "attrs": {"xml:id", "type", "change"},
        "children": {"etym", "note", "sense", "form", "gramGrp", "xr"},
    },
    "form": {
        "attrs": {"corresp", "xml:id", "type", "change"},
        "children": {"orth", "oRef", "usg", "note", "gramGrp"},
    },
    "sense": {
        "attrs": {"xml:id"},
        "children": {"note", "ref", "cit", "xr"},
    },
    "note": {
        "attrs": {"xml:lang"},
    },
    "etym": {
        "children": {"note", "xr", "ref"},
    },
    "gramGrp": {
        "children": {"gram", "subc", "gen", "pos", "note", "number"},
    },
    "xr": {
        "attrs": {"type"},
        "children": {"ref"},
    },
    "cit": {
        "attrs": {"type"},
        "children": {"def", "bibl", "quote", "note"},
    },
    "gram": {
        "attrs": {"type"},
    },
    "def": {
        "attrs": {"xml:lang"},
    },
    "quote": {
        "attrs": {"xml:lang"},
    },
    "ref": {
        "attrs": {"target", "xml:lang", "type"},
    },
    "usg": {
        "attrs": {"type"},
    },
    "subc": {},
    "gen": {},
    "pos": {},
    "number": {},
    "oRef": {},
    "orth": {},
    "bibl": {},
}

argparser = argparse.ArgumentParser(description="Process the Coptic Lexicon.")

argparser.add_argument(
    "--input",
    type=str,
    default="v1.2/Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
    help="Path to the input XML file.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def analyze(soup: bs4.BeautifulSoup | bs4.Tag) -> None:
    all_tag_names = {tag.name for tag in soup.descendants if isinstance(tag, bs4.Tag)}

    tree = {}
    for name in all_tag_names:
        attrs = set()
        children = set()
        for tag in soup.find_all(name):
            attrs.update(tag.attrs.keys())
            children.update(c.name for c in tag.children if isinstance(c, bs4.Tag))
        tree[name] = {}
        if attrs:
            tree[name]["attrs"] = attrs
        if children:
            tree[name]["children"] = children
    pprint.pprint(tree)


@type_enforced.Enforcer
def main():
    with open(args.input) as f:
        soup = bs4.BeautifulSoup(f, "lxml-xml")
    # We only care about the body.
    soup = soup.body
    assert soup
    for child in soup.children:
        if isinstance(child, bs4.NavigableString):
            assert not str(child).strip()
            continue
        assert isinstance(child, bs4.Tag)
        assert child.name in ["entry", "superEntry"], child


if __name__ == "__main__":
    main()
