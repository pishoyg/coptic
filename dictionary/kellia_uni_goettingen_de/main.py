#!/usr/bin/env python3
"""Process KELLIA's dictionary.

The data is retrieved from:
    https://refubium.fu-berlin.de/handle/fub188/27813

This file was forked from:
    https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py
The original file was snapshotted on 2024.06.01.
Edits made to the original file beyond that data should be incorporated.
View history at:
    https://github.com/KELLIA/dictionary/commits/master/utils/dictionary_reader.py

"""


# TODO: (#305) There are some typos in the data. Fix at the origin.

import glob
import os
import pathlib
import re
import typing
import xml.etree.ElementTree as ET
from collections import OrderedDict, abc, defaultdict

import pandas as pd

from utils import log

_SCRIPT_DIR = pathlib.Path(__file__).parent
_V_1_2_DIR = _SCRIPT_DIR / "data" / "raw" / "v1.2"
_CLEAN = set("ⲁⲃⲅⲇⲉⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣϥⳉϧϩϫϭϯ ")
_CRUM_RE = re.compile(r"\b(CD ([0-9]+[ab]?)-?[0-9]*[ab]?)\b")
_CRUM_PAGE = "https://coptot.manuscriptroom.com/crum-coptic-dictionary?pageID="
_SENSE_CHILDREN = ["quote", "definition", "bibl", "ref", "xr"]
_LANGS = ["de", "en", "fr", "MERGED"]

_GEO_MAPPING: dict[str, str] = {
    "?": "U",
    "Ak": "O",
}

# pylint: disable=line-too-long
_SOURCES: list[tuple[str, str]] = [
    (
        r"(Kasser )?CDC",
        r"R. Kasser, Compléments au dictionnaire copte de Crum, Kairo: Inst. Français d'Archéologie Orientale, 1964",
    ),
    (r"KoptHWb", r"Koptisches Handw&ouml;rterbuch /\nW. Westendorf"),
    (
        r"CED",
        r"J. Černý, Coptic Etymological Dictionary, Cambridge: Cambridge Univ. Press, 1976",
    ),
    (
        r"DELC",
        r"W. Vycichl, Dictionnaire étymologique de la langue copte, Leuven: Peeters, 1983",
    ),
    (
        r"ChLCS",
        r"P. Cherix, Lexique Copte (dialecte sahidique), Copticherix, 2006-2018",
    ),
    (
        r"ONB",
        r"T. Orlandi, Koptische Papyri theologischen Inhalts (Mitteilungen aus der Papyrussammlung der Österreichischen Nationalbibliothek (Papyrus Erzherzog Rainer) / Neue Serie, 9), Wien: Hollinek, 1974",
    ),
    (
        r"WbGWKDT",
        r"H. Förster, Wörterbuch der griechischen Wörter in den koptischen dokumentarischen Texten. Berlin/Boston: de Gruyter, 2002",
    ),
    (
        r"LCG",
        r"B. Layton, A Coptic grammar: with a chrestomathy and glossary; Sahidic dialect, Wiesbaden: Harrassowitz, 2000",
    ),
    (
        r"Till D\.?",
        r"W. Till, Koptische Dialektgrammatik: mit Lesestücken und Wörterbuch, München: Beck, 1961",
    ),
    (
        r"Osing, Pap. Ox.",
        r"J. Osing: Der spätägyptische Papyrus BM 10808, Harrassowitz, Wiesbaden 1976",
    ),
    (
        r"Bauer",
        r"W. Bauer, K. Aland, B. Aland, Griechisch-deutsches Wörterbuch zu den Schriften des Neuen Testaments und der frühchristlichen Literatur, Berlin: de Gruyter, 1988",
    ),
    (
        r"BDAG",
        r"F.W. Danker, W. Bauer, A Greek-English Lexicon of the New Testament and other Early Christian Literature, Chicago/London: University of Chicago Press, 2000",
    ),
    (
        r"Daris 1991",
        r"S. Daris, Il lessico Latino nel Greco d'Egitto (Estudis de Papirologia i Filologia Biblica 2), Barcelona: Ediciones Aldecoa, 1991",
    ),
    (
        r"Denniston 1959",
        r"J.D. Denniston, The Greek Particles, London: Clarendon Press, 1959",
    ),
    (
        r"du Cange",
        r"C. F. du Cange, Glossarium ad scriptores mediae et infimae Graecitatis I-II, Graz: Akademische Druck- und Verlagsanstalt, 1958",
    ),
    (
        r"Hatch/Redpath 1906",
        r"E. Hatch, H.A. Redpath, A concordance to the Septuagint and the other Greek versions of the Old Testament (including the apocryphal books), Supplement, Graz: Akademische Druck- und Verlagsanstalt, 1906",
    ),
    (
        r"Kontopoulos",
        r"N. Kontopoulos, A Lexicon of Modern Greek-English and English-Modern Greek, Smyrna/London: B. Tatikidos, Trübner & Co., 1868",
    ),
    (
        r"Lampe",
        r"G.W.H. Lampe, A patristic Greek lexicon, Oxford: Clarendon Press, 1978",
    ),
    (
        r"LBG",
        r"E. Trapp, Lexikon zur byzantinischen Gräzität, besonderes des 9.-12. Jahrhunderts, Philosophisch-historische Klasse, Denkschriften (Veröffentlichungen der Kommission für Byzantinistik 238; VI/1-4) , Wien: Österreichische Akademie der Wissenschaften, 2001",
    ),
    (
        r"LSJ",
        r"H.G. Liddell, R. Scott, H.S. Jones, A Greek-English lexicon, Oxford: Clarendon Press, 1968",
    ),
    (
        r"LSJ Suppl\.",
        r"H.G. Liddell, R. Scott, H.S. Jones, E.A. Barber, A Greek-English lexicon/Supplement, Oxford: Clarendon Press, 1968",
    ),
    (
        r"Muraoka 2009",
        r"T. Muraoka, A Greek-English Lexicon of the Septuagint, Louvain/Paris/Walpole: Peeters, 2009",
    ),
    (
        r"Passow",
        r"F. Passow, V.C.F Rost, F. Palm, Handwörterbuch der griechischen Sprache, Leipzig: Vogel, 1841",
    ),
    (
        r"Preisigke",
        r"F. Preisigke, Wörterbuch der griechischen Papyrusurkunden mit Einschluß der griechischen Inschriften, Aufschriften, Ostraka, Mumienschilder usw. aus Ägypten, Berlin: Selbstverlag der Erben, 1925-1931",
    ),
    (
        r"Sophocles",
        r"E.A. Sophocles, Greek Lexicon of the Roman and Byzantine Periods (From B. C. 146 to A. D. 1100. Memorial Edition), Cambridge/Leipzig: Harvard University Press/Harrassowitz, 1914",
    ),
    (
        r"T. S. Richter 2014b",
        r"T.S. Richter, Neue koptische medizinische Rezepte (Zeitschrift für Ägyptische Sprache und Altertumskunde ZÄS 141(2), 154-194), 2014",
    ),
    (
        r"Till 1951a",
        r"W.C. Till, Arzneikunde der Kopten, Berlin: Akademie Verlag, 1951",
    ),
    (
        r"TLG",
        r"L. Berkowitz, K.A. Squitier, Thesaurus Linguae Graecae (Canon of Greek Authors and Works), New York/Oxford: University Press, 1990",
    ),
]
# pylint: enable=line-too-long

# TODO: (#51) Support entity types.
_PUB_CORPORA = None

_entity_types: defaultdict[str, set[str]] = defaultdict(set)


def _add_crum_links(ref_bibl: str) -> str:
    return _CRUM_RE.sub(rf'<a href="{_CRUM_PAGE}\2">\1</a>', ref_bibl)


def _compress(text: str | None) -> str:
    assert text is not None
    return " ".join(text.split())


def _clean(text: str) -> str:
    text = "".join(c for c in text if c in _CLEAN)
    return _compress(text)


def _cdo(entry_xml_id: str) -> str:
    return f"https://coptic-dictionary.org/entry.cgi?tla={entry_xml_id}"


class _Reformat:
    """_Reformat represents an object that offers alternative formats."""

    def __init__(self):
        self.amir: str = ""

    def pishoy(self) -> str | list[str]:
        raise NotImplementedError()


class _Line:
    """Line represents a single word spelling."""

    def __init__(self, gram_grp: str, orth: str, geo: str, form_id: str):
        self._gram_grp: str = gram_grp
        self._orth: str = orth
        self._geo: str = _GEO_MAPPING.get(geo, geo)
        self._form_id: str = form_id

    def pishoy_tr(self) -> str:
        pairs: list[tuple[str, str]] = [
            (f"orth spelling {self._geo}", self._orth),
            (f"geo dialect {self._geo}", self._geo),
            (f"gram_grp type {self._geo}", self._gram_grp),
        ]
        content = map(
            lambda pair: f'<td class="{pair[0]}">{pair[1]}</td>',
            pairs,
        )
        return f'<tr class="word {self._geo}">' + "".join(content) + "</tr>"


class _OrthString(_Reformat):
    """A word, having a grammatical group, and several spellings."""

    def __init__(self):
        super().__init__()
        self._pishoy: list[_Line] = []
        self._last_gram_grp: str = ""

    # For each entry, you add one grammar group, then several orth's per form.
    def add_gram_grp(self, gram_grp: ET.Element) -> None:
        gram_string = " ".join(_compress(child.text) for child in gram_grp)
        self._last_gram_grp = gram_string
        self.amir += gram_string + "\n"

    def add_orth_geo_id(
        self,
        orth_text: str,
        geos: list[str],
        form_id: str,
    ) -> None:
        if not geos:
            geos = ["S"]
        for g in geos:
            self._pishoy.append(
                _Line(self._last_gram_grp, orth_text, g, form_id),
            )
        geos = [g + "^^" + form_id for g in geos]
        for g in geos:
            self.amir += orth_text + "~" + g + "\n"

    @typing.override
    def pishoy(self):
        out: list[str] = []
        out.append('<table id="orths">')
        for line in self._pishoy:
            out.append(line.pishoy_tr())
        out.append("</table>")
        return "".join(out)


class EtymString(_Reformat):
    """EtymString represents the etymology string of a word."""

    def __init__(self, etym: ET.Element | None, xrs: list[ET.Element]) -> None:
        super().__init__()
        self._greek_id: str = ""
        if etym is not None:
            greek_dict: OrderedDict[str, str | None] = OrderedDict()
            for child in etym:
                if child.tag == "{http://www.tei-c.org/ns/1.0}note":
                    self.amir += _compress(child.text)
                elif child.tag == "{http://www.tei-c.org/ns/1.0}ref":
                    if "type" in child.attrib and "target" in child.attrib:
                        assert child.attrib["type"]
                        assert child.attrib["target"]
                        self.amir += (
                            child.attrib["type"]
                            + ": "
                            + child.attrib["target"]
                            + " "
                        )
                    elif "targetLang" in child.attrib:
                        assert child.attrib["targetLang"]
                        assert child.text
                        self.amir += (
                            child.attrib["targetLang"]
                            + ": "
                            + child.text
                            + " "
                        )
                    elif "type" in child.attrib:
                        if "greek" in child.attrib["type"]:
                            greek_dict[child.attrib["type"]] = child.text
                elif child.tag == "{http://www.tei-c.org/ns/1.0}xr":
                    for ref in child:
                        assert child.attrib["type"]
                        assert ref.attrib["target"]
                        assert ref.text
                        self.amir += (
                            child.attrib["type"]
                            + ". "
                            + ref.attrib["target"]
                            + "# "
                            + ref.text
                            + " "
                        )
            if len(greek_dict) > 0:
                greek_parts: list[str] = []
                for key, val in sorted(greek_dict.items()):
                    if val is None:
                        greek_parts = []
                        break
                    val = val.strip()
                    if "grl_ID" in key:
                        self._greek_id = val
                    if "grl_lemma" in key:
                        part = '<span style="color:darkred">cf. Gr.'
                        if self._greek_id != "":
                            part += " (DDGLC lemma ID " + self._greek_id + ")"
                        part += "</span> " + val
                        greek_parts.append(part)
                    elif "meaning" in key:
                        greek_parts.append("<i>" + val + "</i>.")
                    elif "_pos" in key and len(val) > 0:
                        greek_parts.append(
                            '<span style="color:grey">' + val + "</span>",
                        )
                    elif "grl_ref" in key:
                        greek_parts.append(
                            '<span style="color:grey">(' + val + ")</span>",
                        )
                self.amir += " ".join(greek_parts)

        for xr in xrs:
            for ref in xr:
                ref_target = _clean(ref.attrib["target"])
                assert xr.attrib["type"]
                assert ref_target
                assert ref.text
                self.amir += (
                    xr.attrib["type"]
                    + ". "
                    + "#"
                    + ref_target
                    + "# "
                    + ref.text
                    + " "
                )

    def greek_id(self):
        return self._greek_id

    def process(self):
        etym = self.amir
        xrs: list[str] = re.findall(r" #(.*?)#", etym)
        for xr in xrs:
            word = xr
            link: str = (
                '<a href="https://coptic-dictionary.org/results.cgi?coptic='
                + word
                + '">'
                + word
                + "</a>"
            )
            word = re.sub(r"\(", "\\(", word)
            word = re.sub(r"\)", "\\)", word)
            etym = re.sub(r"#" + word + "#", link, etym)
        if "cf. Gr." in etym:
            etym = _link_greek(etym)
        etym = _gloss_bibl(etym)
        etym = _compress(etym)
        if not etym:
            return ""
        return '<span class="etym">\n\t' + etym + "\n</span>"


class _Sense:
    """_Sense represents a meaning of a word."""

    def __init__(self, sense_n: int, sense_id: str) -> None:
        self._sense_n: int = sense_n
        self._sense_id: str = sense_id
        self._content: list[tuple[str, str]] = []

    def extend_quotes(self, quotes: list[str]) -> None:
        for q in quotes:
            self._content.append(("quote", q))

    def add(self, name: str, value: str):
        assert name in _SENSE_CHILDREN or (not name and not value)
        self._content.append((name, value))

    def add_definition(self, definition: str):
        self.add("definition", definition)

    def add_bibl(self, bibl: str):
        self.add("bibl", bibl)

    def add_ref(self, ref: str):
        self.add("ref", ref)

    def add_xr(self, xr: str):
        self.add("xr", xr)

    def format(self, tag_name: str, tag_text: str) -> str:
        if not tag_name and not tag_text:
            return ""
        fmt = '<span class="{id}">{text}</span>'
        if tag_name == "bibl":
            split = tag_text.split("; ")
            split = [s.strip() for s in split]
            split = list(filter(None, split))
            tag_text = "\n".join(split)
            tag_text = _add_crum_links(tag_text)
            return tag_text
        return fmt.format(id=tag_name, text=tag_text)

    def identify(self) -> tuple[int, str]:
        return (self._sense_n, self._sense_id)

    def pishoy(self) -> str:
        out = "".join(self._pishoy_aux())
        while "\n\n\n" in out:
            out = out.replace("\n\n\n", "\n\n")
        return out

    def _pishoy_aux(self) -> abc.Generator[str]:
        yield f"<!--sense_number:{self._sense_n}, sense_id:{self._sense_id}-->"
        yield "<tr>"
        yield '<td class="meaning">'
        yield "\n".join(
            self.format(*pair) for pair in self.subset("quote", "definition")
        )
        yield "</td>"
        yield '<td class="bibl">'
        yield "\n".join(self.format(*pair) for pair in self.subset("bibl"))
        yield "</td>"
        yield "</tr>"
        ref_xr = self.subset("ref", "xr")
        if ref_xr:
            yield "<tr>"
            yield '<td class="ref_xr" colspan="2">'
            yield "\n".join(self.format(*pair) for pair in ref_xr)
            yield "</td>"
            yield "</tr>"

    def subset(self, *names: str) -> list[tuple[str, str]]:
        assert all(n in _SENSE_CHILDREN for n in names), names
        return [pair for pair in self._content if pair[0] in names]

    def explain(self, prefix: str = ""):
        explanation = self.subset("quote", "definition")
        if not explanation:
            return explanation
        if prefix:
            explanation[0] = (explanation[0][0], prefix + explanation[0][1])
        return explanation

    def give_references(self):
        return self.subset("bibl", "ref", "xr")


class _Quote(_Reformat):
    """_Quote represents a quote."""

    def __init__(self):
        super().__init__()
        self.reset()
        self._pishoy: list[str] = []

    def add_quote(self, quote: ET.Element) -> None:
        text: str = _compress(quote.text)
        self.amir += text
        self._pishoy.append(text)

    def reset(self) -> None:
        self.amir: str = "~~~"
        self._pishoy = []

    def no_definitions(self) -> None:
        self.amir += ";;;"

    def yes_definitions(self) -> None:
        self.amir += "; "

    @typing.override
    def pishoy(self) -> list[str]:
        return self._pishoy


class _Lang(_Reformat):
    """_Lang represents the definition in one language."""

    def __init__(self, name: str):
        super().__init__()
        assert name in _LANGS
        self._name: str = name
        self._pishoy: list[_Sense] = []

    def add_sense(self, sense_n: int, sense_id: str):
        self.amir += str(sense_n) + "@" + sense_id + "|"
        self._pishoy.append(_Sense(sense_n, sense_id))

    def _last_sense(self) -> _Sense:
        return self._pishoy[-1]

    def add_quote(self, quote: _Quote) -> None:
        self.amir += quote.amir
        self._last_sense().extend_quotes(quote.pishoy())

    def add_definition(self, definition: ET.Element) -> None:
        self._last_sense().add_definition(_compress(definition.text))
        if self.amir.endswith("|"):
            self.amir += "~~~"
        definition_text = _compress(definition.text) + ";;;"
        self.amir += definition_text

    def add_bibl(self, bibl: ET.Element | None) -> None:
        if bibl is None:
            return
        if not bibl.text:
            return
        self.amir += bibl.text + " "
        self._last_sense().add_bibl(bibl.text)

    def add_ref(self, ref: ET.Element):
        assert ref.text
        self._last_sense().add_ref(ref.text)
        self.amir += "ref: " + ref.text + " "

    def add_xr(self, xr: ET.Element):
        for ref in xr:
            assert ref.text
            text = xr.tag[29:] + ". " + ref.attrib["target"] + "# " + ref.text
            self.amir += text + " "
            self._last_sense().add_xr(text)

    def finalize(self):
        self.amir: str = _compress(self.amir)

    def add(self, name: str, value: str):
        self._last_sense().add(name, value)

    @typing.override
    def pishoy(self):
        out: list[str] = []
        out.extend(
            [
                '<table id="senses">',
                "<colgroup>",
                "<col>",
                "<col>",
                "</colgroup>",
            ],
        )
        out.extend(sense.pishoy() for sense in self._pishoy)
        out.append("</table>")
        return "".join(out)

    def senses(self) -> list[_Sense]:
        return self._pishoy


def _merge_langs(de: _Lang, en: _Lang, fr: _Lang):
    merged = _Lang("MERGED")
    assert len(de.senses()) == len(en.senses()) == len(fr.senses())
    for de_s, en_s, fr_s in zip(de.senses(), en.senses(), fr.senses()):
        assert de_s.identify() == en_s.identify() == fr_s.identify()
        merged.add_sense(*de_s.identify())
        for row in en_s.explain('<span class="lang">(En.) </span>'):
            merged.add(*row)
        merged.add("", "")
        for row in de_s.explain('<span class="lang">(De.) </span>'):
            merged.add(*row)
        merged.add("", "")
        for row in fr_s.explain('<span class="lang">(Fr.) </span>'):
            merged.add(*row)
        merged.add("", "")
        for row in de_s.give_references():
            merged.add(*row)
    return merged


def _gloss_bibl(ref_bibl: str) -> str:
    """Adds tooltips to lexical resource names.

    Args:
        ref_bibl: Bibliography, containing abbreviations of books. Hints will be
            added to each abbreviation, showing the full title.

    Returns:
        The HTML of the bibliography, with hints added.

    """
    page_expression = r"(?: §)? ?[0-9A-Za-z:]+(, ?[0-9A-Za-z:]+)*"
    template = '<a class="hint" data-tooltip="**src**">?</a>'

    for find, rep in _SOURCES:
        ref_bibl = re.sub(
            "(" + find + page_expression + ")",
            r"\1" + template.replace("**src**", rep),
            ref_bibl,
        )

    ref_bibl = re.sub("DDGLC ref:", "DDGLC Usage ID:", ref_bibl)

    return ref_bibl


def _link_greek(etym: str):
    m = re.search(r"cf\. Gr\.[^<>]+</span>([^<>]+)<i>", etym)
    if m is None:
        return etym
    word = m.group(1).strip()
    href = "https://www.billmounce.com/search/node/{greek}%20type%3Alexicon"

    # Convert polytonic Greek to beta-code using perseids-tools/beta-code-py
    # conversion table.
    link = f' <a href="{href}">{word};</a>'
    linked = re.sub(
        r"(cf\. Gr\.[^<>]*</span>)[^<>]+(<i>)",
        r"\1" + link + r"\2",
        etym,
    )

    return linked


def _order_forms(formlist: list[ET.Element]) -> list[ET.Element]:
    temp: list[tuple[str, str, ET.Element]] = []
    for form in formlist:
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        text = ""
        dialect = ""
        for orth in orths:
            assert orth.text
            text = orth.text.replace("⸗", "--")  # Sort angle dash after hyphen
            geo = form.find("{http://www.tei-c.org/ns/1.0}usg")
            if geo is not None:
                assert geo.text
                dialect = geo.text.replace("Ak", "K")
                if dialect != "S":
                    dialect = "_" + dialect  # Sahidic always first

        temp.append((text, dialect, form))

    output: list[ET.Element] = []
    for _, _, f in sorted(temp, key=lambda x: (x[0], x[1])):
        output.append(f)

    return output


def _get(attr: str, line: str) -> str:
    s = re.search(" " + attr + r'="([^"]*)"', line)
    assert s
    return s.group(1)


def _get_entity_types(pub_corpora_dir: str) -> defaultdict[str, set[str]]:
    if not pub_corpora_dir.endswith(os.sep):
        pub_corpora_dir += os.sep
    tt_files = glob.glob(
        pub_corpora_dir + "**" + os.sep + "*.tt",
        recursive=True,
    )
    entity_types: defaultdict[str, set[str]] = defaultdict(set)
    for file_ in tt_files:
        sgml = open(file_, encoding="utf8").read()
        if ' entities="gold"' not in sgml:
            continue  # Only use gold entities
        lines: list[str] = sgml.splitlines()
        # Pass 1 - get head lemmas
        id2lemma: dict[str, str] = {}
        for line in lines:
            if "norm" in line and "xml:id" in line:
                xml_id = _get("xml:id", line)
                lemma = _get("lemma", line)
                id2lemma[xml_id] = lemma
        # Pass 2 - get entity types for each lemma
        for line in lines:
            if ' entity="' in line:
                ent_type = _get("entity", line)
                head_id = _get("head_tok", line).replace("#", "")
                lemma = id2lemma[head_id]
                entity_types[lemma].add(ent_type)
    return entity_types


def _process_entry(
    entry_id: int,
    super_id: int,
    entry: ET.Element,
    entry_xml_id: str,
) -> dict[str, int | str] | None:
    """
    Args:
        entry_id: id of the entry
        super_id: id of the superentry
        entry: Element representing the entry
        entry_xml_id: The entry XML ID.

    Returns:
        A tuple representing new row to add to the db.
    """
    if "status" in entry.attrib:
        if entry.attrib["status"] == "deprecated":
            return None  # Entire entry is deprecated, used by DDGLC entries
    if "change" in entry.attrib:
        if "deprecated" in entry.attrib["change"]:
            return None  # Same for @change notation

    forms = entry.findall("{http://www.tei-c.org/ns/1.0}form")

    # ORTHSTRING -- "name" column in the db
    # Includes morphological info, followed by orthographic forms and
    # corresponding dialect (geo) info.
    # ||| separates forms
    # \n separates orth-geo pairs
    # ~ separates orth from geo

    # SEARCHSTRING -- "search" column in db
    # similar to orthstring but forms are stripped of anything but Coptic
    # letters and spaces.
    # morphological info not included
    orthstring = _OrthString()
    oref_string = ""
    oref_text = ""
    search_string = "\n"

    lemma = None
    orths: list[ET.Element] = []
    for form in forms:
        is_lemma = False
        if "status" in form.attrib:
            if form.attrib["status"] == "deprecated":
                continue
        if "change" in form.attrib:
            if "deprecated" in form.attrib["change"]:
                continue
        if "type" in form.attrib:
            if form.attrib["type"] == "lemma":
                is_lemma = True
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if len(orths) > 0:
            first_orth = orths[0]
            if is_lemma:
                lemma = first_orth
    if lemma is None:
        log.error("No lemma type for entry of", orths[0].text)

    first: list[ET.Element] = []
    last: list[ET.Element] = []
    for form in forms:
        if "status" in form.attrib:
            if form.attrib["status"] == "deprecated":
                continue
        if "change" in form.attrib:
            if "deprecated" in form.attrib["change"]:
                continue
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if type(lemma).__name__ == "Element":
            assert lemma is not None
            if any([orth.text == lemma.text for orth in orths]):
                first.append(form)
            else:
                last.append(form)
        else:
            if any([orth.text == lemma for orth in orths]):
                first.append(form)
            else:
                last.append(form)

    first = _order_forms(first)
    last = _order_forms(last)
    ordered_forms = first + last

    for form in ordered_forms:
        if "type" in form.attrib:
            if form.attrib["type"] == "lemma":
                continue
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        if form.text is not None and form.text.strip():
            orths.append(form)

        orefs = form.findall("{http://www.tei-c.org/ns/1.0}oRef")

        gram_grp = form.find("{http://www.tei-c.org/ns/1.0}gramGrp")
        if gram_grp is None:
            gram_grp = entry.find("{http://www.tei-c.org/ns/1.0}gramGrp")
        if gram_grp is not None:
            orthstring.add_gram_grp(gram_grp)

        all_geos = form.find("{http://www.tei-c.org/ns/1.0}usg")
        if all_geos is not None:
            if all_geos.text is not None:
                geos_text = re.sub(r"[\(\)]", r"", all_geos.text)
                geos = geos_text.split(" ")
            else:
                geos = []
        else:
            geos = []

        form_id = (
            form.attrib["{http://www.w3.org/XML/1998/namespace}id"]
            if "{http://www.w3.org/XML/1998/namespace}id" in form.attrib
            else ""
        )

        geos_with_id = [g + "^^" + form_id for g in geos]
        for orth in orths:
            assert orth.text
            orth_text = orth.text.strip()

            if len(orefs) > 0:
                assert orefs[0].text
                oref_text = orefs[0].text
            else:
                oref_text = orth_text

            search_text = _clean(orth_text)
            assert oref_text
            oref_text = _clean(oref_text)

            orthstring.add_orth_geo_id(orth_text, geos, form_id)
            for geo in geos_with_id:
                search_string += search_text + "~" + geo + "\n"
            if len(list(geos_with_id)) == 0:
                search_string += search_text + "~S\n"

        oref_string += oref_text
        oref_string += "|||"
        orthstring.amir += "|||"
    orthstring.amir = re.sub(r"\|\|\|$", "", orthstring.amir)
    oref_string = re.sub(r"\|\|\|$", "", oref_string)

    first_orth_re = re.search(r"\n(.*?)~", orthstring.amir)
    if first_orth_re is not None:
        ascii_orth = ""
        mapping = {
            "ⲁ": "A",
            "ⲃ": "B",
            "ⲅ": "C",
            "ⲇ": "D",
            "ⲉ": "E",
            "ⲍ": "F",
            "ⲏ": "G",
            "ⲑ": "H",
            "ⲓ": "I",
            "ⲕ": "J",
            "ⲗ": "K",
            "ⲙ": "L",
            "ⲛ": "M",
            "ⲝ": "N",
            "ⲟ": "O",
            "ⲡ": "P",
            "ⲣ": "Q",
            "ⲥ": "R",
            "ⲧ": "S",
            "ⲩ": "T",
            "ⲫ": "U",
            "ⲭ": "V",
            "ⲯ": "W",
            "ⲱ": "X",
            "ϣ": "Y",
            "ϥ": "Z",
            "ⳉ": "a",
            "ϧ": "b",
            "ϩ": "c",
            "ϫ": "d",
            "ϭ": "e",
            "ϯ": "SI",
            " ": " ",
        }
        # Extract the first orth.
        for char in first_orth_re.group(1):
            if char in mapping:
                ascii_orth += mapping[char]
    else:
        ascii_orth = ""

    # SENSES -- 3 different columns for the 3 languages: de, en, fr
    # each string contains definitions as well as corresponding bibl/ref/xr info
    # definition part, which may come from 'quote' or 'def' in the xml or both,
    # is preceded by ~~~ and followed by ;;;
    # different senses separated by |||
    de = _Lang("de")
    en = _Lang("en")
    fr = _Lang("fr")

    senses = entry.findall("{http://www.tei-c.org/ns/1.0}sense")
    sense_n = 1
    for sense in senses:
        sense_id = (
            sense.attrib["{http://www.w3.org/XML/1998/namespace}id"]
            if "{http://www.w3.org/XML/1998/namespace}id" in sense.attrib
            else ""
        )
        de.add_sense(sense_n, sense_id)
        en.add_sense(sense_n, sense_id)
        fr.add_sense(sense_n, sense_id)
        for sense_child in sense:
            if sense_child.tag == "{http://www.tei-c.org/ns/1.0}cit":
                bibl = sense_child.find("{http://www.tei-c.org/ns/1.0}bibl")
                quotes = sense_child.findall(
                    "{http://www.tei-c.org/ns/1.0}quote",
                )
                definitions = sense_child.findall(
                    "{http://www.tei-c.org/ns/1.0}def",
                )

                q = _Quote()
                for quote in quotes:
                    if quote.text is not None:
                        q.add_quote(quote)
                        if len(definitions) == 0:
                            q.no_definitions()
                        else:
                            q.yes_definitions()
                        lang = quote.get(
                            "{http://www.w3.org/XML/1998/namespace}lang",
                        )
                        if lang == "de":
                            de.add_quote(q)
                        elif lang == "en":
                            en.add_quote(q)
                        elif lang == "fr":
                            fr.add_quote(q)
                        q.reset()
                for definition in definitions:
                    if definition.text is not None:
                        lang = definition.get(
                            "{http://www.w3.org/XML/1998/namespace}lang",
                        )
                        if lang == "de":
                            de.add_definition(definition)
                        elif lang == "en":
                            en.add_definition(definition)
                        elif lang == "fr":
                            fr.add_definition(definition)
                de.add_bibl(bibl)
                en.add_bibl(bibl)
                fr.add_bibl(bibl)
            elif sense_child.tag == "{http://www.tei-c.org/ns/1.0}ref":
                de.add_ref(sense_child)
                en.add_ref(sense_child)
                fr.add_ref(sense_child)
            elif sense_child.tag == "{http://www.tei-c.org/ns/1.0}xr":
                de.add_xr(sense_child)
                en.add_xr(sense_child)
                fr.add_xr(sense_child)

        de.amir += "|||"
        en.amir += "|||"
        fr.amir += "|||"
        sense_n += 1

    de.amir = re.sub(r"\|\|\|$", r"", de.amir)
    en.amir = re.sub(r"\|\|\|$", r"", en.amir)
    fr.amir = re.sub(r"\|\|\|$", r"", fr.amir)
    de.finalize()
    en.finalize()
    fr.finalize()

    # POS -- a single Scriptorium POS tag for each entry
    pos_list: list[str] = []
    for gramgrp in entry.iter("{http://www.tei-c.org/ns/1.0}gramGrp"):
        pos = gramgrp.find("{http://www.tei-c.org/ns/1.0}pos")
        if pos is not None:
            assert pos.text
            pos_text = pos.text
        else:
            pos_text = "None"
        subc = gramgrp.find("{http://www.tei-c.org/ns/1.0}subc")
        if subc is not None:
            assert subc.text
            subc_text = subc.text
        else:
            subc_text = "None"
        new_pos: str = _pos_map(pos_text, subc_text, orthstring.amir)
        if new_pos not in pos_list:
            pos_list.append(new_pos)
    if len(list(pos_list)) > 1:
        pos_list = list(
            filter(
                lambda p: p not in ["NULL", "NONE", "?"],
                pos_list,
            ),
        )
    if len(pos_list) == 0:
        pos_list.append("NULL")
    # On the rare occasion pos_list has len > 1 at this point, the first one is
    # the most valid.
    pos_string = pos_list[0]

    # ETYM
    etym = entry.find("{http://www.tei-c.org/ns/1.0}etym")
    xrs = entry.findall("{http://www.tei-c.org/ns/1.0}xr")
    etym_string = EtymString(etym, xrs)
    ents = ""
    if "~" in search_string:
        row_lemma = search_string.strip().split("~")[0]
        if row_lemma == "ⲉⲓⲱⲧ":  # Hardwired behavior for barley vs. father
            if entry_xml_id == "C998":
                ents = "plant"
            else:
                ents = "person"
        elif row_lemma in _entity_types and pos_string in [
            "ART",
            "PDEM",
            "PPOS",
            "N",
            "NUM",
            "PINT",
        ]:
            ents = ";".join(sorted(list(_entity_types[row_lemma])))

    return {
        "id": entry_id,
        "super_id": super_id,
        "orthstring": orthstring.amir,
        "pos_string": pos_string,
        "de": de.amir,
        "de-pishoy": de.pishoy(),
        "en": en.amir,
        "en-pishoy": en.pishoy(),
        "fr": fr.amir,
        "fr-pishoy": fr.pishoy(),
        "merged-pishoy": _merge_langs(de, en, fr).pishoy(),
        "etym_string": etym_string.amir,
        "etym_string-processed": etym_string.process(),
        "ascii_orth": ascii_orth,
        "search_string": search_string,
        "oref_string": oref_string,
        "greek_id": etym_string.greek_id(),
        "ents": ents,
        "orthstring-pishoy": orthstring.pishoy(),
    }


def _process_super_entry(
    entry_id: int,
    super_id: int,
    super_entry: ET.Element,
) -> list[dict[str, str | int]]:
    row_list: list[dict[str, str | int]] = []
    for entry in super_entry:
        entry_xml_id = (
            entry.attrib["{http://www.w3.org/XML/1998/namespace}id"]
            if "{http://www.w3.org/XML/1998/namespace}id" in entry.attrib
            else ""
        )

        # Get lemma form ID
        forms = [
            f
            for f in entry.findall("{http://www.tei-c.org/ns/1.0}form")
            if "type" in f.attrib
        ]
        lemma = [f for f in forms if f.attrib["type"] == "lemma"]
        if len(lemma) > 0:
            lemma_form_id = lemma[0].attrib[
                "{http://www.w3.org/XML/1998/namespace}id"
            ]
        else:
            lemma_form_id = ""

        cur = _process_entry(entry_id, super_id, entry, entry_xml_id)
        if cur is None:
            continue
        cur["lemma_form_id"] = lemma_form_id
        cur["entry_xml_id"] = entry_xml_id
        row_list.append(cur)
        entry_id += 1

    return row_list


def _pos_map(pos: str, subc: str, orthstring: str) -> str:
    """
    Args:
        pos: A grammatical position (in German).
        subc: Some other grammatical annotation (I still need to learn more
            about this).
        orthstring: The orthstring.

    Returns:
        The mapped position.
    """
    pos = pos.replace("?", "")
    if (
        pos == "Subst."
        or pos == "Adj."
        or pos == "Nominalpräfix"
        or pos == "Adjektivpräfix"
        or pos == "Kompositum"
    ):
        return "N"
    elif (
        "Ausdruck der Nichtexistenz" in subc
        or "Ausdruck des Nicht-Habens" in subc
    ):
        return "EXIST"
    elif pos == "Adv.":
        return "ADV"
    elif pos == "Vb." or pos == "unpersönlicher Ausdruck":
        if subc == "Qualitativ":
            return "VSTAT"
        elif subc == "Suffixkonjugation":
            return "VBD"
        elif subc == "Imperativ":
            return "VIMP"
        elif "ⲟⲩⲛ-" in orthstring or "ⲟⲩⲛⲧⲉ-" in orthstring:
            return "EXIST"
        else:
            return "V"
    elif pos == "Präp.":
        return "PREP"
    elif (
        pos == "Zahlzeichen"
        or pos == "Zahlwort"
        or pos == "Präfix der Ordinalzahlen"
    ):
        return "NUM"
    elif (
        pos == "Partikel"
        or pos == "Interjektion"
        or pos == "Partikel, enklitisch"
    ):
        return "PTC"
    elif (
        pos == "Selbst. Pers. Pron."
        or pos == "Suffixpronomen"
        or pos == "Präfixpronomen (Präsens I)"
    ):
        return "PPER"
    elif pos == "Konj.":
        return "CONJ"
    elif pos == "Dem. Pron.":
        return "PDEM"
    elif pos == "bestimmter Artikel" or pos == "unbestimmter Artikel":
        return "ART"
    elif pos == "Possessivartikel" or pos == "Possessivpräfix":
        return "PPOS"
    elif pos == "Poss. Pron.":
        return "PPERO"
    elif pos == "Interr. Pron.":
        return "PINT"
    elif pos == "Verbalpräfix":
        if subc == "Imperativpräfix ⲁ-" or subc == "Negierter Imperativ ⲙⲡⲣ-":
            return "NEG"
        if subc == "im negativen Bedingungssatz" or subc == "Perfekt II ⲉⲛⲧⲁ-":
            return "NONE"
        else:
            return "A"
    elif pos == "Pron.":
        if subc == "None":
            return "PPER"
        elif subc == "Indefinitpronomen" or subc == "Fragepronomen":
            return "PINT"
        elif subc == "Reflexivpronomen":
            return "PREP"
    elif pos == "Satzkonverter":
        return "C"
    elif pos == "Präfix":
        if "ⲧⲁ-" in orthstring:
            return "PPOS"
        elif "ⲧⲃⲁⲓ-" in orthstring:
            return "N"
        elif "ⲧⲣⲉ-" in orthstring:
            return "A"
    elif pos == "None" or pos == "?":
        if subc == "None":
            return "NULL"
        if subc == "Qualitativ":
            return "VSTAT"
    elif "ϭⲁⲛⲛⲁⲥ" in orthstring:
        return "NULL"

    return "?"


# Gather entity data
if _PUB_CORPORA is not None:
    _entity_types = _get_entity_types(_PUB_CORPORA)


def build(basename: str) -> pd.DataFrame:
    xml_path = _V_1_2_DIR / basename
    del basename
    super_id = 1
    entry_id = 1

    text = (
        ET.parse(xml_path)
        .getroot()
        .find(
            "{http://www.tei-c.org/ns/1.0}text",
        )
    )
    assert text
    body: ET.Element | None = text.find(
        "{http://www.tei-c.org/ns/1.0}body",
    )
    del text
    assert body

    rows: list[dict[str, str | int]] = []
    for child in body:
        if child.tag == "{http://www.tei-c.org/ns/1.0}entry":
            entry_xml_id = (
                child.attrib["{http://www.w3.org/XML/1998/namespace}id"]
                if "{http://www.w3.org/XML/1998/namespace}id" in child.attrib
                else ""
            )

            # Get lemma form ID
            forms = [
                f
                for f in child.findall("{http://www.tei-c.org/ns/1.0}form")
                if "type" in f.attrib
            ]
            lemma = [f for f in forms if f.attrib["type"] == "lemma"]
            if len(lemma) > 0:
                lemma_form_id = lemma[0].attrib[
                    "{http://www.w3.org/XML/1998/namespace}id"
                ]
            else:
                lemma_form_id = ""

            cur = _process_entry(entry_id, super_id, child, entry_xml_id)
            if cur is None:
                continue
            cur["lemma_form_id"] = lemma_form_id
            cur["entry_xml_id"] = entry_xml_id
            rows.append(cur)
            super_id += 1
            entry_id += 1
        elif child.tag == "{http://www.tei-c.org/ns/1.0}superEntry":
            cur_rows = _process_super_entry(entry_id, super_id, child)
            rows.extend(cur_rows)
            super_id += 1
            entry_id += len(cur_rows)

    df = pd.DataFrame(rows)
    df["cdo"] = [_cdo(entry) for entry in df["entry_xml_id"]]

    columns = [
        "entry_xml_id",
        "orthstring-pishoy",
        "merged-pishoy",
        "de-pishoy",
        "en-pishoy",
        "fr-pishoy",
        "cdo",
        "lemma_form_id",
        "id",
        "super_id",
        "orthstring",
        "pos_string",
        "de",
        "en",
        "fr",
        "etym_string",
        "ascii_orth",
        "search_string",
        "oref_string",
        "greek_id",
        "ents",
    ]

    col_to_idx = {col_name: idx for idx, col_name in enumerate(columns)}
    columns = sorted(
        df.columns,
        key=lambda col_name: col_to_idx.get(col_name, 1000),
    )
    df = df[columns]
    return df
    # TODO: (#51) Add network graphs.


# TODO: (#399): Export objects and methods, rather than TSVs!

egyptian: pd.DataFrame = build("BBAW_Lexicon_of_Coptic_Egyptian-v4-2020.xml")
greek: pd.DataFrame = build(
    "DDGLC_Lexicon_of_Greek_Loanwords_in_Coptic-v2-2020.xml",
)
comprehensive: pd.DataFrame = build(
    "Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
)
