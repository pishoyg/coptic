"""Convert Andreas's Dictionary Data to Unicode."""

import collections
import functools
import itertools
import pathlib
import re
import typing
from collections import abc

import bs4

from dictionary.stmacariusmonastery_org import constants
from dictionary.stmacariusmonastery_org.constants import Language
from utils import file, lang, log

# TODO: (#589) Once the Hebrew encoding is populated, this won't be needed
# anymore.
hebrew_freq: collections.Counter[str] = collections.Counter()


@typing.final
class Span:
    """Span represents an HTML tag bearing text in a given language."""

    def __init__(self, tag: bs4.Tag) -> None:
        self.text: str = tag.get_text(strip=True).replace("\n", " ")
        style = tag.get("style")
        assert style is None or isinstance(style, str)
        self.language: Language = self._determine_language(style)

    def convert_to_unicode(self) -> None:
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
        unknown: list[Span] = [s for s in self.spans if not s.language.known()]
        if unknown:
            log.fatal(
                self,
                "has spans with unknown languages after squashing:",
                unknown,
            )
        del unknown

        for s in self.spans:
            s.convert_to_unicode()

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

    # TODO: (#590) While this normalization step removes a lot of unwanted
    # space, some space characters mistakenly make it to the output.
    # Examples:
    # - ϯ ⲡ⸗ ⲟⲩⲟⲓ
    # - ϭⲉ- → ϭ ⲟ
    # This is true for both Greek and Coptic, although there are far fewer Greek
    # victims.
    # Here is a list of candidates:
    # - https://remnqymi.com/crum/?regex=true&query=%5Cp%7BScript%3DCoptic%7D+%5Cp%7BScript%3DCoptic%7D # pylint: disable=line-too-long
    # - https://remnqymi.com/crum/?query=%5Cp%7BScript%3DGreek%7D+%5Cp%7BScript%3DGreek%7D&regex=true # pylint: disable=line-too-long
    def lang(self, language: Language) -> str:
        assert language.known()
        text: str = " ".join(
            s.text for s in self.spans if s.language == language
        )
        text = " ".join(text.split()).strip()
        return text

    def empty(self) -> bool:
        return not self.spans


POSTPROCESSING: list[tuple[str, str]] = [
    (" -", "-"),
    (" ,", ","),
    (",", ", "),
    (" ⸗", "⸗"),
    ("→", " → "),
    ("( ", "("),
    (" )", ")"),
    ("  ", " "),
]

_ACCENTED_LETTER_RE: re.Pattern[str] = re.compile("(?:`|⳿)(.)")
_MISPLACED_ACCENT_RE: re.Pattern[str] = re.compile(" \u0300(.)")
_MISPLACED_OVERLINE_RE: re.Pattern[str] = re.compile("(.) \u0305")
_MISPLACED_ARROW_RE: re.Pattern[str] = re.compile("(→ .) ")


@typing.final
class DictionaryEntry:
    """DictionaryEntry is an entry in Andreas's Dictionary."""

    def __init__(self, paragraphs: list[Paragraph]) -> None:
        self.paragraphs: list[Paragraph] = paragraphs

    def _normalize_coptic(self, text: str) -> str:
        text = _ACCENTED_LETTER_RE.sub(r"\1̀", text)
        text = _MISPLACED_ACCENT_RE.sub(r"\1̀", text)
        text = _MISPLACED_OVERLINE_RE.sub(r"\1̅", text)
        text = _MISPLACED_ARROW_RE.sub(r"\1", text)
        # Fix the combining double overline.
        text = text.replace("\u0305 \u0305", "\u033f")
        return text

    def _lang(self, language: Language) -> str:
        # TODO: (#590) Grouping the output by language causes the text to be
        # reordered in an undesirable manner. You should instead retain the same
        # order in the input.
        assert language.known()
        lines: abc.Iterable[str] = [p.lang(language) for p in self.paragraphs]
        lines = filter(None, lines)
        text = "\n".join(lines)
        for substitution in POSTPROCESSING:
            pattern, repl = substitution
            text = text.replace(pattern, repl)
        if language == Language.COPTIC:
            text = self._normalize_coptic(text)
        return text

    def _front_aux(self) -> abc.Generator[str]:
        assert self.paragraphs
        yield '<span class="word B">'
        yield '<span class="spelling B">'
        yield self._lang(Language.COPTIC)
        yield "</span>"
        yield "</span>"

    def front(self) -> str:
        return "".join(self._front_aux())

    def _span(self, language: Language) -> str:
        text: str = self._lang(language)
        if not text:
            return ""
        return f'<span class="{language.value.lower()}">{text}</span>'

    def back(self) -> str:
        # TODO: (#589) Add Hebrew to the output.
        langs: list[Language] = [
            Language.ARABIC,
            Language.GREEK,
            Language.LATIN,
        ]
        return (
            " ".join(filter(None, map(self._span, langs)))
            .replace("\n", "<br>")
            .strip()
        )


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

    # TODO: (#590) Below, you make the assumption that newlines are always
    # represented by <p> tags. Verify this assumption.
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
        if entry and p.lang(Language.COPTIC):
            # This paragraph actually starts a new entry.
            # TODO: (#590) Handle derivations. Some paragraphs with Coptic texts
            # don't start new entries, but belong to the entries above them.
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
