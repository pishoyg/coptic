"""Convert Andreas's Dictionary Data to Unicode."""

import functools
import itertools
import os
import pathlib
import re
import typing
from collections import abc

import bs4
import regex

from dictionary import cls
from dictionary.stmacariusmonastery_org import constants
from dictionary.stmacariusmonastery_org.constants import Language
from flashcards import deck, ids
from utils import ensure, file, lang, log, paths
from xooxle import xooxle

POSTPROCESSING: list[tuple[str | regex.Pattern[str], str]] = [
    ("``", "`"),
    (" -", "-"),
    (" ,", ","),
    (",", ", "),
    # The mark of the pronominal forms attaches to its stem, but the data
    # sometimes puts a space in front of it.
    (" ⸗", "⸗"),
    ("→", " → "),
    ("( ", "("),
    (" )", ")"),
    ("  ", " "),
    ("--", "-"),
    ("))", ")"),
    ("((", "("),
    ("، ، ", "، "),
    # Arabic punctuation attaches to the word before it, but the data puts a
    # space in front of it here and there.
    (" ،", "،"),
    (" ؛", "؛"),
    ("،؛", "؛"),
    (" ؟", "؟"),
    (" !", "!"),
    # An ellipsis is one mark, however the data spaces its dots.
    (". . .", "..."),
    # A gender marker is a word of its own, and stands apart from the headword
    # it follows. A few dozen entries glue it on.
    (regex.compile(r"(?<=[^\s(])(?=\((?:ⲡ|ⲧ|ⲛ|ⲉϥ|ⲟⲩ)\))"), " "),
    # Misplaced accents:
    (regex.compile("(?:`|⳿)(.)"), "\\1\u0300"),
    (regex.compile(" \u0300(.)"), "\\1\u0300"),
    # Misplaced overline:
    (regex.compile("(.) \u0305"), "\\1\u0305"),
    # No mark is ever written twice over one letter. The rule above doubles an
    # overline that the data spaces out, and the data itself doubles an Arabic
    # diacritic in a few dozen places; either way the mark was typed twice.
    # This comes after the rules that move a mark about, so that it sees the
    # marks where they end up rather than where they were typed.
    (regex.compile(r"(\p{Mn})\1+"), "\\1"),
    # A hyphen that doesn't follow Coptic text marks a prefix, and binds
    # to the letters after it. This comes last, because the rules above
    # can turn what precedes a space into Coptic.
    (
        regex.compile(r"(?<=(?<!\p{Script=Coptic})-) (?=\p{Script=Coptic})"),
        "",
    ),
]

# _SPACE_RE matches a run of whitespace. The data indents its lines and
# separates its runs with non-breaking spaces, which `\s` matches.
_SPACE_RE: re.Pattern[str] = re.compile(r"\s+")

# _HUGS_LEFT are the characters that attach to whatever precedes them, and
# _HUGS_RIGHT to whatever follows. These decide the gaps between two runs,
# where the runs are joined, because the whitespace that separates them lives
# outside their text.
# POSTPROCESSING closes the same gaps within a run, but the two are not quite
# the same rule: the comma rule there reopens the gap in front of a hyphen, so
# `ⲁⲅⲅⲉⲗⲓⲕⲟⲥ, -ⲟⲛ` keeps its space. Nothing in the data splits a run between
# the comma and the hyphen, so the two never have to agree.
_HUGS_LEFT: str = "-,⸗)"
_HUGS_RIGHT: str = "("

# _CROSS_REFERENCE_RE matches an entry that points the reader at another entry
# (`ⲁⲛⲁⲗⲩⲯⲓⲥ (ⲧ) = ⲁⲛⲁⲗⲩⲙⲯⲓⲥ`) instead of defining a word. Such an entry
# legitimately carries no definition, and no Arabic.
_CROSS_REFERENCE_RE: re.Pattern[str] = re.compile(r"[=→]")


def _style(tag: bs4.Tag) -> str:
    style: str | list[str] | None = tag.get("style")
    assert style is None or isinstance(style, str)
    return style or ""


def _classes(tag: bs4.Tag) -> list[str]:
    classes: str | list[str] | None = tag.get("class")
    if classes is None:
        return []
    return [classes] if isinstance(classes, str) else classes


def _tags(string: bs4.NavigableString) -> abc.Generator[bs4.Tag]:
    """Yield the tags enclosing a string, innermost first.

    Args:
        string: The string to walk up from.

    Yields:
        The enclosing tags, from the innermost outwards.
    """
    for tag in string.parents:
        if isinstance(tag, bs4.Tag):
            yield tag


def _hidden(string: bs4.NavigableString) -> bool:
    """Whether the document hides a string.

    A few runs are marked `display: none`. They duplicate text that is already
    visible elsewhere in the same paragraph.

    Args:
        string: The string to check.

    Returns:
        Whether any enclosing tag hides the string.
    """
    return any(
        constants.DISPLAY_NONE_RE.search(_style(tag)) for tag in _tags(string)
    )


def _rtl(string: bs4.NavigableString) -> bool:
    """Whether the document renders a run right-to-left.

    Word records the direction of every run it sets with the Arabic keyboard,
    even where the font gives nothing away.

    Args:
        string: The string to check.

    Returns:
        Whether any enclosing tag marks the run right-to-left.
    """
    return any(tag.get("dir") == "rtl" for tag in _tags(string))


def _font(string: bs4.NavigableString) -> str:
    """Return the font that the document renders a string with.

    An inline `font-family` wins, however far up the tree it sits. A run that
    overrides no font inherits one from its character style, and a run without
    a character style falls back to the document's default font.

    Args:
        string: The string whose font to resolve.

    Returns:
        The font name, lowercased.
    """
    for tag in _tags(string):
        match: re.Match[str] | None = constants.FONT_FAMILY_RE.search(
            _style(tag),
        )
        if match:
            return match.group(1).strip().lower()
        for name in _classes(tag):
            if name.lower() in constants.CLASS_FONT:
                return constants.CLASS_FONT[name.lower()]
    return constants.DEFAULT_FONT


def _language(font: str, text: str, rtl: bool) -> Language:
    """Determine the language that a run is written in.

    The font decides, with two exceptions. A few dozen Arabic runs are set in
    `Arial`, which the data otherwise reserves for the mark of the pronominal
    forms; Arabic script is unambiguous, so the text overrules the font there.
    And a bracket looks the same in every font, so for those the direction
    decides.

    Args:
        font: The font that the document renders the run with.
        text: The text of the run.
        rtl: Whether the document renders the run right-to-left.

    Returns:
        The language of the run.
    """
    stripped: str = text.strip()
    if lang.has_lang("ARABIC", text):
        return Language.ARABIC
    if rtl and all(c in constants.MIRRORED_PUNCTUATION for c in stripped):
        # A right-to-left bracket has to stay with the right-to-left text, or
        # it comes out mirrored and its pair points the wrong way.
        return Language.ARABIC
    if all(c in constants.UNMISTAKABLE_SYMBOLS for c in stripped):
        return Language.SYMBOL
    for name, language in constants.FONT_LANGUAGE:
        if name in font:
            return language
    log.fatal("Unknown font", repr(font), "for the text:", repr(text))


def _hugs(before: str, after: str) -> bool:
    """Whether two runs meet with no space between them.

    Args:
        before: The text of the run on the left.
        after: The text of the run on the right.

    Returns:
        Whether the two runs join without a space.
    """
    return bool(after) and (
        after[0] in _HUGS_LEFT or (bool(before) and before[-1] in _HUGS_RIGHT)
    )


@typing.final
class Span:
    """Span is a run of text that the document writes in a single font."""

    def __init__(self, text: str, language: Language) -> None:
        # Collapse superfluous whitespace.
        text = _SPACE_RE.sub(" ", text)
        self.text: str = text.strip()
        self.language: Language = language
        # The whitespace around a run separates it from its neighbours, and is
        # the only record the document keeps of that separation. The whitespace
        # inside a run is a different beast: the Greek, for one, is littered
        # with spaces that mean nothing. So we hold the two apart,
        # and only put the boundary whitespace back after transliterating.
        self.lead: str = " " if text != text.lstrip() else ""
        self.trail: str = " " if self.text and text != text.rstrip() else ""
        del text
        if self.language == Language.HEBREW:
            # In the original data, Hebrew is written in reverse. Reverse
            # it before translating so that each vowel point follows its
            # consonant, as Unicode expects.
            self.text = self.text[::-1]
        if self.language == Language.GREEK:
            # The Greek is littered with stray spaces. Drop them before
            # transliterating, while the glyphs that give them away are still
            # there, and keep the spaces that separate two words.
            self.text = constants.GREEK_STRAY_SPACE_RE.sub(
                lambda m: m.group(1) or "",
                self.text,
            )
        # Convert to Unicode.
        if self.language not in constants.LANG_TRANSLATION:
            return
        translation: dict[int, str] = constants.LANG_TRANSLATION[self.language]
        ensure.members(map(ord, self.text), translation)
        self.text = self.text.translate(translation)

    def neutral(self) -> bool:
        # Whether the run carries a language of its own. Whitespace, symbols
        # and bare punctuation don't; they belong to the text around them.
        # Only a language that the document stores as plain Unicode can hold
        # bare punctuation: the encoded ones spend those same characters on
        # letters, so `[` is a Coptic ⲝ and `(` a Hebrew ע.
        return (
            not self.text
            or self.language == Language.SYMBOL
            or (
                self.language not in constants.LANG_TRANSLATION
                and all(c in constants.NEUTRAL_PUNCTUATION for c in self.text)
            )
        )

    def postprocess(self) -> None:
        """Tidy up the transliterated text.

        We do this per run, and before the runs are wrapped in their tags: the
        rules below move spaces about, and a rule can't tell that a space it
        adds sits right against a space on the far side of a tag.
        """
        for pattern, repl in POSTPROCESSING:
            if isinstance(pattern, str):
                self.text = self.text.replace(pattern, repl)
            else:
                self.text = pattern.sub(repl, self.text)
        # A rule may have pushed a space out to either end of the run, where it
        # separates this run from the next rather than belonging to it.
        if self.text != self.text.lstrip():
            self.lead = " "
        if self.text != self.text.rstrip():
            self.trail = " "
        self.text = self.text.strip()

    def content(self, html: bool) -> str:
        # Arabic and Hebrew have classes, because they are right-to-left and
        # need to be styled. The other languages need no class of their own.
        if not html or self.language not in [Language.ARABIC, Language.HEBREW]:
            return self.text
        return (
            f'<span class="{self.language.value.lower()}">{self.text}</span>'
        )

    @typing.override
    def __str__(self) -> str:
        return self.lead + self.text + self.trail


class Paragraph:
    """Paragraph represents a <p> tag from the dictionary data."""

    def __init__(self, p: bs4.Tag) -> None:
        text: str = p.get_text()
        # The data indents its continuation lines with a leading run of
        # non-breaking spaces. Read the indentation off the paragraph, before
        # any whitespace is normalized away: it is what tells a derivation
        # apart from a new entry.
        self.indented: bool = bool(text) and text[0].isspace()
        del text

        self.spans: list[Span] = list(self._runs(p))
        self._adopt_neutrals()
        self._squash()
        for s in self.spans:
            s.postprocess()

    @staticmethod
    def _runs(p: bs4.Tag) -> abc.Generator[Span]:
        """Extract the runs of a paragraph.

        We walk the strings rather than the <span> tags, because the tags nest:
        a run is wrapped in an outer <span> bearing its character style and an
        inner one bearing its font, and a few outer spans hold text of their
        own. Walking the strings visits each piece of text exactly once.

        Args:
            p: The paragraph to extract the runs of.

        Yields:
            The runs of the paragraph, in order.
        """
        for node in p.descendants:
            if not isinstance(node, bs4.NavigableString):
                continue
            if not node or _hidden(node):
                continue
            text: str = str(node)
            if not text.strip():
                # The document separates its runs with plain spaces, which sit
                # between the tags rather than inside them. Whitespace has no
                # language, so we don't bother asking what font it is in. The
                # language below is a placeholder that `_adopt_neutrals`
                # replaces, and that nothing decodes in the meantime, because
                # the run holds nothing to decode.
                yield Span(text, Language.SYMBOL)
                continue
            yield Span(text, _language(_font(node), text, _rtl(node)))

    def _adopt_neutrals(self) -> None:
        """Give the neutral runs the language of their neighbours.

        A symbol or a run of whitespace has no language of its own; it belongs
        to the text around it. The arrow in `ⲃⲁⲥⲧ⸗ → ⲃⲱⲥⲧ` is part of the
        Coptic, not a language of its own.
        """
        languages: list[Language | None] = [
            None if span.neutral() else span.language for span in self.spans
        ]
        # A neutral run belongs to the run before it, or, when it opens the
        # paragraph, to the run after it.
        for i in range(1, len(languages)):
            languages[i] = languages[i] or languages[i - 1]
        for i in reversed(range(len(languages) - 1)):
            languages[i] = languages[i] or languages[i + 1]

        for span, language in zip(self.spans, languages, strict=True):
            if language:
                span.language = language

    def _squash(self) -> None:
        """Merge the adjacent runs that share a language.

        The whitespace that separated the two runs moves inside the merged
        one, where the final normalization can collapse it.
        """
        result: list[Span] = []
        for span in self.spans:
            if not result or result[-1].language != span.language:
                result.append(span)
                continue
            previous: Span = result[-1]
            if not span.text:
                # A run of pure whitespace only records a separation.
                previous.trail = " "
                continue
            previous.text += previous.trail + span.lead + span.text
            previous.trail = span.trail
        self.spans = result

    @typing.override
    def __str__(self) -> str:
        return "".join(map(str, self.spans)).strip()

    def empty(self) -> bool:
        # We look at the converted text rather than at the runs: a few
        # paragraphs hold nothing but characters that transliterate away.
        return not "".join(s.text for s in self.spans).strip()

    def content_aux(
        self,
        html: bool,
        spans: list[Span] | None = None,
    ) -> abc.Generator[str]:
        # The whitespace separating two runs stays outside their tags, so that
        # the normalization in `content` sees the two sides of a boundary as
        # one run of whitespace rather than as two split by a tag.
        gap: str = ""
        previous: str = ""
        if spans is None:
            spans = self.spans
        for s in spans:
            gap = gap or s.lead
            if not s.text:
                continue
            if not _hugs(previous, s.text):
                yield gap
            yield s.content(html)
            gap = s.trail
            previous = s.text

    def content(self, html: bool, spans: list[Span] | None = None) -> str:
        content: str = "".join(self.content_aux(html, spans))
        content = " ".join(content.split()).strip()
        if spans is None:
            # If we're not using the override, we have used our own spans,
            # which means that we must have content.
            ensure.ensure(content, "paragraph", self, "has no content!")
        return content

    def langs(self) -> set[Language]:
        return {s.language for s in self.spans}

    def _coptic_prefix(self) -> list[Span]:
        """The Coptic runs that open the paragraph.

        Returns:
            The runs that make up the headword.
        """
        spans: list[Span] = []
        for s in self.spans:
            if s.language != Language.COPTIC:
                break
            spans.append(s)
        return spans

    def coptic_prefix(self, html: bool) -> str:
        return self.content(html, self._coptic_prefix())

    def non_coptic_suffix(self, html: bool) -> str:
        return self.content(html, self.spans[len(self._coptic_prefix()) :])


@typing.final
class DictionaryEntry:
    """DictionaryEntry is an entry in Andreas's Dictionary."""

    def __init__(self, paragraphs: list[Paragraph], idx: int) -> None:
        # TODO: (#595) The methods below split an entry into Coptic (front) and
        # non-Coptic (back). You should extract Greek separately from the
        # non-Coptic part. This should be done in the constructor, which would
        # simplify the other methods. It should also render HTML elements within
        # individual spans unnecessary, because the remainder of the non-Coptic
        # part (after the Greek prefix) should be entirely right-to-left (though
        # we are yet to verify that).
        self.paragraphs: list[Paragraph] = paragraphs
        assert self.paragraphs
        assert idx > 0
        self.key: str = str(idx)

    @typing.override
    def __str__(self) -> str:
        return "\n".join(map(str, self.paragraphs))

    @functools.cached_property
    def _split(self) -> int:
        """The index of the paragraph where the definition begins.

        The front and the back meet in a single paragraph: the first one that
        carries a non-Coptic part. Both sides read that boundary from here, so
        that they can't come to disagree about where it lies.

        Returns:
            The index of that paragraph, or the number of paragraphs if the
            entry is all Coptic and has no definition at all.
        """
        for i, p in enumerate(self.paragraphs):
            if p.non_coptic_suffix(html=False):
                return i
        return len(self.paragraphs)

    def _front_aux(self, html: bool) -> abc.Generator[str]:
        if html:
            yield f'<span class="{cls.WORD} B">'
            yield f'<span class="{cls.SPELLING} B">'

        # The front consists of the Coptic prefix of the data. This is an
        # (optional) sequence of paragraphs that consist entirely of Coptic,
        # followed by an (optional) partial paragraph that only has a Coptic
        # prefix.
        previous: str = ""
        for i, p in enumerate(self.paragraphs[: self._split + 1]):
            prefix: str = p.coptic_prefix(html)
            if prefix and previous and not _hugs(previous, prefix):
                # A headword can run over several lines, and the line break
                # between them separates its words.
                yield " "
            yield prefix
            previous = prefix or previous
            if i == 0:
                self._check_headword(p, prefix)

        if html:
            yield "</span>"
            yield "</span>"

    @staticmethod
    def _check_headword(p: Paragraph, prefix: str) -> None:
        ensure.ensure(
            prefix,
            "Paragraph starts an entry but has no Coptic prefix:",
            p,
        )
        if prefix.startswith("-"):
            prefix = prefix[1:]
        ensure.ensure(
            lang.is_lang("COPTIC", prefix[0]),
            "Coptic prefix doesn't start with Coptic text:",
            p,
        )

    def front(self, html: bool) -> str:
        return "".join(self._front_aux(html))

    def back_aux(self, html: bool) -> abc.Generator[str]:
        """Yield the paragraphs of the definition.

        Args:
            html: Whether to render the text as HTML.

        Yields:
            The non-Coptic part of the paragraph that the front ends in,
            followed by the paragraphs after it in full.
        """
        if self._split == len(self.paragraphs):
            # The entry is all Coptic. It has no definition.
            return
        yield self.paragraphs[self._split].non_coptic_suffix(html)
        for p in self.paragraphs[self._split + 1 :]:
            yield p.content(html)

    def back(self, html: bool) -> str:
        # A paragraph of the definition is a block of its own. We wrap it here
        # rather than in `Paragraph.content`, so that an empty paragraph stays
        # empty: the checks below and in `back_aux` read that emptiness.
        back: str = "\n".join(
            f"<p>{b}</p>" if html else b for b in self.back_aux(html)
        )
        if _CROSS_REFERENCE_RE.search(str(self)):
            # A cross-reference sends the reader to another entry rather than
            # defining anything, so it owes us neither a definition nor Arabic.
            return back
        ensure.ensure(back, "Entry doesn't have a definition:", self)
        # TODO: (#591) Handle the errors below, and switch the error message to
        # an assertion if the check has no false positives.
        if not lang.has_lang("ARABIC", back):
            log.error("Entry's definition has no Arabic:", self)
        return back


def parse_html(file_path: pathlib.Path) -> abc.Generator[Paragraph]:
    """Read HTML file and extract paragraphs.

    Args:
        file_path: Path to the HTML file.

    Yields:
        Paragraph objects representing <p> elements in the HTML.
    """

    soup: bs4.BeautifulSoup = bs4.BeautifulSoup(
        file.read(file_path),
        "html.parser",
    )

    # NOTE: All new lines in the data are represented by <p> tags.
    for p in map(Paragraph, soup.find_all("p")):
        if p.empty():
            continue
        yield p


def group_paragraphs(
    paragraphs: abc.Iterable[Paragraph],
) -> abc.Generator[DictionaryEntry]:
    """Group paragraphs to dictionary entries.

    Args:
        paragraphs: An iterable of Paragraph objects containing dictionary text.

    Yields:
        DictionaryEntry objects.
    """

    entry: list[Paragraph] = []
    idx: int = 1
    for p in paragraphs:
        # Check if this paragraph is the start of a new entry, in which case we
        # yield and entry and start a new one.
        # A new entry is marked by a paragraph containing Coptic text (unless
        # it's indented, in which case it belong to the entry above it).
        if entry and Language.COPTIC in p.langs() and not p.indented:
            # This paragraph actually starts a new entry.
            yield DictionaryEntry(entry, idx)
            idx += 1
            entry = []

        entry.append(p)
    # Yield the last entry.
    if entry:
        yield DictionaryEntry(entry, idx)
        idx += 1
        entry = []


@functools.cache
def words() -> list[DictionaryEntry]:
    # Get spans, corresponding to tags that have text, from the HTML files.
    paragraphs: abc.Iterable[Paragraph] = itertools.chain(
        *map(parse_html, constants.INPUT),
    )

    # Generate entries.
    return list(group_paragraphs(paragraphs))


def notes_aux() -> abc.Generator[deck.Note]:
    for word in words():
        yield deck.Note(
            key=word.key,
            title=word.key,
            front=word.front(html=True),
            back=word.back(html=True),
            force_content=False,
            js_path=os.path.relpath(paths.ANDREAS_JS, paths.LEXICON_DIR),
            css=[os.path.relpath(paths.ANDREAS_CSS, paths.LEXICON_DIR)],
        )


XOOXLE = xooxle.Xooxle(
    source=((note.key, note.html) for note in notes_aux()),
    extract=[],
    captures=[
        xooxle.Capture(
            "FRONT",
            xooxle.Selector({"id": ids.FRONT}),
            retain_classes={cls.WORD, "B"},
        ),
        xooxle.Capture(
            "BACK",
            xooxle.Selector({"id": ids.BACK}),
            # We need the Arabic for styling. We don't need any other classes.
            retain_classes={
                language.value.lower()
                for language in [Language.ARABIC, Language.HEBREW]
            },
            # Each paragraph of the definition is a line of its own. Without
            # this, they would run together, and the styling would have to
            # break them apart, which mixed left-to-right and right-to-left
            # text doesn't survive.
            block_elements=xooxle.BLOCK_ELEMENTS_DEFAULT | {"p"},
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "andreas.json"),
)
