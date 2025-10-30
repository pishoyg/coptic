"""Convert Andreas's Dictionary Data to Unicode."""

import collections
import functools
import pathlib
import re
import typing
from collections import abc

import bs4

from dictionary.stmacariusmonastery_org import constants
from dictionary.stmacariusmonastery_org.constants import Language
from utils import ensure, file, lang, log


@typing.final
class Span:
    """Span represents an HTML tag bearing text in a given language."""

    def __init__(self, text: str, style: str | list[str] | None):
        self.text: str = text
        assert style is None or isinstance(style, str)
        self.language: Language = self._determine_language(style)

    def convert_to_unicode(self) -> None:
        if self.language == Language.RIGHT_ARROW:
            assert len(self.text) == 1
            self.text = "→"
            return

        if self.language == Language.ARABIC:
            # Arabic text is not encoded.
            return

        # TODO: (#452) Stop giving Hebrew special treatment.
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

        return Language.UNKNOWN


POSTPROCESSING: list[tuple[str, str]] = [
    (" -", "-"),
    (" ,", ","),
    (" ⸗", "⸗"),
    ("→", " → "),
    ("( ", "("),
    (" )", ")"),
    ("  ", " "),
]

_ACCENTED_LETTER_RE: re.Pattern[str] = re.compile("(?:`|⳿)(.)")
_MISPLACED_ACCENT_RE: re.Pattern[str] = re.compile("\u0300 (.)")


@typing.final
class DictionaryEntry:
    """DictionaryEntry is an entry in Andreas's Dictionary."""

    def __init__(self) -> None:
        self.coptic_spans: list[str] = []
        self.arabic_spans: list[str] = []
        self.greek_spans: list[str] = []
        self.hebrew_spans: list[str] = []

    def coptic(self) -> str:
        text: str = self._normalize(" ".join(self.coptic_spans))
        text = _ACCENTED_LETTER_RE.sub(r"\1̀", text)
        text = _MISPLACED_ACCENT_RE.sub(r"\1̀", text)
        # Fix the combining double overline.
        text = text.replace("\u0305 \u0305", "\u033f")
        return text

    def greek(self) -> str:
        return self._normalize(" ".join(self.greek_spans))

    def arabic(self) -> str:
        return self._normalize(" ".join(self.arabic_spans))

    def hebrew(self) -> str:  # dead: disable
        return self._normalize(" ".join(self.hebrew_spans))

    def _normalize(self, text: str) -> str:
        text = " ".join(text.split())
        for substitution in POSTPROCESSING:
            pattern, repl = substitution
            text = text.replace(pattern, repl)
        text = text.strip()
        return text

    def front_aux(self) -> abc.Generator[str]:
        assert self.coptic_spans
        yield '<span class="word B">'
        yield '<span class="spelling B">'
        yield self.coptic()
        yield "</span>"
        yield "</span>"

    def front(self) -> str:
        return "".join(self.front_aux())

    def back(self) -> str:
        assert self.arabic_spans
        # TODO: (#452) Add Hebrew to the output.
        return f"{self.arabic()} {self.greek()}".strip()


def parse_html_spans(file_path: pathlib.Path) -> list[Span]:
    """Read HTML file and extract span tags with their content and font
    information.

    Args:
        file_path: Path to the HTML file.

    Returns:
        list: List of dictionaries containing span content and font info.
    """

    soup: bs4.BeautifulSoup = bs4.BeautifulSoup(
        file.read(file_path),
        "html.parser",
    )

    spans: list[Span] = []
    tag: bs4.Tag
    last_content: str | None = None
    for tag in soup.find_all("span"):
        content: str = tag.get_text(strip=True).replace("\n", " ")
        if not content:
            continue
        span: Span = Span(content, tag.get("style"))

        # Outer and inner spans cause some text to be repeated twice.
        # Notice that some of this repetition comes from the fact that we loop
        # over the same tag several times as we navigate down the tree:
        #  - `soup.find_all("span")` loops over all <span> tags.
        #  - Some of those span elements may be parents of other span elements
        #    that we will cover later in the loop.
        if last_content == content:
            # If the second occurrence of the text has no language, use the
            # first occurrence
            if span.language == Language.UNKNOWN:
                continue
            else:
                # Otherwise, use the second occurrence.
                _ = spans.pop()

        spans.append(span)
        last_content = content
    return spans


# TODO: (#452) Once the Hebrew encoding is populated, this won't be needed
# anymore.
hebrew_freq: collections.Counter[str] = collections.Counter()


class Alphabet:
    """Alphabet tracks the alphabet letters."""

    def __init__(self) -> None:
        self.letter: str = "ⲁ"
        self.section: str = self._section_name()

    def next(self) -> None:
        assert not self.last()
        # The letters ⲁ through ⲱ live in a different Unicode block
        # from ϣ through ϯ, so we need to manually handle the
        # transition between blocks.
        # See:
        # - https://en.wikipedia.org/wiki/Coptic_(Unicode_block)
        # - https://en.wikipedia.org/wiki/Greek_and_Coptic
        self.letter = "ϣ" if self.letter == "ⲱ" else chr(ord(self.letter) + 2)
        self.section = self._section_name()

    def last(self) -> bool:
        return self.letter == "ϯ"

    def _section_name(self) -> str:
        return " ".join((self.letter.upper(), ",", self.letter))


def squash(spans: abc.Iterable[Span]) -> list[Span]:
    """Merge consecutive strings with the same language (or if either of them
    is unknown).

    Args:
        spans: A list of Span objects containing text content and language
            information.

    Returns:
        A list of Span objects with consecutive spans merged based on language
        compatibility.
    """

    result: list[Span] = []
    for span in spans:
        if not result:
            result.append(span)
            continue
        # If a span has an unknown language, or is an arrow, it belongs to the
        # previous span.
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
        result.append(span)

    return result


def group_entries(spans: list[Span]) -> abc.Generator[DictionaryEntry]:
    """Group spans to dictionary entries.

    Args:
        spans: A list of Span objects containing text content and language
            information.

    Yields:
        DictionaryEntry objects.
    """

    # Keep track of the letter that we're currently processing.
    ab: Alphabet = Alphabet()

    entry: DictionaryEntry = DictionaryEntry()
    for i, span in enumerate(spans):
        match span.language:
            case Language.COPTIC | Language.RIGHT_ARROW:
                entry.coptic_spans.append(span.text)
            case Language.ARABIC:
                entry.arabic_spans.append(span.text)
            case Language.GREEK:
                entry.greek_spans.append(span.text)
            case Language.HEBREW:
                entry.hebrew_spans.append(span.text)
            case Language.UNKNOWN:
                log.fatal("span", span, "has an unknown language")

        # We know that a dictionary entry has ended when we have a piece of
        # Arabic text followed by a piece of Coptic text (which would be
        # part of the next entry).
        # TODO: (#452) Some entries represent derivations of previous
        # entries, and should be nested instead of occupying a standalone
        # place. Handle this case.
        if span.language == Language.ARABIC and (
            i == len(spans) - 1 or spans[i + 1].language == Language.COPTIC
        ):
            # Entry has ended.
            # Check if we're starting a new letter in the dictionary.
            if entry.coptic_spans[0].startswith(ab.section):
                # Each section starting with a given letter has a redundant
                # entry at the beginning that we need to clean.
                entry.coptic_spans[0] = entry.coptic_spans[0].removeprefix(
                    ab.section,
                )
                if not ab.last():
                    ab.next()  # Move to the next section.

            yield entry
            # Start a new entry.
            entry = DictionaryEntry()

    # Make sure we've gone through the whole alphabet in order.
    ensure.ensure(
        ab.last(),
        "We don't seem to have gone through all letters! Current letter is:",
        ab.letter,
    )


@functools.cache
def words() -> list[DictionaryEntry]:
    spans: abc.Iterable[Span] = (
        span
        for input_file in constants.INPUT
        for span in parse_html_spans(input_file)
    )
    spans = squash(spans)
    for span in spans:
        span.convert_to_unicode()

    log.warn("Unknown Hebrew characters:", len(hebrew_freq))
    for char, count in hebrew_freq.most_common():
        log.warn(f"{char}\t", count, level=False)

    return list(group_entries(spans))
