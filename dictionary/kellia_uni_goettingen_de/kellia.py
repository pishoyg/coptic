#!/usr/bin/env python3
"""Process KELLIA's dictionary.

Data:
1. The TLA data, which comprises the core of the dictionary, is retrieved from:
     https://refubium.fu-berlin.de/handle/fub188/27813
2. Bohairic supplemental entries are being directly retrieved from the sheet
   maintained by Coptic Scriptorium:
     https://docs.google.com/spreadsheets/d/1r9J5nuQFQxgInLpX1Gm-I20nunIBjmGFR3CfFgK0THU
3. Sahidic supplemental entries have been snapshotted from the CDO:
     https://github.com/KELLIA/dictionary/blob/dev/utils/inflections.tab
   The reason we choose to snapshot them instead of retrieving a live version is
   that they remain in the `dev` branch, and it's unclear how KELLIA maintains
   and updates the data.

Code:
-  This file was inspired by:
     https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py
   The original file was snapshotted from the `master` branch on June 1st, 2024.
-  Parts of the file, particularly those pertaining to supplemental entries, are
   based on logic that, as of October 23, 2025, still lives in the `dev` branch:
     https://github.com/KELLIA/dictionary/blob/dev/utils/dictionary_reader.py
"""

# TODO: (#305) The XML file seems to have been modified a few times by Coptic
# Scriptorium. We expect something in the order of magnitude of 20 entries or so
# to have been modified. Retrieve an updated version.

# TODO: (#525) Consider using the same HTML structure as Crum.

# TODO: (#577) Rewrite this file to align with our technical standards.

import functools
import itertools
import pathlib
import re
import typing
import xml.etree.ElementTree as ET
from collections import OrderedDict, abc, defaultdict

import pandas as pd

from utils import ensure, file, gcp, log

XML_NS: str = "{http://www.w3.org/XML/1998/namespace}"
TEI_NS: str = "{http://www.tei-c.org/ns/1.0}"

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_V_1_2_DIR: pathlib.Path = _SCRIPT_DIR / "data" / "raw" / "v1.2"
_CLEAN: set[str] = set("ⲁⲃⲅⲇⲉⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣϥⳉϧϩϫϭϯ ")
_CRUM_RE: re.Pattern[str] = re.compile(r"\b(CD ([0-9]+[ab]?)-?[0-9]*[ab]?)\b")
_CRUM_PAGE: str = (
    "https://coptot.manuscriptroom.com/crum-coptic-dictionary?pageID="
)
_SENSE_CHILDREN: list[str] = ["quote", "definition", "bibl", "ref", "xr"]
FORM_RE: re.Pattern[str] = re.compile(r"[Ⲁ-ⲱϢ-ϯⳈⳉ]+[†⸗\-]?")
PURE_COPTIC_RE: re.Pattern[str] = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ]+")

BOHAIRIC_SUPPLEMENTAL_SHEET_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1r9J5nuQFQxgInLpX1Gm-I20nunIBjmGFR3CfFgK0THU/export?format=tsv"
)
# BOHAIRIC_SUPPLEMENTAL_VERIFIED is the number of verified entries in the
# Bohairic supplemental data. Only this subset will be processed.
BOHAIRIC_SUPPLEMENTAL_VERIFIED: int = 999
SAHIDIC_SUPPLEMENTAL: pathlib.Path = (
    _SCRIPT_DIR / "data" / "raw" / "inflections.tab"
)

# FROM_COPTIC_SCRIPTORIUM is the ID we use for supplemental forms retrieved from
# Coptic Scriptorium, and which are unavailable in the TLA.
FROM_COPTIC_SCRIPTORIUM: str = "from CS"

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


def _add_crum_links(ref_bibl: str) -> str:
    return _CRUM_RE.sub(rf'<a href="{_CRUM_PAGE}\2">\1</a>', ref_bibl)


def _compress(text: str | None) -> str:
    assert text is not None
    return " ".join(text.split())


def _clean(text: str) -> str:
    text = "".join(c for c in text if c in _CLEAN)
    return _compress(text)


class Form:
    """Line represents a single word form."""

    def __init__(self, gram_grp: str, orth: str, geo: str, form_id: str):
        self.gram_grp: str = gram_grp
        self.orth: str = orth
        self.geo: str = _GEO_MAPPING.get(geo, geo)
        self.form_id: str = form_id

    def _td(self, classes: str, text: str) -> str:
        return f'<td class="{classes}">{text}</td>'

    def tr_aux(self) -> abc.Generator[str]:
        """Construct a <tr> element for this form.

        Yields:
            A string representing the HTML of a <tr> element.
        """
        yield f'<tr class="word {self.geo}">'
        yield self._td(f"orth spelling {self.geo}", self.orth)
        yield self._td(f"geo dialect {self.geo}", self.geo)
        yield self._td(f"gram_grp type {self.geo}", self.gram_grp)
        yield "</tr>"


class Orthography:
    """Orthography stores the word forms."""

    def __init__(self):
        self.forms: list[Form] = []
        self._last_gram_grp: str = ""

    def add(self, line: Form):
        self.forms.append(line)

    def has(self, orth: str) -> bool:
        return any(f.orth == orth for f in self.forms)

    def add_gram_grp(self, gram_grp: ET.Element) -> None:
        self._last_gram_grp = " ".join(
            _compress(child.text) for child in gram_grp
        )

    def add_orth_geo_id(
        self,
        orth: str,
        geos: list[str],
        form_id: str,
    ) -> None:
        geos = geos or ["S"]
        for g in geos:
            self.forms.append(
                Form(self._last_gram_grp, orth, g, form_id),
            )

    def table_aux(self) -> abc.Generator[str]:
        yield '<table id="orths">'
        for line in self.forms:
            yield from line.tr_aux()
        yield "</table>"

    def table(self) -> str:
        return "".join(self.table_aux())


class Etymology:
    """Etymology represents the etymology of a word."""

    def __init__(self, etym: ET.Element | None, xrs: list[ET.Element]) -> None:
        self.amir: str = ""
        self._greek_id: str = ""
        if etym is not None:
            greek_dict: OrderedDict[str, str | None] = OrderedDict()
            for child in etym:
                if child.tag == TEI_NS + "note":
                    self.amir += _compress(child.text)
                elif child.tag == TEI_NS + "ref":
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
                elif child.tag == TEI_NS + "xr":
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

    def greek_id(self):  # dead: disable
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


class Sense:
    """_Sense represents a meaning of a word."""

    def __init__(self, sense_n: int, sense_id: str) -> None:
        self._sense_n: int = sense_n
        self._sense_id: str = sense_id
        self._content: list[tuple[str, str]] = []

    def add_quote(self, quote: str) -> None:
        self._content.append(("quote", quote))

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
        if tag_name != "bibl":
            return f'<span class="{tag_name}">{tag_text}</span>'

        split: list[str] = tag_text.split("; ")
        split = [s.strip() for s in split]
        split = list(filter(None, split))
        return _add_crum_links("\n".join(split))

    def identify(self) -> tuple[int, str]:
        return (self._sense_n, self._sense_id)

    def tr(self) -> str:
        out = "".join(self._tr_aux())
        while "\n\n\n" in out:
            out = out.replace("\n\n\n", "\n\n")
        return out

    def _tr_aux(self) -> abc.Generator[str]:
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


class Lang:
    """_Lang represents the definition in one language."""

    def __init__(self, name: typing.Literal["de", "en", "fr", "MERGED"]):
        self.name: typing.Literal["de", "en", "fr", "MERGED"] = name
        self.senses: list[Sense] = []

    def add_sense(self, sense_n: int, sense_id: str):
        self.senses.append(Sense(sense_n, sense_id))

    def _last_sense(self) -> Sense:
        return self.senses[-1]

    def add_quote(self, quote: str) -> None:
        self._last_sense().add_quote(quote)

    def add_definition(self, definition: ET.Element) -> None:
        self._last_sense().add_definition(_compress(definition.text))

    def add_bibl(self, bibl: ET.Element | None) -> None:
        if bibl is None:
            return
        if not bibl.text:
            return
        self._last_sense().add_bibl(bibl.text)

    def add_ref(self, ref: ET.Element):
        assert ref.text
        self._last_sense().add_ref(ref.text)

    def add_xr(self, xr: ET.Element):
        for ref in xr:
            assert ref.text
            text = xr.tag[29:] + ". " + ref.attrib["target"] + "# " + ref.text
            self._last_sense().add_xr(text)

    def add(self, name: str, value: str):
        self._last_sense().add(name, value)

    def table(self) -> str:
        return "".join(self.table_aux())

    def table_aux(self) -> abc.Generator[str]:
        yield '<table id="senses">'
        yield "<colgroup>"
        yield "<col>"
        yield "<col>"
        yield "</colgroup>"
        for sense in self.senses:
            yield sense.tr()
        yield "</table>"


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
        orths = form.findall(TEI_NS + "orth")
        text = ""
        dialect = ""
        for orth in orths:
            assert orth.text
            text = orth.text.replace("⸗", "--")  # Sort angle dash after hyphen
            geo = form.find(TEI_NS + "usg")
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


class Word:
    """Word represents a word in the KELLIA dictionary."""

    def __init__(
        self,
        entry_xml_id: str,
        lemma_form_id: str | None,
        orthstring: Orthography,
        pos_string: str,
        de: Lang,
        en: Lang,
        fr: Lang,
        etym_string: Etymology,
        oref_string: str,
    ):
        self.entry_xml_id: str = entry_xml_id
        self.lemma_form_id: str | None = lemma_form_id
        self.orthstring: Orthography = orthstring
        self.pos_string: str = pos_string
        self.de: Lang = de
        self.en: Lang = en
        self.fr: Lang = fr
        self.etym_string: Etymology = etym_string
        self.oref_string: str = oref_string

    def merge_langs(self):
        merged: Lang = Lang("MERGED")
        assert (
            len(self.de.senses) == len(self.en.senses) == len(self.fr.senses)
        )
        for de, en, fr in zip(
            self.de.senses,
            self.en.senses,
            self.fr.senses,
        ):
            assert de.identify() == en.identify() == fr.identify()
            merged.add_sense(*de.identify())
            for row in en.explain('<span class="lang">(En.) </span>'):
                merged.add(*row)
            merged.add("", "")
            for row in de.explain('<span class="lang">(De.) </span>'):
                merged.add(*row)
            merged.add("", "")
            for row in fr.explain('<span class="lang">(Fr.) </span>'):
                merged.add(*row)
            merged.add("", "")
            for row in de.give_references():
                merged.add(*row)
        return merged

    def cdo(self) -> str:
        return (
            f"https://coptic-dictionary.org/entry.cgi?tla={self.entry_xml_id}"
        )


def _geos(form: ET.Element) -> list[str]:
    goes = form.find(TEI_NS + "usg")
    if goes is None or goes.text is None:
        return []
    return re.sub(r"[\(\)]", r"", goes.text).split(" ")


def _deprecated(element: ET.Element) -> bool:
    if element.attrib.get("status") == "deprecated":
        return True
    if "deprecated" in element.attrib.get("change", ""):
        return True
    return False


def _is_lemma(form: ET.Element) -> bool:
    return form.attrib.get("type") == "lemma"


def _process_entry(entry: ET.Element) -> Word | None:

    assert entry.tag == TEI_NS + "entry"

    if _deprecated(entry):
        return None

    entry_xml_id: str = entry.attrib[XML_NS + "id"]
    lemma: ET.Element | None = None
    forms: list[ET.Element] = entry.findall(TEI_NS + "form")
    try:
        lemma = next(filter(_is_lemma, forms))
    except StopIteration:
        log.error("No lemma found for", entry_xml_id)

    orthography = Orthography()
    oref_string: str = ""
    oref_text: str = ""

    orths: list[ET.Element] = []
    lemma_orth: str = ""
    for form in forms:
        if _deprecated(form):
            continue
        orths = form.findall(TEI_NS + "orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if _is_lemma(form):
            assert orths[0].text
            lemma_orth = orths[0].text

    first: list[ET.Element] = []
    last: list[ET.Element] = []
    for form in forms:
        if _deprecated(form):
            continue
        orths = form.findall(TEI_NS + "orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if lemma and any(orth.text == lemma_orth for orth in orths):
            first.append(form)
        else:
            last.append(form)

    forms = _order_forms(first) + _order_forms(last)
    del first, last

    for form in forms:
        if lemma and form.attrib[XML_NS + "id"] == lemma.attrib[XML_NS + "id"]:
            continue
        orths = form.findall(TEI_NS + "orth")
        if form.text is not None and form.text.strip():
            orths.append(form)

        orefs: list[ET.Element] = form.findall(TEI_NS + "oRef")

        gram_grp: ET.Element | None = form.find(
            TEI_NS + "gramGrp",
        ) or entry.find(TEI_NS + "gramGrp")
        if gram_grp is not None:
            orthography.add_gram_grp(gram_grp)

        form_id: str = form.attrib[XML_NS + "id"]

        for orth in orths:
            assert orth.text
            orth_text = orth.text.strip()

            if orefs:
                assert orefs[0].text
                oref_text = orefs[0].text
            else:
                oref_text = orth_text

            assert oref_text
            oref_text = _clean(oref_text)

            orthography.add_orth_geo_id(orth_text, _geos(form), form_id)

        oref_string += oref_text
        oref_string += "|||"
    oref_string = re.sub(r"\|\|\|$", "", oref_string)

    de = Lang("de")
    en = Lang("en")
    fr = Lang("fr")

    senses: list[ET.Element] = entry.findall(
        TEI_NS + "sense",
    )
    sense_n: int = 1
    for sense in senses:
        sense_id: str = sense.attrib[XML_NS + "id"]
        de.add_sense(sense_n, sense_id)
        en.add_sense(sense_n, sense_id)
        fr.add_sense(sense_n, sense_id)
        for sense_child in sense:
            if sense_child.tag == TEI_NS + "cit":
                bibl: ET.Element | None = sense_child.find(
                    TEI_NS + "bibl",
                )
                quotes: list[ET.Element] = sense_child.findall(
                    TEI_NS + "quote",
                )
                definitions: list[ET.Element] = sense_child.findall(
                    TEI_NS + "def",
                )

                for quote in quotes:
                    if quote.text is None:
                        continue
                    q: str = _compress(quote.text)
                    lang = quote.get(
                        XML_NS + "lang",
                    )
                    if lang == "de":
                        de.add_quote(q)
                    elif lang == "en":
                        en.add_quote(q)
                    elif lang == "fr":
                        fr.add_quote(q)

                for definition in definitions:
                    if definition.text is None:
                        continue
                    lang = definition.get(
                        XML_NS + "lang",
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
            elif sense_child.tag == TEI_NS + "ref":
                de.add_ref(sense_child)
                en.add_ref(sense_child)
                fr.add_ref(sense_child)
            elif sense_child.tag == TEI_NS + "xr":
                de.add_xr(sense_child)
                en.add_xr(sense_child)
                fr.add_xr(sense_child)

        sense_n += 1

    # POS -- a single Scriptorium POS tag for each entry
    pos_list: list[str] = []
    for gramgrp in entry.iter(TEI_NS + "gramGrp"):
        pos = gramgrp.find(TEI_NS + "pos")
        if pos is not None:
            assert pos.text
            pos_text = pos.text
        else:
            pos_text = "None"
        subc = gramgrp.find(TEI_NS + "subc")
        if subc is not None:
            assert subc.text
            subc_text = subc.text
        else:
            subc_text = "None"
        new_pos: str = _pos_map(pos_text, subc_text, orthography)
        if new_pos not in pos_list:
            pos_list.append(new_pos)
    if len(pos_list) > 1:
        pos_list = [p for p in pos_list if p not in ["NULL", "NONE", "?"]]
    pos_list = pos_list or ["NULL"]

    return Word(
        entry_xml_id,
        lemma.attrib[XML_NS + "id"] if lemma else None,
        orthography,
        # On the rare occasion pos_list has len > 1 at this point, the first one
        # is the most valid.
        pos_list[0],
        de,
        en,
        fr,
        Etymology(
            entry.find(TEI_NS + "etym"),
            entry.findall(TEI_NS + "xr"),
        ),
        oref_string,
    )


def _pos_map(pos: str, subc: str, orthography: Orthography) -> str:
    """
    Args:
        pos: A grammatical position (in German).
        subc: Some other grammatical annotation (I still need to learn more
            about this).
        orthography: The word orthography.

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
        elif orthography.has("ⲟⲩⲛ-") or orthography.has("ⲟⲩⲛⲧⲉ-"):
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
        if orthography.has("ⲧⲁ-"):
            return "PPOS"
        elif orthography.has("ⲧⲃⲁⲓ-"):
            return "N"
        elif orthography.has("ⲧⲣⲉ-"):
            return "A"
    elif pos == "None" or pos == "?":
        if subc == "None":
            return "NULL"
        if subc == "Qualitativ":
            return "VSTAT"
    elif orthography.has("ϭⲁⲛⲛⲁⲥ"):
        return "NULL"

    return "?"


@functools.cache
def _bohairic_supplemental() -> dict[str, list[str]]:
    supp: defaultdict[str, list[str]] = defaultdict(list)
    df: pd.DataFrame = gcp.tsv_spreadsheet(
        BOHAIRIC_SUPPLEMENTAL_SHEET_URL,
        # We fail to parse the TSV when using the default engine, and the error
        # messages are meaningless.
        engine="python",
        # Despite the meaningful error messages provided by the `python` engine,
        # we simply skip bad lines instead of fixing them.
        # TODO: (#305) Fix bad lines at the origin.
        on_bad_lines="warn",
    )
    df = df[:BOHAIRIC_SUPPLEMENTAL_VERIFIED]
    # Lemma forms should appear first.
    df = (
        df.assign(is_lemma=df["word"] == df["lemma"])
        .sort_values(by="is_lemma", ascending=False)
        .drop(columns="is_lemma")
    )
    # The TLA column uses an inconsistent delimiter of either a comma or an
    # underscore!
    for _, row in df.iterrows():
        tla: str = row["tla"]
        assert isinstance(tla, str)
        if "_" in tla:
            # The TLA often uses an underscore as a TLA ID delimiter. This is
            # currently omitted from the CDO, so we omit it on our side as well.
            # TODO: (#305) Reconsider.
            continue
        form: str = row["word"]
        assert isinstance(form, str)
        # There is a number of malformed entries in the sheet!
        # TODO: (#305) Fix at the origin.
        if form in {"_warn:empty_norm_", ".", "...", "ⲉⲣ=ϣⲟⲣⲡ"}:
            continue
        assert PURE_COPTIC_RE.fullmatch(form), form

        for tla_id in tla.split(","):
            if not tla_id.startswith("C"):
                # TODO: (#305) Incorporate the entries that have no
                # TLA ID, instead of simply skipping them.
                continue
            if form in supp[tla_id]:
                # This form already exists!
                continue
            supp[tla_id].append(form)
    return supp


@functools.cache
def _sahidic_supplemental() -> dict[str, set[str]]:
    supp: defaultdict[str, set[str]] = defaultdict(set)

    def clean(form: str) -> str:
        return (
            form.replace("=", "⸗").replace("+", "†").replace("!", "").strip()
        )

    for line in file.readlines(SAHIDIC_SUPPLEMENTAL):
        if line.startswith("#"):
            # This is a comment.
            continue

        fields: list[str] = line.split("\t")
        tla_id: str = fields[0]
        lemma: str = clean(fields[1])

        if len(fields) == 3:
            # This line contains a plural form.
            form: str = fields[2].strip()
            # Plural forms have no special characters.
            assert clean(form) == form, form
            assert form != lemma
            assert FORM_RE.fullmatch(form), form
            supp[tla_id].add(form)
            continue

        for form in itertools.chain.from_iterable(
            cell.split(",") for cell in fields[2:]
        ):
            form = clean(form)
            if form == "_":
                continue
            if form == lemma:
                # This is the lemma form. It's already present.
                continue
            assert FORM_RE.fullmatch(form), form
            supp[tla_id].add(form)

    return supp


def _build_aux(basename: str) -> abc.Generator[Word]:
    xml_path: pathlib.Path = _V_1_2_DIR / basename
    del basename

    text: ET.Element[str] | None = (
        ET.parse(xml_path).getroot().find(TEI_NS + "text")
    )
    assert text
    body: ET.Element[str] | None = text.find(
        TEI_NS + "body",
    )
    assert body
    del text

    for child in body:
        # Every child is either a super entry or an entry.
        yield from filter(
            None,
            map(
                _process_entry,
                child if child.tag == TEI_NS + "superEntry" else [child],
            ),
        )


# pylint: disable=line-too-long
def _build(basename: str) -> abc.Generator[Word]:
    """Build a dataset from the given XML, adding supplemental entries.

    NOTE: Supplemental entries have been... problematic! They seem to be poorly
    maintained by Coptic Scriptorium. As of the time of writing, their
    supplemental entries code still lives in the `dev` branch. It doesn't
    consider parts-of-speech of supplemental entries at all (which we hope to
    do), markers of prenominal, pronominal, and qualitative forms are omitted,
    thus all forms agreeing in spelling are treated as equal.
    And the criteria for whether a given supplemental entry should or
    should not be included are unclear.
    Also, the data that they actually use[1] is unavailable to us. We only have
    access to this sheet[2].
    We are considering dropping supplemental entries altogether.

    As of the time of writing, discrepancies are known to exist between the
    supplemental entries that we add and the ones that show in CDO.

    [1] https://github.com/KELLIA/dictionary/blob/edac2731c86fb02819436d39d127344e4e0bf514/utils/dictionary_reader.py#L591
    [2] https://docs.google.com/spreadsheets/d/1r9J5nuQFQxgInLpX1Gm-I20nunIBjmGFR3CfFgK0THU

    Args:
        basename: The basename of the XML file containing the dataset
            definition.

    Yields:
        Words in the dataset.
    """
    # pylint: enable=line-too-long
    b_supp: dict[str, list[str]] = _bohairic_supplemental()
    s_supp: dict[str, set[str]] = _sahidic_supplemental()
    # TODO: (#305) Part-of-speech info is present in the source data. Use it
    # instead of setting it to the empty string!
    for word in _build_aux(basename):
        # Add Sahidic entries before Bohairic ones.
        # Additionally, we sort Sahidic entries to make the output
        # deterministic.
        # TODO: (#305) Use the same sorting logic used for TLA forms.
        for orth in sorted(s_supp.pop(word.entry_xml_id, [])):
            if word.orthstring.has(orth):
                # The word already has this orth.
                continue
            word.orthstring.add(Form("", orth, "S", FROM_COPTIC_SCRIPTORIUM))
        # TODO: (#305) We don't sort Bohairic forms because they already have
        # some order that would be corrupted if we were to reorder them below.
        # The lists retrieved have lamma forms first. We should order them by
        # form while retaining lemma forms at the beginning.
        b: list[str] = b_supp.pop(word.entry_xml_id, [])
        if any(f.geo == "B" for f in word.orthstring.forms):
            # This word already has some Bohairic forms. It's likely that the
            # supplemental entries are going to be redundant.
            # TODO: (#305) This may not always be the case. Only skip
            # supplemental entries that can be found in the list of forms.
            yield word
            continue
        for orth in b:
            word.orthstring.add(Form("", orth, "B", FROM_COPTIC_SCRIPTORIUM))
        yield word

    # Verify that all Sahidic supplemental entries have been consumed.
    ensure.ensure(
        not s_supp,
        "Some Sahidic inflections have invalid TLA IDs:",
        s_supp,
    )

    # Some Bohairic entries are not consumed.
    # TODO: (#305) Fix at the origin.
    for tla_id, forms in b_supp.items():
        log.error("Bohairic forms", forms, "have an invalid TLA ID", tla_id)


@functools.cache
def egyptian() -> list[Word]:
    return list(_build("BBAW_Lexicon_of_Coptic_Egyptian-v4-2020.xml"))


@functools.cache
def greek() -> list[Word]:
    return list(
        _build("DDGLC_Lexicon_of_Greek_Loanwords_in_Coptic-v2-2020.xml"),
    )


@functools.cache
def comprehensive() -> list[Word]:
    return list(_build("Comprehensive_Coptic_Lexicon-v1.2-2020.xml"))
