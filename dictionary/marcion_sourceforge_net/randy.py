"""Shared machinery for rendering Randy's notation."""

import abc
import functools
import itertools
import typing
import unicodedata
from collections import defaultdict
from collections.abc import Generator, Iterable

import regex

from dictionary.marcion_sourceforge_net import cls
from utils import ensure, lang, orth


class Substitution:
    """A class to represent a single regex substitution."""

    def __init__(
        self,
        pattern: str,
        repl: str | typing.Callable[[regex.Match[str]], str],
        ban: list[str] | None = None,
    ):
        """Initializes a Substitution object.

        Args:
            pattern: The regular expression pattern to search for.
            repl: The replacement string.
            ban: A list of tokens that are used for substitution, and
                can't be present in the HTML post-processing. Use this optional
                field to verify that all substitutions are well-formed.
        """
        self.pattern: regex.Pattern[str] = regex.compile(pattern)
        self.repl: str | typing.Callable[[regex.Match[str]], str] = repl
        self.ban: list[str] = ban or []

    def html(self, raw: str) -> str:
        return self.pattern.sub(self.repl, raw)


def bracketed(exp: str, repeat: int = 2) -> str:
    """Construct a regex to match text surrounded by square brackets.

    The expression will use negative lookbehind and lookahead to ensure that
    whatever character follows or precedes is not a square bracket. This is
    useful if your expression itself can contain brackets.

    Args:
        exp: Core of the expression.
        repeat: How many square brackets need to be present on each side of the
            expression.

    Returns:
        A string representing the full expression.
    """
    return r"(?<!\[)" + r"\[" * repeat + exp + r"\]" * repeat + r"(?!\])"


OPEN_PARAGRAPH: str = "<p>"
CLOSE_PARAGRAPH: str = "</p>"

PARAGRAPH: Substitution = Substitution(
    r"\\n",
    CLOSE_PARAGRAPH + OPEN_PARAGRAPH,
    ban=["\\"],
)


def mark(char: str) -> str:
    return f'<span class="{cls.MARK}">{char}</span>'


# The addenda marker is intentionally fixed, because some addenda result in
# several edits throughout the text. Using numbered markers ([1], [2], ...)
# gives the impression that the edits come from multiple addenda and corrigenda,
# which is often incorrect.
# This has the added advantage that a simple search query for the character
# employed yields all occurrences of addenda in the text.
_ADDENDUM_MARK: str = mark("‡")

# The HTML data attribute that holds an addendum's page, consumed by both the
# TypeScript front-end and the Xooxle indexer.
DATA_PAGE: str = "data-page"


# Matches a space at either end of an element — immediately after an opening
# tag, or immediately before a closing one — along with the text on its side of
# the tag, for context.
_SPACE_AT_TAG_BORDER_RE: regex.Pattern[str] = regex.compile(
    r"<(?!/)[^>]+> [^<]*|[^<>]* </[^>]+>",
)


def _validate(entry: object, html: str, subs: list[Substitution]) -> None:
    # Verify that no banned token survives in the HTML.
    # TODO: (#0) Use a regex for the validation below, to find offending tokens
    # in a single pass over the string.
    for token in {token for sub in subs for token in sub.ban}:
        ensure.ensure(
            token not in html,
            "Banned token",
            token,
            "found in entry",
            entry,
            "output:",
            html,
        )
    # Verify spacing.
    # TODO: (#756) This check belongs in `utils/page.py`, where it can cover
    # all of our HTML.
    invalid_tags: list[str] = _SPACE_AT_TAG_BORDER_RE.findall(html)
    ensure.ensure(
        not invalid_tags,
        entry,
        "contains a space at either end of an element:",
        invalid_tags,
    )


@functools.total_ordering
class Column:
    """A column of a two-column book, written as its page then `a` or `b`.

    A subclass bounds the pages of its book.
    """

    FIRST: typing.ClassVar[int]
    LAST: typing.ClassVar[int]
    # Whether the book has Roman pages, which fall outside the order of its
    # body. See `ordered`.
    ROMAN: typing.ClassVar[bool] = False

    def __init__(self, raw: str) -> None:
        match: regex.Match[str] | None = regex.fullmatch(
            r"([1-9][0-9]*|[ivx]+)([ab])",
            raw,
        )
        ensure.ensure(match, "invalid column:", repr(raw))
        assert match
        self._num: str = match[1]
        self._col: str = match[2]
        if self.ordered():
            ensure.ensure(
                self.FIRST <= self.num() <= self.LAST,
                type(self).__name__,
                "column out of range:",
                raw,
            )
        else:
            ensure.ensure(
                self.roman() and self.ROMAN,
                type(self).__name__,
                "invalid column:",
                raw,
            )

    def ordered(self) -> bool:
        # Only a column whose page is a number can be ordered. Crum's Roman
        # pages, the Additions and Corrections, are not, as an addendum is
        # placed beside the entry that it amends.
        return self._num.isdigit()

    def roman(self) -> bool:
        return all(c in "ivx" for c in self._num)

    def num(self) -> int:
        return int(self._num)

    def __lt__(self, other: "Column") -> bool:
        assert self.ordered() and other.ordered()
        return (self.num(), self._col) < (other.num(), other._col)

    @typing.override
    def __eq__(self, other: object) -> bool:
        assert type(other) is type(self)
        return str(self) == str(other)

    @typing.override
    def __hash__(self) -> int:
        return hash(str(self))

    @typing.override
    def __str__(self) -> str:
        return self._num + self._col

    @typing.override
    def __repr__(self) -> str:
        return str(self)


class Entry[Col: Column](abc.ABC):
    """An entry in one of our transcriptions in Randy's notation.

    The entry occurs on a column of type `P`.
    """

    def __init__(
        self,
        page: Col,
        entry: str,
        marcion: str,
        vide: str,
        raw_re: regex.Pattern[str],
    ) -> None:
        """Initialize and validate the fields shared by all entries.

        A subclass should set the fields that its `__str__` reads before
        calling this, as the error messages below print the entry.

        Args:
            page: The page, along with its column, that the entry occurs on.
            entry: The entry's raw text.
            marcion: The space-separated Marcion keys of the entry.
            vide: Whether the entry is a vide entry, marked by a `v`.
            raw_re: The pattern that the raw text must consist of. See
                `RAW_RE` in either module.
        """
        self.page: Col = page
        # NFC normalization simplifies some validations below. It allows us to
        # use character classes for validation (e.g. \p{Latin}, \p{Arabic},
        # etc.) without the need for \p{Mark}.
        self.entry: str = unicodedata.normalize("NFC", entry)

        # TODO: (#786) Force `keys` and `entry` to be nonempty, once Kasser's
        # data is fully populated.
        ensure.ensure(
            not marcion or regex.fullmatch(r"\d+( \d+)*", marcion),
            self,
            "has an invalid Marcion entry:",
            marcion,
        )
        self.keys: list[int] = list(map(int, marcion.split()))

        ensure.ensure(
            vide in ["", "v"],
            self,
            "has an invalid vide entry:",
            vide,
        )
        self.vide: bool = bool(vide)

        if len(self.keys) > 1:
            ensure.ensure(
                self.vide,
                self,
                "is non-vide but has several keys:",
                self.keys,
            )

        invalid: list[str] = [s for s in raw_re.split(self.entry) if s]
        ensure.ensure(
            not invalid,
            "contains invalid text:",
            invalid,
            "in:",
            self.entry,
        )

    @property
    def splits_page(self) -> bool:
        # Whether the entry opens a section that spans the page, below which
        # the columns restart, so that it steps back from column `b` to `a`.
        # Crum opens each letter so.
        return False

    @abc.abstractmethod
    def subs(self) -> Iterable[Substitution]:
        # The substitutions that render the entry, in order. Their banned
        # tokens must be absent from the HTML.
        raise NotImplementedError

    @functools.cached_property
    def html(self) -> str:
        """Render the entry into HTML, and validate the result.

        Returns:
            The entry's HTML.
        """
        ensure.ensure(self.entry, self, "has no entry to render")
        # The substitutions are traversed twice, once to apply them and once to
        # validate the output.
        subs: list[Substitution] = list(self.subs())
        raw: str = self.entry
        for s in subs:
            raw = s.html(raw)
        classes: list[str] = [cls.ENTRY]
        if self.vide:
            classes.append(cls.VIDE)
        html: str = "".join(
            [
                f'<div class="{" ".join(classes)}">',
                OPEN_PARAGRAPH,
                raw,
                CLOSE_PARAGRAPH,
                "</div>",
            ],
        )
        _validate(self, html, subs)
        return html

    @property
    @abc.abstractmethod
    def addenda_page(self) -> str:
        # The page of the addenda that corrects this entry, inferred from the
        # entry's own page.
        raise NotImplementedError

    def addendum_substitution(self, page: str = "") -> Substitution:
        """Construct the substitution that renders the entry's addenda.

        An addendum takes the form `//deleted//inserted//`, either half of
        which may be empty, optionally followed by the page that the
        correction comes from. See `replace_addendum` for how one is written.

        NOTE: The substitution must follow the paragraph one. See
        `replace_addendum`.

        Args:
            page: The pattern of the page that an addendum may name. If empty,
                an addendum can't name one, and it is always inferred.

        Returns:
            The substitution.
        """
        pattern: str = r"//(?P<delete>.*?)//(?P<insert>.*?)//"
        if page:
            pattern += f"(?P<page>{page})?"
        return Substitution(pattern, self.replace_addendum, ban=["//"])

    def replace_addendum(self, match: regex.Match[str]) -> str:
        """Render an addendum — a correction from the author's own addenda.

        An addendum records an emendation from the book's addenda, as opposed
        to a footnote, which records an editorial note of ours. Its two halves
        are the removed and the added text, either of which may be empty.

        The rules below govern how one is written into a sheet. The first is
        enforced by the ban on spaces at either end of an element (see
        `html`), the second by this method, and the last by the
        substitution's own pattern; 3 through 5 are matters of judgement, and
        are checked by review rather than by code.

        1. Neither half may begin or end with a space, which would strand the
           space immediately inside the `<del>` or `<ins>` tag.
        2. Neither half may contain a `\\n` token. Paragraphing is substituted
           before addenda are, so the token would already have become
           paragraph tags, which would then spill out of the addendum element
           and corrupt the nesting.
        3. Punctuation belongs outside the block: prefer `//[[ⲁ]]//[[ⲃ]]//,` to
           `//[[ⲁ]],//[[ⲃ]],//`. The comma is as much a part of the corrected
           text as the word is, but the output reads better with it outside,
           and the duplication earns nothing. In the same spirit we take a
           small liberty with the format of the output — occasionally
           introducing a comma or a `\\t` of our own — and with the placement
           of an addendum: one that pertains to a paragraph or a subparagraph
           as a whole is appended at the very end of that subparagraph, rather
           than wedged into the middle of it.
        4. A citation is never split across the addendum boundary. To correct
           `Ge 1 1` to `Ge 1 2`, write `//Ge 1 1//Ge 1 2//`, and not
           `Ge 1 //1//2//`. The first yields two complete Bible citations, each
           enriched and hyperlinked in its own right. The second yields a
           citation of Genesis 1 trailed by two numbers that nothing ever
           interprets: followups are read off the flat chain, and an addendum
           is a wrapper on that chain that no followup handler descends into
           (see `parseBibleFollowups` in `docs/crum/wiki.ts`). The same holds
           for non-biblical references — leave the citation whole in both
           halves even when that means repeating most of it. The redundancy is
           the price of two working tooltips.
        5. The exception to 4, when the duplication would otherwise be
           unwieldy AND the correction falls in the followups rather than in
           the main citation: label the followups by hand, so that they resolve
           without a handler having to reach into the wrapper. Prefer
           `Ge 1 1, //{1}//{2}//` to the merely verbose
           `//Ge 1 1, 1//Ge 1 1, 2//`. Note that this does not license the
           broken form in 4: numbers left unlabeled inside an addendum are an
           error whatever their length.
        6. Where the substitution allows it (see `addendum_substitution`), an
           addendum may name the page it comes from, written immediately after
           the closing `//`, e.g. `//[[ⲁ]]//[[ⲃ]]//717a`. It is optional, and
           is left out in the ordinary case, where the page is inferred from
           the page of the entry being corrected (see `addenda_page`). Write it
           out when that inference goes wrong.

        Args:
            match: The addendum match. Its `delete` and `insert` groups are the
                removed and the added text; its `page` group, when present, is
                the page that the correction comes from.

        Returns:
            The addendum's HTML.
        """
        return "".join(self._replace_addendum_aux(match))

    def _replace_addendum_aux(
        self,
        match: regex.Match[str],
    ) -> Generator[str]:
        delete: str = match["delete"]
        insert: str = match["insert"]
        for group in [delete, insert]:
            ensure.ensure(
                OPEN_PARAGRAPH not in group,
                self,
                "has an addendum group containing paragraphing elements:",
                group,
            )
        page: str = match.groupdict().get("page") or self.addenda_page
        yield f'<span class="{cls.ADDENDUM}" {DATA_PAGE}="{page}">'
        if delete:
            yield f"<del>{delete}</del>"
        if delete and insert:
            yield " "
        if insert:
            yield f"<ins>{insert}</ins>"
        yield _ADDENDUM_MARK
        yield "</span>"


def by_marcion_key[E: Entry[typing.Any]](
    entries: Iterable[E],
) -> dict[str, list[E]]:
    """Index the entries of a sheet by their Marcion keys.

    The entries are also verified to be in the order of their columns, except
    for the unordered columns, which are skipped.

    Args:
        entries: The entries, in the order of the sheet.

    Returns:
        The entries of each key, in the order of the sheet.
    """
    by_key: dict[str, list[E]] = defaultdict(list)
    last: E | None = None
    for e in entries:
        if e.page.ordered():
            ensure.ensure(
                last is None
                or last.page <= e.page
                or (e.splits_page and last.page.num() == e.page.num()),
                e,
                "on",
                e.page,
                "is out of order, following",
                last,
            )
            last = e
        for key in e.keys:
            by_key[str(key)].append(e)
    return by_key


def columns(
    page_class: str,
    entries: Iterable[Entry[typing.Any]],
) -> Generator[str]:
    """Render entries, grouped by the column that they occur on.

    Args:
        page_class: The HTML class of the label that names a column's page.
        entries: The entries to render. The entries on a column must be
            contiguous.

    Yields:
        The HTML of each column.
    """
    for page, group in itertools.groupby(entries, key=lambda e: e.page):
        yield f'<div class="{cls.FOLIO}">'
        yield f'<span class="{page_class}">{page}</span>'
        for e in group:
            yield e.html
        yield "</div>"


class Languages[L: str]:
    """The languages that the bracketed text of a transcription may be in."""

    def __init__(
        self,
        names: Iterable[L],
        alphabets: dict[L, tuple[str, ...]],
        classes: dict[L, str],
    ) -> None:
        """Initialize the languages, and validate their tables.

        Args:
            names: Every language, spelled as it appears in the Unicode names
                of its characters. See `identify`.
            alphabets: The alphabet of each language. See `_ALPHABETS` in
                either module. The order is that in which `identify` tries
                the languages.
            classes: The HTML class used for each language.
        """
        names = list(names)
        ensure.equal_sets(names, alphabets.keys(), "alphabets")
        ensure.equal_sets(names, classes.keys(), "classes")
        self._classes: dict[L, str] = classes
        # The validation pattern for text marked as belonging to each
        # language.
        self._validators: dict[L, regex.Pattern[str]] = {
            language: regex.compile("".join(("[", *alphabet, "]+")))
            for language, alphabet in alphabets.items()
        }

    def identify(self, text: str) -> L | None:
        """Identify the language of a text.

        Args:
            text: The text.

        Returns:
            The first language, in the order of the alphabets, that any of
            the text's characters belongs to, judging by their Unicode names.
            None if there is none.
        """
        # We exclude diacritics from language determination because Coptic
        # uses Greek diacritics in the expression ⲇͅⲇͅ - which is the
        # abbreviation for the Greek phrase δεῖνα δεῖνος, translating to
        # "so-and-so" or "NN". The diacritic used is Combining Greek
        # Ypogegrammeni (U+0345), and we don't want use of this diacritic to
        # cause the expression to be evaluated as Greek.
        text = orth.clean_diacritics(text)
        for language in self._validators:
            if lang.has_lang(language, text):
                ensure.fullmatch(
                    self._validators[language],
                    self.normalize_for_validation(language, text),
                    language,
                )
                return language
        return None

    def normalize_for_validation(self, language: L, text: str) -> str:
        # Greek is often transcribed with precomposed characters, which are not
        # represented in our alphabet, so we NFD-normalize it.
        if language == "GREEK":
            text = orth.normalize(text)
        return text

    def span(self, language: L, html: str) -> str:
        return f'<span class="{self._classes[language]}">{html}</span>'
