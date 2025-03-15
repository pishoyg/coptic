import json
import os
import re
import typing
from collections import defaultdict

import deck
import pandas as pd

import utils
import web.xooxle as xooxle

# Data
LEXICON_DIR = os.path.join(utils.SITE_DIR, "crum/")
ROOTS = "dictionary/marcion.sourceforge.net/data/output/tsv/roots.tsv"
ROOT_APPENDICES = (
    "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
)
CRUM_DIALECTS = ["S", "Sa", "Sf", "A", "sA", "B", "F", "Fb", "O", "NH"]
EXPLANATORY_SOURCES = "dictionary/marcion.sourceforge.net/data/img-sources"
KELLIA_TSV_DIR = "dictionary/kellia.uni-goettingen.de/data/output/tsv/"
COPTICSITE_TSV = "dictionary/copticsite.com/data/output/tsv/output.tsv"

CRUM_JS = "crum.js"  # Relative to the HTML write directory.
# DIALECTS_JS is a JavaScript line that can be used to set the default dialects.
DIALECTS_JS = "if (localStorage.getItem('d') === null) localStorage.setItem('d', {DIALECT_ARR}.join(','));"

CSS = os.path.join(utils.SITE_DIR, "style.css")  # Not a relative path!
CRUM_SEARCH = "./"  # Relative to the HTML write directory.
CRUM_HOME = "../"  # Relative to the HTML write directory.
DAWOUD_DIR = "../dawoud/"  # Relative to the HTML write directory.
SCAN_DIR = "crum/"  # Relative to the HTML write directory.
EXPLANATORY_DIR = "explanatory/"  # Relative to the HTML write directory.

EMAIL = "remnqymi@gmail.com"
DESCRIPTION = "https://remnqymi.com"
KELLIA_PREFIX = "https://coptic-dictionary.org/entry.cgi?tla="

DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
COPTIC_WORD_RE = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")
GREEK_WORD_RE = re.compile("([Α-Ωα-ω]+)")
TLA_ID_RE = re.compile(r'\bid="[^"]+"')

LINE_BREAK = "<br>"
HORIZONTAL_RULE = "<hr>"


def _img_aux(
    id: str,
    _class: str,
    path: str,
    alt: str,
    caption: str,
    line_br: bool = False,
) -> typing.Generator[str]:
    yield f'<figure id="{id}" class="{_class}">'
    # NOTE: Anki requires basenames. The string `src="{path}"` gets updated
    # while the Anki flashcards are being generated, using regular
    # expressions. So retaining the format `src="{path}"` is important.
    yield f'<img src="{path}" alt="{alt}" class="{_class}-img">'
    yield f"<figcaption>{caption}</figcaption>"
    yield "</figure>"
    if line_br:
        yield LINE_BREAK


# TODO: The `decker` type is a thin wrapper around `deck`. Eliminate it.
class decker:
    def __init__(self, deck_name: str, deck_id: int, write_html: bool) -> None:
        self._deck_name: str = deck_name
        self._deck_id: int = deck_id
        self._write_html: bool = write_html

    def deck_(self) -> deck.deck:
        return deck.deck(
            deck_name=self._deck_name,
            deck_id=self._deck_id,
            deck_description=DESCRIPTION,
            css_path=CSS,
            notes=list(self.notes_aux()),
            html_dir=LEXICON_DIR,
            index_indexes=self.index_indexes(),
            write_html=self._write_html,
        )

    def name(self) -> str:
        return self._deck_name

    def html(self) -> None:
        if not self._write_html:
            return
        self.deck_().write_html_if_needed()

    def notes_aux(self) -> typing.Generator[deck.note]:
        raise NotImplementedError

    def index_indexes(self) -> list[deck.index_index]:
        raise NotImplementedError

    def notes_key_content_aux(self) -> typing.Generator[tuple[str, str]]:
        for note in self.notes_aux():
            yield note.key, note.html


class CRUM_ROOTS:
    _roots: pd.DataFrame = utils.TSV_CACHE.read(ROOTS)
    _appendices: pd.DataFrame = utils.TSV_CACHE.read(ROOT_APPENDICES)
    assert list(_roots["key"]) == list(_appendices["key"])
    _appendices.drop("key", axis=1, inplace=True)
    roots: pd.DataFrame = pd.concat([_roots, _appendices], axis=1)
    del _roots, _appendices


# All or nothing!
def _aon(*parts: str) -> str:
    return "".join(parts) if all(parts) else ""


def _join(*parts: str) -> str:
    return "".join(parts)


def _use_html_line_breaks(text: str) -> str:
    return text.replace("\n", LINE_BREAK)


class sister:
    def __init__(self, key: str, title: str, meaning: str, _type: str) -> None:
        self.key = key
        self.title = title
        self.meaning = meaning
        self.type = _type


class sister_with_frag:
    HREF_FMT = "{key}.html"

    def __init__(self, sister: sister, fragment: str) -> None:
        self.sister = sister
        self.fragment = fragment

    def frag(self) -> str:
        if not self.fragment:
            return ""
        if self.fragment.startswith("#"):
            return self.fragment
        return f"#:~:text={self.fragment}"

    def html_aux(self) -> typing.Generator[str]:
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
        yield f'<span hidden="" class="dev sister-key right">'
        yield self.sister.key
        yield "</span>"
        yield "</td>"
        yield "</tr>"


class stepsister_with_frag(sister_with_frag):
    HREF_FMT = KELLIA_PREFIX + "{key}"


class _mother:

    def __init__(
        self,
        key_to_sister: dict[str, sister],
        with_frag: typing.Callable[[sister, str], sister_with_frag],
    ) -> None:
        self.key_to_sister: dict[str, sister] = key_to_sister
        self.with_frag: typing.Callable[[sister, str], sister_with_frag] = (
            with_frag
        )

    def parse(self, raw: str) -> sister_with_frag:
        assert raw
        split = raw.split()
        return self.with_frag(
            # The first part of the split is the key.
            self.key_to_sister[split[0]],
            # The rest is the fragment.
            " ".join(split[1:]),
        )

    def gather_aux(self, _sisters: str) -> typing.Generator[str]:
        sisters = map(self.parse, utils.ssplit(_sisters, ";"))
        for s in sisters:
            yield from s.html_aux()


class _crum_indexer(_mother):
    def __init__(
        self,
        key_to_sister: dict[str, sister],
        with_frag: typing.Callable[[sister, str], sister_with_frag],
    ):
        super().__init__(key_to_sister, with_frag)

    def __generate_index_body_aux(
        self,
        index_name: str,
        keys: list[str],
    ) -> typing.Generator[str]:
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
    ) -> list[deck.index]:
        """
        Args:
            indexes: A list such that indexes_i gives the indexes that word_i
            belongs to.
        """
        index_to_keys: defaultdict = defaultdict(list)
        assert len(keys) == len(indexes)
        for word_key, word_indexes in zip(keys, indexes):
            for word_index in word_indexes:
                index_to_keys[word_index].append(word_key)
        return [
            deck.index(
                index_name,
                len(keys),
                self.__generate_index_body_aux(index_name, keys),
            )
            for index_name, keys in sorted(
                index_to_keys.items(),
                key=lambda pair: pair[0],
            )
        ]

    def generate_indexes(self) -> list[deck.index_index]:
        keys: list[str] = []
        types: list[list[str]] = []
        categories: list[list[str]] = []
        for _, row in CRUM_ROOTS.roots.iterrows():
            keys.append(row["key"])
            types.append([row["type-parsed"]])
            categories.append(utils.ssplit(row["categories"], ","))

        return [
            deck.index_index(
                "Categories",
                self.__generate_indexes(keys, categories),
                home=CRUM_HOME,
                search=CRUM_SEARCH,
                scripts=[CRUM_JS],
            ),
            deck.index_index(
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
class Crum(decker):

    key_sense_code_sense: dict[str, dict[str, str]] = {}
    images_by_key: defaultdict[str, list[str]] = defaultdict(list)
    key_to_sister: dict[str, sister] = {}
    key_to_stepsister: dict[str, sister] = {}
    mother: _mother
    stepmother: _mother
    indexer: _crum_indexer

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

    for _, row in CRUM_ROOTS.roots.iterrows():
        key = __cell(row, "key")
        title = (
            __cell(row, "word-parsed-classify")
            .replace("<br>", " ")
            .replace("<br/>", " ")
        )
        meaning = __cell(row, "en-parsed", line_br=True, force=False)
        _type = __cell(row, "type-parsed")
        key_to_sister[key] = sister(key, title, meaning, _type)
        senses = __cell(row, "senses", force=False)
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

    for _, row in utils.TSV_CACHE.read(
        os.path.join(KELLIA_TSV_DIR, "comprehensive.tsv"),
    ).iterrows():
        key = __tla_col(row, "entry_xml_id")
        title = (
            __tla_col(row, "orthstring-pishoy")
            .replace("<br>", " ")
            .replace("</br>", " ")
        )
        meaning = __tla_col(row, "merged-pishoy")
        key_to_stepsister[key] = sister(key, title, meaning, "")

    mother = _mother(key_to_sister, sister_with_frag)
    stepmother = _mother(key_to_stepsister, stepsister_with_frag)
    indexer = _crum_indexer(key_to_sister, sister_with_frag)

    for basename in os.listdir(os.path.join(LEXICON_DIR, EXPLANATORY_DIR)):
        key = basename[: basename.find("-")]
        images_by_key[key].append(basename)

    @staticmethod
    def __get_caption(path: str) -> str:
        stem = utils.stem(path)
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
        stem = utils.stem(path)
        source_path = os.path.join(EXPLANATORY_SOURCES, f"{stem}.txt")
        sources: list[str] = [
            line.strip() for line in utils.read(source_path).split("\n")
        ]
        sources = [line for line in sources if line.startswith("http")]
        return sources[0] if sources else stem

    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        dialects: list[str] = [],
        write_html: bool = False,
    ):
        super().__init__(deck_name, deck_id, write_html)
        self.dialects: list[str] = dialects

    def index_indexes(self) -> list[deck.index_index]:
        # NOTE: Our indexer will produce indexes for all notes, even if
        # those notes end up being filtered out from the deck. While this is
        # a bug, we don't care, because we only write HTML for the full
        # deck that has all the notes.
        return Crum.indexer.generate_indexes()

    @typing.override
    def notes_aux(self) -> typing.Generator:
        for _, row in CRUM_ROOTS.roots.iterrows():
            if not self.__dialect_match(row):
                continue
            yield deck.note(
                # NOTE: The key is a protected field. Do not change unless you know what
                # you're doing.
                key=self.__key(row),
                front=self.__add_lookup_classes(self.__front(row)),
                back=self.__add_lookup_classes(self.__back(row)),
                title=self.__title(row),
                next=self.__next(row),
                prev=self.__prev(row),
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

    def __front_aux(self, row: pd.Series) -> typing.Generator[str]:
        # Header.
        # Open the table.
        yield '<table id="header" class="header">'
        yield "<tr>"
        # Home
        yield '<td><a class="navigate" href="../">home</a></td>'
        # Contact
        yield "<td>"
        yield f'<a class="contact" href="mailto:{EMAIL}">'
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
        next = self.__next(row)
        if next:
            yield f'<a class="navigate" href="{next}">next</a>'
        del next
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

    @staticmethod
    def __add_lookup_classes(text: str) -> str:
        return Crum.__greek(Crum.__cdo(text))

    # TODO: Insert the tags in the Crum pipeline.
    # This replaces all Coptic words, regardless of whether they
    # represent plain text. Coptic text that occurs inside a tag (for example
    # as a tag property) would still get wrapped inside this <span> tag.
    @staticmethod
    def __cdo(text: str) -> str:
        return COPTIC_WORD_RE.sub(
            r'<span class="coptic">\1</span>',
            text,
        )

    # TODO: Insert tags in the Crum pipeline.
    # This replaces all Greek words, regardless of whether they
    # represent plain text. Greek text that occurs inside a tag (for example
    # as a tag property) would still acquire this tag.
    @staticmethod
    def __greek(text: str) -> str:
        return GREEK_WORD_RE.sub(
            r'<span class="greek">\1</span>',
            text,
        )

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

    def __back_aux(self, row: pd.Series) -> typing.Generator[str]:
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
        yield self.__cell(row, "type-parsed")
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

        crum = self.__cell(row, "crum", force=False)
        dawoud = self.__cell(row, "dawoud-pages", force=False)
        if crum or dawoud:
            # Dictionary pages.
            yield '<div id="dictionary" class="dictionary">'
            yield '<span class="right">'
            yield _aon(
                '<b><a href="#crum" class="crum hover-link">Crum</a>: </b>',
                '<span class="crum-page">',
                crum,
                "</span>",
            )
            yield _aon(
                LINE_BREAK,
                # Abd-El-Nour is Dawoud's actual last name! We continue
                # to refer to him as Dawoud throughout the repo.
                '<b><a href="#dawoud" class="dawoud hover-link">Abd-El-Nour</a>: </b>',
                DICTIONARY_PAGE_RE.sub(
                    r'<span class="dawoud-page">\1</span>',
                    dawoud.replace(",", ", "),
                ),
            )
            yield "</span>"
            yield "</div>"
            yield LINE_BREAK

        # Images.
        basenames: list[str] = self.images_by_key.get(key, [])
        basenames = utils.sort_semver(basenames)
        if not basenames:
            yield LINE_BREAK
        else:
            yield '<div id="images" class="images">'
            for basename in basenames:
                yield from _img_aux(
                    id=f"explanatory{utils.stem(basename)}",
                    _class="explanatory",
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
        stepsisters = self.__cell(row, "TLA-sisters", force=False)
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
        if crum:
            last_page_override = Crum.__cell(
                row,
                "crum-last-page",
                force=False,
            )
            if last_page_override:
                assert last_page_override != crum
                page_range = f"{crum}-{last_page_override}"
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
                    id=f"crum{num}",
                    path=os.path.join(SCAN_DIR, f"{num+20}.png"),
                    _class="crum-page-img",
                    alt=str(num),
                    caption=f'<span class="crum-page-external">{num}</span>',
                    line_br=True,
                )
            del page_numbers
            yield "</div>"
        del crum

        if dawoud:
            yield HORIZONTAL_RULE
            yield '<div id="dawoud" class="dawoud dictionary">'
            yield '<span class="right">'
            # Dawoud's pages.
            # Abd-El-Nour is Dawoud's actual last name! We continue
            # to refer to him as Dawoud throughout the repo.
            yield '<b><a href="#dawoud" class="dawoud hover-link">Abd-El-Nour</a>: </b>'
            page_ranges = self.__cell(row, "dawoud-pages", force=False)
            yield DICTIONARY_PAGE_RE.sub(
                r'<span class="dawoud-page">\1</span>',
                page_ranges.replace(",", ", "),
            )
            yield "</span>"
            page_numbers = Crum._page_numbers(page_ranges)
            for num in page_numbers:
                yield from _img_aux(
                    path=os.path.join(DAWOUD_DIR, f"{num+16}.jpg"),
                    caption=f'<span class="dawoud-page-external">{num}</span>',
                    id=f"dawoud{num}",
                    _class="dawoud-page-img",
                    alt=str(num),
                    line_br=True,
                )
            yield "</div>"
        del dawoud

    @staticmethod
    def _dedup(arr: list[int], at_most_once: bool = False) -> list[int]:
        """
        Args:
            at_most_once: If true, deduplicate across the whole list.
            If false, only deduplicate consecutive occurrences.
            For example, given the list 1,1,2,1.
            If deduped with `at_most_once`, it will return 1,2, with each page
            occurring at most once.
            If deduped with `at_most_once=False`, it will return 1,2,1, only
            removing the consecutive entries.
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
        """page_ranges is a comma-separated list of columns or columns ranges.
        The column ranges resemble what you type when you're using your
        printer, except that each page number must be followed by a letter,
        either "a" or b", representing the column.

        For example, "1a,3b-5b,8b-9a" means [1a, 3b, 4a, 4b, 5a, 5b,
        9a].
        """

        def col_to_page_num(col: str) -> int:
            col = col.strip()
            assert col[-1] in ["a", "b"]
            col = col[:-1]
            assert col.isdigit()
            return int(col)

        out = []
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


class copticsite(decker):

    @staticmethod
    def __cell(row: pd.Series, col: str, line_br: bool = False) -> str:
        cell: str = str(row[col])
        if line_br:
            cell = _use_html_line_breaks(cell)
        return cell

    def __init__(self, deck_name: str, deck_id: int) -> None:
        self.tsv = utils.TSV_CACHE.read(COPTICSITE_TSV)
        super().__init__(deck_name, deck_id, False)

    @typing.override
    def notes_aux(self) -> typing.Generator[deck.note]:
        # NOTE: The key is a protected field. Do not change unless you know what
        # you're doing.
        key = 1
        for _, row in self.tsv.iterrows():
            front = _aon(
                '<span class="word B">',
                '<span class="spelling B">',
                copticsite.__cell(row, "prettify"),
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
                            copticsite.__cell(row, "Word Kind"),
                            copticsite.__cell(row, "Word Gender"),
                            copticsite.__cell(row, "Origin"),
                        ],
                    ),
                ),
                "</b>",
                ")",
                "</span>",
                LINE_BREAK,
            ) + copticsite.__cell(row, "Meaning", line_br=True)

            if not front and not back:
                continue
            yield deck.note(
                key=str(key),
                title=str(key),
                front=front,
                back=back,
                force_content=False,
            )
            key += 1

    @typing.override
    def index_indexes(self) -> list[deck.index_index]:
        return []


class KELLIA(decker):
    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        tsv_basename: str,
    ) -> None:
        self._tsv = utils.TSV_CACHE.read(
            os.path.join(KELLIA_TSV_DIR, f"{tsv_basename}.tsv"),
        )
        super().__init__(deck_name, deck_id, False)

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
    def notes_aux(self) -> typing.Generator[deck.note]:
        for _, row in self._tsv.iterrows():
            # NOTE: The key is a protected field. Do not change unless you know what
            # you're doing.
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
            yield deck.note(
                key=str(key),
                title=str(key),
                front=front,
                back=back,
            )

    @typing.override
    def index_indexes(self) -> list[deck.index_index]:
        return []


# NOTE: The deck IDs are protected fields. They are used as database keys for the
# decks. Do NOT change them!
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


def file_name(deck_name: str) -> str:
    """Given a deck name, return a string that is valid as a file name.

    Remove invalid characters, and make it filename-like.
    """
    return (
        deck_name.lower().replace(" ", "_").replace(":", "_").replace("/", "-")
    )


DECKERS: list[decker] = [
    Crum(
        CRUM_ALL,
        1284010387,
        [],
        write_html=True,
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
    copticsite(
        COPTICSITE,
        1284010385,
    ),
    KELLIA(
        KELLIA_COMPREHENSIVE,
        1284010391,
        "comprehensive",
    ),
    KELLIA(
        KELLIA_EGYPTIAN,
        1284010392,
        "egyptian",
    ),
    KELLIA(
        KELLIA_GREEK,
        1284010393,
        "greek",
    ),
]

NAME_TO_DECKER: dict[str, decker] = {
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
    "sA",
    "B",
    "F",
    "Fb",
    "O",
    # The following dialects are only found in Marcion.
    "NH",
    # The following dialects are only found in TLA / KELLIA.
    "Ak",
    "M",
    "L",
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
    return utils.stem(path).isdigit()


CRUM_XOOXLE = xooxle.subindex(
    CRUM_ALL,
    input=NAME_TO_DECKER[CRUM_ALL].notes_key_content_aux(),
    include=_is_crum_word,
    extract=[
        xooxle.selector({"name": "title"}, force=False),
        xooxle.selector({"class_": "header"}, force=False),
        xooxle.selector({"class_": "dictionary"}, force=False),
        xooxle.selector({"class_": "crum"}, force=False),
        xooxle.selector({"class_": "crum-page"}, force=False),
        xooxle.selector({"class_": "crum-page-external"}, force=False),
        xooxle.selector({"class_": "dawoud"}, force=False),
        xooxle.selector({"class_": "dawoud-page"}, force=False),
        xooxle.selector(
            {"class_": "dawoud-page-external"},
            force=False,
        ),
        xooxle.selector({"class_": "drv-key"}, force=False),
        xooxle.selector({"id": "images"}, force=False),
        xooxle.selector({"class_": "nag-hammadi"}, force=False),
        xooxle.selector({"class_": "sisters"}, force=False),
        xooxle.selector({"id": "marcion"}),
        xooxle.selector({"id": "categories"}, force=False),
    ],
    captures=[
        xooxle.capture(
            "marcion",
            xooxle.selector({"id": "pretty"}),
            # This is the list of classes needed for highlighting. If the
            # highlighting rules change, you might have to add new classes!
            retain_classes=_CRUM_RETAIN_CLASSES,
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
        ),
        xooxle.capture(
            "meaning",
            xooxle.selector({"id": "root-type-meaning"}, force=False),
            retain_classes=_CRUM_RETAIN_CLASSES,
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
        ),
        xooxle.capture(
            "appendix",
            xooxle.selector(
                {"name": "body"},
            ),
            retain_classes=_CRUM_RETAIN_CLASSES,
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            unit_tags={"tr", "div", "hr"},
            block_elements=xooxle.BLOCK_ELEMENTS_DEFAULT | {"td"},
        ),
    ],
    result_table_name="crum",
    href_fmt="{KEY}.html",
)


KELLIA_XOOXLE = xooxle.subindex(
    KELLIA_COMPREHENSIVE,
    input=NAME_TO_DECKER[KELLIA_COMPREHENSIVE].notes_key_content_aux(),
    extract=[
        xooxle.selector({"name": "footer"}, force=False),
        xooxle.selector({"class_": "bibl"}, force=False),
        xooxle.selector({"class_": "ref_xr"}, force=False),
        xooxle.selector({"class_": "ref"}, force=False),
    ],
    captures=[
        xooxle.capture(
            "orths",
            xooxle.selector({"id": "orths"}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.capture(
            "senses",
            xooxle.selector({"id": "senses"}),
            retain_classes=_KELLIA_RETAIN_CLASSES,
        ),
        xooxle.capture(
            "text",
            xooxle.selector(
                {"name": "body"},
            ),
        ),
    ],
    result_table_name="kellia",
    href_fmt=f"{KELLIA_PREFIX}{{KEY}}",
)


COPTICSITE_XOOXLE = xooxle.subindex(
    COPTICSITE,
    input=NAME_TO_DECKER[COPTICSITE].notes_key_content_aux(),
    extract=[],
    captures=[
        xooxle.capture(
            "front",
            xooxle.selector({"id": "front"}),
            retain_classes=_COPTICSITE_RETAIN_CLASSES,
        ),
        xooxle.capture(
            "back",
            xooxle.selector({"id": "back"}),
        ),
    ],
    result_table_name="copticsite",
    href_fmt="",
)


def XOOXLE(decks: list[str]) -> xooxle.index:
    subindexes: list[xooxle.subindex] = [
        subindex
        for subindex in [CRUM_XOOXLE, KELLIA_XOOXLE, COPTICSITE_XOOXLE]
        if subindex.name in decks
    ]
    return xooxle.index(
        os.path.join(LEXICON_DIR, "xooxle.json"),
        *subindexes,
    )
