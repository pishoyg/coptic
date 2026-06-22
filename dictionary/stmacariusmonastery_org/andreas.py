"""Convert Andreas's Dictionary Data to Unicode."""

import functools
import itertools
import os
import pathlib
import re
import typing
from collections import abc

import bs4

from dictionary import cls as dict_cls
from dictionary.stmacariusmonastery_org import constants
from dictionary.stmacariusmonastery_org.constants import Language
from flashcards import deck, ids
from utils import ensure, file, lang, log, paths
from xooxle import xooxle

POSTPROCESSING: list[tuple[str | re.Pattern[str], str]] = [
    ("``", "`"),
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
        style: str | list[str] | None = tag.get("style")
        assert style is None or isinstance(style, str)
        self.language: Language = self._determine_language(style)
        self.unicode: bool = False

    def convert_to_unicode(self) -> None:
        ensure.ensure(not self.unicode, self, "already converted to Unicode!")
        self.unicode = True
        if self.language == Language.RIGHT_ARROW:
            assert len(self.text) == 1
            self.text = "→"
            return

        if self.language in [Language.ARABIC, Language.LATIN]:
            # Arabic and Latin text is not encoded.
            return

        if self.language == Language.HEBREW:
            # In the original data, Hebrew is written in reverse. Reverse it
            # before translating so that each vowel point follows its
            # consonant, as Unicode expects.
            self.text = self.text[::-1]

        # This is an encoded language.
        # TODO: (#590) This ignores characters not present in the mapping. You
        # should instead ensure that all encountered characters are present in
        # the mapping.
        self.text = self.text.translate(constants.LANG_ENCODING[self.language])

    def _determine_language(self, style: str | None) -> Language:
        if lang.has_lang("ARABIC", self.text):
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

    def content(self, html: bool) -> abc.Generator[str]:
        ensure.ensure(
            self.unicode,
            "attempting to retrieve span content before Unicode conversion:",
            self,
        )
        ensure.ensure(
            self.language.known(),
            "Can't retrieve content from a span with an unknown language:",
            self,
        )
        ensure.ensure(self.text, self, "has no text!")

        # Arabic and Hebrew have classes, because they need to be styled. For
        # other languages, we prefer omitting the language so we can prettify
        # the text (e.g. by removing superfluous space).
        # TODO: (#595) HTML classes will no longer be necessary if Greek is
        # extracted and the remainder is determined to be entirely
        # right-to-left. The "arabic" class would then be inserted on a
        # per-entry basis rather than on a per-span basis.
        span: bool = html and self.language in [
            Language.ARABIC,
            Language.HEBREW,
        ]
        if span:
            yield f'<span class="{self.language.value.lower()}">'
        yield self.text
        if span:
            yield "</span>"

    @typing.override
    def __str__(self) -> str:
        return self.text


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
        return " ".join(map(str, self.spans))

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

    def content_aux(
        self,
        html: bool,
        spans: list[Span] | None = None,
    ) -> abc.Generator[str]:
        for s in (self.spans if spans is None else spans):
            yield from s.content(html)

    def content(self, html: bool, spans: list[Span] | None = None) -> str:
        content: str = "".join(self.content_aux(html, spans))
        # TODO: (#590) While this normalization step removes a lot of unwanted
        # space, some space characters mistakenly make it to the output.
        # Examples:
        # - ϯ ⲡ⸗ ⲟⲩⲟⲓ
        # - ϭⲉ- → ϭ ⲟ
        # This is true for both Greek and Coptic, although there are far fewer
        # Greek victims.
        # It's also true for Arabic, unfortunately.
        # Here is a list of candidates:
        # pylint: disable-next=line-too-long
        # - https://remnqymi.com/crum/?regex=true&query=%5Cp%7BScript%3DCoptic%7D+%5Cp%7BScript%3DCoptic%7D+&crum=false&kellia=false
        # pylint: disable-next=line-too-long
        # - https://remnqymi.com/crum/?query=%5Cp%7BScript%3DGreek%7D+%5Cp%7BScript%3DGreek%7D&regex=true
        # The equivalent Arabic query returns most of the dictionary, so we
        # might have to go over the whole dictionary to find Arabic spacing
        # errors.
        content = " ".join(content.split()).strip()
        for substitution in POSTPROCESSING:
            pattern, repl = substitution
            if isinstance(pattern, str):
                content = content.replace(pattern, repl)
            else:
                assert isinstance(pattern, re.Pattern)
                content = pattern.sub(repl, content)
        if spans is None:
            # If we're not using the override, we have used our own spans, which
            # means that we must have content.
            ensure.ensure(content, "paragraph", self, "has no content!")
        return content

    def langs(self) -> set[Language]:
        self._assert_all_known()
        return {s.language for s in self.spans}

    def _coptic_prefix(self) -> list[Span]:
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

    def indented(self) -> bool:
        return self.spans[0].indented


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

    def _front_aux(self, html: bool) -> abc.Generator[str]:
        if html:
            yield f'<span class="{dict_cls.WORD} B">'
            yield f'<span class="{dict_cls.SPELLING} B">'

        # The front consists of the Coptic prefix of the data. This is an
        # (optional) sequence of paragraphs paragraphs that consist entirely of
        # Coptic, followed by an (optional) partial paragraph that only has a
        # Coptic prefix.
        for i, p in enumerate(self.paragraphs):
            prefix: str = p.coptic_prefix(html)
            yield prefix
            # TODO: (#591) Handle these errors, and switch the error message to
            # an assertion if the check has no false positives.
            if i == 0:
                if not prefix:
                    log.error(
                        "Paragraph starts an entry but has no Coptic prefix:",
                        p,
                    )
                elif not lang.is_lang("COPTIC", prefix[0]):
                    log.error(
                        "Coptic prefix doesn't start with Coptic text:",
                        p,
                    )
            if p.non_coptic_suffix(html):
                # This paragraph has a non-Coptic part! This is the start of the
                # back.
                break

        if html:
            yield "</span>"
            yield "</span>"

    def front(self, html: bool) -> str:
        return "".join(self._front_aux(html))

    def back_aux(self, html: bool) -> abc.Generator[str]:
        # Go through the paragraphs until you encounter non-Coptic text, and
        # yield everything starting from there.
        for i, p in enumerate(self.paragraphs):
            non_coptic_suffix: str = p.non_coptic_suffix(html)
            if non_coptic_suffix:
                yield non_coptic_suffix
                for p in self.paragraphs[i + 1 :]:
                    yield p.content(html)
                return

    def back(self, html: bool) -> str:
        back: str = "\n".join(
            f"<p>{b}</p>" if html else b for b in self.back_aux(html)
        )
        # TODO: (#591) Handle the errors below, and switch the error message to
        # an assertion if the check has no false positives.
        if not back:
            log.error("Entry doesn't have a definition:", self)
        elif not lang.has_lang("ARABIC", back):
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
        # TODO: (#590) This doesn't catch all derivations.
        if entry and Language.COPTIC in p.langs() and not p.indented():
            # This paragraph actually starts a new entry.
            yield DictionaryEntry(entry, idx)
            idx += 1
            entry = []

        entry.append(p)
    # Yield the last entry.
    if entry:
        yield DictionaryEntry(entry, idx)
        idx += 1


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
            retain_classes={dict_cls.WORD, "B"},
        ),
        xooxle.Capture(
            "BACK",
            xooxle.Selector({"id": ids.BACK}),
            # We need the Arabic for styling. We don't need any other classes.
            retain_classes={
                language.value.lower()
                for language in [Language.ARABIC, Language.HEBREW]
            },
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "andreas.json"),
)
