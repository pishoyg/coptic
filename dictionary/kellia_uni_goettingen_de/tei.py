"""A typed, validating view of the Comprehensive Coptic Lexicon's TEI XML.

This module is the source of truth for the schema of the dataset. Each class
below wraps one XML element, the way a `TypedDict` describes a `dict`. Its
fields declare the element's schema: its attributes, its text, and its
children. Parsing a document validates the whole tree against these
declarations, and fails on anything that they don't describe:
- an unknown attribute or child,
- a missing mandatory attribute, text, or child,
- a child that occurs more often than permitted,
- a value outside of an enumeration,
- text where none is expected, or
- a violation of a rule that spans several fields (see `_validate`).

A field is declared as `typing.Annotated[T, marker]`, where the marker is one of
`Attr`, `Text`, or `Child`, and the type `T` determines the validation:
- `str` accepts any value, while a `typing.Literal` accepts only its values.
- `T | None` makes an attribute, the text, or a child optional. The field is
  `None` when absent.
- `list[T]` accepts any number of children, or at least `Child(min_count)`.

The enumerations list the values observed in the data, so they reject typos as
well as genuinely new values. A new value needs to be added here.

The element's generic parameter lists the classes of its children. They are
also accessible in document order through `children`.

The upstream schema, `data/raw/v1.2/Coptic_Lemma_Schema-v1.2.xsd`, is more
permissive than this one.
"""

# NOTE: As of the time of writing, the truth value of an ET.Element object
# depends on the number of children. Instead of directly evaluating the truth
# value of an `ET.Element | None`, use `is not None`.
# The wrappers below have no such caveat.

# The fields are declared by annotation only, and populated reflectively from
# the schema by `Element.__init__`, which (based)pyright can't see.
# pyright: reportUninitializedInstanceVariable=false

import dataclasses
import pathlib
import re
import types
import typing
import xml.etree.ElementTree as ET
from collections import abc

from utils import ensure

_XML_NS: str = "{http://www.w3.org/XML/1998/namespace}"
_TEI_NS: str = "{http://www.tei-c.org/ns/1.0}"
_XML_ID: str = _XML_NS + "id"


def _local(name: str) -> str:
    """Abbreviate a qualified name, such as `xml:id` or `orth`, for messages.

    Args:
        name: A qualified name, in Clark notation.

    Returns:
        The name, with the XML namespace prefixed, and the TEI one omitted.
    """
    return name.replace(_XML_NS, "xml:").replace(_TEI_NS, "")


# Enumerations.
Language = typing.Literal["de", "en", "fr"]
Change = typing.Literal["#added #v1.2", "#deprecated #v1.2"]
EntryType = typing.Literal["compound", "foreign", "hom"]
FormType = typing.Literal["compound", "inflected", "lemma"]
Dialect = typing.Literal[
    "?",  # Greek (usage unclear)
    "A",  # Akhmimic
    "Ak",  # Old Coptic (Altkoptisch)
    "B",  # Bohairic
    "F",  # Fayyumic
    "L",  # Lycopolitan
    "M",  # Mesokemic
    "P",  # Proto-Theban
    "S",  # Sahidic
    "V",  # South Fayyumic Greek
    "W",  # Crypto-Mesokemic Greek
]
PartOfSpeech = typing.Literal[
    "?",
    "Adj.",
    "Adj.?",
    "Adjektivpräfix",
    "Adv.",
    "Dem. Pron.",
    "Interjektion",
    "Interr. Pron.",
    "Kompositum",
    "Konj.",
    "Nominalpräfix",
    "Partikel",
    "Partikel, enklitisch",
    "Poss. Pron.",
    "Possessivartikel",
    "Possessivpräfix",
    "Pron.",
    "Präfix",
    "Präfix der Ordinalzahlen",
    "Präfixpronomen (Präsens I)",
    "Präp.",
    "Satzkonverter",
    "Selbst. Pers. Pron.",
    "Subst.",
    "Subst.?",
    "Suffixpronomen",
    "Vb.",
    "Vb. Hilfsverb.",
    "Vb.?",
    "Verbalpräfix",
    "Zahlwort",
    "Zahlzeichen",
    "bestimmter Artikel",
    "unbestimmter Artikel",
    "unpersönlicher Ausdruck",
]
Subcategory = typing.Literal[
    "1. Pers.",
    "2. Pers.",
    "3. Pers.",
    "Adjektivverb",
    "Aorist neg. ⲙⲉ(ⲣⲉ)-",
    "Aorist ϣⲁ(ⲣⲉ)-",
    "Fokalisierungskonverter",
    "Frageadverb",
    "Fragepartikel",
    "Fragepronomen",
    "Futur I / II ⲛⲁ-",
    "Futur III neg. ⲛⲛⲉ-",
    "Futur III ⲉ(ⲣⲉ)-",
    "Genitivpartikel",
    "Göttername",
    "Hilfsverb",
    "Imperativ",
    "Imperativpräfix ⲁ-",
    "Imperfekt ⲛⲉ(ⲣⲉ)-",
    "Indefinitpronomen",
    "Infinitiv",
    "Kausativer Imperativ ⲙⲁⲣⲉ-",
    "Kausativer Infinitiv ⲧⲣⲉ-",
    "Kompletiv neg. ⲙⲡⲁ(ⲧⲉ)-",
    "Kompositverb",
    "Kompositverb (?)",
    "Konditionalis ⲉⲣϣⲁⲛ-",
    "Konjunktiv ⲛ(ⲧⲉ)-",
    "Kopula",
    "Name einer Sache oder Institution",
    "Negationspartikel",
    "Negativpräfix zur Bildung von Adjektiven",
    "Negativpräfix zur Bildung von Substantiven f.",
    "Negierter Imperativ ⲙⲡⲣ-",
    "Negiertes Futur im Bedingungssatz ⲁⲛⲛⲉ- (B)",
    "Obsolete Relativform",
    "Ortsname",
    "Participium conjunctum",
    "Perfekt II ⲉⲛⲧⲁ-",
    "Perfekt neg. ⲙⲡⲉ-",
    "Perfekt ⲁ-",
    "Qualitativ",
    "Qualitativ?",
    "Reflexivpronomen",
    "Relativkonverter",
    "Status nominalis",
    "Status pronominalis",
    "Suffixkonjugation",
    "Temporalis ⲛⲧⲉⲣⲉ-",
    "Titel",
    "Umstandsatzkonverter",
    "Unpersönlich",
    "Völkername",
    "im negativen Bedingungssatz",
    "zur Bildung von Ortsangaben",
]
Gender = typing.Literal["f.", "m."]
GrammaticalNumber = typing.Literal["pl.", "sg."]
Collocation = typing.Literal[
    "collocAdv",
    "collocConj",
    "collocNoun",
    "collocPartikel",
    "collocParticle",
    "collocPrep",
]
CitType = typing.Literal["example", "translation"]
XrType = typing.Literal["ant", "cf", "syn"]
SenseRefType = typing.Literal["Greek", "coptic_usage::cu_ID"]
GreekLemmaField = typing.Literal[
    "greek_lemma::grl_ID",
    "greek_lemma::grl_lemma",
    "greek_lemma::grl_meaning",
    "greek_lemma::grl_pos",
    "greek_lemma::grl_ref",
]
EtymRefType = typing.Literal["Greek", "WCNae", "WCNde", GreekLemmaField]
GreekPartOfSpeech = typing.Literal[
    "adjective",
    "adverb",
    "adverb (dative form of noun)",
    "adverb / conjunction",
    "conjunction",
    "conjunction / adverb",
    "conjunction / preposition",
    "interjection",
    "noun",
    "participle",
    "particle",
    "preposition",
    "pronoun",
    "verb",
]
# BiblSource lists the works that translations cite, besides the DDGLC.
# NOTE: The frontend explains these abbreviations in tooltips, using the list
# of works in `docs/crum/kellia.ts`. Every source here must have an entry
# there, under the same abbreviation. Keep the two lists aligned.
BiblSource = typing.Literal[
    "CD",
    "CDC",
    "CED",
    "ChLCS",
    "DELC",
    "KoptHWb",
    "LCG",
    "ONB",
    "Osing, Pap. Ox.",
    "Till D",
    "WbGWKDT",
]

# Patterns.
# _COPTIC_LETTERS holds the Coptic letters of the Greek and Coptic block, the
# Greek kai symbol (an abbreviation of ⲕⲁⲓ), and the letters and symbols of the
# Coptic block, which end with the symbol shima sima.
_COPTIC_LETTERS: str = "Ϣ-ϯϗⲀ-⳪"
# _COPTIC_MARKS holds the other characters of Coptic spellings. Spellings use
# `*` for reconstructed forms, `[…]` and `.` for lacunae, and `-` and `⸗` for
# the prenominal and pronominal states.
_COPTIC_MARKS: str = "".join(
    [
        r" ()\[\]*.\-⸗",
        r"\u0304",  # COMBINING MACRON
        r"\u0305",  # COMBINING OVERLINE
        r"\u0308",  # COMBINING DIAERESIS
        r"\u0323",  # COMBINING DOT BELOW
        r"\u1dcd",  # COMBINING DOUBLE CIRCUMFLEX ABOVE
        r"\u2cef",  # COPTIC COMBINING NI ABOVE
        r"\u2cf1",  # COPTIC COMBINING SPIRITUS LENIS
        r"\ufe24",  # COMBINING MACRON LEFT HALF
        r"\ufe25",  # COMBINING MACRON RIGHT HALF
        r"\ufe26",  # COMBINING CONJOINING MACRON
        "ˉ",  # MODIFIER LETTER MACRON
        "’",  # RIGHT SINGLE QUOTATION MARK
        "⳽",  # COPTIC FRACTION ONE HALF
    ],
)
# _COPTIC_TEXT is Coptic text, with at least one letter.
_COPTIC_TEXT: str = (
    f"(?=.*[{_COPTIC_LETTERS}])[{_COPTIC_LETTERS}{_COPTIC_MARKS}]+"
)
_NUMBER: re.Pattern[str] = re.compile(r"\d+")
_FORM_ID: str = r"CF\d+"

# Bibliography.
# A citation gives a source, followed by a list of locations. A location is a
# page, or a range of pages, optionally annotated with the headword that the
# source lists the word under (`s. v.` or `unter`), with a quoted note, or
# with a footnote (`Anm.`).
_HEADWORD: str = f"[{_COPTIC_LETTERS}]+"
# A quoted note can't contain the separator of citations.
_ANNOTATION: str = (
    "(?:"
    + "|".join(
        [
            rf" \((?:s\. v\.|unter) {_HEADWORD}\)",
            r' \("[^";]+"\)',
            r", Anm\. \d+",
        ],
    )
    + ")"
)


def _locations(page: str, prefix: str = "") -> str:
    location: str = rf"{page}(?:-{page})?{_ANNOTATION}?"
    return rf"{prefix}{location}(?:, {location})*"


# Crum's addenda occupy pages XV to XXIV.
_CRUM_ADDENDA: str = "|".join(
    [
        "XV",
        "XVI",
        "XVII",
        "XVIII",
        "XIX",
        "XX",
        "XXI",
        "XXII",
        "XXIII",
        "XXIV",
    ],
)
# A page of a dictionary ends with its columns: `a`, `b`, `ab`, or `a-b`.
_COLUMNS: str = r"(?:a-b|ab|a|b)?"
_SECTIONS: str = r"(?:§§? )?"
# _LOCATIONS maps a source to the pattern of its locations.
_LOCATIONS: dict[BiblSource, str] = {
    "CD": _locations(rf"(?:\d+|{_CRUM_ADDENDA}){_COLUMNS}"),
    "CDC": _locations(rf"\d+{_COLUMNS}"),
    "CED": _locations(r"\d+"),
    "ChLCS": _locations(rf"\d+{_COLUMNS}"),
    "DELC": _locations(rf"\d+{_COLUMNS}"),
    # `f` extends a location to the following page.
    "KoptHWb": _locations(r"\d+f?"),
    "LCG": _locations(r"\d+", _SECTIONS),
    # ONB comes in volumes.
    "ONB": _locations(r"\d+", r"(?:[IVX]+ )?"),
    "Osing, Pap. Ox.": _locations(r"\d+"),
    "Till D": _locations(r"\d+", _SECTIONS),
    "WbGWKDT": _locations(r"\d+"),
}
assert _LOCATIONS.keys() == set(typing.get_args(BiblSource))
_CITATION: str = "|".join(
    f"{re.escape(source)} {locations}"
    for source, locations in _LOCATIONS.items()
)
# A citation may be parenthesized, optionally followed by the headword that
# the source lists the word under.
_ITEM: str = rf"(?:{_CITATION}|\((?:{_CITATION})(?:, unter {_HEADWORD})?\))"
# A translation either comes from the DDGLC, cites a list of sources, or, in a
# single case, cites the Book of Jeremiah by chapter and verse.
_BIBL: str = rf"DDGLC|Jer \d+,\d+|{_ITEM}(?:; {_ITEM})*"
# _CITATION_SOURCE extracts the source of a citation.
_SOURCE: str = "|".join(map(re.escape, _LOCATIONS))
_CITATION_SOURCE: re.Pattern[str] = re.compile(rf"\(?({_SOURCE}) ")
# _WCN_TARGET maps a WCN reference type to the pattern of its target.
_WCN_TARGET: dict[str, re.Pattern[str]] = {
    "WCNae": re.compile(r"#\d+"),
    "WCNde": re.compile(r"#dm?\d+"),
}
_GREEK_POS: frozenset[str] = frozenset(typing.get_args(GreekPartOfSpeech))

_GREEK_LEMMA_FIELDS: frozenset[str] = frozenset(
    typing.get_args(GreekLemmaField),
)
# The text of these Greek lemma fields may be missing.
_GREEK_LEMMA_OPTIONAL: frozenset[str] = frozenset(
    {"greek_lemma::grl_meaning", "greek_lemma::grl_ref"},
)
_ADDED: Change = "#added #v1.2"
_DEPRECATED: Change = "#deprecated #v1.2"
# An added form corresponds to the deprecated form that it replaces, while a
# deprecated form corresponds to the forms that replace it.
_CORRESP: dict[Change, re.Pattern[str]] = {
    _ADDED: re.compile(_FORM_ID),
    _DEPRECATED: re.compile(f"'{_FORM_ID}'(, '{_FORM_ID}')*"),
}


# Markers.
@dataclasses.dataclass(frozen=True)
class Attr:
    """Attr marks a field as an attribute.

    Attributes:
        name: The XML name of the attribute, such as `xml:id`. It defaults to
            the name of the field.
        pattern: A regular expression that a free-text value must match.
    """

    name: str | None = None
    pattern: str | None = None


@dataclasses.dataclass(frozen=True)
class Text:
    """Text marks a field as the text of the element, whitespace-normalized.

    Attributes:
        pattern: A regular expression that a free-text value must match.
    """

    pattern: str | None = None


@dataclasses.dataclass(frozen=True)
class Child:
    """Child marks a field as a child element, or a list thereof.

    Attributes:
        min_count: The minimum number of children, for a list.
    """

    min_count: int = 0


@dataclasses.dataclass(frozen=True)
class _Value:
    """_Value is the schema of an attribute or text field."""

    field: str
    required: bool
    # choices is `None` for free text.
    choices: frozenset[str] | None
    # pattern is `None` for unconstrained text.
    pattern: re.Pattern[str] | None

    def validate(self, value: str | None, *where: object) -> str | None:
        if value is None:
            ensure.ensure(not self.required, *where, "is missing!")
            return None
        ensure.ensure(
            self.choices is None or value in self.choices,
            *where,
            "has an unknown value",
            repr(value),
        )
        ensure.ensure(
            self.pattern is None or self.pattern.fullmatch(value),
            *where,
            "has a malformed value",
            repr(value),
        )
        return value


def _value(
    name: str,
    typ: typing.Any,
    optional: bool,
    marker: "Attr | Text",
) -> _Value:
    choices: frozenset[str] | None = _choices(typ)
    assert choices is None or marker.pattern is None, (name, typ)
    return _Value(
        name,
        not optional,
        choices,
        re.compile(marker.pattern) if marker.pattern else None,
    )


@dataclasses.dataclass(frozen=True)
class _Children:
    """_Children is the schema of a child field."""

    field: str
    klass: type["Element[typing.Any]"]
    many: bool
    min_count: int


def _optional(typ: typing.Any) -> tuple[typing.Any, bool]:
    """Strip `None` from an optional type.

    Args:
        typ: A type, possibly optional.

    Returns:
        The type, without `None`, and whether the type was optional.
    """
    if typing.get_origin(typ) not in (typing.Union, types.UnionType):
        return typ, False
    args: list[typing.Any] = [
        a for a in typing.get_args(typ) if a is not types.NoneType
    ]
    assert len(args) == 1, typ
    return args[0], True


def _choices(typ: typing.Any) -> frozenset[str] | None:
    if typ is str:
        return None
    assert typing.get_origin(typ) is typing.Literal, typ
    choices: tuple[typing.Any, ...] = typing.get_args(typ)
    assert all(isinstance(c, str) for c in choices), typ
    return frozenset(choices)


def _child_classes(cls: type) -> set[type]:
    """Return the classes in the generic parameter of an element class.

    Args:
        cls: An element class.

    Returns:
        The classes of the children of the element.
    """
    for base in types.get_original_bases(cls):
        if typing.get_origin(base) is not Element:
            continue
        (param,) = typing.get_args(base)
        if param is typing.Never:
            return set()
        return set(typing.get_args(param)) or {param}
    assert False, f"{cls} must subclass `Element[...]` directly!"


def _distinct(values: abc.Iterable[object]) -> bool:
    items: list[object] = list(values)
    return len(items) == len(set(items))


class Element[C]:
    """Element is the base class of all element wrappers.

    The generic parameter `C` is the union of the classes of the children, or
    `typing.Never` if the element has no children.
    """

    # TAG is the local name of the element, without the namespace.
    TAG: typing.ClassVar[str]
    # _attrs maps an attribute's qualified name to its schema.
    _attrs: typing.ClassVar[dict[str, _Value]]
    _text: typing.ClassVar[_Value | None]
    # _children maps a child's qualified tag to its schema.
    _children: typing.ClassVar[dict[str, _Children]]

    def __init_subclass__(cls, **kwargs: typing.Any) -> None:
        """Compile the schema from the annotations of the subclass.

        Args:
            **kwargs: Passed to the superclass.
        """
        super().__init_subclass__(**kwargs)
        assert isinstance(getattr(cls, "TAG", None), str), cls
        cls._attrs = {}
        cls._text = None
        cls._children = {}
        hints: dict[str, typing.Any] = typing.get_type_hints(
            cls,
            include_extras=True,
        )
        for name, hint in hints.items():
            if typing.get_origin(hint) is not typing.Annotated:
                continue
            typ, *metadata = typing.get_args(hint)
            (marker,) = (
                m for m in metadata if isinstance(m, (Attr, Text, Child))
            )
            typ, optional = _optional(typ)
            match marker:
                case Attr():
                    qname: str = (marker.name or name).replace("xml:", _XML_NS)
                    assert qname not in cls._attrs, (cls, qname)
                    cls._attrs[qname] = _value(name, typ, optional, marker)
                case Text():
                    assert cls._text is None, cls
                    cls._text = _value(name, typ, optional, marker)
                case Child():
                    many: bool = typing.get_origin(typ) is list
                    if many:
                        assert not optional, (cls, name)
                        (typ,) = typing.get_args(typ)
                    else:
                        assert marker.min_count == 0, (cls, name)
                    assert issubclass(typ, Element), (cls, name)
                    tag: str = _TEI_NS + typ.TAG
                    assert tag not in cls._children, (cls, tag)
                    cls._children[tag] = _Children(
                        name,
                        typ,
                        many,
                        marker.min_count if many else int(not optional),
                    )
        # Verify that the generic parameter agrees with the child fields.
        assert _child_classes(cls) == {
            c.klass for c in cls._children.values()
        }, cls

    def __init__(
        self,
        elem: ET.Element,
        parent: "Element[typing.Any] | None" = None,
    ) -> None:
        xml_id: str | None = elem.get(_XML_ID)
        # path locates the element in the document, for error messages.
        self.path: str = (
            (parent.path if parent is not None else "")
            + f"/{self.TAG}"
            + (f"[{xml_id}]" if xml_id else "")
        )
        self._ensure(
            elem.tag == _TEI_NS + self.TAG,
            "has an unexpected tag",
            _local(elem.tag),
        )

        # Attributes.
        unknown: set[str] = elem.attrib.keys() - self._attrs.keys()
        self._ensure(
            not unknown,
            "has unknown attributes",
            sorted(map(_local, unknown)),
        )
        for qname, attr in self._attrs.items():
            setattr(
                self,
                attr.field,
                attr.validate(
                    elem.get(qname),
                    self.path,
                    "attribute",
                    _local(qname),
                ),
            )

        # Text.
        txt: str = " ".join((elem.text or "").split())
        if self._text is None:
            self._ensure(not txt, "has unexpected text", repr(txt))
        else:
            setattr(
                self,
                self._text.field,
                self._text.validate(txt or None, self.path, "text"),
            )

        # Children.
        groups: dict[str, list[Element[typing.Any]]] = {
            tag: [] for tag in self._children
        }
        wrappers: list[Element[typing.Any]] = []
        for sub in elem:
            self._ensure(
                not (sub.tail or "").strip(),
                "has unexpected text",
                repr(sub.tail),
                "after a child",
                _local(sub.tag),
            )
            self._ensure(
                sub.tag in self._children,
                "has an unknown child",
                _local(sub.tag),
            )
            wrapper = self._children[sub.tag].klass(sub, self)
            groups[sub.tag].append(wrapper)
            wrappers.append(wrapper)
        # children lists the children in document order.
        self.children: list[C] = typing.cast(list[C], wrappers)
        for tag, spec in self._children.items():
            found: list[Element[typing.Any]] = groups[tag]
            self._ensure(
                len(found) >= spec.min_count,
                "has",
                len(found),
                _local(tag),
                "children, but requires at least",
                spec.min_count,
            )
            if spec.many:
                setattr(self, spec.field, found)
                continue
            self._ensure(
                len(found) <= 1,
                "has",
                len(found),
                _local(tag),
                "children, but permits at most one",
            )
            setattr(self, spec.field, found[0] if found else None)

        self._validate()

    def _validate(self) -> None:
        """Check the rules that span several fields.

        This runs once all fields, including the children, are validated.
        """

    def _ensure(self, cond: object, *message: object) -> None:
        ensure.ensure(cond, self.path, *message)

    @typing.override
    def __repr__(self) -> str:
        return f"<{type(self).__name__} {self.path}>"


class Orth(Element[typing.Never]):
    """Orth is the spelling of a form."""

    TAG = "orth"
    text: typing.Annotated[str, Text(_COPTIC_TEXT)]


class Usg(Element[typing.Never]):
    """Usg is the dialect of a form."""

    TAG = "usg"
    type: typing.Annotated[typing.Literal["geo"], Attr()]
    text: typing.Annotated[Dialect, Text()]


class ORef(Element[typing.Never]):
    """ORef references the headword of a compound."""

    TAG = "oRef"
    text: typing.Annotated[str, Text(_COPTIC_TEXT)]


class Note(Element[typing.Never]):
    """Note is a free-text note, found in many contexts."""

    TAG = "note"
    lang: typing.Annotated[Language | None, Attr("xml:lang")]
    text: typing.Annotated[str, Text()]


class Pos(Element[typing.Never]):
    """Pos is a part of speech."""

    TAG = "pos"
    text: typing.Annotated[PartOfSpeech, Text()]


class Subc(Element[typing.Never]):
    """Subc is a grammatical subcategory."""

    TAG = "subc"
    text: typing.Annotated[Subcategory, Text()]


class Gen(Element[typing.Never]):
    """Gen is a grammatical gender."""

    TAG = "gen"
    text: typing.Annotated[Gender, Text()]


class Number(Element[typing.Never]):
    """Number is a grammatical number."""

    TAG = "number"
    text: typing.Annotated[GrammaticalNumber, Text()]


class Gram(Element[typing.Never]):
    """Gram is a collocation."""

    TAG = "gram"
    type: typing.Annotated[Collocation, Attr()]
    text: typing.Annotated[str, Text()]


class GramGrp(Element[Pos | Gen | Number | Subc | Gram | Note]):
    """GramGrp groups the grammatical info of an entry or a form.

    The `pos` is mandatory at the entry level (see `Entry`).
    """

    TAG = "gramGrp"
    pos: typing.Annotated[Pos | None, Child()]
    gen: typing.Annotated[Gen | None, Child()]
    number: typing.Annotated[Number | None, Child()]
    subcs: typing.Annotated[list[Subc], Child()]
    grams: typing.Annotated[list[Gram], Child()]
    notes: typing.Annotated[list[Note], Child()]


class Form(Element[Orth | Usg | GramGrp | Note | ORef]):
    """Form is a word form."""

    TAG = "form"
    xml_id: typing.Annotated[str, Attr("xml:id", _FORM_ID)]
    type: typing.Annotated[FormType | None, Attr()]
    change: typing.Annotated[Change | None, Attr()]
    # corresp lists the IDs of the corresponding forms (see `_CORRESP`).
    corresp: typing.Annotated[str | None, Attr()]
    orth: typing.Annotated[Orth, Child()]
    usg: typing.Annotated[Usg | None, Child()]
    gram_grp: typing.Annotated[GramGrp | None, Child()]
    note: typing.Annotated[Note | None, Child()]
    o_ref: typing.Annotated[ORef | None, Child()]

    @property
    def deprecated(self) -> bool:
        return self.change == _DEPRECATED

    @property
    def correspondents(self) -> list[str]:
        return re.findall(_FORM_ID, self.corresp or "")

    @typing.override
    def _validate(self) -> None:
        if self.corresp is None:
            return
        self._ensure(
            self.change is not None,
            "has correspondents, but no change",
        )
        assert self.change is not None
        self._ensure(
            _CORRESP[self.change].fullmatch(self.corresp),
            "has malformed correspondents",
            repr(self.corresp),
        )


class XrRef(Element[typing.Never]):
    """XrRef is the target of a cross-reference."""

    TAG = "ref"
    target: typing.Annotated[str, Attr(pattern="#" + _COPTIC_TEXT)]
    text: typing.Annotated[str, Text()]


class Xr(Element[XrRef]):
    """Xr is a cross-reference."""

    TAG = "xr"
    type: typing.Annotated[XrType, Attr()]
    refs: typing.Annotated[list[XrRef], Child(min_count=1)]


class Quote(Element[typing.Never]):
    """Quote is a translation, or an example."""

    TAG = "quote"
    # lang is present in, and only in, translations.
    lang: typing.Annotated[Language | None, Attr("xml:lang")]
    text: typing.Annotated[str, Text()]


class Def(Element[typing.Never]):
    """Def is a definition."""

    TAG = "def"
    lang: typing.Annotated[Language, Attr("xml:lang")]
    text: typing.Annotated[str, Text()]


class Bibl(Element[typing.Never]):
    """Bibl is the source of a translation: the DDGLC, or citations."""

    TAG = "bibl"
    text: typing.Annotated[str, Text(_BIBL)]

    @property
    def citations(self) -> list[str]:
        return self.text.split("; ")

    @typing.override
    def _validate(self) -> None:
        sources: list[str] = [
            m.group(1)
            for m in map(_CITATION_SOURCE.match, self.citations)
            if m is not None
        ]
        self._ensure(_distinct(sources), "cites a source more than once")


class Cit(Element[Quote | Def | Bibl | Note]):
    """Cit is a citation, either a translation or an example."""

    TAG = "cit"
    type: typing.Annotated[CitType, Attr()]
    quotes: typing.Annotated[list[Quote], Child()]
    definitions: typing.Annotated[list[Def], Child()]
    bibl: typing.Annotated[Bibl | None, Child()]
    notes: typing.Annotated[list[Note], Child()]

    @property
    def source(self) -> Bibl:
        """Return the source of a translation.

        Returns:
            The source.
        """
        assert self.type == "translation" and self.bibl is not None
        return self.bibl

    @property
    def quotes_by_language(self) -> dict[Language, str]:
        """Return the quotes of a translation, keyed by their languages.

        Returns:
            The text of each quote, keyed by its language.
        """
        assert self.type == "translation"
        return {q.lang: q.text for q in self.quotes if q.lang is not None}

    @typing.override
    def _validate(self) -> None:
        translation: bool = self.type == "translation"
        self._ensure(
            (self.bibl is not None) == translation,
            "must have a bibl if, and only if, it's a translation",
        )
        self._ensure(
            all((q.lang is not None) == translation for q in self.quotes),
            "must have quote languages if, and only if, it's a translation",
        )
        self._ensure(
            self.quotes or self.definitions,
            "has neither quotes nor definitions",
        )
        self._ensure(
            _distinct(q.lang for q in self.quotes if q.lang is not None),
            "has repeated quote languages",
        )
        self._ensure(
            _distinct(d.lang for d in self.definitions),
            "has repeated definition languages",
        )
        self._ensure(
            _distinct(n.lang for n in self.notes if n.lang is not None),
            "has repeated note languages",
        )


class SenseRef(Element[typing.Never]):
    """SenseRef is a reference within a sense."""

    TAG = "ref"
    type: typing.Annotated[SenseRefType, Attr()]
    text: typing.Annotated[str, Text()]

    @typing.override
    def _validate(self) -> None:
        self._ensure(
            self.type != "coptic_usage::cu_ID" or _NUMBER.fullmatch(self.text),
            "has a malformed usage ID",
            repr(self.text),
        )


class Sense(Element[SenseRef | Xr | Cit | Note]):
    """Sense is a meaning of an entry."""

    TAG = "sense"
    xml_id: typing.Annotated[str, Attr("xml:id", r"CS\d+")]
    refs: typing.Annotated[list[SenseRef], Child()]
    xrs: typing.Annotated[list[Xr], Child()]
    cits: typing.Annotated[list[Cit], Child(min_count=1)]
    note: typing.Annotated[Note | None, Child()]

    @property
    def translation(self) -> Cit:
        """Return the only translation of the sense.

        Returns:
            The translation.
        """
        (translation,) = (c for c in self.cits if c.type == "translation")
        return translation

    @property
    def ddglc(self) -> bool:
        """Whether the sense comes from the DDGLC, which is to say, it's Greek.

        Returns:
            Whether the sense comes from the DDGLC.
        """
        return self.translation.source.text == "DDGLC"

    @typing.override
    def _validate(self) -> None:
        num: int = sum(c.type == "translation" for c in self.cits)
        self._ensure(num == 1, "has", num, "translations, rather than one")
        self._ensure(
            any(r.type == "coptic_usage::cu_ID" for r in self.refs)
            == self.ddglc,
            "must have a DDGLC usage ID if, and only if, it's a DDGLC sense",
        )
        if not self.ddglc:
            return
        translation: Cit = self.translation
        self._ensure(
            len(self.refs) == 1
            and not self.xrs
            and len(self.cits) == 1
            and list(translation.quotes_by_language) == ["en"]
            and len(translation.quotes) == 1
            and not translation.definitions
            and not translation.notes,
            "is a DDGLC sense, so it must have a usage ID, and a translation",
            "with an English quote, and nothing else",
        )


class EtymRef(Element[typing.Never]):
    """EtymRef is a reference within an etymology.

    It's one of:
    - a field of a Greek lemma, possibly with no text,
    - a WCN reference, which has a target but no text, or
    - a Greek word, given by a type of "Greek" or a language of "grc".
    """

    TAG = "ref"
    type: typing.Annotated[EtymRefType | None, Attr()]
    target: typing.Annotated[str | None, Attr()]
    lang: typing.Annotated[typing.Literal["grc"] | None, Attr("xml:lang")]
    text: typing.Annotated[str | None, Text()]

    @property
    def wcn(self) -> bool:
        return self.type in _WCN_TARGET

    @typing.override
    def _validate(self) -> None:
        self._ensure(
            (self.target is not None) == self.wcn,
            "must have a target if, and only if, it's a WCN reference",
        )
        self._ensure(
            (self.lang is not None) == (self.type is None),
            "must have either a type or a language",
        )
        if self.wcn:
            assert self.type is not None and self.target is not None
            self._ensure(self.text is None, "is a WCN reference with text")
            self._ensure(
                _WCN_TARGET[self.type].fullmatch(self.target),
                "has a malformed target",
                repr(self.target),
            )
            return
        if self.type not in _GREEK_LEMMA_OPTIONAL:
            self._ensure(self.text is not None, "has no text")
        if self.type == "greek_lemma::grl_ID":
            self._ensure(
                _NUMBER.fullmatch(self.text or ""),
                "has a malformed Greek lemma ID",
                repr(self.text),
            )
        if self.type == "greek_lemma::grl_pos":
            self._ensure(
                self.text in _GREEK_POS,
                "has an unknown Greek part of speech",
                repr(self.text),
            )


@dataclasses.dataclass(frozen=True)
class GreekLemma:
    """GreekLemma is the DDGLC lemma that a Greek loanword derives from."""

    lemma_id: str
    lemma: str
    meaning: str | None
    pos: GreekPartOfSpeech
    # ref cites the lexicons that list the lemma.
    ref: str | None


class Etym(Element[EtymRef | Xr | Note]):
    """Etym is the etymology of an entry."""

    TAG = "etym"
    refs: typing.Annotated[list[EtymRef], Child()]
    xrs: typing.Annotated[list[Xr], Child()]
    notes: typing.Annotated[list[Note], Child()]

    @property
    def _greek_lemma_fields(self) -> list[tuple[str, str | None]]:
        return [
            (r.type, r.text)
            for r in self.refs
            if r.type is not None and r.type in _GREEK_LEMMA_FIELDS
        ]

    @property
    def greek_lemma(self) -> GreekLemma | None:
        """Return the Greek lemma, if any.

        Returns:
            The Greek lemma, or `None` if the etymology has none.
        """
        fields: dict[str, str | None] = dict(self._greek_lemma_fields)
        if not fields:
            return None
        lemma_id: str | None = fields["greek_lemma::grl_ID"]
        lemma: str | None = fields["greek_lemma::grl_lemma"]
        pos: str | None = fields["greek_lemma::grl_pos"]
        assert lemma_id is not None and lemma is not None and pos in _GREEK_POS
        return GreekLemma(
            lemma_id,
            lemma,
            fields["greek_lemma::grl_meaning"],
            typing.cast(GreekPartOfSpeech, pos),
            fields["greek_lemma::grl_ref"],
        )

    @typing.override
    def _validate(self) -> None:
        fields: list[str] = sorted(f for f, _ in self._greek_lemma_fields)
        self._ensure(
            not fields or fields == sorted(_GREEK_LEMMA_FIELDS),
            "has an incomplete Greek lemma",
            fields,
        )


class Entry(Element[Form | GramGrp | Etym | Xr | Sense | Note]):
    """Entry is a dictionary entry."""

    TAG = "entry"
    xml_id: typing.Annotated[str, Attr("xml:id", r"C\d+")]
    type: typing.Annotated[EntryType | None, Attr()]
    change: typing.Annotated[Change | None, Attr()]
    forms: typing.Annotated[list[Form], Child(min_count=1)]
    gram_grp: typing.Annotated[GramGrp | None, Child()]
    etym: typing.Annotated[Etym | None, Child()]
    xrs: typing.Annotated[list[Xr], Child()]
    senses: typing.Annotated[list[Sense], Child(min_count=1)]
    note: typing.Annotated[Note | None, Child()]

    @property
    def deprecated(self) -> bool:
        return self.change == _DEPRECATED

    @property
    def ddglc(self) -> bool:
        """Whether the entry comes from the DDGLC, which is to say, it's Greek.

        Returns:
            Whether the entry comes from the DDGLC.
        """
        return self.senses[0].ddglc

    @property
    def _lemmas(self) -> list[Form]:
        return [
            f for f in self.forms if not f.deprecated and f.type == "lemma"
        ]

    @property
    def lemma(self) -> Form:
        """Return the lemma form, of which every entry has exactly one.

        Returns:
            The lemma form.
        """
        (lemma,) = self._lemmas
        return lemma

    def grammar(self, form: Form) -> GramGrp:
        """Return the grammatical group of a form, which isn't the lemma.

        A form without a grammatical group of its own inherits the entry's.

        Args:
            form: A form of the entry, other than the lemma.

        Returns:
            The grammatical group of the form.
        """
        assert form is not self.lemma, form.path
        gram_grp: GramGrp | None = form.gram_grp or self.gram_grp
        assert gram_grp is not None, form.path
        return gram_grp

    @typing.override
    def _validate(self) -> None:
        lemmas: int = len(self._lemmas)
        self._ensure(
            lemmas == 1,
            "has",
            lemmas,
            "lemma forms, rather than one",
        )
        self._ensure(
            self.gram_grp is None or self.gram_grp.pos is not None,
            "has a gramGrp with no pos",
        )
        self._ensure(
            self.gram_grp is not None
            or all(
                f.gram_grp is not None
                for f in self.forms
                if f is not self.lemma
            ),
            "has a form, other than the lemma, with no grammatical group",
        )
        forms: dict[str, Form] = {f.xml_id: f for f in self.forms}
        for form in self.forms:
            for other in map(forms.get, form.correspondents):
                self._ensure(
                    other is not None
                    and other.deprecated != form.deprecated
                    and form.xml_id in other.correspondents,
                    "has form",
                    form.xml_id,
                    "with a non-reciprocal correspondent",
                    form.corresp,
                )
        self._ensure(
            len({s.ddglc for s in self.senses}) == 1,
            "mixes DDGLC and other senses",
        )
        self._ensure(
            self.ddglc
            == (self.etym is not None and self.etym.greek_lemma is not None),
            "must have a Greek lemma if, and only if, it's a DDGLC entry",
        )


class SuperEntry(Element[Entry]):
    """SuperEntry groups related entries."""

    TAG = "superEntry"
    entries: typing.Annotated[list[Entry], Child(min_count=1)]


class Body(Element[Entry | SuperEntry]):
    """Body holds the dictionary content."""

    TAG = "body"
    entries: typing.Annotated[list[Entry], Child()]
    super_entries: typing.Annotated[list[SuperEntry], Child()]

    def iter_entries(self) -> abc.Generator[Entry]:
        """Yield all entries, in document order, flattening super entries.

        Yields:
            Entries.
        """
        for sub in self.children:
            if isinstance(sub, SuperEntry):
                yield from sub.entries
            else:
                yield sub


def parse(path: pathlib.Path) -> Body:
    """Parse and validate a TEI document.

    Args:
        path: The path to the document.

    Returns:
        The validated `<body>` of the document.
    """
    body: ET.Element | None = ET.parse(path).find(
        f"{_TEI_NS}text/{_TEI_NS}body",
    )
    ensure.ensure(body is not None, path, "has no body!")
    assert body is not None
    ensure.unique(
        (e.get(_XML_ID) for e in body.iter() if _XML_ID in e.attrib),
        "IDs",
    )
    return Body(body)
