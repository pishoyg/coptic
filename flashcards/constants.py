"""This package hosts hardcoded definitions of our dictionary structure."""

import json
import os
import re
import typing
from collections import abc, defaultdict

import pandas as pd

import dictionary.copticsite_com.main as copticsite
import dictionary.kellia_uni_goettingen_de.main as kellia
import dictionary.marcion_sourceforge_net.main as crum
from flashcards import deck
from utils import file, paths, semver, text
from xooxle import xooxle

# Data
LEXICON_DIR = os.path.join(paths.SITE_DIR, "crum/")
CRUM_DIALECTS = ["S", "Sa", "Sf", "A", "L", "B", "F", "Fb", "O", "NH"]
# TODO: (#399) Crum should export images through an interface, so you don't
# have to look up the files directly.
EXPLANATORY_SOURCES = "dictionary/marcion_sourceforge_net/data/img-sources"

CRUM_JS = "main.js"  # Relative to the HTML write directory.
# DIALECTS_JS is a JavaScript line that can be used to set the default dialects.
DIALECTS_JS = """
if (localStorage.getItem('d') === null) {{
  localStorage.setItem('d', {DIALECT_ARR}.join(','));
}}
"""

CSS = os.path.join(paths.SITE_DIR, "style.css")  # Not a relative path!
CRUM_SEARCH = "./"  # Relative to the HTML write directory.
CRUM_HOME = "../"  # Relative to the HTML write directory.
DAWOUD_DIR = "../dawoud/"  # Relative to the HTML write directory.
SCAN_DIR = "crum/"  # Relative to the HTML write directory.
EXPLANATORY_DIR = "explanatory/"  # Relative to the HTML write directory.

DESCRIPTION = f"https://${paths.DOMAIN}"
KELLIA_PREFIX = "https://coptic-dictionary.org/entry.cgi?tla="
DAWOUD_SURNAME = "Dawoud"

DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
TLA_ID_RE = re.compile(r'\bid="[^"]+"')

LINE_BREAK = "<br>"
HORIZONTAL_RULE = "<hr>"


def _img_aux(
    id_: str,
    cls: str,
    path: str,
    alt: str,
    caption: str,
    line_br: bool = False,
) -> abc.Generator[str]:
    yield f'<figure id="{id_}" class="{cls}">'
    # NOTE: Anki requires basenames. The string `src="{path}"` gets updated
    # while the Anki flashcards are being generated, using regular
    # expressions. So retaining the format `src="{path}"` is important.
    yield f'<img src="{path}" alt="{alt}" class="{cls}-img">'
    yield f"<figcaption>{caption}</figcaption>"
    yield "</figure>"
    if line_br:
        yield LINE_BREAK


class Decker:
    """Decker is a wrapper that materializes the Deck upon request."""

    # TODO: (#0) The `decker` type is a thin wrapper around `deck`. Eliminate
    # it.

    def __init__(self, deck_name: str, deck_id: int) -> None:
        self._deck_name: str = deck_name
        self._deck_id: int = deck_id

    def deck_(self) -> deck.Deck:
        return deck.Deck(
            deck_name=self._deck_name,
            deck_id=self._deck_id,
            deck_description=DESCRIPTION,
            css_path=CSS,
            notes=list(self.notes_aux()),
            html_dir=LEXICON_DIR,
            index_indexes=self.index_indexes(),
        )

    def name(self) -> str:
        return self._deck_name

    def html(self) -> None:
        self.deck_().write_html()

    def notes_aux(self) -> abc.Generator[deck.Note]:
        raise NotImplementedError

    def index_indexes(self) -> list[deck.IndexIndex]:
        raise NotImplementedError

    def notes_key_content_aux(self) -> abc.Generator[tuple[str, str]]:
        for note in self.notes_aux():
            yield note.key, note.html


# All or nothing!
def _aon(*parts: str) -> str:
    return "".join(parts) if all(parts) else ""


def _join(*parts: str) -> str:
    return "".join(parts)


def _use_html_line_breaks(txt: str) -> str:
    return txt.replace("\n", LINE_BREAK)


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

    def parse(self, raw: str) -> SisterWithFrag:
        assert raw
        split = raw.split()
        return self.with_frag(
            # The first part of the split is the key.
            self.key_to_sister[split[0]],
            # The rest is the fragment.
            " ".join(split[1:]),
        )

    def gather_aux(self, sisters: str) -> abc.Generator[str]:
        for s in text.ssplit(sisters, ";"):
            yield from self.parse(s).html_aux()


class CrumIndexer(Mother):
    """CrumIndexer generates indexes and index indexes for Crum's
    dictionary."""

    def __generate_index_body_aux(
        self,
        index_name: str,
        keys: list[str],
    ) -> abc.Generator[str]:
        yield f"<h1>{index_name}</h2>"
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
        for _, row in crum.roots.iterrows():
            keys.append(row["key"])
            types.append([row["type"]])
            categories.append(text.ssplit(row["categories"], ","))

        return [
            deck.IndexIndex(
                "Categories",
                self.__generate_indexes(keys, categories),
                home=CRUM_HOME,
                search=CRUM_SEARCH,
                scripts=[CRUM_JS],
            ),
            deck.IndexIndex(
                "Types",
                self.__generate_indexes(keys, types),
                home=CRUM_HOME,
                search=CRUM_SEARCH,
                scripts=[CRUM_JS],
            ),
        ]


# TODO: (#221) The produced HTML is identical between all versions of the Crum
# decks. They only differ in the JavaScript, and the subset of the notes
# included. Deduplicate the work to save a bit of time.
class Crum(Decker):
    """Crum represents a Crum deck."""

    key_sense_code_sense: dict[str, dict[str, str]] = {}
    images_by_key: defaultdict[str, list[str]] = defaultdict(list)
    key_to_sister: dict[str, Sister] = {}
    key_to_stepsister: dict[str, Sister] = {}
    mother: Mother
    stepmother: Mother
    indexer: CrumIndexer

    @staticmethod
    def __cell(
        row: pd.Series,
        col: str,
        line_br: bool = False,
        force: bool = True,
    ) -> str:
        cell: str = str(row[col])
        if force:
            assert cell
        if line_br:
            cell = _use_html_line_breaks(cell)
        return cell

    @staticmethod
    def __key(row: pd.Series) -> str:
        key = str(row["key"])
        assert key and key.isdigit()
        return key

    for _, row in crum.roots.iterrows():
        key: str = __cell(row, "key")
        title: str = (
            __cell(row, "word-parsed-classify")
            .replace("<br>", " ")
            .replace("<br/>", " ")
        )
        meaning: str = __cell(row, "en-parsed", line_br=True, force=False)
        typ: str = __cell(row, "type")
        key_to_sister[key] = Sister(key, title, meaning, typ)
        senses: str = __cell(row, "senses", force=False)
        key_sense_code_sense[__key(row)] = json.loads(senses) if senses else {}

    @staticmethod
    def __tla_col(row: pd.Series, col: str) -> str:
        data = str(row[col])
        assert data
        data = _use_html_line_breaks(data)
        # NOTE: TLA sister elements possess IDs that are often identical, which
        # we remove here in order to avoid having HTML element ID conflicts,
        # given that, in this view, we can include several TLA entries in the
        # same HTML page.
        data = TLA_ID_RE.sub("", data)
        return data

    for _, row in kellia.comprehensive.iterrows():
        key = __tla_col(row, "entry_xml_id")
        title = (
            __tla_col(row, "orthstring-pishoy")
            .replace("<br>", " ")
            .replace("</br>", " ")
        )
        meaning = __tla_col(row, "merged-pishoy")
        key_to_stepsister[key] = Sister(key, title, meaning, "")

    mother = Mother(key_to_sister, SisterWithFrag)
    stepmother = Mother(key_to_stepsister, StepsisterWithFrag)
    indexer = CrumIndexer(key_to_sister, SisterWithFrag)

    for basename in os.listdir(os.path.join(LEXICON_DIR, EXPLANATORY_DIR)):
        key = basename[: basename.find("-")]
        images_by_key[key].append(basename)

    @staticmethod
    def __get_caption(path: str) -> str:
        stem = file.stem(path)
        key, sense, _ = stem.split("-")
        assert key.isdigit()
        assert sense.isdigit()
        return _join(
            '<span hidden="" class="dev explanatory-key">',
            stem,
            " ",
            "</span>",
            '<span class="italic lighter small">',
            # TODO: (#189) Require the presence of a sense once the sense
            # data has been fully populated.
            Crum.key_sense_code_sense[key].get(sense, ""),
            "</span>",
        )

    @staticmethod
    def __explanatory_alt(path: str) -> str:
        stem = file.stem(path)
        source_path = os.path.join(EXPLANATORY_SOURCES, f"{stem}.txt")
        sources: list[str] = list(
            map(str.strip, file.read(source_path).splitlines()),
        )
        sources = [line for line in sources if line.startswith("http")]
        return sources[0] if sources else stem

    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        dialects: list[str] | None = None,
    ):
        super().__init__(deck_name, deck_id)
        self.dialects: list[str] = dialects or []

    @typing.override
    def index_indexes(self) -> list[deck.IndexIndex]:
        # NOTE: Our indexer will produce indexes for all notes, even if
        # those notes end up being filtered out from the deck. While this is
        # a bug, we don't care, because we only write HTML for the full
        # deck that has all the notes.
        return Crum.indexer.generate_indexes()

    @typing.override
    def notes_aux(self) -> abc.Generator[deck.Note]:
        for _, row in crum.roots.iterrows():
            if not self.__dialect_match(row):
                continue
            yield deck.Note(
                # NOTE: The key is a protected field. Do not change unless you
                # know what you're doing.
                key=self.__key(row),
                front=self.__front(row),
                back=self.__back(row),
                title=self.__title(row),
                nxt=self.__next(row),
                prv=self.__prev(row),
                search=CRUM_SEARCH,
                js_start=(
                    DIALECTS_JS.format(DIALECT_ARR=self.dialects)
                    if self.dialects
                    else ""
                ),
                js_path=CRUM_JS,
            )

    def __dialect_match(self, row: pd.Series) -> bool:
        if not self.dialects:
            return True  # No dialect filter!
        dialects = list(map(str.strip, row["dialects"].split(",")))
        assert all(d in CRUM_DIALECTS for d in dialects)
        return any(d in self.dialects for d in dialects)

    @staticmethod
    def __title(row: pd.Series) -> str:
        return Crum.__cell(row, "word-title")

    @staticmethod
    def __next(row: pd.Series) -> str:
        key = Crum.__cell(row, "key-next", force=False)
        return f"{key}.html" if key else ""

    @staticmethod
    def __prev(row: pd.Series) -> str:
        key = Crum.__cell(row, "key-prev", force=False)
        return f"{key}.html" if key else ""

    def __front(self, row: pd.Series) -> str:
        return "".join(self.__front_aux(row))

    def __front_aux(self, row: pd.Series) -> abc.Generator[str]:
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
        prev = self.__prev(row)
        if prev:
            yield f'<a class="navigate" href="{prev}">prev</a>'
        del prev
        yield "</td>"
        # Key.
        yield "<td>"
        key = self.__key(row)
        yield f'<a class="navigate" href="{key}.html">{key}</a>'
        del key
        yield "</td>"
        # Next
        yield "<td>"
        nxt = self.__next(row)
        if nxt:
            yield f'<a class="navigate" href="{nxt}">next</a>'
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
        yield HORIZONTAL_RULE
        # The word.
        yield '<div id="pretty" class="pretty">'
        yield self.__cell(
            row,
            "word-parsed-prettify",
            line_br=True,
            force=False,
        )
        yield "</div>"

    def __back(self, row: pd.Series) -> str:
        return "".join(self.__back_aux(row))

    @staticmethod
    def __senses_json_to_html(senses_dump: str) -> str:
        if not senses_dump:
            return ""
        senses: dict[str, str] = json.loads(senses_dump)
        return "; ".join(
            f'<span class="sense" id="sense{k}">{senses[k]}</span>'
            for k in sorted(senses.keys(), key=int)
        )

    def __back_aux(self, row: pd.Series) -> abc.Generator[str]:
        key = self.__key(row)
        # Meaning
        yield '<div id="root-type-meaning" class="root-type-meaning">'
        # TODO: (#233) For consistency, this should be renamed to
        # "type", and the existing "type" class that is used
        # elsewhere should be renamed to something else.
        # We have had the convention to use an unqualified class
        # name to refer to elements that relate to the root.
        yield '<div id="root-type" class="root-type">'
        yield "(<b>"
        yield self.__cell(row, "type")
        yield "</b>)"
        yield "</div>"

        cat = self.__cell(row, "categories", force=False)
        if cat:
            yield '<div id="categories" class="categories">'
            yield cat
            yield "</div>"
        del cat
        meaning = self.__cell(row, "en-parsed", line_br=True, force=False)
        if meaning:
            yield '<div id="meaning" class="meaning">'
            yield meaning
            yield "</div>"
        yield "</div>"

        crum_page = self.__cell(row, "crum", force=False)
        dawoud_pages = self.__cell(row, "dawoud-pages", force=False)
        if crum_page or dawoud_pages:
            # Dictionary pages.
            yield '<div id="dictionary" class="dictionary">'
            yield '<span class="right">'
            yield _aon(
                '<b><a href="#crum" class="crum hover-link">Crum</a>: </b>',
                '<span class="crum-page">',
                crum_page,
                "</span>",
            )
            yield _aon(
                LINE_BREAK,
                "<b>",
                '<a href="#dawoud" class="dawoud hover-link">',
                DAWOUD_SURNAME,
                "</a>",
                ": ",
                "</b>",
                DICTIONARY_PAGE_RE.sub(
                    r'<span class="dawoud-page">\1</span>',
                    dawoud_pages.replace(",", ", "),
                ),
            )
            yield "</span>"
            yield "</div>"
            yield LINE_BREAK

        # Images.
        basenames: list[str] = self.images_by_key.get(key, [])
        basenames = semver.sort_semver(basenames)
        if not basenames:
            yield LINE_BREAK
        else:
            yield '<div id="images" class="images">'
            for basename in basenames:
                yield from _img_aux(
                    id_=f"explanatory{file.stem(basename)}",
                    cls="explanatory",
                    alt=Crum.__explanatory_alt(basename),
                    path=os.path.join(EXPLANATORY_DIR, basename),
                    caption=self.__get_caption(basename),
                )
            yield "</div>"
        del basenames

        # Editor's notes.
        editor = self.__cell(row, "notes", line_br=True, force=False)
        if editor:
            yield '<div id="notes" class="notes">'
            yield "<i>Editor's Note: </i>"
            yield editor
            yield "</div>"
        del editor

        # Senses.
        senses = self.__cell(row, "senses", force=False)
        if senses:
            yield '<div id="senses" class="senses">'
            yield Crum.__senses_json_to_html(senses)
            yield "</div>"
        del senses

        # Horizontal line.
        yield HORIZONTAL_RULE

        # Full entry.
        yield '<div id="marcion" class="marcion">'
        yield self.__cell(row, "word-parsed-classify", line_br=True)
        yield "</div>"

        # Derivations.
        yield self.__cell(
            row,
            "derivations-table",
            line_br=True,
            force=False,
        )

        # Sisters.
        sisters = self.__cell(row, "sisters", force=False)
        stepsisters = self.__cell(row, "greek-sisters", force=False)
        antonyms = self.__cell(row, "antonyms", force=False)
        homonyms = self.__cell(row, "homonyms", force=False)

        if sisters or stepsisters or antonyms or homonyms:
            yield HORIZONTAL_RULE
            yield '<div id="sisters" class="sisters">'
            before: bool = False
            if sisters:
                yield "<i>See also: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.mother.gather_aux(sisters)
                yield "</table>"
                before = True
            if stepsisters:
                if before:
                    yield LINE_BREAK
                yield "<i>Greek: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.stepmother.gather_aux(stepsisters)
                yield "</table>"
                before = True
            if antonyms:
                if before:
                    yield LINE_BREAK
                yield "<i>Opposite: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.mother.gather_aux(antonyms)
                yield "</table>"
                before = True
            if homonyms:
                if before:
                    yield LINE_BREAK
                yield "<i>Homonyms: </i>"
                yield '<table class="sisters-table">'
                yield from Crum.mother.gather_aux(homonyms)
                yield "</table>"
                before = True
            yield "</div>"
            del before
        del sisters, stepsisters, antonyms, homonyms

        # Crum's pages.
        if crum_page:
            last_page_override = Crum.__cell(
                row,
                "crum-last-page",
                force=False,
            )
            if last_page_override:
                assert last_page_override != crum_page
                page_range = f"{crum_page}-{last_page_override}"
            else:
                page_range = Crum.__cell(row, "crum-page-range")
            del last_page_override

            yield HORIZONTAL_RULE
            yield '<div id="crum" class="crum dictionary">'
            yield '<span class="right">'
            yield '<b><a href="#crum" class="crum hover-link">Crum</a>: </b>'
            yield DICTIONARY_PAGE_RE.sub(
                r'<span class="crum-page">\1</span>',
                page_range.replace(",", ", "),
            )
            yield "</span>"
            page_numbers: list[int] = Crum._page_numbers(page_range)
            del page_range
            for num in page_numbers:
                yield from _img_aux(
                    id_=f"crum{num}",
                    path=os.path.join(SCAN_DIR, f"{num+22}.png"),
                    cls="crum-page-img",
                    alt=str(num),
                    caption=f'<span class="crum-page-external">{num}</span>',
                    line_br=True,
                )
            del page_numbers
            yield "</div>"
        del crum_page

        if dawoud_pages:
            yield HORIZONTAL_RULE
            yield '<div id="dawoud" class="dawoud dictionary">'
            yield '<span class="right">'
            # Dawoud's pages.
            yield "<b>"
            yield '<a href="#dawoud" class="dawoud hover-link">'
            yield DAWOUD_SURNAME
            yield "</a>"
            yield ": "
            yield "</b>"
            page_ranges = self.__cell(row, "dawoud-pages", force=False)
            yield DICTIONARY_PAGE_RE.sub(
                r'<span class="dawoud-page">\1</span>',
                page_ranges.replace(",", ", "),
            )
            yield "</span>"
            page_numbers = Crum._page_numbers(page_ranges)
            for num in page_numbers:
                yield from _img_aux(
                    path=os.path.join(DAWOUD_DIR, f"{num+17}.png"),
                    caption=f'<span class="dawoud-page-external">{num}</span>',
                    id_=f"dawoud{num}",
                    cls="dawoud-page-img",
                    alt=str(num),
                    line_br=True,
                )
            yield "</div>"
        del dawoud_pages

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


class Copticsite(Decker):
    """Copticsite represents a copticsite deck."""

    @staticmethod
    def __cell(row: pd.Series, col: str, line_br: bool = False) -> str:
        cell: str = str(row[col])
        if line_br:
            cell = _use_html_line_breaks(cell)
        return cell

    @typing.override
    def notes_aux(self) -> abc.Generator[deck.Note]:
        # NOTE: The key is a protected field. Do not change unless you know what
        # you're doing.
        key = 1
        for _, row in copticsite.copticsite.iterrows():
            front = _aon(
                '<span class="word B">',
                '<span class="spelling B">',
                Copticsite.__cell(row, "prettify"),
                "</span>",
                "</span>",
            )
            back = _aon(
                '<span class="type B">',
                "(",
                "<b>",
                " - ".join(
                    filter(
                        None,
                        [
                            Copticsite.__cell(row, "Word Kind"),
                            Copticsite.__cell(row, "Word Gender"),
                            Copticsite.__cell(row, "Origin"),
                        ],
                    ),
                ),
                "</b>",
                ")",
                "</span>",
                LINE_BREAK,
            ) + Copticsite.__cell(row, "Meaning", line_br=True)

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

    @typing.override
    def index_indexes(self) -> list[deck.IndexIndex]:
        return []


class KELLIA(Decker):
    """KELLIA represents a KELLIA deck."""

    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        tsv: pd.DataFrame,
    ) -> None:
        self._tsv: pd.DataFrame = tsv
        super().__init__(deck_name, deck_id)

    def __cell(
        self,
        row: pd.Series,
        col: str,
        force: bool = True,
        line_br: bool = False,
    ) -> str:
        cell: str = str(row[col])
        if force:
            assert cell
        if line_br:
            cell = _use_html_line_breaks(cell)
        return cell

    @typing.override
    def notes_aux(self) -> abc.Generator[deck.Note]:
        for _, row in self._tsv.iterrows():
            # NOTE: The key is a protected field. Do not change unless you know
            # what you're doing.
            key = self.__cell(row, "entry_xml_id")
            front = self.__cell(row, "orthstring-pishoy", line_br=True)
            back = _join(
                self.__cell(row, "merged-pishoy", line_br=True),
                self.__cell(
                    row,
                    "etym_string-processed",
                    line_br=True,
                    force=False,
                ),
                HORIZONTAL_RULE,
                "<footer>",
                "Coptic Dictionary Online: ",
                '<a href="',
                self.__cell(row, "cdo"),
                '">',
                self.__cell(row, "entry_xml_id"),
                "</a>",
                "</footer>",
            )
            yield deck.Note(
                key=str(key),
                title=str(key),
                front=front,
                back=back,
            )

    @typing.override
    def index_indexes(self) -> list[deck.IndexIndex]:
        return []


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
CRUM_BOHAIRIC = "A Coptic Dictionary::Bohairic"
CRUM_SAHIDIC = "A Coptic Dictionary::Sahidic"
CRUM_BOHAIRIC_SAHIDIC = "A Coptic Dictionary::Bohairic / Sahidic"
CRUM_ALL = "A Coptic Dictionary::All Dialects"
COPTICSITE = "copticsite.com"
KELLIA_COMPREHENSIVE = "KELLIA::Comprehensive"
KELLIA_EGYPTIAN = "KELLIA::Egyptian"
KELLIA_GREEK = "KELLIA::Greek"


DECKERS: list[Decker] = [
    Crum(
        CRUM_ALL,
        1284010387,
        [],
    ),
    Crum(
        CRUM_BOHAIRIC,
        1284010383,
        ["B"],
    ),
    Crum(
        CRUM_SAHIDIC,
        1284010386,
        ["S"],
    ),
    Crum(
        CRUM_BOHAIRIC_SAHIDIC,
        1284010390,
        ["B", "S"],
    ),
    Copticsite(
        COPTICSITE,
        1284010385,
    ),
    KELLIA(
        KELLIA_COMPREHENSIVE,
        1284010391,
        kellia.comprehensive,
    ),
    KELLIA(
        KELLIA_EGYPTIAN,
        1284010392,
        kellia.egyptian,
    ),
    KELLIA(
        KELLIA_GREEK,
        1284010393,
        kellia.greek,
    ),
]

NAME_TO_DECKER: dict[str, Decker] = {
    decker.name(): decker for decker in DECKERS
}

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


def _is_crum_word(path: str) -> bool:
    return file.stem(path).isdigit()


CRUM_XOOXLE = xooxle.Index(
    input_dir=NAME_TO_DECKER[CRUM_ALL].notes_key_content_aux(),
    include=_is_crum_word,
    extract=[
        xooxle.Selector({"name": "title"}, force=False),
        xooxle.Selector({"class_": "header"}, force=False),
        xooxle.Selector({"class_": "dictionary"}, force=False),
        xooxle.Selector({"class_": "crum"}, force=False),
        xooxle.Selector({"class_": "crum-page"}, force=False),
        xooxle.Selector({"class_": "crum-page-external"}, force=False),
        xooxle.Selector({"class_": "dawoud"}, force=False),
        xooxle.Selector({"class_": "dawoud-page"}, force=False),
        xooxle.Selector(
            {"class_": "dawoud-page-external"},
            force=False,
        ),
        xooxle.Selector({"class_": "drv-key"}, force=False),
        xooxle.Selector({"id": "images"}, force=False),
        xooxle.Selector({"class_": "nag-hammadi"}, force=False),
        xooxle.Selector({"class_": "sisters"}, force=False),
        xooxle.Selector({"id": "marcion"}),
        xooxle.Selector({"id": "categories"}, force=False),
    ],
    captures=[
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
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            unit_tags={"tr", "div", "hr"},
            block_elements=xooxle.BLOCK_ELEMENTS_DEFAULT | {"td"},
        ),
    ],
    output=os.path.join(LEXICON_DIR, "crum.json"),
)


KELLIA_XOOXLE = xooxle.Index(
    input_dir=NAME_TO_DECKER[KELLIA_COMPREHENSIVE].notes_key_content_aux(),
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
    output=os.path.join(LEXICON_DIR, "kellia.json"),
)


COPTICSITE_XOOXLE = xooxle.Index(
    input_dir=NAME_TO_DECKER[COPTICSITE].notes_key_content_aux(),
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
    output=os.path.join(LEXICON_DIR, "copticsite.json"),
)
