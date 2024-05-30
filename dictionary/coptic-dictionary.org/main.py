# TODO: Read this file for inspiration:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py.
import argparse
import json
import re

import bs4
import type_enforced

MAX_NUM_ATTR_VALUES = 10
LIST_ELEMENT_CLOSING_QUOTE = re.compile(r'",\s+')


PROPERTIES = {
    "def": {
        "xml:lang": ["de", "fr", "en"],
        "STRINGS": [
            "146 DISTINCT VALUES",
            "roter Turmalin",
            "iterrog. or condit.",
            "variété inconnue de plante",
            "...",
        ],
    },
    "entry": {
        "type": ["compound", "foreign", "hom"],
        "xml:id": ["11284 DISTINCT VALUES", "C10197", "C9097", "C8392", "..."],
        "change": ["#deprecated #v1.2"],
        "STRINGS": ["to be deleted?; no longer in DB"],
        "CHILDREN": ["gramGrp", "form", "etym", "note", "xr", "sense"],
    },
    "etym": {"CHILDREN": ["xr", "note", "ref"]},
    "gen": {"STRINGS": ["m.", "f."]},
    "xr": {"type": ["cf", "ant", "syn"], "CHILDREN": ["ref"]},
    "usg": {"type": ["geo"], "STRINGS": ["11 DISTINCT VALUES", "S", "Ak", "V", "..."]},
    "gram": {
        "type": [
            "collocPartikel",
            "collocConj",
            "collocAdv",
            "collocNoun",
            "collocPrep",
            "collocParticle",
        ],
        "STRINGS": ["107 DISTINCT VALUES", "ϩⲁϫⲛ-", "ⲛⲧⲛ-", "ⲉⲑⲏ", "..."],
    },
    "orth": {"STRINGS": ["15259 DISTINCT VALUES", "ⲥⲧⲁⲇⲓⲟⲛ", "ⲧⲱⲃⲉ", "ⲟⲩⲁ-", "..."]},
    "cit": {
        "type": ["example", "translation"],
        "CHILDREN": ["def", "bibl", "note", "quote"],
    },
    "note": {
        "xml:lang": ["de", "fr", "en"],
        "STRINGS": [
            "405 DISTINCT VALUES",
            "zumeist mit folgender Kardinalzahl",
            "conjuguè à une négation",
            "Briefe",
            "...",
        ],
    },
    "bibl": {
        "STRINGS": [
            "6416 DISTINCT VALUES",
            "CD 480b",
            "CD 374a; CED 169; KoptHWb 193, 539; DELC 194-195",
            "CDC 9a; KoptHWb 496; ONB II 687",
            "...",
        ]
    },
    "pos": {
        "STRINGS": [
            "34 DISTINCT VALUES",
            "unbestimmter Artikel",
            "Interjektion",
            "Nominalpräfix",
            "...",
        ]
    },
    "superEntry": {"CHILDREN": ["entry"]},
    "number": {"STRINGS": ["sg.", "pl."]},
    "ref": {
        "target": ["677 DISTINCT VALUES", "#ϩⲙⲟⲟⲥ", "#ⲱϩⲉ", "#ⲕⲱⲕ ⲁϩⲏⲩ", "..."],
        "type": [
            "coptic_usage::cu_ID",
            "WCNae",
            "greek_lemma::grl_ID",
            "Greek",
            "greek_lemma::grl_ref",
            "greek_lemma::grl_meaning",
            "greek_lemma::grl_lemma",
            "greek_lemma::grl_pos",
            "WCNde",
        ],
        "xml:lang": ["grc"],
        "STRINGS": ["17117 DISTINCT VALUES", "δευτερονόμος", "1642", "περιχρίω", "..."],
    },
    "gramGrp": {
        "STRINGS": [
            '<gram type="pos">Possessivartikel</gram>\n         <gram type="gen">f.</gram>\n         <gram type="number">sg.</gram>\n         <gram type="person[psor]">1.</gram>\n         <gram type="number[psor]">sg.</gram>',
            '<gram type="pos">Possessivartikel</gram>\n          <gram type="gen">m.</gram>\n          <gram type="number">sg.</gram>\n          <gram type="person[psor]">2.</gram>\n          <gram type="gen[psor]">f.</gram>\n          <gram type="number[psor]">sg.</gram>',
            '<gram type="pos">Possessivartikel</gram>\n          <gram type="number">pl.</gram>\n          <gram type="person[psor]">2.</gram>\n          <gram type="gen[psor]">f.</gram>\n          <gram type="number[psor]">sg.</gram>',
            '<gram type="pos">Possessivartikel</gram>\n          <gram type="number">pl.</gram>\n          <gram type="person[psor]">1.</gram>\n          <gram type="number[psor]">sg.</gram>',
            '-\n          <gram type="pos">Possessivartikel</gram>\n          <gram type="gen">f.</gram>\n          <gram type="number">sg.</gram>\n          <gram type="person[psor]">2.</gram>\n          <gram type="gen[psor]">f.</gram>\n          <gram type="number[psor]">sg.</gram>',
            '<gram type="pos">Possessivartikel</gram>\n          <gram type="gen">m.</gram>\n          <gram type="number">sg.</gram>\n          <gram type="person[psor]">1.</gram>\n          <gram type="number[psor]">sg.</gram>',
        ],
        "CHILDREN": ["subc", "number", "note", "gen", "gram", "pos"],
    },
    "subc": {
        "STRINGS": [
            "55 DISTINCT VALUES",
            "zur Bildung von Ortsangaben",
            "Umstandsatzkonverter",
            "Konjunktiv ⲛ(ⲧⲉ)-",
            "...",
        ]
    },
    "oRef": {
        "STRINGS": ["65 DISTINCT VALUES", "ⲣ ⲡ ⲣⲱϣⲉ", "ⲣ ⲡ ⲕⲉ-", "ϭⲙ ⲡ ⲟⲩⲱ", "..."]
    },
    "form": {
        "type": ["lemma", "compound", "inflected"],
        "xml:id": ["32230 DISTINCT VALUES", "CF23974", "CF19823", "CF4356", "..."],
        "change": ["#added #v1.2", "#deprecated #v1.2"],
        "corresp": ["762 DISTINCT VALUES", "CF13062", "CF15733", "CF14313", "..."],
        "STRINGS": ["ⲓ", "ⲣⲧϭⲟⲧ", "ⲙⲉⲧϩⲟⲩⲟ"],
        "CHILDREN": ["orth", "gramGrp", "oRef", "note", "usg"],
    },
    "sense": {
        "xml:id": ["15923 DISTINCT VALUES", "CS11973", "CS10964", "CS11952", "..."],
        "CHILDREN": ["ref", "xr", "note", "cit"],
    },
    "quote": {
        "xml:lang": ["de", "fr", "en"],
        "STRINGS": [
            "28320 DISTINCT VALUES",
            "freundlich, höflich sein, werden",
            "coup (sans doute un coup qui rend sourd)",
            "wachsen lassen, hervorbringen",
            "...",
        ],
    },
}


argparser = argparse.ArgumentParser(description="Process the Coptic Lexicon.")

argparser.add_argument(
    "--input",
    type=str,
    default="v1.2/Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
    help="Path to the input XML file.",
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
def analyze(soup: bs4.BeautifulSoup | bs4.Tag) -> None:
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
    print(prettify(tree))


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

    analyze(soup)


if __name__ == "__main__":
    main()
