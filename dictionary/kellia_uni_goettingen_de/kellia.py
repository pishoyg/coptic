"""Process KELLIA's dictionary.

The dictionary combines the TLA / DDGLC core data (see `paths.KELLIA_XML`)
with supplemental forms maintained by Coptic Scriptorium, which we read from
the Coptic Dictionary Online's entries (see `cdo.py`).

The code was originally inspired by https://github.com/KELLIA/dictionary, but
both our code base and theirs have significantly diverged since then, so the
similarity is virtually non-existent at this point.

The original code was very badly written, and had several (small) bugs, which
we avoid.

There are artifacts that we chose to ignore in our own pipeline:
- Egyptian etymologies:
  https://github.com/KELLIA/dictionary/blob/dev/utils/egyptian_etymologies.tab
- Entity types:
  https://github.com/KELLIA/dictionary/blob/edac2731c86fb02819436d39d127344e4e0bf514/utils/dictionary_reader.py#L14
- `oRef` tags:
  https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-oRef.html
"""

# NOTE: Our HTML uses classes rather than IDs, because Crum embeds KELLIA
# entries in its pages, and several entries on one page would have the same
# IDs.

import functools
import os
import pathlib
import re
import typing
from collections import abc

import regex

from dictionary import cls as dict_cls
from dictionary.kellia_uni_goettingen_de import cdo, cls, tei, trie
from flashcards import deck
from utils import ensure, javascript, page, paths
from xooxle import xooxle

NUM_GREEK: int = 3208
NUM_EGYPTIAN: int = 8055

# A `translation_note` has a language, like the quotes and definitions. A
# `sense_note` is a note of the sense itself, which has none.
_SenseChild = typing.Literal[
    "quote",
    "definition",
    "translation_note",
    "bibl",
    "example",
    "ref",
    "xr",
    "sense_note",
]
_SENSE_CHILDREN: list[_SenseChild] = list(typing.get_args(_SenseChild))
# _EXPLANATION lists the rows that explain a sense in a given language.
_EXPLANATION: tuple[_SenseChild, ...] = (
    "quote",
    "definition",
    "translation_note",
)
# _SUPPLEMENT lists the rows that follow the explanation and the bibliography
# of a sense, each on a line of its own.
_SUPPLEMENT: tuple[_SenseChild, ...] = ("example", "ref", "xr", "sense_note")
# _SHARED lists the rows that no language owns, so all languages share them.
_SHARED: tuple[_SenseChild, ...] = ("bibl", *_SUPPLEMENT)
assert sorted(_EXPLANATION + _SHARED) == sorted(_SENSE_CHILDREN)
# _DDGLC_ROWS lists the only rows that a DDGLC sense has.
_DDGLC_ROWS: tuple[_SenseChild, ...] = ("quote", "bibl")
# A sense row is a tuple of (name, value, label). The label is an optional
# HTML prefix, such as a language label, rendered before the value.
_Row = tuple[_SenseChild, str, str]
# _ROW_CLASS is the class of the span holding the value of a sense row. A
# bibliography row is split into citations instead, so it has no entry.
_ROW_CLASS: dict[_SenseChild, str] = {
    "quote": dict_cls.GLOSS,
    "definition": cls.DEFINITION,
    "translation_note": cls.NOTE,
    "example": cls.EXAMPLE,
    "ref": cls.REF,
    "xr": cls.XR,
    "sense_note": cls.NOTE,
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
# _SUPPLEMENTAL_FORM_RE matches a supplemental form. A form may end with a
# marker of a prenominal (`-`), pronominal (`⸗`), or qualitative (`†`) form, and
# an enclitic starts with a hyphen (`-ⲡⲉ`).
_SUPPLEMENTAL_FORM_RE: re.Pattern[str] = re.compile(
    r"-?[Ⲁ-ⲱϢ-ϯⳈⳉ]+[†⸗\-]?",
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

    def __init__(self, lemma_orth: str) -> None:
        # lemma_orth is the spelling of the lemma. The forms that bear it are
        # marked as such.
        self.lemma_orth: str = lemma_orth
        self.forms: list[Form] = []

    def add(
        self,
        gram_grp: str,
        orth: str,
        geo: str,
        remarks: tuple[str, ...] = (),
    ) -> None:
        self.forms.append(Form(gram_grp, orth, geo, remarks))

    def has(self, orth: str, geo: str) -> bool:
        return any(f.orth == orth and f.geo == geo for f in self.forms)

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
            # TODO: (#0) Consider grouping the forms more intelligently, like
            # Crum does. Forms that share the same set of dialects could share
            # a line, separated by commas, and followed by their dialects only
            # once (such as `ⲁⲗ, ⲁⲁⲗ SA`). A form's remarks would still need
            # to stay next to it.
            for (orth, remarks), geos in forms.items():
                # The highlighter dims the children of a `word` that belong to
                # none of the active dialects, so each child carries the
                # classes of its dialects. See `docs/crum/highlight.ts`.
                spelling: list[str] = [dict_cls.SPELLING, *geos]
                if orth == self.lemma_orth:
                    spelling.append(cls.LEMMA)
                yield "<tr>"
                yield f'<td class="{" ".join([dict_cls.WORD, *geos])}">'
                yield _span(orth, *spelling)
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
    """Render a note of a form, or of its grammatical group, as a remark.

    Args:
        note: The note.

    Returns:
        The HTML of the note, parenthesized, unless it already is.
    """
    text: str = note.text
    if not (text.startswith("(") and text.endswith(")")):
        text = f"({text})"
    return _greek(text)


def _etym_note(note: tei.Note) -> str:
    return f'<span class="{cls.ETYM_NOTE}">{_greek(note.text)}</span>'


class Etymology:
    """Etymology represents the etymology of a word.

    It also holds the note of the entry. The schema doesn't restrict the
    purpose of that note, but four of the five live entries that have one use
    it for etymology (such as `vgl. gr. μῶμος, σπίλος, ῥύπος`), while the fifth
    says `Lesung unsicher`. (A sixth, deprecated entry explains its
    deprecation.) If future versions of the dataset use the note for
    something else, it would no longer belong in the etymology, nor would the
    `etym-note` class describe it correctly.
    """

    def __init__(self, entry: tei.Entry) -> None:
        # Each note, reference, cross-reference, and Greek lemma occupies a
        # line of its own.
        self.amir: str = page.LINE_BREAK.join(filter(None, self._amir(entry)))

    def _amir(self, entry: tei.Entry) -> abc.Generator[str]:
        for child in entry.etym.children if entry.etym is not None else []:
            match child:
                case tei.Note():
                    yield _etym_note(child)
                case tei.Xr():
                    for ref in child.refs:
                        yield _xr(child.type, ref)
                case tei.EtymRef() if child.wcn:
                    assert child.target is not None
                    # The target is the WCN ID, prefixed with `#`.
                    yield f"{child.type}: {child.target.removeprefix("#")}"
                case tei.EtymRef() if child.greek_word:
                    # This is the Greek word that a loanword derives from, or
                    # that it's compared to. DDGLC entries give theirs as a
                    # Greek lemma instead (see below).
                    assert child.text is not None
                    yield _greek(child.text)
                case tei.EtymRef():
                    # This is a field of the Greek lemma, rendered below.
                    assert child.type in typing.get_args(tei.GreekLemmaField)
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

        if entry.note is not None:
            # See the class docstring for why the note of the entry is
            # rendered here.
            yield _etym_note(entry.note)


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
        if name != "xr":
            # The other rows hold plain text, so we mark their Greek words
            # here. A cross-reference holds the HTML that `_xr` renders.
            value = _greek(value)
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
        supplement = self.subset(*_SUPPLEMENT)
        if supplement:
            yield "<tr>"
            yield f'<td class="{cls.SUPPLEMENT}" colspan="2">'
            yield page.LINE_BREAK.join(map(self.format, supplement))
            yield "</td>"
            yield "</tr>"
        yield "</tbody>"

    def _explanation(self) -> str:
        """Render the explanation of the sense, one line per language.

        The explanation in a language starts with a row that bears the label of
        the language (see `explain`). Its definitions and notes follow its
        quotes on the same line, in parentheses, like a note that follows a
        gloss.

        Returns:
            The HTML of the explanation.
        """
        lines: list[list[str]] = []
        for row in self.subset(*_EXPLANATION):
            name, _, label = row
            if label or not lines:
                lines.append([])
            line: list[str] = lines[-1]
            html: str = self.format(row)
            line.append(f"({html})" if line and name != "quote" else html)
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
        explanation = self.subset(*_EXPLANATION)
        if not explanation:
            return explanation
        if label:
            name, value, _ = explanation[0]
            explanation[0] = (name, value, label)
        return explanation

    def give_shared(self) -> list[_Row]:
        return self.subset(*_SHARED)


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
            parts.append(
                f'<span class="{dict_cls.GLOSS}">{_greek(labels[0])}</span>',
            )
            labels = labels[1:]
        parts.extend(f"({_greek(label)})" for label in labels)
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


def _example(cit: tei.Cit) -> str:
    """Render an example of a sense.

    An example usually has a single quote, holding a Coptic phrase followed by
    its quoted translation (`ⲉⲙⲁϣⲟ "überaus, sehr"`). A few hold the phrase and
    the translation in separate quotes, or hold several phrases.

    Args:
        cit: The example.

    Returns:
        The text of the example.
    """
    text: str = ", ".join(cit.phrases)
    # Quote the translations, like the other examples do.
    text += "".join(f' "{t}"' for t in cit.translations)
    text += "".join(f" ({n.text})" for n in cit.notes)
    return text


def _form_sort_key(form: tei.Form) -> tuple[str, str]:
    # TODO: (#0) You could do a lot better than this!
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
            for row in d.give_shared():
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
        assert all(
            s.subset(*_DDGLC_ROWS) == s.subset(*_SENSE_CHILDREN)
            for s in senses
        )
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
    lemma: tei.Form = entry.lemma
    lemma_orth: str = lemma.orth.text
    lemma_key: tuple[str, str] = (lemma_orth, _geo(lemma))
    forms: list[tei.Form] = sorted(
        (f for f in entry.forms if not f.deprecated),
        key=_form_sort_key,
    )
    # The lemma comes first, either itself or through the forms that repeat
    # its spelling, preferably in its own dialect. Since a type and a form
    # retain the order of their first occurrence (see `Orthography._groups`),
    # this puts the lemma at the top of the table.
    forms = sorted(
        forms,
        key=lambda form: (
            form is not lemma,
            (form.orth.text, _geo(form)) != lemma_key,
            form.orth.text != lemma_orth,
        ),
    )

    orthography: Orthography = Orthography(lemma_orth)

    for form in forms:
        # The lemma usually repeats the spelling of another form, which then
        # bears the lemma class instead (see `Orthography.table_aux`). We
        # render the lemma only when no other form repeats its spelling. Some
        # such lemmas are merely normalized spellings (`ⲙⲉϩⲧⲟⲟⲧ⸗` of
        # `ⲙⲉϩ ⲧⲟⲟⲧ⸗`), which still helps search. Others are forms of their own
        # (such as the prenominal `ϩⲁⲧⲛ-`, of which the pronominal `ϩⲁⲧⲟⲟⲧ⸗` is
        # the only other form).
        # We ignore the dialect of the lemma when looking for a repetition,
        # because it's often Sahidic by default, rather than by attestation
        # (such as `ϫⲓⲛⲁⲓⲁⲓ`, whose only other form is Bohairic, since `ϫⲓⲛ-` is
        # the Bohairic prefix). Rendering such a lemma would add a dialect
        # that the word likely lacks. As of the time of writing, a repeated
        # lemma loses no note, nor any grammar that the forms repeating it
        # don't specify further.
        # TODO: (#305) The next version of the XML will largely resolve the
        # issues of the lemma, such as its repetition by other forms. Once
        # it's out, simplify this logic, or make the checks stricter (such as
        # validating that the lemma repeats no form, or that it does).
        if form is lemma and entry.lemma_repeated:
            continue

        # The notes of the grammatical group are remarks on the form, rather
        # than part of its type. Forms of the same type thus share a group,
        # though each repeats the remarks that it shares with others.
        # The note of the form itself follows them. Some explain when the form
        # is used (such as `ⲁⲑ-`, `vor Liquiden`), or how Greek renders a name.
        gram_grp: tei.GramGrp = entry.grammar(form)
        notes: list[tei.Note] = gram_grp.notes.copy()
        if form.note is not None:
            notes.append(form.note)
        orthography.add(
            " ".join(
                child.text
                for child in gram_grp.children
                if not isinstance(child, tei.Note)
            ),
            form.orth.text,
            _geo(form),
            tuple(map(_remark, notes)),
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
                        lang.add("ref", child.text)
                case tei.Xr():
                    for ref in child.refs:
                        for lang in langs.values():
                            lang.add("xr", _xr(child.type, ref))
                case tei.Note():
                    # The note of a sense has no language. It's mostly German,
                    # and qualifies the sense (such as `meist Plural`).
                    # TODO: (#0) Explain the citations in notes, like those in
                    # the bibliography and the etymology. Two sense notes cite
                    # a work (`CD 45b vgl. βοίδιον (?)`, under `ⲃⲟⲉⲓⲧ`), and
                    # so does one translation note (`Černý CED 3`, under
                    # `ⲁⲕⲟⲩⲗⲁⲩϫⲉ`). The frontend would need to search the `NOTE`
                    # class, and `tei.py` would need to validate the citations.
                    for lang in langs.values():
                        lang.add("sense_note", child.text)
                case tei.Cit() if child.type == "example":
                    # Examples are few, and mostly compounds or set phrases
                    # (such as `ⲁⲗⲙⲡⲉ`, hailstone, under `ⲁⲗ`, pebble).
                    for lang in langs.values():
                        lang.add("example", _example(child), "e.g. ")
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
                    # The notes of a translation qualify it, in its own
                    # language (such as `with dat. of person`).
                    for note in child.notes:
                        assert note.lang is not None
                        langs[note.lang].add("translation_note", note.text)
                case _:
                    typing.assert_never(child)

    return Word(
        entry.xml_id,
        orthography,
        langs,
        Etymology(entry),
        entry.ddglc,
    )


def _words() -> abc.Generator[Word]:
    """Generate words from the dataset.

    Yields:
        Word objects representing entries in the dataset.
    """
    for entry in tei.parse(paths.KELLIA_XML).iter_entries():
        if entry.deprecated:
            continue
        yield _process_entry(entry)


# Coptic Scriptorium has attempted to grow the data by adding supplemental
# forms. As of the time of writing, the CDO is capable of expanding an entry by
# adding variant forms, but it can't add any new entries that lack an ID.
# We take the supplemental forms from the CDO's entries, so we show the same set
# that the CDO shows.
def _augmented_words() -> abc.Generator[Word]:
    """Augment the stream of words with supplemental forms.

    Yields:
        Word objects, with supplemental forms added.
    """
    for word in _words():
        # The supplemental forms retain the CDO's order.
        # TODO: (#305) Use the same sorting logic used for TLA forms.
        for form in cdo.supplemental_forms(word.entry_xml_id):
            ensure.ensure(
                _SUPPLEMENTAL_FORM_RE.fullmatch(form.orth),
                word.entry_xml_id,
                "has an invalid supplemental form",
                form.orth,
            )
            ensure.ensure(
                form.dialect in GEOS,
                word.entry_xml_id,
                "has a supplemental form with an invalid dialect",
                form.dialect,
            )
            if word.orthstring.has(form.orth, form.dialect):
                # The word already has this form.
                continue
            # TODO: (#305) The supplemental forms lack parts of speech, so they
            # share an empty grammatical group. If an entry has a single part of
            # speech, then the new forms probably belong to it (the only
            # exception I can think of being verbal forms followed by a dagger
            # that marks qualitative forms).
            word.orthstring.add("", form.orth, form.dialect)
        yield word


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


# TODO: (#0) Consider retaining the `lemma` class, and using it for ranking.
# The frontend could rank a result whose match falls in the lemma above one
# whose match falls in another form, like Crum does with its headwords (see
# `docs/crum/digital.ts`).
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
        xooxle.Selector({"name": "title"}),
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
            # A sense ends with its bibliography, followed by its examples,
            # references, cross-references, and notes, each on a line of its
            # own. The bibliography, references, and cross-references retain
            # their classes, which style them, and let the frontend explain the
            # cited works.
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
