#!/usr/bin/env python3
"""Process KELLIA's dictionary."""

# TODO: (#525) Consider using the same HTML structure as Crum.

# TODO: (#577) Rewrite this file to align with our technical standards.
# - One thing to do is to introduce objects that represent XML entities, instead
#   of using raw ET.Element objects throughout the program.

# NOTE: As of the time of writing, the truth value of an ET.Element object
# depends on the number of children. Instead of directly evaluating the truth
# value of an `ET.Element | None`, use `is not None`.

import functools
import itertools
import os
import pathlib
import re
import typing
import xml.etree.ElementTree as ET
from collections import OrderedDict, abc, defaultdict

import pandas as pd

from dictionary.kellia_uni_goettingen_de import sources
from flashcards import deck
from utils import ensure, file, gcp, javascript, log, page, paths, text
from xooxle import xooxle

XML_NS: str = "{http://www.w3.org/XML/1998/namespace}"
TEI_NS: str = "{http://www.tei-c.org/ns/1.0}"

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
# COMPREHENSIVE is the path to the dataset that contains both Greek and Egyptian
# words.
COMPREHENSIVE: pathlib.Path = (
    _SCRIPT_DIR
    / "data"
    / "input"
    / "v1.2"
    / "Comprehensive_Coptic_Lexicon-v1.2-2020.xml"
)
NUM_GREEK: int = 3208
NUM_EGYPTIAN: int = 8055

_CLEAN: set[str] = set("ⲁⲃⲅⲇⲉⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣϥⳉϧϩϫϭϯ ")
_SenseChild = typing.Literal["quote", "definition", "bibl", "ref", "xr"]
_SENSE_CHILDREN: list[_SenseChild] = [
    "quote",
    "definition",
    "bibl",
    "ref",
    "xr",
]
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
DEFAULT_GEO = "S"

GEOS: list[str] = ["S", "A", "L", "B", "F", "M", "O", "P", "V", "W", "U"]


def relpath(dst: str | pathlib.Path) -> str:
    return os.path.relpath(dst, paths.LEXICON_DIR)


def _is_greek(entry: ET.Element) -> bool:
    assert entry.tag == TEI_NS + "entry"
    return any(
        bibl.text and bibl.text.strip() == "DDGLC"
        for bibl in entry.iter(TEI_NS + "bibl")
    )


def _clean(txt: str) -> str:
    return "".join(c for c in txt if c in _CLEAN)


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
        self.geo: str = geo
        self.form_id: str = form_id

    def _td(self, txt: str, *classes: str) -> str:
        return f'<td class="{" ".join([*classes, self.geo])}">{txt}</td>'

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


def _text(tag: ET.Element, strict: bool = True) -> str:
    """Assert that the tag is childless, and return its text.

    A given tag can either have text or children, but not both.
    Normally, we also verify the existence of text, unless `strict` is set to
    `False`.

    Args:
        tag: A tag.
        strict: If true, assert the existence of text.

    Returns:
        Tag text.
    """

    ensure.ensure(len(tag) == 0, "element", tag, "has children!")

    txt: str = tag.text or ""
    txt = " ".join(txt.split())
    if strict:
        ensure.ensure(txt, "element", tag, "has no text!")

    return txt


class Orthography:
    """Orthography stores the word forms."""

    def __init__(self) -> None:
        self.forms: list[Form] = []

    def add(self, gram_grp: str, orth: str, geo: str, form_id: str) -> None:
        self.forms.append(Form(gram_grp, orth, geo, form_id))

    def has(self, orth: str) -> bool:
        return any(f.orth == orth for f in self.forms)

    def has_dialect(self, geo: str) -> bool:
        return any(f.geo == geo for f in self.forms)

    def table_aux(self) -> abc.Generator[str]:
        yield '<table id="orths">'
        for line in self.forms:
            yield from line.tr_aux()
        yield "</table>"

    def table(self) -> str:
        return "".join(self.table_aux())


class Etymology:
    """Etymology represents the etymology of a word."""

    def __init__(self, entry: ET.Element) -> None:
        self._greek_id: str | None = None
        self.amir: str = "".join(self._amir(entry))

    def _amir(self, entry: ET.Element) -> abc.Generator[str]:
        greek_dict: OrderedDict[str, str | None] = OrderedDict()
        for child in entry.find(TEI_NS + "etym") or []:

            if child.tag == TEI_NS + "note":
                yield _text(child)
                continue

            if child.tag == TEI_NS + "xr":
                for ref in child:
                    # pylint: disable-next=line-too-long
                    yield f"{child.attrib["type"]}. {ref.attrib["target"]}# {_text(ref)} "
                continue

            assert child.tag == TEI_NS + "ref"

            if "type" in child.attrib and "target" in child.attrib:
                yield f"{child.attrib["type"]}: {child.attrib["target"]} "
                continue

            if "targetLang" in child.attrib:
                yield f"{child.attrib["targetLang"]}: {_text(child)} "
                continue

            if "greek" in child.attrib.get("type", ""):
                greek_dict[child.attrib["type"]] = _text(child, False)
                continue

            # TODO: (#51) Handle remaining children.

        greek_parts: list[str] = []
        for key, val in sorted(greek_dict.items()):
            if val is None:
                greek_parts = []
                break
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

        for xr in entry.iterfind(TEI_NS + "xr"):
            for ref in xr:
                ref_target: str = _clean(ref.attrib["target"])
                assert ref_target
                # pylint: disable-next=line-too-long
                yield f"{xr.attrib["type"]}. #{ref_target}# {_text(ref)} "

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
        etym = _gloss_bibl(etym)
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

    def format(self, pair: tuple[_SenseChild, str]) -> str:
        if pair[0] == "bibl":
            return page.LINE_BREAK.join(text.ssplit(pair[1], "; "))
        return f'<span class="{pair[0]}">{pair[1]}</span>'

    def identify(self) -> tuple[int, str]:
        return (self._sense_n, self._sense_id)

    def tr(self) -> str:
        return "".join(self._tr_aux())

    def _tr_aux(self) -> abc.Generator[str]:
        yield f"<!--sense_number:{self._sense_n}, sense_id:{self._sense_id}-->"
        yield "<tr>"
        yield '<td class="meaning">'
        yield page.LINE_BREAK.join(
            map(self.format, self.subset("quote", "definition")),
        )
        yield "</td>"
        yield '<td class="bibl">'
        yield page.LINE_BREAK.join(map(self.format, self.subset("bibl")))
        yield "</td>"
        yield "</tr>"
        ref_xr = self.subset("ref", "xr")
        if ref_xr:
            yield "<tr>"
            yield '<td class="ref_xr" colspan="2">'
            yield page.LINE_BREAK.join(map(self.format, ref_xr))
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
        if name == "xr" and isinstance(value, ET.Element):
            for ref in value:
                self._last_sense.add(
                    "xr",
                    # pylint: disable-next=line-too-long
                    f"{value.tag[29:]}. {ref.attrib["target"]}# {_text(ref)}",
                )
            return

        if isinstance(value, ET.Element):
            value = _text(value)
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
    return ref_bibl


def _form_sort_key(form: ET.Element) -> tuple[str, str]:
    # TODO: (#51) You could do a lot better than this!
    # Try to mimic Crum's sorting behavior. Verbs should be sorted by case
    # (infinitive, prenominal, pronominal, then qualitative), singular nouns
    # should precede plural nouns, ...
    # This sorting behavior would be more intuitive. Consistency with Crum is
    # also beneficial.
    # For now, the criteria below mimic CDO's.
    geo: str = _geo(form)
    if geo == "O":
        geo = "K"
    if geo != "S":
        geo = f"_{geo}"
    return (
        # We first sort by the orthographic form.
        # For two forms that are identical in spelling, we want prenominal forms
        # precede prenominal forms, so we change the prefix of the latter from
        # "⸗" to "--".
        # The prefix of the former is simply "-".
        _orth(form).replace("⸗", "--"),
        # Secondly, we sort by dialect.
        geo,
    )


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
        is_greek: bool,
    ) -> None:
        self.entry_xml_id: str = entry_xml_id
        self.lemma_form_id: str | None = lemma_form_id
        self.orthstring: Orthography = orthstring
        self.pos_string: str = pos_string
        self.langs: dict[str, Lang] = langs
        self.etym_string: Etymology = etym_string
        self.is_greek: bool = is_greek

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

    def has_dialect(self, geo: str) -> bool:
        return self.orthstring.has_dialect(geo)

    def has_a_dialect(self, geos: abc.Iterable[str]) -> bool:
        return any(map(self.has_dialect, geos))


def _geo(form: ET.Element) -> str:
    geo: str
    usgs: list[ET.Element] = form.findall(TEI_NS + "usg")
    if usgs:
        assert len(usgs) == 1
        assert usgs[0].attrib["type"] == "geo"
        geo = _text(usgs[0])
    else:
        geo = DEFAULT_GEO
    del usgs

    geo = _GEO_MAPPING.get(geo, geo)
    ensure.ensure(geo in GEOS, "unknown dialect:", geo)
    return geo


def deprecated(element: ET.Element) -> bool:
    return "deprecated" in element.attrib.get("change", "")


def _is_lemma(form: ET.Element) -> bool:
    return not deprecated(form) and form.attrib["type"] == "lemma"


def _orth(lemma: ET.Element) -> str:
    orths: list[ET.Element] = lemma.findall(TEI_NS + "orth")
    assert len(orths) == 1
    return _text(orths[0])


def _process_entry(entry: ET.Element) -> Word:

    entry_xml_id: str = entry.attrib[XML_NS + "id"]

    forms: list[ET.Element] = entry.findall(TEI_NS + "form")
    forms = [f for f in forms if not deprecated(f)]

    lemma: ET.Element | None = None
    try:
        lemma = next(filter(_is_lemma, forms))
    except StopIteration:
        log.error("No lemma found for", entry_xml_id)

    forms = sorted(forms, key=_form_sort_key)
    if lemma is not None:
        lemma_orth: str = _orth(lemma)
        forms = sorted(
            forms,
            key=lambda form: any(
                _text(orth) == lemma_orth
                for orth in form.iterfind(TEI_NS + "orth")
            ),
            reverse=True,
        )

    orthography: Orthography = Orthography()

    for form in forms:
        if (
            lemma is not None
            and form.attrib[XML_NS + "id"] == lemma.attrib[XML_NS + "id"]
        ):
            continue

        gram_grp: ET.Element | None = form.find(TEI_NS + "gramGrp")
        if gram_grp is None:
            gram_grp = entry.find(TEI_NS + "gramGrp")
        assert gram_grp

        orthography.add(
            " ".join(map(_text, gram_grp)),
            _orth(form),
            _geo(form),
            form.attrib[XML_NS + "id"],
        )

    langs: dict[str, Lang] = {
        "de": Lang("de"),
        "en": Lang("en"),
        "fr": Lang("fr"),
    }

    for sense_n, sense in enumerate(entry.iterfind(TEI_NS + "sense"), 1):
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
            assert child.attrib["type"] in ["translation", "example"]

            bibl: ET.Element | None = child.find(TEI_NS + "bibl")
            if bibl is not None:
                for lang in langs.values():
                    lang.add("bibl", bibl)
            del bibl

            language: str | None
            for quote in child.iterfind(TEI_NS + "quote"):
                language = quote.get(XML_NS + "lang")
                if not language:
                    # TODO: (#51) Incorporate quotes with an unknown language.
                    continue
                langs[language].add("quote", _text(quote))

            for definition in child.iterfind(TEI_NS + "def"):
                langs[definition.attrib[XML_NS + "lang"]].add(
                    "definition",
                    definition,
                )

            # TODO: (#51) Handle other children of <cit>

    # POS -- a single Scriptorium POS tag for each entry
    pos_list: list[str] = []
    for gramgrp in entry.iter(TEI_NS + "gramGrp"):
        pos = gramgrp.find(TEI_NS + "pos")
        if pos is not None:
            pos_text = _text(pos)
        else:
            pos_text = "None"
        subc = gramgrp.find(TEI_NS + "subc")
        if subc is not None:
            subc_text = _text(subc)
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
        Etymology(entry),
        _is_greek(entry),
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
            ensure.ensure(
                FORM_RE.fullmatch(form),
                "line",
                line,
                "has an invalid form",
                form,
            )
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
            ensure.ensure(
                FORM_RE.fullmatch(form),
                "line",
                line,
                "has an invalid form",
                form,
            )
            supp[tla_id].add(form)

    return supp


def body_element() -> ET.Element:
    txt: ET.Element | None = (
        ET.parse(COMPREHENSIVE).getroot().find(TEI_NS + "text")
    )
    assert txt
    body: ET.Element[str] | None = txt.find(TEI_NS + "body")
    assert body

    return body


def _words() -> abc.Generator[Word]:
    """Generate words from the given XML file.

    Yields:
        Word objects representing entries in the dataset.
    """
    for child in body_element():
        # Every child is either a super entry or an entry.
        entries: ET.Element | list[ET.Element] = (
            child if child.tag == TEI_NS + "superEntry" else [child]
        )
        for entry in entries:
            assert entry.tag == TEI_NS + "entry"
            if deprecated(entry):
                continue
            try:
                yield _process_entry(entry)
            # pylint: disable-next=broad-exception-caught
            except Exception as e:
                log.fatal(
                    "Error processing entry",
                    entry.attrib[XML_NS + "id"],
                    e,
                )


def _augmented_words() -> abc.Generator[Word]:
    """Augment the stream of words with supplemental forms.

    Yields:
        Word objects, with supplemental entries added.
    """
    b_supp: dict[str, list[str]] = _bohairic_supplemental()
    s_supp: dict[str, set[str]] = _sahidic_supplemental()
    # TODO: (#305) Part-of-speech info is present in the source data. Use it
    # instead of using an empty gram_grp for all supplemental forms.
    for word in _words():
        # Add Sahidic entries before Bohairic ones.
        # Additionally, we sort Sahidic entries to make the output
        # deterministic.
        # TODO: (#305) Use the same sorting logic used for TLA forms.
        for orth in sorted(s_supp.pop(word.entry_xml_id, [])):
            if word.orthstring.has(orth):
                # The word already has this orth.
                continue
            word.orthstring.add("", orth, "S", FROM_COPTIC_SCRIPTORIUM)
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
            word.orthstring.add("", orth, "B", FROM_COPTIC_SCRIPTORIUM)
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


# The `geos` parameter uses a tuple instead of a list because
# `functools.cache` requires all arguments to be hashable.
@functools.cache
def comprehensive(geos: tuple[str, ...] | None = None) -> dict[str, Word]:
    return {
        w.entry_xml_id: w
        for w in _augmented_words()
        if not geos or w.has_a_dialect(geos)
    }


@functools.cache
def egyptian(geos: tuple[str, ...] | None = None) -> dict[str, Word]:
    words: dict[str, Word] = {
        k: w for k, w in comprehensive(geos).items() if not w.is_greek
    }
    if not geos:
        assert len(words) == NUM_EGYPTIAN, len(words)
    return words


@functools.cache
def greek(geos: tuple[str, ...] | None = None) -> dict[str, Word]:
    words: dict[str, Word] = {
        k: w for k, w in comprehensive(geos).items() if w.is_greek
    }
    if not geos:
        assert len(words) == NUM_GREEK, len(words)
    return words


def _join(*parts: str) -> str:
    return "".join(parts)


def notes_aux(
    words: dict[str, Word],
    dialects: abc.Iterable[str] | None = None,
) -> abc.Generator[deck.Note]:
    for key, word in words.items():
        front: str = word.orthstring.table()
        back: str = _join(
            word.merge_langs().table(),
            word.etym_string.process(),
            page.HORIZONTAL_RULE,
            "<footer>",
            "Coptic Dictionary Online: ",
            '<a href="',
            word.cdo(),
            '">',
            word.entry_xml_id,
            "</a>",
            "</footer>",
        )
        yield deck.Note(
            key=str(key),
            title=str(key),
            front=front,
            back=back,
            js_start=javascript.dialects_js(dialects or set()),
            js_path=relpath(paths.KELLIA_JS),
            css=[relpath(paths.CRUM_CSS), relpath(paths.TOOLTIP_CSS)],
        )


_KELLIA_RETAIN_CLASSES = {
    "word",
    "spelling",
    "dialect",
    "type",
    "lang",
    "geo",
    "gram_grp",
} | set(GEOS)

XOOXLE: xooxle.Xooxle = xooxle.Xooxle(
    source=((note.key, note.html) for note in notes_aux(comprehensive())),
    extract=[
        xooxle.Selector({"name": "footer"}, force=False),
        xooxle.Selector({"class_": "bibl"}, force=False),
        xooxle.Selector({"class_": "ref_xr"}, force=False),
        xooxle.Selector({"class_": "ref"}, force=False),
    ],
    captures=[
        xooxle.Capture(
            "ORTHS",
            xooxle.Selector({"id": "orths"}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.Capture(
            "SENSES",
            xooxle.Selector({"id": "senses"}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.Capture(
            "TEXT",
            xooxle.Selector(
                {"name": "body"},
            ),
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "kellia.json"),
)
