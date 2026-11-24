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
import regex

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
# _ROW_CLASS is the class of the span holding the value of a sense row. A
# bibliography row is split into citations instead, so it has no entry.
_ROW_CLASS: dict[_SenseChild, str] = {
    "quote": dict_cls.GLOSS,
    "definition": cls.DEFINITION,
    "ref": cls.REF,
    "xr": cls.XR,
}
# _CITATION_DELIMITER separates the citations of a sense. The source delimits
# them with a semicolon, and so does the Xooxle index, which displays them on a
# single line. Cards hide the delimiter, and stack the citations instead.
_CITATION_DELIMITER: str = f'<span class="{cls.DELIMITER}">; </span>'
# _GREEK_WORD_RE matches a Greek word. A word may contain optional letters in
# parentheses (`βησ(σ)ίον`), end with an elision mark (`ἀλλ'`), and start or
# end with a hyphen if it's only part of a word (`ἀν-`, `-ἔρχεσθαι`).
_GREEK_WORD_RE: regex.Pattern[str] = regex.compile(
    r"-?\p{Greek}[\p{Greek}\p{M}]*"
    r"(?:\([\p{Greek}\p{M}]+\)[\p{Greek}\p{M}]*)*'?-?",
)
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

_GEO_MAPPING: dict[str, str] = {
    "?": "U",
    "Ak": "O",
}
DEFAULT_GEO = "S"

GEOS: list[str] = ["S", "A", "L", "B", "F", "M", "O", "P", "V", "W", "U"]


def relpath(dst: str | pathlib.Path) -> str:
    return os.path.relpath(dst, paths.LEXICON_DIR)


class Form:
    """Form represents a single word form.

    We omit the ID of the form, which is internal to the dataset, and which we
    have no use for.
    """

    def __init__(
        self,
        gram_grp: str,
        orth: str,
        geo: str,
        remarks: tuple[str, ...],
    ) -> None:
        self.gram_grp: str = gram_grp
        self.orth: str = orth
        self.geo: str = geo
        self.remarks: tuple[str, ...] = remarks


def _span(content: str, *classes: str) -> str:
    return f'<span class="{" ".join(classes)}">{content}</span>'


class Orthography:
    """Orthography stores the word forms."""

    def __init__(self) -> None:
        self.forms: list[Form] = []

    def add(
        self,
        gram_grp: str,
        orth: str,
        geo: str,
        remarks: tuple[str, ...] = (),
    ) -> None:
        self.forms.append(Form(gram_grp, orth, geo, remarks))

    def has(self, orth: str) -> bool:
        return any(f.orth == orth for f in self.forms)

    def has_dialect(self, geo: str) -> bool:
        return any(f.geo == geo for f in self.forms)

    def _groups(
        self,
    ) -> dict[str, dict[tuple[str, tuple[str, ...]], list[str]]]:
        """Group the forms by grammatical type, and the dialects by form.

        Returns:
            The dialects of each form and its remarks, by grammatical type.
            Types and forms retain the order of their first occurrence.
            Dialects follow the order of `GEOS`, which is Crum's.
        """
        groups: dict[str, dict[tuple[str, tuple[str, ...]], set[str]]] = {}
        for form in self.forms:
            groups.setdefault(form.gram_grp, {}).setdefault(
                (form.orth, form.remarks),
                set(),
            ).add(form.geo)
        return {
            gram_grp: {
                form: sorted(geos, key=GEOS.index)
                for form, geos in forms.items()
            }
            for gram_grp, forms in groups.items()
        }

    def table_aux(self) -> abc.Generator[str]:
        """Construct a table of the forms, grouped by grammatical type.

        Each type gets a row group, which Xooxle treats as a unit. The type
        occupies the first row, unless it's empty, and each of its forms
        occupies a row of its own, followed by the concatenated sigla of its
        dialects, like in Crum, and by its remarks.

        Yields:
            The HTML of the table.
        """
        yield f'<table class="{cls.ORTHS}">'
        for gram_grp, forms in self._groups().items():
            yield "<tbody>"
            if gram_grp:
                # Like in Crum, the type is parenthesized, and carries no
                # dialects.
                yield f'<tr><td class="{dict_cls.PART_OF_SPEECH}">'
                yield f"({gram_grp})"
                yield "</td></tr>"
            # TODO: (#51) Consider grouping the forms more intelligently, like
            # Crum does. Forms that share the same set of dialects could share
            # a line, separated by commas, and followed by their dialects only
            # once (such as `ⲁⲗ, ⲁⲁⲗ SA`). A form's remarks would still need
            # to stay next to it.
            for (orth, remarks), geos in forms.items():
                # The highlighter dims the children of a `word` that belong to
                # none of the active dialects, so each child carries the
                # classes of its dialects. See `docs/crum/highlight.ts`.
                yield "<tr>"
                yield f'<td class="{" ".join([dict_cls.WORD, *geos])}">'
                yield _span(orth, dict_cls.SPELLING, *geos)
                yield " "
                yield "".join(
                    _span(geo, dict_cls.DIALECT, geo) for geo in geos
                )
                for remark in remarks:
                    yield " "
                    yield _span(remark, cls.REMARK, *geos)
                yield "</td>"
                yield "</tr>"
            yield "</tbody>"
        yield "</table>"

    def table(self) -> str:
        return "".join(self.table_aux())


def _remark(note: tei.Note) -> str:
    """Render a note of a grammatical group as a remark on a form.

    Args:
        note: The note.

    Returns:
        The text of the note, parenthesized, unless it already is.
    """
    text: str = note.text
    if text.startswith("(") and text.endswith(")"):
        return text
    return f"({text})"


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
            # We omit the DDGLC ID of the lemma. It could only serve to link to
            # the DDGLC, and our site strives to be self-sufficient rather than
            # send the reader elsewhere.
            # The meaning and the reference are optional. The meaning is styled
            # like a gloss, and the part of speech like an inlined type.
            parts: list[str] = [_greek(lemma.lemma)]
            if lemma.meaning is not None:
                parts.append(
                    f'<span class="{dict_cls.GLOSS}">{lemma.meaning}</span>',
                )
            parts.append(f'<span class="{dict_cls.TYPE}">{lemma.pos}</span>')
            if lemma.ref is not None:
                parts.append(
                    f'<span class="{cls.GREEK_REF}">({lemma.ref})</span>',
                )
            yield " ".join(parts)

        for xr in entry.xrs:
            for ref in xr.refs:
                yield _xr(xr.type, ref)


class Sense:
    """_Sense represents a meaning of a word."""

    def __init__(self) -> None:
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
        return f'{label}<span class="{_ROW_CLASS[name]}">{value}</span>'

    def tbody(self) -> str:
        return "".join(self._tbody_aux())

    def _tbody_aux(self) -> abc.Generator[str]:
        yield "<tbody>"
        yield "<tr>"
        yield f'<td class="{dict_cls.MEANING}">'
        yield self._explanation()
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
        yield "</tbody>"

    def _explanation(self) -> str:
        """Render the explanation of the sense, one line per language.

        The explanation in a language starts with a row that bears the label of
        the language (see `explain`). Its definitions follow its quotes on the
        same line, in parentheses, like a note that follows a gloss.

        Returns:
            The HTML of the explanation.
        """
        lines: list[list[str]] = []
        for row in self.subset("quote", "definition"):
            name, _, label = row
            if label or not lines:
                lines.append([])
            line: list[str] = lines[-1]
            html: str = self.format(row)
            line.append(f"({html})" if line and name == "definition" else html)
        return page.LINE_BREAK.join(" ".join(line) for line in lines)

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

    def start_sense(self) -> None:
        self.senses.append(Sense())

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
            yield sense.tbody()
        yield "</table>"


def _tree_aux(
    nodes: list[trie.Node],
    top: bool,
) -> abc.Generator[str]:
    """Render trie nodes as list items.

    Args:
        nodes: The nodes to render.
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
        parts.extend(f"({label})" for label in labels)
        yield "<li>"
        yield " ".join(parts)
        if node.children:
            # Likewise, separate a node from its children.
            yield " <ul>"
            yield from _tree_aux(list(node.children.values()), False)
            yield "</ul>"
        yield "</li>"


def _greek(text: str) -> str:
    """Mark the Greek words in a text.

    We mark each word, rather than the whole text, because the text may also
    hold German or Latin notes (`βᾶρις (ägyptisches Lehnwort)`), and because the
    frontend looks up the words one by one.

    Args:
        text: A text holding Greek words.

    Returns:
        The HTML of the text.
    """
    return _GREEK_WORD_RE.sub(
        lambda m: f'<span class="{dict_cls.GREEK}">{m.group()}</span>',
        text,
    )


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
    """Word represents a word in the KELLIA dictionary.

    We omit the ID of the lemma form, which is internal to the dataset, and
    which we have no use for. The ID of the entry is the key of the word, and
    links it to Coptic Dictionary Online.
    """

    def __init__(
        self,
        entry_xml_id: str,
        orthstring: Orthography,
        langs: dict[str, Lang],
        etym_string: Etymology,
        is_greek: bool,
    ) -> None:
        self.entry_xml_id: str = entry_xml_id
        self.orthstring: Orthography = orthstring
        self.langs: dict[str, Lang] = langs
        self.etym_string: Etymology = etym_string
        self.is_greek: bool = is_greek

    def merge_langs(self) -> Lang:
        merged: Lang = Lang("MERGED")
        de, en, fr = self.langs["de"], self.langs["en"], self.langs["fr"]
        assert len(de.senses) == len(en.senses) == len(fr.senses)
        for d, e, f in zip(de.senses, en.senses, fr.senses):
            merged.start_sense()
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
        (we omit the redundant attribution).

        Yields:
            The HTML of the tree.
        """
        de, en, fr = self.langs["de"], self.langs["en"], self.langs["fr"]
        assert not any(s.explain() for s in [*de.senses, *fr.senses])
        senses: list[Sense] = en.senses
        assert not any(s.subset("definition", "ref", "xr") for s in senses)
        assert all(s.single("bibl") == "DDGLC" for s in senses)
        yield f'<ul class="{cls.SENSES}">'
        yield from _tree_aux(
            trie.build([s.single("quote") for s in senses]),
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

        # TODO: (#51) Render the note of the form as a remark, like the notes
        # of its grammatical group. Some explain when the form is used (such
        # as `ⲁⲑ-`, `vor Liquiden`), or how Greek renders a name.

        # The notes of the grammatical group are remarks on the form, rather
        # than part of its type. Forms of the same type thus share a group,
        # though each repeats the remarks that it shares with others.
        gram_grp: tei.GramGrp = entry.grammar(form)
        orthography.add(
            " ".join(
                child.text
                for child in gram_grp.children
                if not isinstance(child, tei.Note)
            ),
            form.orth.text,
            _geo(form),
            tuple(map(_remark, gram_grp.notes)),
        )

    langs: dict[str, Lang] = {
        "de": Lang("de"),
        "en": Lang("en"),
        "fr": Lang("fr"),
    }

    # We omit the ID of each sense, which is internal to the dataset, and its
    # position, which the order of the senses already shows.
    for sense in entry.senses:
        for lang in langs.values():
            lang.start_sense()

        for child in sense.children:
            match child:
                case tei.SenseRef() if child.type == "coptic_usage::cu_ID":
                    # We omit the DDGLC usage IDs. They are bare numbers, which
                    # we can't link to anything, so they would only clutter
                    # the senses.
                    pass
                case tei.SenseRef():
                    for lang in langs.values():
                        lang.add("ref", _greek(child.text))
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

    return Word(
        entry.xml_id,
        orthography,
        langs,
        Etymology(entry),
        entry.ddglc,
    )


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
            word.orthstring.add("", orth, "S")
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
            word.orthstring.add("", orth, "B")
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
            word.etym_string.amir,
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
    dict_cls.PART_OF_SPEECH,
    cls.LANG,
    cls.REMARK,
    dict_cls.GLOSS,
    cls.BIBL,
    cls.REF,
    cls.XR,
    cls.XR_TARGET,
    dict_cls.GREEK,
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
            # Each grammatical type, along with its forms, is a unit, so the
            # frontend separates the types with rules.
            unit_tags={"tbody"},
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
            # Each sense of an Egyptian word is a unit, so the frontend
            # separates the senses with rules. A Greek tree has no row groups,
            # so it remains a single unit.
            unit_tags={"tbody"},
        ),
        xooxle.Capture(
            "TEXT",
            xooxle.Selector(
                {"name": "body"},
            ),
            # The notes and the Greek references retain their classes, so the
            # frontend can explain the works that they cite. Cross-references
            # retain theirs, so the frontend can link them. The meaning and the
            # part of speech of a Greek lemma retain theirs, which style them.
            retain_classes={
                cls.ETYM_NOTE,
                cls.GREEK_REF,
                cls.XR_TARGET,
                dict_cls.GREEK,
                dict_cls.GLOSS,
                dict_cls.TYPE,
            },
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "kellia.json"),
)
