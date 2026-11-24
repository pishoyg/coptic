#!/usr/bin/env python3
"""Process KELLIA's dictionary.

The dictionary combines the TLA / DDGLC / CDO core data (see `COMPREHENSIVE`)
with supplemental forms maintained by Coptic Scriptorium (see
`BOHAIRIC_SUPPLEMENTAL_SHEET_URL` and `SAHIDIC_SUPPLEMENTAL`).

We based this logic on the CDO's `dictionary_reader.py`:
  https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py
Parts of it, particularly those pertaining to supplemental forms, are derived
from pieces that, as of October 2025, live in the `dev` version of the file:
  https://github.com/KELLIA/dictionary/blob/dev/utils/dictionary_reader.py

The original code is very badly written and is completely unmaintainable, and
it has several (small) bugs. Our code has since significantly diverged from the
original, and there is little overlap left.

There are artifacts that we chose to ignore in our own pipeline:
- Egyptian etymologies:
  https://github.com/KELLIA/dictionary/blob/dev/utils/egyptian_etymologies.tab
- Entity types:
  https://github.com/KELLIA/dictionary/blob/edac2731c86fb02819436d39d127344e4e0bf514/utils/dictionary_reader.py#L14
- `oRef` tags:
  https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-oRef.html
"""

# TODO: (#525) Consider using the same HTML structure as Crum.

# NOTE: Our HTML uses classes rather than IDs, because Crum embeds KELLIA
# entries in its pages, and several entries on one page would have the same
# IDs.

import functools
import itertools
import os
import pathlib
import re
import typing
from collections import abc, defaultdict

import pandas as pd

from dictionary import cls as dict_cls
from dictionary.kellia_uni_goettingen_de import cls, tei, trie
from flashcards import deck
from utils import ensure, file, gcp, javascript, log, page, paths
from xooxle import xooxle

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
# COMPREHENSIVE is the path to the dataset that contains both Greek and Egyptian
# words. It comprises the core of the dictionary, and is retrieved from
# "Comprehensive Coptic Lexicon: Including Loanwords from Ancient Greek v 1.2":
# https://refubium.fu-berlin.de/handle/fub188/27813
# Commit 84c1044282faa12daf748858351b989376f82018 integrates some changes made
# by Coptic Scriptorium to the CDO's copy of the XML:
# https://github.com/KELLIA/dictionary/blob/master/xml/Comprehensive_Coptic_Lexicon-v1.2-2020.xml
# We may have made some changes afterwards. Use `git log` or `git diff` to find
# them.
COMPREHENSIVE: pathlib.Path = (
    _SCRIPT_DIR
    / "data"
    / "input"
    / "v1.2"
    / "Comprehensive_Coptic_Lexicon-v1.2-2020.xml"
)
NUM_GREEK: int = 3208
NUM_EGYPTIAN: int = 8055

_SenseChild = typing.Literal["quote", "definition", "bibl", "ref", "xr"]
_SENSE_CHILDREN: list[_SenseChild] = [
    "quote",
    "definition",
    "bibl",
    "ref",
    "xr",
]
# A sense row is a tuple of (name, value, label). The label is an optional
# HTML prefix, such as a language label, rendered before the value.
_Row = tuple[_SenseChild, str, str]
# _CITATION_DELIMITER separates the citations of a sense. The source delimits
# them with a semicolon, and so does the Xooxle index, which displays them on a
# single line. Cards hide the delimiter, and stack the citations instead.
_CITATION_DELIMITER: str = f'<span class="{cls.DELIMITER}">; </span>'
FORM_RE: re.Pattern[str] = re.compile(r"[Ⲁ-ⲱϢ-ϯⳈⳉ]+[†⸗\-]?")
PURE_COPTIC_RE: re.Pattern[str] = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ]+")

# Coptic Scriptorium has attempted to grow the data by adding supplemental
# forms. As of the time of writing, the CDO is capable of expanding an entry by
# adding variant forms, but it can't add any new entries that lack an ID.
#
# BOHAIRIC_SUPPLEMENTAL_SHEET_URL is the sheet, maintained by Coptic
# Scriptorium, from which we retrieve the Bohairic supplemental forms directly.
# The data that the CDO actually uses is unavailable to us, but it's derived
# from this sheet:
# https://github.com/KELLIA/dictionary/blob/edac2731c86fb02819436d39d127344e4e0bf514/utils/dictionary_reader.py#L591
BOHAIRIC_SUPPLEMENTAL_SHEET_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1r9J5nuQFQxgInLpX1Gm-I20nunIBjmGFR3CfFgK0THU/export?format=tsv"
)
# BOHAIRIC_SUPPLEMENTAL_VERIFIED is the number of verified entries in the
# Bohairic supplemental data. Only this subset will be processed.
BOHAIRIC_SUPPLEMENTAL_VERIFIED: int = 999
_BOHAIRIC_SUPPLEMENTAL_COLS: list[str] = ["word", "lemma", "tla"]
# SAHIDIC_SUPPLEMENTAL is a snapshot, taken in October 2025, of the CDO's
# `inflections.tab`. As of the time of writing, it remains on the CDO's `dev`
# branch:
# https://github.com/KELLIA/dictionary/blob/dev/utils/inflections.tab
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
        yield f'<tr class="{dict_cls.WORD} {self.geo}">'
        # We separate the nonempty cells with spaces, so they remain separated
        # when the table gets flattened into text (as is the case in Xooxle).
        separate: bool = False
        for txt, classes in [
            (self.orth, [cls.ORTH, dict_cls.SPELLING]),
            (self.geo, [cls.GEO, dict_cls.DIALECT]),
            (self.gram_grp or "", [cls.GRAM_GRP, dict_cls.TYPE]),
        ]:
            if separate and txt:
                yield " "
            separate = separate or bool(txt)
            yield self._td(txt, *classes)
        yield "</tr>"


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
        yield f'<table class="{cls.ORTHS}">'
        for line in self.forms:
            yield from line.tr_aux()
        yield "</table>"

    def table(self) -> str:
        return "".join(self.table_aux())


class Etymology:
    """Etymology represents the etymology of a word."""

    def __init__(self, entry: tei.Entry) -> None:
        # Each note, reference, cross-reference, and Greek lemma occupies a
        # line of its own.
        self.amir: str = page.LINE_BREAK.join(filter(None, self._amir(entry)))

    def _amir(self, entry: tei.Entry) -> abc.Generator[str]:
        for child in entry.etym.children if entry.etym is not None else []:
            match child:
                case tei.Note():
                    yield f'<span class="{cls.ETYM_NOTE}">{child.text}</span>'
                case tei.Xr():
                    for ref in child.refs:
                        yield _xr(child.type, ref)
                case tei.EtymRef() if child.wcn:
                    assert child.target is not None
                    # The target is the WCN ID, prefixed with `#`.
                    yield f"{child.type}: {child.target.removeprefix("#")}"
                case tei.EtymRef():
                    # The Greek lemma is rendered below.
                    # TODO: (#51) Handle the remaining references.
                    pass
                case _:
                    typing.assert_never(child)

        lemma: tei.GreekLemma | None = (
            entry.etym.greek_lemma if entry.etym is not None else None
        )
        if lemma is not None:
            # TODO: (#51) Omit the meaning and the reference when they're
            # missing, rather than rendering an empty `<i></i>.` and `()`.
            yield " ".join(
                [
                    '<span style="color:darkred">cf. Gr. (DDGLC lemma ID'
                    f" {lemma.lemma_id})</span> {lemma.lemma}",
                    f"<i>{lemma.meaning or ""}</i>.",
                    f'<span style="color:grey">{lemma.pos}</span>',
                    f'<span class="{cls.GREEK_REF}" style="color:grey">'
                    f'({lemma.ref or ""})</span>',
                ],
            )

        for xr in entry.xrs:
            for ref in xr.refs:
                yield _xr(xr.type, ref)

    def process(self) -> str:
        if not self.amir:
            return ""
        return f'<span class="{cls.ETYM}">{self.amir}</span>'


class Sense:
    """_Sense represents a meaning of a word."""

    def __init__(self, sense_n: int, sense_id: str) -> None:
        self._sense_n: int = sense_n
        self._sense_id: str = sense_id
        self._content: list[_Row] = []

    def add(self, name: _SenseChild, value: str, label: str = "") -> None:
        assert name in _SENSE_CHILDREN
        assert value
        self._content.append((name, value, label))

    def format(self, row: _Row) -> str:
        name, value, label = row
        if name == "bibl":
            assert not label
            return f'<span class="{cls.CITATION}">{value}</span>'
        klass: str = dict_cls.GLOSS if name == "quote" else name
        return f'{label}<span class="{klass}">{value}</span>'

    def identify(self) -> tuple[int, str]:
        return (self._sense_n, self._sense_id)

    def tr(self) -> str:
        return "".join(self._tr_aux())

    def _tr_aux(self) -> abc.Generator[str]:
        yield f"<!--sense_number:{self._sense_n}, sense_id:{self._sense_id}-->"
        yield "<tr>"
        yield f'<td class="{dict_cls.MEANING}">'
        yield page.LINE_BREAK.join(
            map(self.format, self.subset("quote", "definition")),
        )
        yield "</td>"
        yield f'<td class="{cls.BIBL}">'
        yield _CITATION_DELIMITER.join(map(self.format, self.subset("bibl")))
        yield "</td>"
        yield "</tr>"
        ref_xr = self.subset("ref", "xr")
        if ref_xr:
            yield "<tr>"
            yield f'<td class="{cls.REF_XR}" colspan="2">'
            yield page.LINE_BREAK.join(map(self.format, ref_xr))
            yield "</td>"
            yield "</tr>"

    def subset(self, *names: _SenseChild) -> list[_Row]:
        assert all(n in _SENSE_CHILDREN for n in names), names
        return [row for row in self._content if row[0] in names]

    def single(self, name: _SenseChild) -> str:
        """Return the value of the only child of the given type.

        Args:
            name: The type of the child.

        Returns:
            The value of the child.
        """
        ((_, value, _),) = self.subset(name)
        return value

    def explain(self, label: str = "") -> list[_Row]:
        explanation = self.subset("quote", "definition")
        if not explanation:
            return explanation
        if label:
            name, value, _ = explanation[0]
            explanation[0] = (name, value, label)
        return explanation

    def give_references(self) -> list[_Row]:
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

    def add(self, name: _SenseChild, value: str, label: str = "") -> None:
        self._last_sense.add(name, value, label)

    def table(self) -> str:
        return "".join(self.table_aux())

    def table_aux(self) -> abc.Generator[str]:
        yield f'<table class="{cls.SENSES}">'
        yield "<colgroup>"
        yield "<col>"
        yield "<col>"
        yield "</colgroup>"
        for sense in self.senses:
            yield sense.tr()
        yield "</table>"


def _tree_aux(
    nodes: list[trie.Node],
    senses: list[Sense],
    top: bool,
) -> abc.Generator[str]:
    """Render trie nodes as list items.

    Args:
        nodes: The nodes to render.
        senses: The senses of the word. Nodes refer to them by index.
        top: Whether the nodes are top-level nodes. The first label of a
            top-level node is the head of its senses. All other labels are
            qualifiers, and get rendered as children, even when they are merged
            into the same line as their parent.

    Yields:
        The HTML of the list items.
    """
    for idx, node in enumerate(nodes):
        if idx:
            # Separate siblings with a space, so their words don't fuse when
            # the tree gets flattened into text (as is the case in Xooxle).
            # Browsers ignore whitespace between list items.
            yield " "
        labels: list[str] = node.labels
        parts: list[str] = []
        if top:
            parts.append(f'<span class="{dict_cls.GLOSS}">{labels[0]}</span>')
            labels = labels[1:]
        parts.extend(
            f'<span class="{cls.CHILD}">({label})</span>' for label in labels
        )
        yield "<li>"
        yield " ".join(parts)
        if node.senses:
            # A node can terminate several senses, if they are identical.
            terminated: list[Sense] = [senses[i] for i in node.senses]
            for s in terminated:
                sense_n, sense_id = s.identify()
                yield f"<!--sense_number:{sense_n}, sense_id:{sense_id}-->"
            # Separate the reference from the preceding text, so their words
            # don't fuse when the tree gets flattened into text.
            yield f' <span class="{cls.REF}">'
            yield ", ".join(s.single("ref") for s in terminated)
            yield "</span>"
        if node.children:
            # Likewise, separate a node from its children.
            yield " <ul>"
            yield from _tree_aux(list(node.children.values()), senses, False)
            yield "</ul>"
        yield "</li>"


def _xr(typ: str, ref: tei.XrRef) -> str:
    """Render a cross-reference, in a sense or an etymology.

    Args:
        typ: The type of the cross-reference, such as `cf` or `syn`.
        ref: The target of the cross-reference.

    Returns:
        The HTML of the cross-reference.
    """
    # The target is the word, prefixed with `#`. The frontend adds lookup
    # hyperlinks for the word. Adding the link there, rather than here, keeps
    # the HTML and the Xooxle index smaller.
    word: str = ref.target.removeprefix("#")
    return f'{typ}. <span class="{cls.XR_TARGET}">{word}</span> {ref.text}'


def _form_sort_key(form: tei.Form) -> tuple[str, str]:
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
        form.orth.text.replace("⸗", "--"),
        # Secondly, we sort by dialect.
        geo,
    )


class Word:
    """Word represents a word in the KELLIA dictionary."""

    def __init__(
        self,
        entry_xml_id: str,
        lemma_form_id: str,
        orthstring: Orthography,
        pos_string: str,
        langs: dict[str, Lang],
        etym_string: Etymology,
        is_greek: bool,
    ) -> None:
        self.entry_xml_id: str = entry_xml_id
        self.lemma_form_id: str = lemma_form_id
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
            for row in e.explain(f'<span class="{cls.LANG}">(En.)</span> '):
                merged.add(*row)
            for row in d.explain(f'<span class="{cls.LANG}">(De.)</span> '):
                merged.add(*row)
            for row in f.explain(f'<span class="{cls.LANG}">(Fr.)</span> '):
                merged.add(*row)
            for row in d.give_references():
                merged.add(*row)
        return merged

    def senses_html(self) -> str:
        if self.is_greek:
            return "".join(self._tree_aux())
        return self.merge_langs().table()

    def _tree_aux(self) -> abc.Generator[str]:
        """Render the senses of a Greek word as a tree.

        DDGLC senses only have English translations, so we use no language
        labels. Each sense has a single translation, attributed to the DDGLC
        (we omit the redundant attribution), and a single reference (a DDGLC
        Coptic usage ID).

        Yields:
            The HTML of the tree.
        """
        de, en, fr = self.langs["de"], self.langs["en"], self.langs["fr"]
        assert not any(s.explain() for s in [*de.senses, *fr.senses])
        senses: list[Sense] = en.senses
        assert not any(s.subset("definition", "xr") for s in senses)
        assert all(s.single("bibl") == "DDGLC" for s in senses)
        yield f'<ul class="{cls.SENSES}">'
        yield from _tree_aux(
            trie.build([s.single("quote") for s in senses]),
            senses,
            top=True,
        )
        yield "</ul>"

    def cdo(self) -> str:
        return paths.coptic_dictionary_online(self.entry_xml_id)

    def has_dialect(self, geo: str) -> bool:
        return self.orthstring.has_dialect(geo)

    def has_a_dialect(self, geos: abc.Iterable[str]) -> bool:
        return any(map(self.has_dialect, geos))


def _geo(form: tei.Form) -> str:
    geo: str = form.usg.text if form.usg is not None else DEFAULT_GEO
    geo = _GEO_MAPPING.get(geo, geo)
    assert geo in GEOS, geo
    return geo


def _process_entry(entry: tei.Entry) -> Word:
    # TODO: (#51) Mark loanwords. The entry type `foreign` marks the non-Greek
    # ones (such as `ⲥⲓⲣ`, butter).
    # TODO: (#51) Render the note of the entry (such as `Lesung unsicher`).
    lemma: tei.Form = entry.lemma
    forms: list[tei.Form] = sorted(
        (f for f in entry.forms if not f.deprecated),
        key=_form_sort_key,
    )
    forms = sorted(
        forms,
        key=lambda form: form.orth.text == lemma.orth.text,
        reverse=True,
    )

    orthography: Orthography = Orthography()

    for form in forms:
        # TODO: (#51) Render the lemma. We skip it, assuming that another form
        # repeats it, but no form does in a few dozen entries. Some lemmas are
        # merely normalized spellings (`ⲙⲉϩⲧⲟⲟⲧ⸗` of `ⲙⲉϩ ⲧⲟⲟⲧ⸗`), which still
        # helps search. Others are forms of their own, which we lose entirely,
        # along with their grammar (such as the prenominal `ϩⲁⲧⲛ-`, of which
        # only the pronominal `ϩⲁⲧⲟⲟⲧ⸗` shows).
        if form is lemma:
            continue

        # TODO: (#51) Render the note of the form. Some explain when the form
        # is used (such as `ⲁⲑ-`, `vor Liquiden`), or how Greek renders a name.
        gram_grp: tei.GramGrp = entry.grammar(form)
        orthography.add(
            " ".join(child.text for child in gram_grp.children),
            form.orth.text,
            _geo(form),
            form.xml_id,
        )

    langs: dict[str, Lang] = {
        "de": Lang("de"),
        "en": Lang("en"),
        "fr": Lang("fr"),
    }

    for sense_n, sense in enumerate(entry.senses, 1):
        for lang in langs.values():
            lang.start_sense(sense_n, sense.xml_id)

        for child in sense.children:
            match child:
                case tei.SenseRef():
                    for lang in langs.values():
                        lang.add("ref", child.text)
                case tei.Xr():
                    for ref in child.refs:
                        for lang in langs.values():
                            lang.add("xr", _xr(child.type, ref))
                case tei.Note():
                    # TODO: (#51) Render the notes of senses.
                    pass
                case tei.Cit() if child.type == "example":
                    # TODO: (#51) Incorporate examples. They are few, and
                    # mostly compounds or set phrases, without a translation
                    # (such as `ⲁⲗⲙⲡⲉ`, hailstone, under `ⲁⲗ`, pebble).
                    pass
                case tei.Cit():
                    for lang in langs.values():
                        for citation in child.source.citations:
                            lang.add("bibl", citation)
                    for language, quote in child.quotes_by_language.items():
                        langs[language].add("quote", quote)
                    for definition in child.definitions:
                        langs[definition.lang].add(
                            "definition",
                            definition.text,
                        )
                    # TODO: (#51) Handle the notes of <cit>.
                case _:
                    typing.assert_never(child)

    # POS -- a single Scriptorium POS tag for each entry
    # TODO: (#0) Drop the POS tag, along with `_pos_map`. We never render it,
    # and the grammar of each form already shows its part of speech.
    pos_list: list[str] = []
    # This includes the grammatical groups of deprecated forms.
    for group in [*(f.gram_grp for f in entry.forms), entry.gram_grp]:
        if group is None:
            continue
        pos_text: str = group.pos.text if group.pos is not None else "None"
        subc_text: str = group.subcs[0].text if group.subcs else "None"
        new_pos: str = _pos_map(pos_text, subc_text, orthography)
        if new_pos not in pos_list:
            pos_list.append(new_pos)
    if len(pos_list) > 1:
        pos_list = [p for p in pos_list if p not in ["NULL", "NONE", "?"]]
    pos_list = pos_list or ["NULL"]

    return Word(
        entry.xml_id,
        lemma.xml_id,
        orthography,
        # On the rare occasion pos_list has len > 1 at this point, the first one
        # is the most valid.
        pos_list[0],
        langs,
        Etymology(entry),
        entry.ddglc,
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


def snapshot() -> None:
    """Refresh the local snapshot of the Bohairic supplemental sheet.

    The snapshot is tracked in Git, so that an upstream edit shows up as a
    `diff`. Like the Crum snapshots, it only retains the data that we process:
    the verified rows, and the columns that we read.
    """
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
    file.to_tsv(
        df[:BOHAIRIC_SUPPLEMENTAL_VERIFIED][_BOHAIRIC_SUPPLEMENTAL_COLS],
        paths.KELLIA_BOHAIRIC_SUPPLEMENTAL_TSV,
    )


@functools.cache
def _bohairic_supplemental() -> abc.Mapping[str, abc.Sequence[str]]:
    supp: defaultdict[str, list[str]] = defaultdict(list)
    df: pd.DataFrame = file.read_tsv(
        paths.KELLIA_BOHAIRIC_SUPPLEMENTAL_TSV,
    )
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
def _sahidic_supplemental() -> abc.Mapping[str, abc.Set[str]]:
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


def _words() -> abc.Generator[Word]:
    """Generate words from the dataset.

    Yields:
        Word objects representing entries in the dataset.
    """
    for entry in tei.parse(COMPREHENSIVE).iter_entries():
        if entry.deprecated:
            continue
        yield _process_entry(entry)


# NOTE: Supplemental forms have been, well, problematic! They seem to be poorly
# maintained by Coptic Scriptorium. As of October 2025, besides the difficulty
# of accessing the latest data or a stable snapshot (see
# `BOHAIRIC_SUPPLEMENTAL_SHEET_URL` and `SAHIDIC_SUPPLEMENTAL`), their
# processing code seems to also suffer from at least the following:
# - Parts-of-speech of supplemental forms are completely ignored.
# - Markers of prenominal (`-`), pronominal (`⸗`), and qualitative (`†`)
#   forms are omitted.
# - For a given entry, Bohairic supplemental forms are taken on an
#   all-or-nothing basis. No deduplication or merging is performed:
# https://github.com/KELLIA/dictionary/blob/edac2731c86fb02819436d39d127344e4e0bf514/utils/dictionary_reader.py#L467
#
# Lexicon therefore often doesn't show the same set of supplemental forms that
# the CDO shows. The CDO doesn't seem to be under active development at the
# moment, and the above issues aren't expected to be resolved. We are
# considering reverting the addition of supplemental forms, and relying only on
# the core data. See #305.
def _augmented_words() -> abc.Generator[Word]:
    """Augment the stream of words with supplemental forms.

    Yields:
        Word objects, with supplemental entries added.
    """
    b_supp: abc.Mapping[str, abc.Sequence[str]] = _bohairic_supplemental()
    s_supp: abc.Mapping[str, abc.Set[str]] = _sahidic_supplemental()
    seen: set[str] = set()
    # TODO: (#305) Part-of-speech info is present in the source data. Use it
    # instead of using an empty gram_grp for all supplemental forms.
    for word in _words():
        seen.add(word.entry_xml_id)
        # Add Sahidic entries before Bohairic ones.
        # Additionally, we sort Sahidic entries to make the output
        # deterministic.
        # TODO: (#305) Use the same sorting logic used for TLA forms.
        for orth in sorted(s_supp.get(word.entry_xml_id, ())):
            if word.orthstring.has(orth):
                # The word already has this orth.
                continue
            word.orthstring.add("", orth, "S", FROM_COPTIC_SCRIPTORIUM)
        # TODO: (#305) We don't sort Bohairic forms because they already have
        # some order that would be corrupted if we were to reorder them below.
        # The lists retrieved have lamma forms first. We should order them by
        # form while retaining lemma forms at the beginning.
        b: abc.Sequence[str] = b_supp.get(word.entry_xml_id, ())
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
    s_orphans: set[str] = s_supp.keys() - seen
    ensure.ensure(
        not s_orphans,
        "Some Sahidic inflections have invalid TLA IDs:",
        s_orphans,
    )

    # Some Bohairic entries are not consumed.
    # TODO: (#305) Fix at the origin.
    for tla_id in sorted(b_supp.keys() - seen):
        log.error(
            "Bohairic forms",
            b_supp[tla_id],
            "have an invalid TLA ID",
            tla_id,
        )


@functools.cache
def _comprehensive() -> dict[str, Word]:
    return {w.entry_xml_id: w for w in _augmented_words()}


# The `geos` parameter uses a tuple instead of a list because
# `functools.cache` requires all arguments to be hashable.
# Dialect-filtered views share the words of the unfiltered set, so the words
# are parsed and augmented only once.
@functools.cache
def comprehensive(geos: tuple[str, ...] | None = None) -> dict[str, Word]:
    if not geos:
        return _comprehensive()
    return {k: w for k, w in _comprehensive().items() if w.has_a_dialect(geos)}


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
    words: dict[str, Word] | None = None,
    dialects: abc.Iterable[str] | None = None,
) -> abc.Generator[deck.Note]:
    # Default to the comprehensive set, loaded lazily.
    # This allows callers to invoke `notes_aux(comprehensive())` without
    # invoking `comprehensive()` which is expensive.
    # As of the time of writing, it's used by `XOOXLE`, which is defined in the
    # global scope and gets executed at load time.
    if words is None:
        words = comprehensive()
    for key, word in words.items():
        front: str = word.orthstring.table()
        back: str = _join(
            word.senses_html(),
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
    dict_cls.WORD,
    dict_cls.SPELLING,
    dict_cls.DIALECT,
    dict_cls.TYPE,
    cls.LANG,
    cls.GEO,
    cls.GRAM_GRP,
    dict_cls.GLOSS,
    cls.BIBL,
    cls.REF,
    cls.XR,
    cls.XR_TARGET,
} | set(GEOS)


XOOXLE: xooxle.Xooxle = xooxle.Xooxle(
    source=((note.key, note.html) for note in notes_aux()),
    extract=[
        xooxle.Selector({"name": "footer"}, force=False),
    ],
    captures=[
        xooxle.Capture(
            "ORTHS",
            xooxle.Selector({"class_": cls.ORTHS}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.Capture(
            "SENSES",
            xooxle.Selector({"class_": cls.SENSES}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
            # Greek senses are rendered as a tree of nested lists, so we retain
            # the list elements. We don't treat them as block elements, because
            # Xooxle balances the HTML of each line: It closes the tags left
            # open at the end of a line, and reopens them on the next one. Each
            # list item would thus end up in a list of its own.
            # The downside is that the whole tree occupies a single line, and
            # since Xooxle searches the index one line at a time, it sees the
            # text of all the senses concatenated.
            # To keep words from fusing, the tree separates its nodes with
            # spaces (see `_tree_aux`).
            retain_tags=xooxle.RETAIN_TAGS_DEFAULT | {"ul", "li"},
            # A sense ends with its bibliography, followed by its references
            # and cross-references, each on a line of its own. They retain
            # their classes, which style them, and let the frontend explain
            # the cited works.
            block_classes={cls.BIBL},
        ),
        xooxle.Capture(
            "TEXT",
            xooxle.Selector(
                {"name": "body"},
            ),
            # The notes and the Greek references retain their classes, so the
            # frontend can explain the works that they cite. Cross-references
            # retain theirs, so the frontend can link them.
            retain_classes={cls.ETYM_NOTE, cls.GREEK_REF, cls.XR_TARGET},
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "kellia.json"),
)
