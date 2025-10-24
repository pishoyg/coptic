#!/usr/bin/env python3
"""Process KELLIA's dictionary."""

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

from dictionary.kellia_uni_goettingen_de import sources
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
_SenseChild = typing.Literal["quote", "definition", "bibl", "ref", "xr"]
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
DEFAULT_GEOS = ["S"]


def _add_crum_links(ref_bibl: str) -> str:
    return _CRUM_RE.sub(rf'<a href="{_CRUM_PAGE}\2">\1</a>', ref_bibl)


def _compress(text: str | None) -> str:
    assert text is not None
    return " ".join(text.split())


def _clean(text: str) -> str:
    text = "".join(c for c in text if c in _CLEAN)
    return _compress(text)


class Form:
    """Form represents a single word form."""

    def __init__(
        self,
        gram_grp: str | None,
        orth: str,
        geo: str,
        form_id: str,
    ) -> None:
        self.gram_grp: str | None = gram_grp
        self.orth: str = orth
        self.geo: str = _GEO_MAPPING.get(geo, geo)
        self.form_id: str = form_id

    def _td(self, text: str, *classes: str) -> str:
        return f'<td class="{" ".join([*classes, self.geo])}">{text}</td>'

    def tr_aux(self) -> abc.Generator[str]:
        """Construct a <tr> element for this form.

        Yields:
            A string representing the HTML of a <tr> element.
        """
        yield f'<tr class="word {self.geo}">'
        yield self._td(self.orth, "orth", "spelling")
        yield self._td(self.geo, "geo", "dialect")
        yield self._td(self.gram_grp or "", "gram_grp", "type")
        yield "</tr>"


class Orthography:
    """Orthography stores the word forms."""

    def __init__(self) -> None:
        self.forms: list[Form] = []
        self._last_gram_grp: str | None = None

    def start_gram_grp(self, gram_grp: ET.Element | None) -> None:
        self._last_gram_grp = (
            " ".join(_compress(child.text) for child in gram_grp)
            if gram_grp
            else None
        )

    def add(self, orth: str, geos: list[str], form_id: str) -> None:
        geos = geos or DEFAULT_GEOS
        for g in geos:
            self.forms.append(Form(self._last_gram_grp, orth, g, form_id))

    def has(self, orth: str) -> bool:
        return any(f.orth == orth for f in self.forms)

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
        self._greek_id: str | None = None
        self.amir: str = "".join(self._amir(etym, xrs))

    def _amir(
        self,
        etym: ET.Element | None,
        xrs: list[ET.Element],
    ) -> abc.Generator[str]:
        greek_dict: OrderedDict[str, str | None] = OrderedDict()
        for child in etym or []:

            if child.tag == TEI_NS + "note":
                yield _compress(child.text)
                continue

            if child.tag == TEI_NS + "xr":
                for ref in child:
                    assert ref.text
                    # pylint: disable-next=line-too-long
                    yield f"{child.attrib["type"]}. {ref.attrib["target"]}# {ref.text} "
                continue

            assert child.tag == TEI_NS + "ref"

            if "type" in child.attrib and "target" in child.attrib:
                yield f"{child.attrib["type"]}: {child.attrib["target"]} "
                continue

            if "targetLang" in child.attrib:
                assert child.text
                yield f"{child.attrib["targetLang"]}: {child.text} "
                continue

            if "greek" in child.attrib.get("type", ""):
                greek_dict[child.attrib["type"]] = child.text
                continue

            # TODO: (#0) Handle remaining children.

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
                if self._greek_id:
                    part += " (DDGLC lemma ID " + self._greek_id + ")"
                part += "</span> " + val
                greek_parts.append(part)
                continue
            if "meaning" in key:
                greek_parts.append("<i>" + val + "</i>.")
                continue
            if "_pos" in key and len(val) > 0:
                greek_parts.append(
                    '<span style="color:grey">' + val + "</span>",
                )
                continue
            if "grl_ref" in key:
                greek_parts.append(
                    '<span style="color:grey">(' + val + ")</span>",
                )
                continue
        yield " ".join(greek_parts)

        for xr in xrs:
            for ref in xr:
                ref_target: str = _clean(ref.attrib["target"])
                assert ref_target
                assert ref.text
                yield f"{xr.attrib["type"]}. #{ref_target}# {ref.text} "

    def process(self) -> str:
        etym: str = "".join(self.amir)
        xrs: list[str] = re.findall(r" #(.*?)#", etym)
        for xr in xrs:
            word = xr
            link: str = (
                # pylint: disable-next=line-too-long
                f'<a href="https://coptic-dictionary.org/results.cgi?coptic={word}">{word}</a>'
            )
            word = re.sub(r"\(", r"\(", word)
            word = re.sub(r"\)", r"\)", word)
            etym = re.sub(r"#" + word + "#", link, etym)
        if "cf. Gr." in etym:
            etym = _link_greek(etym)
        etym = _gloss_bibl(etym)
        etym = _compress(etym)
        return f'<span class="etym">{etym}</span>' if etym else ""


class Sense:
    """_Sense represents a meaning of a word."""

    def __init__(self, sense_n: int, sense_id: str) -> None:
        self._sense_n: int = sense_n
        self._sense_id: str = sense_id
        self._content: list[tuple[_SenseChild, str]] = []

    def add(self, name: _SenseChild, value: str) -> None:
        assert name in _SENSE_CHILDREN
        assert value
        self._content.append((name, value))

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

    def subset(self, *names: _SenseChild) -> list[tuple[_SenseChild, str]]:
        assert all(n in _SENSE_CHILDREN for n in names), names
        return [pair for pair in self._content if pair[0] in names]

    def explain(self, prefix: str = "") -> list[tuple[_SenseChild, str]]:
        explanation = self.subset("quote", "definition")
        if not explanation:
            return explanation
        if prefix:
            explanation[0] = (explanation[0][0], prefix + explanation[0][1])
        return explanation

    def give_references(self) -> list[tuple[_SenseChild, str]]:
        return self.subset("bibl", "ref", "xr")


class Lang:
    """_Lang represents the definition in one language."""

    def __init__(
        self,
        name: typing.Literal["de", "en", "fr", "MERGED"],
    ) -> None:
        self.name: typing.Literal["de", "en", "fr", "MERGED"] = name
        self.senses: list[Sense] = []

    def start_sense(self, sense_n: int, sense_id: str) -> None:
        self.senses.append(Sense(sense_n, sense_id))

    @property
    def _last_sense(self) -> Sense:
        return self.senses[-1]

    def add(self, name: _SenseChild, value: str | ET.Element) -> None:
        if isinstance(value, ET.Element):
            if name == "xr":
                for ref in value:
                    assert ref.text
                    self._last_sense.add(
                        "xr",
                        value.tag[29:]
                        + ". "
                        + ref.attrib["target"]
                        + "# "
                        + ref.text,
                    )
                return
            assert value.text
            value = value.text
        assert isinstance(value, str)
        if name == "definition":
            value = _compress(value)
        self._last_sense.add(name, value)

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
    for regex, repl in sources.SOURCES:
        ref_bibl = regex.sub(repl, ref_bibl)
    ref_bibl = ref_bibl.replace("DDGLC ref:", "DDGLC Usage ID:")
    return ref_bibl


def _link_greek(etym: str) -> str:
    m = re.search(r"cf\. Gr\.[^<>]+</span>([^<>]+)<i>", etym)
    if m is None:
        return etym
    word = m.group(1).strip()
    href = "https://www.billmounce.com/search/node/{greek}%20type%3Alexicon"

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
        langs: dict[str, Lang],
        etym_string: Etymology,
        oref_string: str,
    ) -> None:
        self.entry_xml_id: str = entry_xml_id
        self.lemma_form_id: str | None = lemma_form_id
        self.orthstring: Orthography = orthstring
        self.pos_string: str = pos_string
        self.langs: dict[str, Lang] = langs
        self.etym_string: Etymology = etym_string
        self.oref_string: str = oref_string

    def merge_langs(self) -> Lang:
        merged: Lang = Lang("MERGED")
        de, en, fr = self.langs["de"], self.langs["en"], self.langs["fr"]
        assert len(de.senses) == len(en.senses) == len(fr.senses)
        for d, e, f in zip(de.senses, en.senses, fr.senses):
            assert d.identify() == e.identify() == f.identify()
            merged.start_sense(*d.identify())
            for row in e.explain('<span class="lang">(En.) </span>'):
                merged.add(*row)
            for row in d.explain('<span class="lang">(De.) </span>'):
                merged.add(*row)
            for row in f.explain('<span class="lang">(Fr.) </span>'):
                merged.add(*row)
            for row in d.give_references():
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
    return not _deprecated(form) and form.attrib["type"] == "lemma"


def _orths(form: ET.Element) -> abc.Generator[ET.Element]:
    yield from form.findall(TEI_NS + "orth")
    if form.text is not None and form.text.strip():
        yield form


def _orth(lemma: ET.Element) -> str:
    first_orth: str | None = next(_orths(lemma)).text
    assert first_orth
    return first_orth


def _process_entry(entry: ET.Element) -> Word:
    entry_xml_id: str = entry.attrib[XML_NS + "id"]
    lemma: ET.Element | None = None
    forms: list[ET.Element] = entry.findall(TEI_NS + "form")
    try:
        lemma = next(filter(_is_lemma, forms))
    except StopIteration:
        log.error("No lemma found for", entry_xml_id)

    orthography: Orthography = Orthography()
    oref_strings: list[str] = []
    oref_text: str = ""

    lemma_orth: str | None = _orth(lemma) if lemma else None

    first: list[ET.Element] = []
    last: list[ET.Element] = []
    for form in forms:
        if _deprecated(form):
            continue
        orths = form.findall(TEI_NS + "orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if any(orth.text == lemma_orth for orth in orths):
            first.append(form)
        else:
            last.append(form)

    forms = _order_forms(first) + _order_forms(last)
    del first, last

    for form in forms:
        if lemma and form.attrib[XML_NS + "id"] == lemma.attrib[XML_NS + "id"]:
            continue
        orefs: list[ET.Element] = form.findall(TEI_NS + "oRef")

        gram_grp: ET.Element | None = form.find(
            TEI_NS + "gramGrp",
        ) or entry.find(TEI_NS + "gramGrp")
        if gram_grp:
            orthography.start_gram_grp(gram_grp)

        for orth in _orths(form):
            assert orth.text
            orth_text: str = orth.text.strip()

            if orefs:
                assert orefs[0].text
                oref_text = orefs[0].text
            else:
                oref_text = orth_text
            oref_text = _clean(oref_text)

            orthography.add(
                orth_text,
                _geos(form),
                form.attrib[XML_NS + "id"],
            )

        oref_strings.append(oref_text)

    langs: dict[str, Lang] = {
        "de": Lang("de"),
        "en": Lang("en"),
        "fr": Lang("fr"),
    }

    for sense_n, sense in enumerate(entry.findall(TEI_NS + "sense"), 1):
        sense_id: str = sense.attrib[XML_NS + "id"]
        for lang in langs.values():
            lang.start_sense(sense_n, sense_id)

        for child in sense:
            if child.tag == TEI_NS + "ref":
                for lang in langs.values():
                    lang.add("ref", child)
                continue

            if child.tag == TEI_NS + "xr":
                for lang in langs.values():
                    lang.add("xr", child)
                continue

            if child.tag == TEI_NS + "note":
                continue

            assert child.tag == TEI_NS + "cit"

            bibl: ET.Element | None = child.find(TEI_NS + "bibl")
            if bibl:
                for lang in langs.values():
                    lang.add("bibl", bibl)
            del bibl

            language: str | None
            for quote in child.findall(TEI_NS + "quote"):
                if quote.text is None:
                    continue
                language = quote.get(XML_NS + "lang")
                if not language:
                    # TODO: (#0) Incorporate quotes with an unknown language.
                    continue
                langs[language].add("quote", _compress(quote.text))

            for definition in child.findall(TEI_NS + "def"):
                if definition.text is None:
                    continue
                language = definition.get(XML_NS + "lang")
                if not language:
                    # TODO: (#0) Incorporate definitions with an unknown
                    # language.
                    continue
                langs[language].add("definition", definition)

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
        langs,
        Etymology(
            entry.find(TEI_NS + "etym"),
            entry.findall(TEI_NS + "xr"),
        ),
        "|||".join(oref_strings),
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
    if (
        "Ausdruck der Nichtexistenz" in subc
        or "Ausdruck des Nicht-Habens" in subc
    ):
        return "EXIST"
    if pos == "Adv.":
        return "ADV"
    if pos == "Vb." or pos == "unpersönlicher Ausdruck":
        if subc == "Qualitativ":
            return "VSTAT"
        if subc == "Suffixkonjugation":
            return "VBD"
        if subc == "Imperativ":
            return "VIMP"
        if orthography.has("ⲟⲩⲛ-") or orthography.has("ⲟⲩⲛⲧⲉ-"):
            return "EXIST"
        return "V"
    if pos == "Präp.":
        return "PREP"
    if (
        pos == "Zahlzeichen"
        or pos == "Zahlwort"
        or pos == "Präfix der Ordinalzahlen"
    ):
        return "NUM"
    if (
        pos == "Partikel"
        or pos == "Interjektion"
        or pos == "Partikel, enklitisch"
    ):
        return "PTC"
    if (
        pos == "Selbst. Pers. Pron."
        or pos == "Suffixpronomen"
        or pos == "Präfixpronomen (Präsens I)"
    ):
        return "PPER"
    if pos == "Konj.":
        return "CONJ"
    if pos == "Dem. Pron.":
        return "PDEM"
    if pos == "bestimmter Artikel" or pos == "unbestimmter Artikel":
        return "ART"
    if pos == "Possessivartikel" or pos == "Possessivpräfix":
        return "PPOS"
    if pos == "Poss. Pron.":
        return "PPERO"
    if pos == "Interr. Pron.":
        return "PINT"
    if pos == "Verbalpräfix":
        if subc == "Imperativpräfix ⲁ-" or subc == "Negierter Imperativ ⲙⲡⲣ-":
            return "NEG"
        if subc == "im negativen Bedingungssatz" or subc == "Perfekt II ⲉⲛⲧⲁ-":
            return "NONE"
        return "A"
    if pos == "Pron.":
        if subc == "None":
            return "PPER"
        if subc == "Indefinitpronomen" or subc == "Fragepronomen":
            return "PINT"
        if subc == "Reflexivpronomen":
            return "PREP"
    if pos == "Satzkonverter":
        return "C"
    if pos == "Präfix":
        if orthography.has("ⲧⲁ-"):
            return "PPOS"
        if orthography.has("ⲧⲃⲁⲓ-"):
            return "N"
        if orthography.has("ⲧⲣⲉ-"):
            return "A"
    if pos == "None" or pos == "?":
        if subc == "None":
            return "NULL"
        if subc == "Qualitativ":
            return "VSTAT"
    if orthography.has("ϭⲁⲛⲛⲁⲥ"):
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


def _words(basename: str) -> abc.Generator[Word]:
    """Generate words from the given XML file.

    Args:
        basename: Basename of the XML file containing the data.

    Yields:
        Word objects representing entries in the dataset.
    """
    text: ET.Element[str] | None = (
        ET.parse(_V_1_2_DIR / basename).getroot().find(TEI_NS + "text")
    )
    del basename
    assert text
    body: ET.Element[str] | None = text.find(TEI_NS + "body")
    del text
    assert body

    for child in body:
        # Every child is either a super entry or an entry.
        entries: ET.Element | list[ET.Element] = (
            child if child.tag == TEI_NS + "superEntry" else [child]
        )
        for entry in entries:
            assert entry.tag == TEI_NS + "entry"
            if _deprecated(entry):
                continue
            yield _process_entry(entry)


def _augmented_words(basename: str) -> abc.Generator[Word]:
    """Augment the stream of words from the given file with supplemental forms.

    Args:
        basename: Basename of the XML file containing the data.

    Yields:
        Word objects, with supplemental entries added.
    """
    b_supp: dict[str, list[str]] = _bohairic_supplemental()
    s_supp: dict[str, set[str]] = _sahidic_supplemental()
    for word in _words(basename):
        # TODO: (#305) Part-of-speech info is present in the source data. Use it
        # instead of setting the gram_grp to None for all supplemental forms.
        word.orthstring.start_gram_grp(None)
        # Add Sahidic entries before Bohairic ones.
        # Additionally, we sort Sahidic entries to make the output
        # deterministic.
        # TODO: (#305) Use the same sorting logic used for TLA forms.
        for orth in sorted(s_supp.pop(word.entry_xml_id, [])):
            if word.orthstring.has(orth):
                # The word already has this orth.
                continue
            word.orthstring.add(orth, ["S"], FROM_COPTIC_SCRIPTORIUM)
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
            word.orthstring.add(orth, ["B"], FROM_COPTIC_SCRIPTORIUM)
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


def _dataset(basename: str) -> list[Word]:
    return list(_augmented_words(basename))


@functools.cache
def egyptian() -> list[Word]:
    return _dataset("BBAW_Lexicon_of_Coptic_Egyptian-v4-2020.xml")


@functools.cache
def greek() -> list[Word]:
    return _dataset("DDGLC_Lexicon_of_Greek_Loanwords_in_Coptic-v2-2020.xml")


@functools.cache
def comprehensive() -> list[Word]:
    return _dataset("Comprehensive_Coptic_Lexicon-v1.2-2020.xml")
