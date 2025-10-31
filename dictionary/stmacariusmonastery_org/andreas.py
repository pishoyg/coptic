"""Convert Andreas's Dictionary Data to Unicode."""

import collections
import functools
import itertools
import os
import pathlib
import re
import typing
from collections import abc

import bs4

from dictionary.stmacariusmonastery_org import constants
from dictionary.stmacariusmonastery_org.constants import Language
from flashcards import deck
from utils import ensure, file, lang, log, page, paths
from xooxle import xooxle

# TODO: (#589) Once the Hebrew encoding is populated, this won't be needed
# anymore.
hebrew_freq: collections.Counter[str] = collections.Counter()

POSTPROCESSING: list[tuple[str | re.Pattern[str], str]] = [
    (" -", "-"),
    (" ,", ","),
    (",", ", "),
    (" ⸗", "⸗"),
    ("→", " → "),
    ("( ", "("),
    (" )", ")"),
    ("  ", " "),
    # Misplaced accents:
    (re.compile("(?:`|⳿)(.)"), r"\1̀"),
    (re.compile(" \u0300(.)"), r"\1̀"),
    # Misplaced overline:
    (re.compile("(.) \u0305"), r"\1̅"),
    # Extra space (common error by our heurstic, because it inserts spaces
    # between all spans).
    (re.compile("(→ .) "), r"\1"),
    # Combining double overline.
    ("\u0305 \u0305", "\u033f"),
]


@typing.final
class Span:
    """Span represents an HTML tag bearing text in a given language."""

    def __init__(self, tag: bs4.Tag) -> None:
        self.text: str = tag.get_text().replace("\n", " ")
        self.indented: bool = bool(self.text) and self.text[0].isspace()
        # Remove superfluous space after determining whether the span is
        # indented.
        self.text = " ".join(self.text.split()).strip()
        style = tag.get("style")
        assert style is None or isinstance(style, str)
        self.language: Language = self._determine_language(style)
        self.unicode: bool = False

    def convert_to_unicode(self) -> None:
        self.unicode = True
        if self.language == Language.RIGHT_ARROW:
            assert len(self.text) == 1
            self.text = "→"
            return

        if self.language in [Language.ARABIC, Language.LATIN]:
            # Arabic and Latin text is not encoded.
            return

        # TODO: (#589) Stop giving Hebrew special treatment.
        if self.language == Language.HEBREW:
            # We don't have the Hebrew encoding yet.
            # Add text to the Hebrew letter frequency tracker.
            hebrew_freq.update(self.text)
            # In the original text, Hebrew is written in reverse.
            self.text = self.text[::-1]
            return

        # This is an encoded language.
        self.text = self.text.translate(constants.LANG_ENCODING[self.language])

    def _determine_language(self, style: str | None) -> Language:
        if any(map(lang.is_arabic_char, self.text)):
            return Language.ARABIC

        if not style:
            return Language.UNKNOWN

        # Extract font properties from inline styles
        font_match: re.Match[str] | None = constants.FONT_FAMILY_RE.search(
            style,
        )

        if not font_match:
            return Language.GREEK

        font: str = font_match.group(1).strip().lower()
        if "athanasius" in font:
            return Language.COPTIC
        if "rhebrew" in font:
            return Language.HEBREW
        if "kenshrin1" in font:
            return Language.ARABIC
        if "wingdings" in font:
            return Language.RIGHT_ARROW
        if "greek" in font or "athena" in font:
            return Language.GREEK

        # Some corner cases:
        if "times new roman" in font:
            return Language.LATIN
        # TODO: (#590) Prevent spans with unknown languages. We should be able
        # to infer languages for all spans.
        return Language.UNKNOWN

    def html(self) -> abc.Generator[str]:
        assert self.unicode
        assert self.language.known()
        # Only Arabic has classes, because it needs to be styled. For other
        # languages, we prefer omitting the language so we can prettify the text
        # (e.g. by removing superfluous space).
        if self.language == Language.ARABIC:
            yield f'<span class="{self.language.value.lower()}">'
        ensure.ensure(self.text, self, "has no text!")
        yield self.text
        if self.language == Language.ARABIC:
            yield "</span>"

    @typing.override
    def __str__(self) -> str:
        return f'("{self.text}", {self.language.value})'


class Paragraph:
    """Paragraph represents a <p> tag from the dictionary data."""

    def __init__(self, p: bs4.Tag) -> None:
        self.spans: list[Span] = []

        tag: bs4.Tag
        last_text: str | None = None
        for tag in p.find_all("span"):
            span: Span = Span(tag)
            if not span.text:
                # An empty span!
                continue

            # Outer and inner spans cause some text to be repeated twice.
            # This repetition comes from the fact that we encounter the same
            # string several times as we navigate down the tree:
            #  - `soup.find_all("span")` loops over all <span> tags.
            #  - Some of those span elements may be parents of other span
            #    elements that we will cover later in the loop.
            # TODO: (#590) This is only valid if every <span> element is
            # guaranteed to have a single string as a child, which may not be
            # the case. Also this is not a clean check. Investigate and fix.
            if last_text == span.text:
                # If the second occurrence of the text has no language, use the
                # first occurrence
                if span.language == Language.UNKNOWN:
                    continue
                else:
                    # Otherwise, use the second occurrence.
                    _ = self.spans.pop()

            self.spans.append(span)
            last_text = span.text

        self._squash()
        # After squashing, all spans should represent known languages.
        self._assert_all_known()

        for s in self.spans:
            s.convert_to_unicode()

    def _assert_all_known(self) -> None:
        unknown: list[Span] = [s for s in self.spans if not s.language.known()]
        if not unknown:
            return
        log.fatal(
            self,
            "has spans with unknown languages after squashing:",
            unknown,
        )

    @typing.override
    def __str__(self) -> str:
        return str(list(map(str, self.spans)))

    def _squash(self) -> None:
        """Merge consecutive paragraphs within the same language."""
        # TODO: (#590) You shouldn't need to squash any spans. Spans should be
        # independent of one another, and each span should bear its own language
        # information.

        result: list[Span] = []
        for span in self.spans:
            if not result:
                result.append(span)
                continue
            # If a span has an unknown language, or is an arrow, it belongs to
            # the previous span.
            # Also, if it has the same language as the previous span, we simply
            # concatenate them.
            if span.language == Language.RIGHT_ARROW:
                span.convert_to_unicode()
            if span.language in [
                Language.UNKNOWN,
                Language.RIGHT_ARROW,
                result[-1].language,
            ]:
                result[-1].text += " " + span.text
                continue

            # If the top of the stack has an unknown language, it's the same
            # language as this span.
            if result[-1].language == Language.UNKNOWN:
                result[-1].language = span.language
            result.append(span)

        self.spans = result

    def empty(self) -> bool:
        return not self.spans

    def html_aux(self, spans: list[Span] | None = None) -> abc.Generator[str]:
        for s in (self.spans if spans is None else spans):
            if s.language == Language.HEBREW:
                # We don't support Hebrew yet.
                # TODO: (#589) Extend support for Hebrew.
                continue
            yield from s.html()

    def html(self, spans: list[Span] | None = None) -> str:
        html: str = "".join(self.html_aux(spans))
        # TODO: (#590) While this normalization step removes a lot of unwanted
        # space, some space characters mistakenly make it to the output.
        # Examples:
        # - ϯ ⲡ⸗ ⲟⲩⲟⲓ
        # - ϭⲉ- → ϭ ⲟ
        # This is true for both Greek and Coptic, although there are far fewer
        # Greek victims.
        # Here is a list of candidates:
        # - https://remnqymi.com/crum/?regex=true&query=%5Cp%7BScript%3DCoptic%7D+%5Cp%7BScript%3DCoptic%7D # pylint: disable=line-too-long
        # - https://remnqymi.com/crum/?query=%5Cp%7BScript%3DGreek%7D+%5Cp%7BScript%3DGreek%7D&regex=true # pylint: disable=line-too-long
        html = " ".join(html.split()).strip()
        for substitution in POSTPROCESSING:
            pattern, repl = substitution
            if isinstance(pattern, str):
                html = html.replace(pattern, repl)
            else:
                assert isinstance(pattern, re.Pattern)
                html = pattern.sub(repl, html)
        if spans is None:
            # If we're not using the override, we have used our own spans, which
            # means that we must have content.
            ensure.ensure(html, "paragraph", self, "seemingly has no content!")
        return html

    def langs(self) -> set[Language]:
        self._assert_all_known()
        return {s.language for s in self.spans}

    def _coptic_prefix(self) -> list[Span]:
        spans: list[Span] = []
        for s in self.spans:
            if s.language != Language.COPTIC:
                break
            spans.append(s)
        if not spans:
            log.error(self, "has no Coptic prefix!")
        return spans

    def coptic_prefix_html(self) -> str:
        return self.html(self._coptic_prefix())

    def non_coptic_suffix_html(self) -> str:
        return self.html(self.spans[len(self._coptic_prefix()) :])

    def indented(self) -> bool:
        return self.spans[0].indented


@typing.final
class DictionaryEntry:
    """DictionaryEntry is an entry in Andreas's Dictionary."""

    def __init__(self, paragraphs: list[Paragraph]) -> None:
        self.paragraphs: list[Paragraph] = paragraphs

    @typing.override
    def __str__(self) -> str:
        return str(list(map(str, self.paragraphs)))

    def _front_aux(self) -> abc.Generator[str]:
        # The front is the first paragraph.
        assert self.paragraphs
        yield '<span class="word B">'
        yield '<span class="spelling B">'
        yield self.paragraphs[0].coptic_prefix_html()
        yield "</span>"
        yield "</span>"

    def front(self) -> str:
        return "".join(self._front_aux())

    def back_aux(self) -> abc.Generator[str]:
        yield self.paragraphs[0].non_coptic_suffix_html()
        for p in self.paragraphs[1:]:
            yield p.html()

    def back(self) -> str:
        # TODO: (#589) Add Hebrew to the output.
        back: str = page.LINE_BREAK.join(filter(None, self.back_aux()))
        if not back:
            log.error("Entry doesn't have a back:", self)
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
    for p in paragraphs:
        # Check if this paragraph is the start of a new entry, in which case we
        # yield and entry and start a new one.
        # A new entry is marked by a paragraph containing Coptic text (unless
        # it's indented, in which case it belong to the entry above it).
        if entry and Language.COPTIC in p.langs() and not p.indented():
            # This paragraph actually starts a new entry.
            yield DictionaryEntry(entry)
            entry = []

        entry.append(p)
    # Yield the last entry.
    if entry:
        yield DictionaryEntry(entry)


@functools.cache
def words() -> list[DictionaryEntry]:
    # Get spans, corresponding to tags that have text, from the HTML files.
    paragraphs: abc.Iterable[Paragraph] = itertools.chain(
        *map(parse_html, constants.INPUT),
    )

    # Generate entries.
    return list(group_paragraphs(paragraphs))


def notes_aux() -> abc.Generator[deck.Note]:
    for key, word in enumerate(words(), 1):
        yield deck.Note(
            key=str(key),
            title=str(key),
            front=word.front(),
            back=word.back(),
            force_content=False,
        )


XOOXLE = xooxle.Xooxle(
    source=notes_aux,
    extract=[],
    captures=[
        xooxle.Capture(
            "front",
            xooxle.Selector({"id": "front"}),
            retain_classes={"word", "B"},
        ),
        xooxle.Capture(
            "back",
            xooxle.Selector({"id": "back"}),
            # We need the Arabic for styling. We don't need any other classes.
            retain_classes={"arabic"},
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "andreas.json"),
)
