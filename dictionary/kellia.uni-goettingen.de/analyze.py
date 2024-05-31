# TODO: Read this file for inspiration:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py.
import argparse
import json
import re

import bs4
import type_enforced

MAX_NUM_ATTR_VALUES = 10
LIST_ELEMENT_CLOSING_QUOTE = re.compile(r'",\s+')


argparser = argparse.ArgumentParser(description="Process the Coptic Lexicon.")

argparser.add_argument(
    "--input",
    type=str,
    default="dictionary/kellia.uni-goettingen.de/data/v1.2/Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
    help="Path to the input XML file.",
)

argparser.add_argument(
    "--output",
    type=str,
    default="dictionary/kellia.uni-goettingen.de/analysis.json",
    help="Path to the output JSON.",
)

args = argparser.parse_args()


def format_set(s: set) -> dict:
    s = list(s)
    if len(s) > MAX_NUM_ATTR_VALUES:
        return [f"{len(s)} DISTINCT VALUES"] + s[:3] + ["..."]
    return s


@type_enforced.Enforcer
def prettify(d: dict) -> str:
    out = json.dumps(d, indent=2, ensure_ascii=False).encode("utf8").decode()
    out = LIST_ELEMENT_CLOSING_QUOTE.sub('", ', out)
    return out
    # TODO: Try to return the output with the keys in the following order:
    # [
    #     "superEntry", "entry", "form", "sense", "note", "etym", "gramGrp", "xr",
    #     "cit", "gram", "def", "quote", "ref", "usg", "subc", "gen", "pos",
    #     "number", "oRef", "orth", "bibl",
    # ]


@type_enforced.Enforcer
def analyze(soup: bs4.BeautifulSoup | bs4.Tag) -> str:
    all_tag_names = {tag.name for tag in soup.descendants if isinstance(tag, bs4.Tag)}

    tree = {}
    for name in all_tag_names:
        attrs = dict()
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
            tree[name]["CHILDREN"] = list(children)
    return prettify(tree)


@type_enforced.Enforcer
def main():
    with open(args.input) as f:
        soup = bs4.BeautifulSoup(f, "lxml-xml")
    # We only care about the body.
    soup = soup.body
    assert soup

    analysis = analyze(soup)
    with open(args.output, "w") as f:
        f.write(analysis)


if __name__ == "__main__":
    main()
