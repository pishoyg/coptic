# TODO: Read this file for inspiration:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py.
import argparse

import bs4
import type_enforced

ENTRY_ATTRS = {"xml:id", "change", "type"}
ENTRY_CHILDREN = {"gramGrp", "etym", "sense", "note", "xr", "form"}

FORM_ATTRS = {"type", "xml:id", "change", "corresp"}
FORM_CHILDREN = {"usg", "oRef", "note", "orth", "gramGrp"}

GRAMGRP_ATTRS = set()
GRAMGRP_CHILDREN = {"pos", "number", "subc", "gram", "gen", "note"}

ETYM_ATTRS = set()
ETYM_CHILDREN = {"note", "xr", "ref"}

SENSE_ATTRS = {"xml:id"}
SENSE_CHILDREN = {"note", "cit", "xr", "ref"}

NOTE_ATTRS = {"xml:lang"}
NOTE_CHILDREN = set()

XR_ATTRS = {"type"}
XR_CHILDREN = {"ref"}

GRAM_ATTRS = {"type"}
GRAM_CHILDREN = set()

ORTH_ATTRS = set()
ORTH_CHILDREN = set()

REF_ATTRS = {"target", "type", "xml:lang"}
REF_CHILDREN = set()

OREF_ATTRS = set()
OREF_CHILDREN = set()

NUMBER_ATTRS = set()
NUMBER_CHILDREN = set()

SUBC_ATTRS = set()
SUBC_CHILDREN = set()

POS_ATTRS = set()
POS_CHILDREN = set()

USG_ATTRS = {"type"}
USG_CHILDREN = set()

GEN_ATTRS = set()
GEN_CHILDREN = set()

CIT_ATTRS = {"type"}
CIT_CHILDREN = {"def", "quote", "note", "bibl"}

QUOTE_ATTRS = {"xml:lang"}
QUOTE_CHILDREN = set()

DEF_ATTRS = {"xml:lang"}
DEF_CHILDREN = set()

BIBL_ATTRS = set()
BIBL_CHILDREN = set()

argparser = argparse.ArgumentParser(description="Process the Coptic Lexicon.")

argparser.add_argument(
    "--input",
    type=str,
    default="v1.2/Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
    help="Path to the input XML file.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def analyze(soup: bs4.BeautifulSoup | bs4.Tag, tag_name: str) -> None:
    attrs = set()
    children = set()
    for tag in soup.find_all(tag_name):
        attrs.update(tag.attrs.keys())
        children.update(c.name for c in tag.children if isinstance(c, bs4.Tag))
    print(f"{tag_name.upper()}_ATTRS = {attrs}")
    print(f"{tag_name.upper()}_CHILDREN = {children}")


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
