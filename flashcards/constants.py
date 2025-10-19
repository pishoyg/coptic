"""This package hosts hardcoded definitions of our dictionary structure."""

# TODO: (#399) Crum HTML should all live in one place, and should be
# deduplicated. Currently:
# - It lives in both this file and dictionary/marcion_sourceforge_net/main.py.
# - Much of the logic is duplicated, which causes such issues as #398.

import os
import pathlib
import re
import typing
from collections import abc, defaultdict

from dictionary.copticsite_com import main as copticsite
from dictionary.kellia_uni_goettingen_de import main as kellia
from dictionary.marcion_sourceforge_net import main as crum
from flashcards import deck
from utils import page, paths
from xooxle import xooxle

# DIALECTS_JS is a JavaScript line that can be used to set the default dialects.
DIALECTS_JS = """
if (localStorage.getItem('d') === null) {{
  localStorage.setItem('d', {DIALECT_ARR}.join(','));
}}
"""


def dialects_js(dialects: abc.Iterable[str]) -> str:
    if not dialects:
        return ""
    return DIALECTS_JS.format(DIALECT_ARR=list(dialects))


def relpath(dst: str | pathlib.Path) -> str:
    """Get the path to the destination relative to the lexicon directory.

    This can be used to construct a short path to navigate to a given
    destination from the Lexicon directory.

    Args:
        dst: Destination.

    Returns:
        Path from the Lexicon directory.
    """
    return os.path.relpath(dst, paths.LEXICON_DIR)


CRUM_SEARCH: str = relpath(paths.LEXICON_DIR)
CRUM_HOME: str = relpath(paths.SITE_DIR)
DAWOUD_DIR: str = relpath(paths.DAWOUD_DIR)
SCAN_DIR: str = relpath(paths.CRUM_SCAN_DIR)

KELLIA_PREFIX = "https://coptic-dictionary.org/entry.cgi?tla="
DAWOUD_SURNAME = "Dawoud"

DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
TLA_ID_RE = re.compile(r'\bid="[^"]+"')


def _img_aux(
    id_: str,
    cls: str,
    path: str,
    alt: str,
    caption: str | None = None,
    line_br: bool = False,
) -> abc.Generator[str]:
    yield f'<figure id="{id_}" class="{cls}">'
    # NOTE: Anki requires basenames. The string `src="{path}"` gets updated
    # while the Anki flashcards are being generated, using regular
    # expressions. So retaining the format `src="{path}"` is important.
    yield f'<img src="{path}" alt="{alt}" class="{cls}-img">'
    if caption:
        yield f"<figcaption>{caption}</figcaption>"
    yield "</figure>"
    if line_br:
        yield page.LINE_BREAK


# All or nothing!
def _aon(*parts: str) -> str:
    return "".join(parts) if all(parts) else ""


def _join(*parts: str) -> str:
    return "".join(parts)


# TODO: (#399) Crum and KELLIA words should implement a sister interface. You
# shouldn't construct objects in the Flashcards pipeline.
class Sister:
    """Sister represents a sister of a Crum word."""

    def __init__(self, key: str, title: str, meaning: str, typ: str) -> None:
        self.key: str = key
        self.title: str = title
        self.meaning: str = meaning
        self.type: str = typ


class SisterWithFrag:
    """SisterWithFrag represents a Sister, and an associated fragment."""

    HREF_FMT: str = "{key}.html"

    def __init__(self, sis: Sister, fragment: str) -> None:
        self.sister: Sister = sis
        self.fragment: str = fragment

    def frag(self) -> str:
        if not self.fragment:
            return ""
        if self.fragment.startswith("#"):
            return self.fragment
        return f"#:~:text={self.fragment}"

    def html_aux(self) -> abc.Generator[str]:
        yield f'<tr id="sister{self.sister.key}" class="sister">'
        yield '<td class="sister-view">'
        href = self.HREF_FMT.format(key=self.sister.key) + self.frag()
        yield f'<a class="navigate" href="{href}" target="_blank">'
        yield "view"
        yield "</a>"
        yield "</td>"
        yield '<td class="sister-title">'
        yield self.sister.title
        yield "</td>"
        yield '<td class="sister-meaning">'
        if self.sister.type:
            yield "(<b>"
            yield self.sister.type
            yield "</b>) "
        yield self.sister.meaning
        yield '<span hidden="" class="dev sister-key right">'
        yield self.sister.key
        yield "</span>"
        yield "</td>"
        yield "</tr>"


class StepsisterWithFrag(SisterWithFrag):
    """StepsisterWithFrag is a Greek Crum sister, with a fragment."""

    HREF_FMT: str = KELLIA_PREFIX + "{key}"


class Mother:
    """Mother holds the sisters of a Crum word."""

    def __init__(
        self,
        key_to_sister: dict[str, Sister],
        with_frag: typing.Callable[[Sister, str], SisterWithFrag],
    ) -> None:
        self.key_to_sister: dict[str, Sister] = key_to_sister
        self.with_frag: typing.Callable[[Sister, str], SisterWithFrag] = (
            with_frag
        )

    def gather_aux(self, relations: crum.House) -> abc.Generator[str]:
        for r in relations:
            yield from self.with_frag(
                self.key_to_sister[r.key],
                r.fragment,
            ).html_aux()


class CrumIndexer(Mother):
    """CrumIndexer generates indexes and index indexes for Crum's
    dictionary."""

    def __generate_index_body_aux(
        self,
        index_name: str,
        keys: list[str],
    ) -> abc.Generator[str]:
        yield f"<h1>{index_name}</h1>"
        yield '<table class="index-table">'
        for key in keys:
            sister = self.with_frag(self.key_to_sister[key], "")
            yield from sister.html_aux()
        yield "</table>"

    def __generate_indexes(
        self,
        keys: list[str],
        indexes: list[list[str]],
    ) -> list[deck.Index]:
        """Generate indexes.

        Args:
            keys: A list of word keys.
            indexes: A list such that indexes_i gives the indexes that word_i
                belongs to.

        Returns:
            A list of deck indexes.

        """
        index_to_keys: defaultdict[str, list[str]] = defaultdict(list)
        assert len(keys) == len(indexes)
        for word_key, word_indexes in zip(keys, indexes):
            for word_index in word_indexes:
                index_to_keys[word_index].append(word_key)
        return [
            deck.Index(
                index_name,
                len(keys),
                self.__generate_index_body_aux(index_name, keys),
            )
            for index_name, keys in sorted(
                index_to_keys.items(),
                key=lambda pair: pair[0],
            )
        ]

    def generate_indexes(self) -> list[deck.IndexIndex]:
        keys: list[str] = []
        types: list[list[str]] = []
        categories: list[list[str]] = []
        for _, root in crum.Crum.roots.items():
            keys.append(root.key)
            types.append([root.type_name])
            categories.append(root.categories)

        return [
            deck.IndexIndex(
                "Categories",
                self.__generate_indexes(keys, categories),
                home=CRUM_HOME,
                search=CRUM_SEARCH,
                scripts=[relpath(paths.CRUM_JS)],
                css=[relpath(paths.DROPDOWN_CSS)],
            ),
            deck.IndexIndex(
                "Types",
                self.__generate_indexes(keys, types),
                home=CRUM_HOME,
                search=CRUM_SEARCH,
                scripts=[relpath(paths.CRUM_JS)],
                css=[relpath(paths.DROPDOWN_CSS)],
            ),
        ]


# TODO: (#221) The produced HTML is identical between all versions of the Crum
# decks. They only differ in the JavaScript, and the subset of the notes
# included. Deduplicate the work to save a bit of time.
class Crum(deck.Deck):
    """Crum represents a Crum deck."""

    key_to_sister: dict[str, Sister] = {}
    key_to_stepsister: dict[str, Sister] = {}
    mother: Mother
    stepmother: Mother
    indexer: CrumIndexer

    for _, root in crum.Crum.roots.items():
        title: str = page.no_line_breaks(root.word_parsed_classify())
        key_to_sister[root.key] = Sister(
            root.key,
            title,
            root.meaning,
            root.type_name,
        )

    @staticmethod
    def __tla_col(data: str) -> str:
        data = page.html_line_breaks(data)
        # NOTE: TLA sister elements possess IDs that are often identical, which
        # we remove here in order to avoid having HTML element ID conflicts,
        # given that, in this view, we can include several TLA entries in the
        # same HTML page.
        data = TLA_ID_RE.sub("", data)
        return data

    for word in kellia.KELLIA.comprehensive:
        key: str = __tla_col(word.entry_xml_id)
        title = (
            __tla_col(word.orthstring.pishoy())
            .replace("<br>", " ")
            .replace("</br>", " ")
        )
        meaning: str = __tla_col(word.merge_langs().pishoy())
        key_to_stepsister[key] = Sister(key, title, meaning, "")

    mother = Mother(key_to_sister, SisterWithFrag)
    stepmother = Mother(key_to_stepsister, StepsisterWithFrag)
    indexer = CrumIndexer(key_to_sister, SisterWithFrag)

    def __init__(
        self,
        name: str,
        deck_id: int,
        dialects: list[str] | None = None,
    ):
        super().__init__(name, deck_id)
        self.dialects: set[str] = set(dialects or [])

    @typing.override
    def index_indexes(self) -> list[deck.IndexIndex]:
        # NOTE: Our indexer will produce indexes for all notes, even if
        # those notes end up being filtered out from the deck. While this is
        # a bug, we don't care, because we only write HTML for the full
        # deck that has all the notes.
        return Crum.indexer.generate_indexes()

    @typing.override
    def notes_aux(self) -> abc.Generator[deck.Note]:
        for _, root in crum.Crum.roots.items():

            if self.dialects and not self.dialects.intersection(
                root.all_dialects,
            ):
                continue

            yield deck.Note(
                # NOTE: The key is a protected field. Do not change unless you
                # know what you're doing.
                key=root.key,
                front=self.__front(root),
                back=self.__back(root),
                title=root.title(),
                nxt=self.__path(crum.Crum.next_key(root)),
                prv=self.__path(crum.Crum.prev_key(root)),
                search=CRUM_SEARCH,
                js_start=dialects_js(self.dialects),
                js_path=relpath(paths.CRUM_JS),
                css=[relpath(paths.DROPDOWN_CSS)],
            )

    def __path(self, key: str | None) -> str:
        return "" if not key else f"{key}.html"

    def __front(self, root: crum.Root) -> str:
        return "".join(self.__front_aux(root))

    def __front_aux(self, root: crum.Root) -> abc.Generator[str]:
        # Header.
        # Open the table.
        yield '<table id="header" class="header">'
        yield "<tr>"
        # Home
        yield '<td><a class="navigate" href="../">home</a></td>'
        # Contact
        yield "<td>"
        yield f'<a class="contact" href="mailto:{paths.EMAIL}">'
        yield "email"
        yield "</a>"
        yield "</td>"
        # Prev
        yield "<td>"
        prev = crum.Crum.prev_key(root)
        if prev:
            yield f'<a class="navigate" href="{prev}.html">prev</a>'
        del prev
        yield "</td>"
        # Key.
        yield "<td>"
        yield f'<a class="navigate" href="{root.key}.html">{root.key}</a>'
        yield "</td>"
        # Next
        yield "<td>"
        nxt = crum.Crum.next_key(root)
        if nxt:
            yield f'<a class="navigate" href="{nxt}.html">next</a>'
        del nxt
        yield "</td>"
        # Reset.
        yield "<td>"
        yield '<span class="reset">reset</span>'
        yield "</td>"
        # Dev.
        yield "<td>"
        yield '<span class="developer">dev</span>'
        yield "</td>"
        # Close the table.
        yield "</tr>"
        yield "</table>"
        # Horizontal line.
        yield page.HORIZONTAL_RULE
        # The word.
        yield '<div id="pretty" class="pretty">'
        yield root.word_parsed_prettify()
        yield "</div>"

    def __back(self, root: crum.Root) -> str:
        return "".join(self.__back_aux(root))

    @staticmethod
    def __senses(senses: dict[int, str]) -> str:
        return ", ".join(
            f'<span class="sense" id="sense{k}">{k}: {senses[k]}</span>'
            for k in sorted(senses.keys(), key=int)
        )

    def __back_aux(self, root: crum.Root) -> abc.Generator[str]:
        # Meaning
        yield '<div id="root-type-meaning" class="root-type-meaning">'
        # TODO: (#233) For consistency, the class used for the root type should
        # be renamed to "type", and the existing "type" class that is used
        # elsewhere should be renamed to something else. We have had the
        # convention of assigning unqualified class names to root elements.
        yield '<span id="root-part-of-speech" class="part-of-speech">'
        yield "(<b>"
        yield root.type_name
        yield "</b>)"
        yield "</span>"

        if root.categories:
            yield '<div id="categories" class="categories">'
            yield ", ".join(root.categories)
            yield "</div>"
        if root.meaning:
            yield '<div id="meaning" class="meaning">'
            yield root.meaning
            yield "</div>"
        yield "</div>"

        if root.crum or root.dawoud_pages:
            # Dictionary pages.
            yield '<div id="dictionary" class="dictionary">'
            yield '<span class="right">'

            if root.crum:
                yield "<b>"
                yield '<a href="#crum" class="crum hover-link">Crum</a>: '
                yield "</b>"
                yield '<span class="crum-page">'
                yield str(root.crum)
                yield "</span>"

            if root.dawoud_pages:
                yield page.LINE_BREAK
                yield "<b>"
                yield '<a href="#dawoud" class="dawoud hover-link">'
                yield DAWOUD_SURNAME
                yield "</a>"
                yield ": "
                yield "</b>"
                yield DICTIONARY_PAGE_RE.sub(
                    r'<span class="dawoud-page">\1</span>',
                    root.dawoud_pages.replace(",", ", "),
                )

            yield "</span>"
            yield "</div>"
            yield page.LINE_BREAK

        # Images.
        if not root.images:
            yield page.LINE_BREAK
        else:
            yield '<div id="images" class="images">'
            for img in root.images:
                yield from _img_aux(
                    id_=f"explanatory{img.stem}",
                    cls="explanatory",
                    alt=img.alt,
                    path=relpath(img.dst_path),
                    caption=_join(
                        '<span hidden="" class="dev explanatory-key">',
                        img.stem,
                        " ",
                        "</span>",
                        '<span class="italic lighter small">',
                        root.sense(img) or "",
                        "</span>",
                    ),
                )
            yield "</div>"

        # Editor's notes.
        if root.notes:
            yield '<div id="notes" class="notes">'
            yield "<i>Editor's Note: </i>"
            yield root.notes
            yield "</div>"

        # Senses.
        if root.senses:
            yield '<div id="senses" class="senses">'
            yield Crum.__senses(root.senses)
            yield "</div>"

        # Quality, and URL link.
        yield '<div id="quality" class="quality">'
        yield f'<a href="{root.row_url}" target="_blank">'
        yield root.quality
        yield "</a>"
        yield "</div>"

        # Line break.
        yield page.LINE_BREAK

        # Derivations.
        yield root.drv_html_table()

        # Sisters.
        if (
            root.sisters
            or root.greek_sisters
            or root.antonyms
            or root.homonyms
        ):
            yield page.HORIZONTAL_RULE
            yield '<div id="sisters" class="sisters">'
            before: bool = False
            if root.sisters:
                yield "<i>See also: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.mother.gather_aux(root.sisters)
                yield "</table>"
                before = True
            if root.greek_sisters:
                if before:
                    yield page.LINE_BREAK
                yield "<i>Greek: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.stepmother.gather_aux(root.greek_sisters)
                yield "</table>"
                before = True
            if root.antonyms:
                if before:
                    yield page.LINE_BREAK
                yield "<i>Opposite: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.mother.gather_aux(root.antonyms)
                yield "</table>"
                before = True
            if root.homonyms:
                if before:
                    yield page.LINE_BREAK
                yield "<i>Homonyms: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.mother.gather_aux(root.homonyms)
                yield "</table>"
                before = True
            yield "</div>"
            del before

        if root.has_complete_wiki() or root.crum:
            yield page.HORIZONTAL_RULE

        # Wiki.
        if root.has_complete_wiki():
            yield '<div class="wiki" id="wiki">'
            yield root.wiki_html
            yield "</div>"

        # Crum's pages.
        if root.crum:
            yield '<div id="crum" class="crum dictionary">'
            yield '<span class="right">'
            yield '<b><a href="#crum" class="crum hover-link">Crum</a>: </b>'
            yield DICTIONARY_PAGE_RE.sub(
                r'<span class="crum-page">\1</span>',
                root.crum_page_range.replace(",", ", "),
            )
            yield "</span>"
            for num in Crum._page_numbers(root.crum_page_range):
                yield from _img_aux(
                    id_=f"crum{num}",
                    path=os.path.join(SCAN_DIR, f"{num+22}.png"),
                    cls="crum-page-img",
                    alt=str(num),
                    line_br=True,
                )
            yield "</div>"

        if root.dawoud_pages:
            yield page.HORIZONTAL_RULE
            yield '<div id="dawoud" class="dawoud dictionary">'
            yield '<span class="right">'
            # Dawoud's pages.
            yield "<b>"
            yield '<a href="#dawoud" class="dawoud hover-link">'
            yield DAWOUD_SURNAME
            yield "</a>"
            yield ": "
            yield "</b>"
            yield DICTIONARY_PAGE_RE.sub(
                r'<span class="dawoud-page">\1</span>',
                root.dawoud_pages.replace(",", ", "),
            )
            yield "</span>"
            page_numbers = Crum._page_numbers(root.dawoud_pages)
            for num in page_numbers:
                yield from _img_aux(
                    path=os.path.join(DAWOUD_DIR, f"{num+17}.png"),
                    id_=f"dawoud{num}",
                    cls="dawoud-page-img",
                    alt=str(num),
                    line_br=True,
                )
            yield "</div>"

    @staticmethod
    def _dedup(arr: list[int], at_most_once: bool = False) -> list[int]:
        """Squash identical consecutive elements.

        Args:
            arr: An array of elements to deduplicate.
            at_most_once: If true, deduplicate across the whole list.
                If false, only deduplicate consecutive occurrences.
                For example, given the list 1,1,2,1.
                If deduped with `at_most_once`, it will return 1,2, with each
                page occurring at most once.
                If deduped with `at_most_once=False`, it will return 1,2,1, only
                removing the consecutive entries.

        Returns:
            A list of integers, with duplicate elements eliminated.

        """
        if at_most_once:
            return list(dict.fromkeys(arr))
        out: list[int] = []
        for x in arr:
            if out and out[-1] == x:
                continue
            out.append(x)
        return out

    @staticmethod
    def _page_numbers(
        column_ranges: str,
        single_range: bool = False,
    ) -> list[int]:
        """
        Args:
            column_ranges: a comma-separated list of columns or columns ranges.
                The column ranges resemble what you type when you're using your
                printer, except that each page number must be followed by a
                letter - either "a" or b" - representing the column.
                For example, "1a,3b-5b,8b-9a" means [1a, 3b, 4a, 4b, 5a, 5b,
                9a].
            single_range: If true, force a single range (no commas allowed).

        Returns:
            The list of page numbers.
        """

        def col_to_page_num(col: str) -> int:
            col = col.strip()
            assert col[-1] in ["a", "b"]
            col = col[:-1]
            assert col.isdigit()
            return int(col)

        out: list[int] = []
        column_ranges = column_ranges.strip()
        if not column_ranges:
            return []
        ranges = column_ranges.split(",")
        if single_range:
            assert len(ranges) == 1, f"ranges={ranges}"
        del column_ranges, single_range
        for col_or_col_range in ranges:
            if "-" not in col_or_col_range:
                # This is a single column.
                out.append(col_to_page_num(col_or_col_range))
                continue
            # This is a page range.
            cols = col_or_col_range.split("-")
            del col_or_col_range
            assert len(cols) == 2
            assert cols[0] != cols[1]
            start, end = map(col_to_page_num, cols)
            del cols
            assert end >= start
            for x in range(start, end + 1):
                out.append(x)
        out = Crum._dedup(out, at_most_once=True)
        return out


class Copticsite(deck.Deck):
    """Copticsite represents a copticsite deck."""

    @typing.override
    def notes_aux(self) -> abc.Generator[deck.Note]:
        # NOTE: The key is a protected field. Do not change unless you know what
        # you're doing.
        key = 1
        for word in copticsite.Copticsite.words:
            front = _aon(
                '<span class="word B">',
                '<span class="spelling B">',
                word.pretty,
                "</span>",
                "</span>",
            )
            back = _aon(
                '<span class="type B">',
                "(",
                "<b>",
                " - ".join(
                    filter(None, [word.kind, word.gender, word.origin]),
                ),
                "</b>",
                ")",
                "</span>",
                page.LINE_BREAK,
            ) + page.html_line_breaks(word.meaning)

            if not front and not back:
                continue
            yield deck.Note(
                key=str(key),
                title=str(key),
                front=front,
                back=back,
                force_content=False,
            )
            key += 1


class KELLIA(deck.Deck):
    """KELLIA represents a KELLIA deck."""

    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        words: list[kellia.Word],
    ) -> None:
        self.words: list[kellia.Word] = words
        super().__init__(deck_name, deck_id)

    @typing.override
    def notes_aux(self) -> abc.Generator[deck.Note]:
        for word in self.words:
            # NOTE: The key is a protected field. Do not change unless you know
            # what you're doing.
            key: str = word.entry_xml_id
            front: str = page.html_line_breaks(word.orthstring.pishoy())
            back: str = _join(
                page.html_line_breaks(word.merge_langs().pishoy()),
                page.html_line_breaks(word.etym_string.process()),
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
            )


# NOTE: The deck IDs are protected fields. They are used as database keys for
# the decks. Do NOT change them!
#
# The deck names are protected fields. Do NOT change them. They are used for:
# 1. Display in the Anki UI, including nesting.
# 2. Prefixes for the note keys, to prevent collisions between notes in
#    different decks.
# 3. Model names (largely irrelevant).
#
# NOTE: If the `name` argument is provided, it overrides the first use case
# (display), but the deck names continue to be used for prefixing and model
# names.
# It's for the second reason, and to a lesser extend the first as well, that
# the names should NOT change. If the DB keys diverge, synchronization will
# mess up the data! Importing a new deck will result in the notes being
# duplicated rather than replaced or updated.

# NOTE: Besides the constants hardcoded below, the "name" and "key" fields in
# the deck generation logic are also protected.
# The "name" argument is used to generate deck names for datasets that generate
# multiple decks.
# The "key" field is used to key the notes.


CRUM_ALL: Crum = Crum("A Coptic Dictionary::All Dialects", 1284010387, [])
COPTICSITE_BOHAIRIC: Copticsite = Copticsite("copticsite.com", 1284010385)
KELLIA_COMPREHENSIVE: KELLIA = KELLIA(
    "KELLIA::Comprehensive",
    1284010391,
    kellia.KELLIA.comprehensive,
)
DECKS: list[deck.Deck] = [
    CRUM_ALL,
    Crum("A Coptic Dictionary::Bohairic", 1284010383, ["B"]),
    Crum("A Coptic Dictionary::Sahidic", 1284010386, ["S"]),
    Crum("A Coptic Dictionary::Bohairic / Sahidic", 1284010390, ["B", "S"]),
    COPTICSITE_BOHAIRIC,
    KELLIA_COMPREHENSIVE,
    KELLIA("KELLIA::Egyptian", 1284010392, kellia.KELLIA.egyptian),
    KELLIA("KELLIA::Greek", 1284010393, kellia.KELLIA.greek),
]

# Xooxle search will work fine even if we don't retain any HTML tags, because it
# relies entirely on searching the text payloads of the HTML. However, we retain
# the subset of the classes that are needed for highlighting, in order to make
# the Xooxle search results pretty.

_DIALECTS = {
    "S",
    "Sa",
    "Sf",
    "A",
    "L",
    "B",
    "F",
    "Fb",
    "O",
    # The following dialects are only found in Marcion.
    "NH",
    # The following dialects are only found in TLA / KELLIA.
    "M",
    "P",
    "V",
    "W",
    "U",
}

_CRUM_RETAIN_CLASSES = {
    "word",
    "dialect",
    "spelling",
    "type",
} | _DIALECTS

_CRUM_RETAIN_ELEMENTS_FOR_CLASSES = {
    "dialect-comma",
    "spelling-comma",
    "dialect-parenthesis",
}

_KELLIA_RETAIN_CLASSES = {
    "word",
    "spelling",
    "dialect",
    "type",
    "lang",
    "geo",
    "gram_grp",
} | _DIALECTS

_COPTICSITE_RETAIN_CLASSES = {
    "word",
    "spelling",
} | _DIALECTS

CRUM_XOOXLE = xooxle.Xooxle(
    source=CRUM_ALL,
    extract=[
        xooxle.Selector({"name": "title"}, force=False),
        xooxle.Selector({"class_": "header"}, force=False),
        xooxle.Selector({"class_": "dictionary"}, force=False),
        xooxle.Selector({"class_": "crum"}, force=False),
        xooxle.Selector({"class_": "crum-page"}, force=False),
        xooxle.Selector({"class_": "dawoud"}, force=False),
        xooxle.Selector({"class_": "dawoud-page"}, force=False),
        xooxle.Selector({"class_": "drv-key"}, force=False),
        xooxle.Selector({"id": "images"}, force=False),
        xooxle.Selector({"class_": "nag-hammadi"}, force=False),
        xooxle.Selector({"class_": "sisters"}, force=False),
        xooxle.Selector({"id": "categories"}, force=False),
        xooxle.Selector({"id": "quality"}),
    ],
    captures=[
        xooxle.Capture(
            "wiki",
            xooxle.Selector({"id": "wiki"}, force=False),
            # The following classes are used for styling. While we may be able
            # to style the languages in JavaScript without retaining classes in
            # the HTML, this approach is simpler, because it's inherited from
            # Wiki.
            # For Arabic, Amharic, Hebrew, and Aramaic, this only increases the
            # size of the index by ~8%.
            # If we were to need the classes for Coptic or Greek, this would
            # increase the size of the index more significantly, so we shouldn't
            # do it.
            # TODO: (#0) Import class names from Wiki, instead of duplicating
            # them below.
            retain_classes={
                "wiki",
                "dialect",
                "headword",
                "bullet",
                "arabic",
                "amharic",
                "hebrew",
                "aramaic",
            },
            unit_tags={"p"},
        ),
        xooxle.Capture(
            "marcion",
            xooxle.Selector({"id": "pretty"}),
            # This is the list of classes needed for highlighting. If the
            # highlighting rules change, you might have to add new classes!
            retain_classes=_CRUM_RETAIN_CLASSES,
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
        ),
        xooxle.Capture(
            "meaning",
            xooxle.Selector({"id": "root-type-meaning"}, force=False),
            retain_classes=_CRUM_RETAIN_CLASSES,
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
        ),
        xooxle.Capture(
            "appendix",
            xooxle.Selector(
                {"name": "body"},
            ),
            retain_classes=_CRUM_RETAIN_CLASSES,
            retain_attributes={"href", "target"},
            retain_tags=xooxle.RETAIN_TAGS_DEFAULT | {"a"},
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            unit_tags={"tr", "div", "hr"},
            block_elements=xooxle.BLOCK_ELEMENTS_DEFAULT | {"td"},
        ),
    ],
    layers=[["marcion", "meaning", "appendix"], ["wiki"]],
    output=paths.LEXICON_DIR / "crum.json",
)


KELLIA_XOOXLE = xooxle.Xooxle(
    source=KELLIA_COMPREHENSIVE,
    extract=[
        xooxle.Selector({"name": "footer"}, force=False),
        xooxle.Selector({"class_": "bibl"}, force=False),
        xooxle.Selector({"class_": "ref_xr"}, force=False),
        xooxle.Selector({"class_": "ref"}, force=False),
    ],
    captures=[
        xooxle.Capture(
            "orths",
            xooxle.Selector({"id": "orths"}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.Capture(
            "senses",
            xooxle.Selector({"id": "senses"}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.Capture(
            "text",
            xooxle.Selector(
                {"name": "body"},
            ),
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "kellia.json"),
)


COPTICSITE_XOOXLE = xooxle.Xooxle(
    source=COPTICSITE_BOHAIRIC,
    extract=[],
    captures=[
        xooxle.Capture(
            "front",
            xooxle.Selector({"id": "front"}),
            retain_classes=_COPTICSITE_RETAIN_CLASSES,
        ),
        xooxle.Capture(
            "back",
            xooxle.Selector({"id": "back"}),
        ),
    ],
    output=os.path.join(paths.LEXICON_DIR, "copticsite.json"),
)
