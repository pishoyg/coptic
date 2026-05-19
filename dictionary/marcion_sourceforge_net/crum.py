"""Parse Crum's dictionary."""

# TODO: (#399) Define add_image and rm_image methods on `Root`, and update the
# object every time the content of the directories changes. This way, you can
# maintain an up-to-date view throughout the program execution.
# The image helper, defined in `img_helper.py`, has an interactive mode where it
# repeatedly receives commands and update the dataset accordingly. If it updates
# the source without updating the in-memory copy of the data, the discrepancy
# may cause issues. We can solve the problem by having the script update the
# in-memory view as well.

# TODO: (#0) Use CSS to enforce a `block` display, instead of line breaks.

import collections
import dataclasses
import functools
import itertools
import os
import pathlib
import re
import typing
from collections import abc, defaultdict

import gspread
import yaml

from dictionary.kellia_uni_goettingen_de import kellia
from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from dictionary.marcion_sourceforge_net import parse, sheet, wiki
from flashcards import deck
from xooxle import xooxle

# We can't put all imports on one line, because there is conflict between the
# following pre-commit hooks: isort, add-trailing-comma, black
# TODO: (#0) This is not ideal. Resolve hook conflicts.
# pylint: disable=ungrouped-imports
# isort: off
from utils import cache, concur, ensure, file, gcp, log, page, paths, text
from utils import javascript, numeral

_NUM_DRV_COLS: int = 10
_HUNDRED: int = 100
assert not _HUNDRED % _NUM_DRV_COLS

_CATEGORIES_PATH: pathlib.Path = paths.MARCION / "categories.yaml"

# _FROM_MARCION is a set of entries that have been added to Crum by Marcion.
# They don't exist in the original text, and therefore are not expected to be
# found in Wiki!
_FROM_MARCION: set[str] = {"3381", "3382", "3385"}

# TODO: (#399) Crum HTML logic should be deduplicated. The duplication causes
# such issues as #398.

INDEX_CLASS = "index"
INDEX_INDEX_CLASS = "index_index"


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


CSS: list[str] = [
    relpath(paths.CRUM_CSS),
    relpath(paths.DROPDOWN_CSS),
    relpath(paths.HELP_CSS),
    relpath(paths.HEADER_CSS),
]
JS: str = relpath(paths.CRUM_JS)

SEARCH: str = relpath(paths.LEXICON_DIR)
HOME: str = relpath(paths.SITE_DIR)

KELLIA_PREFIX = "https://coptic-dictionary.org/entry.cgi?tla="


class Row(gcp.Record):
    """Row represents a row in the Crum sheet."""

    def __init__(
        self,
        row_num: int,
        row: abc.Mapping[str, str | int | float],
        root: bool,
    ) -> None:
        super().__init__(row_num, row)
        self.root: bool = root

    def get(self, col: sheet.COL) -> str:
        return self.row[col.value]

    @functools.cached_property
    def key(self) -> str:
        key: str = self.get(sheet.COL.KEY)
        return key

    @functools.cached_property
    def num(self) -> int:
        return int(self.key)

    @functools.cached_property
    def type_name(self) -> str:
        return self.get(sheet.COL.TYPE)

    # TODO: (#331) Split the type field into type and gender.
    @functools.cached_property
    def grammatical_type(self) -> lex.Type:
        return constants.TYPE_ENCODING[self.type_name]

    # TODO: (#339) Produce a single word parsing.
    # TODO: (#338) Parsing options should be independent of one another, and of
    # output options.
    @functools.cached_property
    def parsing_1(self) -> list[lex.Line]:
        return parse.parse_word_cell(
            self._raw_word(),
            self.grammatical_type,
            self.root,
            detach_types=False,
            use_coptic_symbol=False,
            normalize_optional=False,
            normalize_assumed=False,
        )

    def word_parsed_classify(self, include_references: bool = True) -> str:
        return page.LINE_BREAK.join(
            w.string(classify=True, include_references=include_references)
            for w in self.parsing_1
        )

    @functools.cached_property
    def parsing_2(self) -> list[lex.Line]:
        return parse.parse_word_cell(
            self._raw_word(),
            self.grammatical_type,
            self.root,
            detach_types=True,
            use_coptic_symbol=True,
            normalize_optional=True,
            normalize_assumed=True,
        )

    def _raw_word(self) -> str:
        return self.get(sheet.COL.WORD)

    def word_parsed_prettify(self) -> str:
        return page.LINE_BREAK.join(
            w.string(append_root_type=True, classify=True)
            for w in self.parsing_2
        )

    @functools.cached_property
    def meaning(self) -> str:
        return parse.parse_english_cell(self.get(sheet.COL.EN))

    @functools.cached_property
    def dialects(self) -> list[str]:
        line_dialects: list[list[str] | None] = [
            w.dialects() for w in self.parsing_1
        ]
        # NOTE: For roots, we have two cases:
        # - either all lines have dialects, or
        # - none does.
        # For derivations, the presence or absence of dialects is more flexible.
        if not any(line_dialects):
            # None of the lines has a dialect. This is an undialected entry.
            # If this is a root, and it's undialected, we treat it as belonging
            # to all dialects.
            # If this is a derivation, we can't infer the dialects, as
            # many derivations don't have any!
            return sorted(constants.DIALECTS) if self.root else []
        # All lines must have dialects.
        combined: set[str] = set()
        for group in line_dialects:
            if self.root:
                assert group
            elif not group:
                continue
            combined.update(group)
        return sorted(combined)

    @functools.cached_property
    def crum(self) -> lex.Column:
        return lex.Column(self.get(sheet.COL.CRUM))


# NOTE: As of now, derivations are somewhat of second-class citizens in our
# database. Many of the methods defined under `Root` may belong under the base
# class `Row if the derivations were to acquire additional properties.
class Derivation(Row):
    """Derivation represents a derivation row."""

    @functools.cached_property
    def url(self) -> str:
        return paths.crum_url(self.key_word, self.key)

    def __init__(
        self,
        row_num: int,
        row: abc.Mapping[str, str | int | float],
        depth: int,
    ) -> None:
        super().__init__(row_num, row, root=False)
        self.depth: int = depth

    @typing.override
    @classmethod
    def worksheet(cls) -> gspread.worksheet.Worksheet:
        return sheet.derivations_sheet()

    @typing.override
    @classmethod
    def worksheet_url(cls) -> str:
        return sheet.DERIVATIONS_URL

    @functools.cached_property
    def key_word(self) -> str:
        return self.get(sheet.COL.KEY_WORD)

    @functools.cached_property
    def key_deriv(self) -> str:
        return self.get(sheet.COL.KEY_DERIV)

    @typing.override
    def __str__(self) -> str:
        return self.key

    @typing.override
    def _raw_word(self) -> str:
        return "\n".join(
            filter(
                None,
                [
                    self.get(sheet.COL.WORD),
                    self.get(sheet.COL.WORDS),
                ],
            ),
        )


class Relation:
    """House represents a word relation."""

    def __init__(self, encoding: str) -> None:
        parts: list[str] = encoding.split()
        del encoding
        self.key: str = parts[0]
        self.fragment: str = " ".join(parts[1:])

    @typing.override
    def __str__(self):
        return f"{self.key} {self.fragment}"

    @typing.override
    def __repr__(self):
        return self.__str__()


class House:
    """House represents a list of relations."""

    def __init__(self, relations: abc.Iterable[str]) -> None:
        self.relations: list[Relation] = list(map(Relation, relations))
        ensure.unique(self.relations)

    def __contains__(self, key: str) -> bool:
        return any(key == r.key for r in self.relations)

    def __iter__(self):
        return iter(self.relations)

    def __bool__(self):
        return bool(self.relations)


class Image:
    """Image represents a Crum explanatory image."""

    def __init__(self, basename: str) -> None:
        self.src_basename: str = basename
        match: re.Match[str] | None = constants.BASENAME_RE.fullmatch(basename)
        assert match
        self.key_word: str = match.group(1)
        self.sense_num: int = int(match.group(2))
        self.idx: int = int(match.group(3))
        self.src_ext: str = match.group(4)
        ensure.ensure(
            self.src_ext in constants.VALID_SRC_EXTENSIONS,
            self.src_path,
            "has an invalid extension",
            self.src_ext,
        )

    @functools.cached_property
    def dst_basename(self) -> str:
        dst_ext: str = constants.EXT_MAP.get(self.src_ext, self.src_ext)
        assert dst_ext in constants.VALID_DST_EXTENSIONS
        return f"{self.stem}{dst_ext}"

    @functools.cached_property
    def src_path(self) -> pathlib.Path:
        return constants.IMG_SRC_DIR / self.src_basename

    @functools.cached_property
    def dst_path(self) -> pathlib.Path:
        return constants.IMG_DST_DIR / self.dst_basename

    @functools.cached_property
    def stem(self) -> str:
        return file.stem(self.src_basename)

    @functools.cached_property
    def sources_path(self) -> pathlib.Path:
        return constants.SOURCES_DIR / f"{self.stem}.txt"

    @functools.cached_property
    def _sort_key(self) -> list[int]:
        return [int(self.key_word), self.sense_num, self.idx]

    @functools.cached_property
    def sources(self) -> list[str]:
        # TODO: (#0) Sources should be stripped at the source.
        sources: list[str] = list(
            map(str.strip, file.readlines(self.sources_path)),
        )
        ensure.ensure(
            all(sources),
            "source file",
            self.sources_path,
            "appears to have empty lines!",
        )
        for s in sources:
            ensure.ensure(
                s.startswith("http") or constants.NAME_RE.fullmatch(s),
                self.sources_path,
                "has an invalid source",
                s,
            )
        return sources

    @functools.cached_property
    def http_sources(self) -> list[str]:
        return [s for s in self.sources if s.startswith("http")]

    @functools.cached_property
    def alt(self) -> str:
        # TODO: (#258) An HTTP source should always be present.
        return self.http_sources[0] if self.http_sources else self.stem

    def __lt__(self, other: typing.Self) -> bool:
        return self._sort_key < other._sort_key

    @functools.cached_property
    def artifacts(self) -> list[pathlib.Path]:
        return [self.src_path, self.dst_path, self.sources_path]

    def caption_aux(self, sense: str | None) -> abc.Generator[str]:
        yield '<span hidden="" class="explanatory-key">'
        yield self.stem
        yield "</span>"
        if not sense:
            return
        yield f' <span class="explanatory-caption">{sense}</span>'

    def caption(self, sense: str | None) -> str:
        return "".join(self.caption_aux(sense))


@dataclasses.dataclass
class Drv:
    """Drv is used to verify the tree structure."""

    key: str
    depth: int


class Root(Row):
    """Root represents a root row."""

    @functools.cached_property
    def num(self) -> int:
        num: int = super().num
        assert constants.MIN_KEY <= num <= constants.MAX_KEY
        return num

    @typing.override
    @classmethod
    def worksheet(cls) -> gspread.worksheet.Worksheet:
        return sheet.roots_sheet()

    @typing.override
    @classmethod
    def worksheet_url(cls) -> str:
        return sheet.ROOTS_URL

    @functools.cached_property
    def url(self) -> str:
        return paths.crum_url(self.key)

    def __init__(
        self,
        row_num: int,
        row: abc.Mapping[str, str | int | float],
        derivations: abc.Iterable[Derivation],
    ) -> None:
        super().__init__(row_num, row, root=True)
        self._derivations: list[Derivation] = list(derivations)
        assert all(d.key_word == self.key for d in self._derivations)
        # Verify the tree structure. Ensure that each derivation renders beneath
        # its parent.
        # Create a stack with a placeholder element.
        stack: list[Drv] = [Drv("0", -1)]
        for d in self._derivations:
            while stack[-1].depth >= d.depth:
                _ = stack.pop()
            top: Drv = stack[-1]
            assert top.depth < d.depth  # Sanity check.
            ensure.ensure(
                top.key == d.key_deriv,
                "Word",
                self.key,
                "has derivation",
                d.key,
                "rendering below an element that is not its parent:",
                top.key,
            )
            stack.append(Drv(d.key, d.depth))

    @functools.cached_property
    def wikis(self) -> list[wiki.Wiki]:
        _verify_wiki_keys()
        return (
            []
            if self.key in _FROM_MARCION
            else wiki.by_marcion_key()[self.key]
        )

    @functools.cached_property
    def wiki_html(self) -> str:
        wikis: list[wiki.Wiki] = [w for w in self.wikis if not w.wip]
        ensure.ensure(
            wikis,
            "Can't generate HTML for an empty list of Wikis at",
            self.key,
        )
        # The input is guaranteed to be sorted by page number, so we can use
        # `groupby` directly.
        return "".join(
            wiki.Column(col, group).html()
            for col, group in itertools.groupby(wikis, key=lambda w: w.crum)
        )

    @functools.cached_property
    def images(self) -> list[Image]:
        return Crum.images_by_key.get(self.key, [])

    def update_cell(self, col: sheet.COL, value: str) -> None:
        if super().update(col.value, value):
            log.info("Updated", col, "under", self.key)

    def from_marcion(self) -> bool:
        return self.key in _FROM_MARCION

    def has_wiki_canonical_entries(self) -> bool:
        """Assess whether we have complete Wiki data.

        Returns:
            True if all Wiki canonical entries are populated, false otherwise.
        """
        if self.from_marcion():
            return False
        # TODO: (#503) This check will no longer be necessary once the data is
        # fully populated.
        return not any(w.canonical and w.wip for w in self.wikis)

    def title(self) -> str:
        return ", ".join(
            w.string(
                include_dialects=False,
                include_references=False,
                append_root_type=False,
                parenthesize_assumed=True,
                append_types=False,
                classify=False,
            )
            for w in self.parsing_2
        )

    @functools.cached_property
    def senses(self) -> dict[int, str]:
        # TODO: (#189) Once all senses are present, don't allow the field to be
        # absent.
        raw: str = self.get(sheet.COL.SENSES)
        if not raw:
            return {}
        senses: dict[int, str] = yaml.safe_load(raw)
        del raw
        ensure.unique(senses.keys())
        ensure.unique(senses.values())
        ensure.ensure(
            min(senses.keys()) == 1 and max(senses.keys()) == len(senses),
            self.key,
            "has a gap in senses!",
        )
        return senses

    def max_img_idx(self, sense: int) -> int:
        return max(
            (img.idx for img in self.images if img.sense_num == sense),
            default=1,
        )

    # TODO: (#189) Require the presence of a sense once the sense data has been
    # fully populated.
    def sense(self, img: Image) -> str | None:
        assert img.key_word == self.key
        return self.senses.get(img.sense_num, None)

    @functools.cached_property
    def quality(self) -> str:
        quality: str = self.get(sheet.COL.QUALITY)
        ensure.ensure(
            quality in constants.QUALITY,
            self.key,
            "has an invalid value for quality:",
            quality,
        )
        return quality

    @functools.cached_property
    def categories(self) -> list[str]:
        cats: list[str] = text.ssplit(self.get(sheet.COL.CATEGORIES), ",")
        ensure.members(
            cats,
            Crum.known_categories,
            self.key,
            "has unknown categories",
        )
        return cats

    def set_categories(self, cats: abc.Iterable[str]) -> None:
        cats = sorted(cats)
        ensure.members(cats, Crum.known_categories)
        self.update_cell(sheet.COL.CATEGORIES, ", ".join(cats))
        self.categories = cats

    def add_categories(self, cats: abc.Iterable[str]) -> None:
        self.set_categories(set(cats) | set(self.categories))

    @functools.cached_property
    def notes(self) -> str:
        return self.get(sheet.COL.NOTES)

    @cache.run_once
    def _validate_unique_relations(self) -> None:
        # Verify no relation is recorded twice.
        ensure.unique(
            self.relations(),
            "duplicate relations found at",
            self.key,
        )

    def _house(self, col: sheet.COL, container: abc.Container[str]) -> House:
        self._validate_unique_relations()
        verify_relation_symmetry()
        house: House = House(text.ssplit(self.get(col), ";"))
        ensure.ensure(
            self.key not in house,
            self.key,
            "can't be a relation of itself",
        )
        ensure.members(
            [r.key for r in house],
            container,
            self.key,
            "has unknown relations:",
        )
        return house

    @functools.cached_property
    def sisters(self) -> House:
        return self._house(sheet.COL.SISTERS, Crum.roots)

    @functools.cached_property
    def antonyms(self) -> House:
        return self._house(sheet.COL.ANTONYMS, Crum.roots)

    @functools.cached_property
    def homonyms(self) -> House:
        return self._house(sheet.COL.HOMONYMS, Crum.roots)

    @functools.cached_property
    def greek_sisters(self) -> House:
        return self._house(sheet.COL.GREEK_SISTERS, kellia.greek())

    def relations(self) -> abc.Generator[Relation]:
        yield from self.sisters
        yield from self.antonyms
        yield from self.homonyms
        yield from self.greek_sisters

    @property
    def derivations(self) -> list[Derivation]:
        return self._derivations

    @functools.cached_property
    def all_dialects(self) -> list[str]:
        combined: set[str] = set(self.dialects)
        for child in self.derivations:
            combined.update(child.dialects)
        return sorted(combined)

    def drv_html_table(self, explain: bool = True) -> str:
        """Construct the derivations HTML table.

        Args:
            explain: If true, include the meaning, type, and Crum page number.

        Returns:
            A plain HTML table for the derivations.
        """
        return "".join(self.drv_html_table_aux(explain))

    def drv_html_table_aux(self, explain: bool = True) -> abc.Generator[str]:
        if not self.derivations:
            return

        yield '<table class="derivations" id="derivations">'
        yield "<colgroup>"
        for _ in range(_NUM_DRV_COLS):
            yield f'<col style="width: {_HUNDRED/_NUM_DRV_COLS}%;">'
        yield "</colgroup>"

        for d, crum_row_span in zip(self.derivations, self._crum_row_spans()):
            crum, crum_span = crum_row_span
            if not crum_span:
                assert not crum
            if not crum:
                crum_span = 0
            if not explain:
                crum, crum_span = "", 0
            word: str = d.word_parsed_classify()
            word_width: int = int((_NUM_DRV_COLS - d.depth) / 2) if word else 0
            # We keep the meaning column regardless of whether a meaning is
            # actually present. However, if the whole table is to be generated
            # without a meaning, we remove it.
            meaning_width: int = _NUM_DRV_COLS - word_width - d.depth - 1
            if not explain and d.type_name != "HEADER":
                # Skip the English.
                meaning_width = 0
            assert word_width or meaning_width
            key: str = f'<span class="drv-key">{d.key}</span>'
            # New row.
            yield f'<tr id="drv{d.key}" class="drv">'
            # Margin.
            yield f'<td colspan="{d.depth}"></td>' if d.depth else ""
            # Word.
            if word_width:
                yield f'<td colspan="{word_width}" class="marcion">'
                yield word
                if not meaning_width:
                    yield key
                yield "</td>"
            # Meaning.
            if meaning_width:
                yield f'<td colspan="{meaning_width}" class="meaning">'
                if d.type_name not in ["-", "HEADER"]:
                    yield '<span class="part-of-speech">'
                    yield "(<b>"
                    yield d.type_name
                    yield "</b>)"
                    yield "</span>"
                yield d.meaning
                yield key
                yield "</td>"
            if crum_span:
                yield f'<td rowspan="{crum_span}" class="dictionary">'
                yield f'<span class="crum-page">{crum}</span>'
                yield "</td>"

            # End row.
            yield "</tr>"
        yield "</table>"

    def drv_html_list(self) -> str:  # dead: disable
        return "".join(self.drv_html_list_aux())

    def drv_html_list_aux(self) -> abc.Generator[str]:
        if not self.derivations:
            return

        yield "<ul>"

        depth: int = 0
        for d in self.derivations:
            while d.depth > depth:
                yield "<li>"
                yield "<ul>"
                depth += 1
            while d.depth < depth:
                yield "</ul>"
                yield "</li>"
                depth -= 1
            word: str = d.word_parsed_prettify()
            meaning: str = d.meaning
            assert word or (d.type_name == "HEADER" and meaning)
            if d.type_name and d.type_name not in ["-", "HEADER"]:
                meaning = f"({d.type_name}) {meaning}"
            yield "<li>"
            yield page.LINE_BREAK.join(filter(None, [word, meaning]))
            yield "</li>"

        while depth > 0:
            yield "</ul>"
            yield "</li>"
            depth -= 1
            yield "</ul>"

    def _crum_row_spans(self) -> abc.Generator[tuple[str, int]]:
        crum_column: list[str] = [
            d.get(sheet.COL.CRUM) for d in self.derivations
        ]
        for group in itertools.groupby(crum_column):
            crum = group[0]
            repetitions = len(list(group[1]))
            yield (crum, repetitions)
            for _ in range(repetitions - 1):
                yield ("", 0)

    def note(self, dialects: set[str] | None = None) -> deck.Note:
        return deck.Note(
            key=self.key,
            front=self._front,
            back=self._back,
            title=self.title(),
            nxt=f"{Crum.next_key(self)}.html",
            prv=f"{Crum.prev_key(self)}.html",
            search=SEARCH,
            js_start=javascript.dialects_js(dialects or set()),
            js_path=JS,
            css=CSS,
        )

    @functools.cached_property
    def _front(self) -> str:
        return "".join(self._front_aux())

    def _front_aux(self) -> abc.Generator[str]:
        # Header.
        # TODO: (#203) The header should be mostly implemented in TypeScript,
        # rather than hardcoded in the HTML.
        # Open the table.
        yield '<table id="header">'
        yield "<tr>"
        # Home
        yield '<td><a class="navigate" href="../">Home</a></td>'
        # Contact
        yield "<td>"
        yield '<span id="reports">'
        yield "Reports"
        yield "</span>"
        yield "</td>"
        # Prev
        yield "<td>"
        prev = Crum.prev_key(self)
        if prev:
            yield f'<a class="navigate" href="{prev}.html">⇐</a>'
        del prev
        yield "</td>"
        # Key.
        yield "<td>"
        yield f'<a class="navigate" id="key" href="{self.key}.html">'
        yield numeral.coptic(self.num)
        yield "</a>"
        yield "</td>"
        # Next
        yield "<td>"
        nxt = Crum.next_key(self)
        if nxt:
            yield f'<a class="navigate" href="{nxt}.html">⇒</a>'
        del nxt
        yield "</td>"
        # Reset.
        yield "<td>"
        yield '<span class="reset">Reset</span>'
        yield "</td>"
        # Dev.
        yield "<td>"
        yield '<span class="developer">Dev</span>'
        yield "</td>"
        # Close the table.
        yield "</tr>"
        yield "</table>"

        # The word.
        yield '<div id="pretty" class="pretty">'
        # TODO: (#338) Parentheses should be used at the source. This is not a
        # clean way to do it.
        yield self.word_parsed_prettify().replace("{", "(").replace("}", ")")
        yield "</div>"

    @functools.cached_property
    def _back(self) -> str:
        return "".join(self._back_aux())

    def _back_aux(self) -> abc.Generator[str]:
        # Meaning
        yield '<div id="root-type-meaning" class="root-type-meaning">'
        yield '<span id="root-part-of-speech" class="part-of-speech">'
        yield "(<b>"
        yield self.type_name
        yield "</b>)"
        yield "</span>"

        if self.categories:
            yield '<div id="categories" class="categories">'
            yield ", ".join(self.categories)
            yield "</div>"
        if self.meaning:
            yield '<div id="meaning" class="meaning">'
            yield self.meaning
            yield "</div>"
        yield "</div>"

        # Images.
        if self.images:
            yield '<div id="images" class="images">'
            for img in self.images:
                yield from _img_aux(
                    id_=f"explanatory{img.stem}",
                    cls="explanatory",
                    alt=img.alt,
                    path=relpath(img.dst_path),
                    caption=img.caption(self.sense(img)),
                )
            yield "</div>"

        # Editor's notes.
        if self.notes:
            yield '<div id="notes" class="notes">'
            yield "<i>Editor's note: </i>"
            yield self.notes
            yield "</div>"

        # Senses.
        if self.senses:
            yield '<div id="senses" class="senses">'
            yield ", ".join(
                f'<span class="sense" id="sense{k}">'
                + f"{k}: {self.senses[k]}"
                + "</span>"
                for k in sorted(self.senses.keys(), key=int)
            )
            yield "</div>"

        # Quality.
        yield '<div id="quality" class="quality">'
        yield self.quality
        yield "</div>"

        # Derivations.
        # TODO: (#338) Parentheses should be used at the source. This is not a
        # clean way to do it.
        yield self.drv_html_table().replace("{", "(").replace("}", ")")

        # Wiki.
        if self.has_wiki_canonical_entries():
            yield '<div class="wiki" id="wiki">'
            yield self.wiki_html
            yield "</div>"

        # Sisters.
        if (
            self.sisters
            or self.greek_sisters
            or self.antonyms
            or self.homonyms
        ):
            yield '<div id="sisters" class="sisters">'
            before: bool = False
            if self.sisters:
                yield "<i>See also: </i>"
                yield '<table class="sisters-table">'
                yield from _mother().gather_aux(self.sisters)
                yield "</table>"
                before = True
            if self.greek_sisters:
                if before:
                    yield page.LINE_BREAK
                yield "<i>Greek: </i>"
                yield '<table class="sisters-table">'
                yield from _stepmother().gather_aux(self.greek_sisters)
                yield "</table>"
                before = True
            if self.antonyms:
                if before:
                    yield page.LINE_BREAK
                yield "<i>Opposite: </i>"
                yield '<table class="sisters-table">'
                yield from _mother().gather_aux(self.antonyms)
                yield "</table>"
                before = True
            if self.homonyms:
                if before:
                    yield page.LINE_BREAK
                yield "<i>Homonyms: </i>"
                yield '<table class="sisters-table">'
                yield from _mother().gather_aux(self.homonyms)
                yield "</table>"
                before = True
            yield "</div>"
            del before


class Crum:
    """Crum Database."""

    @cache.StaticProperty
    @staticmethod
    def keys() -> set[str]:
        return {r.key for r in Crum.roots.values()}

    @cache.StaticProperty
    @staticmethod
    def nums() -> set[int]:
        return {r.num for r in Crum.roots.values()}

    @cache.StaticProperty
    @staticmethod
    def roots() -> dict[str, Root]:
        """Retrieve a shared, static snapshot of the roots.

        Returns:
            A shared, static snapshot of the roots.
        """
        return Crum.roots_live()

    @cache.StaticProperty
    @staticmethod
    def known_categories() -> dict[str, str]:
        cats: dict[str, str] = {}
        for categories in yaml.safe_load(file.read(_CATEGORIES_PATH)).values():
            for name, description in categories.items():
                ensure.ensure(name not in cats, "Duplicate key found:", name)
                cats[name] = description
        return cats

    @cache.StaticProperty
    @staticmethod
    def images_by_key() -> dict[str, list[Image]]:
        stems: list[str] = list(
            map(file.stem, os.listdir(constants.IMG_SRC_DIR)),
        )
        ensure.unique(stems)
        ensure.equal_sets(
            stems,
            map(file.stem, os.listdir(constants.SOURCES_DIR)),
        )
        ensure.equal_sets(
            stems,
            map(file.stem, os.listdir(paths.CRUM_EXPLANATORY_DIR)),
        )
        return {
            key: list(group)
            for key, group in itertools.groupby(
                sorted(map(Image, os.listdir(constants.IMG_SRC_DIR))),
                lambda img: img.key_word,
            )
        }

    # TODO: (#399) Retrieving a fresh version of the sheet will become
    # unnecessary if your interface is capable of updating the local copy
    # whenever the origin is updated.
    # In general, any update method in your interface should both update the
    # sheet (a.k.a. origin or source of truth), as well as the local snapshot.
    # This way, retrieving a new copy is unnecessary, and you can remove this
    # method.
    @staticmethod
    def roots_live() -> dict[str, Root]:
        """Retrieve a fresh snapshot of the roots.

        Returns:
            A fresh snapshot of the roots.
        """
        derivations: dict[str, Derivation] = {}

        # NOTE: In order for this method to work properly, derivations must be
        # provided in sorted order—a parent derivation must always precede its
        # children.
        def depth(derivation: gcp.Record) -> int:
            key_deriv: str = derivation.row[sheet.COL.KEY_DERIV.value]
            if key_deriv == "0":
                # This derivation has no parents.
                return 0
            d: int = 1 + derivations[key_deriv].depth  # noqa: F821
            assert d <= constants.MAX_DERIVATION_DEPTH
            return d

        by_key_word: collections.defaultdict[str, list[Derivation]] = (
            collections.defaultdict(list)
        )
        for record in sheet.derivations():
            d: Derivation = Derivation(
                record.row_num,
                record.row,
                depth(record),
            )
            derivations[d.key] = d
            by_key_word[d.key_word].append(d)
        # This object was needed to calculate depths, but is no longer required.
        del derivations

        roots: dict[str, Root] = {}
        for record in sheet.roots():
            key: str = record.row[sheet.COL.KEY.value]
            roots[key] = Root(
                record.row_num,
                record.row,
                by_key_word.pop(key, []),
            )

        ensure.ensure(
            not by_key_word,
            "some derivations are not consumed into any roots:",
            list(by_key_word.values()),
        )
        ensure.ensure(
            len(roots) <= constants.MAX_NUM_ROOTS,
            "Got",
            len(roots),
            "roots! Expecting <=",
            constants.MAX_NUM_ROOTS,
        )
        return roots

    @staticmethod
    def _assert_valid_key(key: int) -> None:
        assert constants.MIN_KEY <= key <= constants.MAX_KEY
        assert key in Crum.nums

    @staticmethod
    def next_num(root: Root) -> int | None:
        if root.num == constants.MAX_KEY:
            return None
        nxt: int = root.num + 1
        while nxt not in Crum.nums:
            nxt += 1
        Crum._assert_valid_key(nxt)
        return nxt

    @staticmethod
    def prev_num(root: Root) -> int | None:
        if root.num == constants.MIN_KEY:
            return None
        prv: int = root.num - 1
        while prv not in Crum.nums:
            prv -= 1
        Crum._assert_valid_key(prv)
        return prv

    @staticmethod
    def next_key(root: Root) -> str:
        return str(Crum.next_num(root) or constants.MIN_KEY)

    @staticmethod
    def prev_key(root: Root) -> str:
        return str(Crum.prev_num(root) or constants.MAX_KEY)


@cache.run_once
def verify_relation_symmetry() -> None:
    # Validate relation symmetry.
    # Normally, we validate data right before retrieval.
    # This is difficult to do for relation symmetry due to their recursive
    # nature. (If X and Y are relations, then you need to retrieve Y's relations
    # in order to validate X's, and you need to retrieve X's relations in order
    # to validate Y's.) So we centralize validation, instead of performing it
    # during retrieval.
    for r in Crum.roots.values():
        # The sister relation is symmetric.
        assert all(r.key in Crum.roots[s.key].sisters for s in r.sisters)
        # The antonym relation is symmetric.
        assert all(r.key in Crum.roots[a.key].antonyms for a in r.antonyms)
        # The homonym relation is symmetric.
        assert all(r.key in Crum.roots[h.key].homonyms for h in r.homonyms)


@cache.run_once
def _verify_wiki_keys() -> None:
    for key, wikis in wiki.by_marcion_key().items():
        ensure.ensure(
            key in Crum.roots,
            "Unknown Marcion key:",
            key,
            "for entries:",
            wikis,
        )


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
        # TODO: (#366) Stop using fragments.
        return f"#:~:text={self.fragment.replace(" ", "%20")}"

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
        yield '<span hidden="" class="sister-key">'
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

    def gather_aux(self, relations: House) -> abc.Generator[str]:
        for r in relations:
            yield from self.with_frag(
                self.key_to_sister[r.key],
                r.fragment,
            ).html_aux()


# TODO: (#203) The header should be fully defined in TypeScript.
class HeaderCell:
    """HeaderCell represents a cell in the header table."""

    def __init__(self, title: str, link: str) -> None:
        self.title: str = title
        self.link: str = link

    def td(self) -> abc.Generator[str]:
        yield "<td>"
        yield f'<a class="navigate" href="{self.link}">{self.title}</a>'
        yield "</td>"


class Headerer:
    """Headerer can be used to generate a header."""

    def __init__(self, base_cells: list[HeaderCell]) -> None:
        self.cells: list[HeaderCell] = base_cells

    def header(self) -> str:
        return "".join(self.header_aux())

    def header_aux(self) -> abc.Generator[str]:
        yield '<table id="header" class="header">'
        yield "<tr>"
        for cell in self.cells:
            yield from cell.td()
        yield "</tr>"
        yield "</table>"


def file_name(title: str) -> str:
    """Return the file name of an index.

    Args:
        title: Index title.

    Returns:
        A suitable stem.
    """
    return title.replace("/", "_").lower()


class Index:
    """Index is a single Deck index."""

    def __init__(
        self,
        title: str,
        count: int,
        body: abc.Generator[str],
    ) -> None:
        self.title: str = title
        self.count: int = count
        self.body: abc.Generator[str] = body

    def basename(self) -> str:
        return file_name(self.title) + ".html"

    def write(self, dir_: str | pathlib.Path, head: str, header: str) -> None:
        file.writelines(
            page.html_aux(head, INDEX_CLASS, header, *self.body),
            os.path.join(dir_, self.basename()),
            report=False,
        )


class IndexIndex:
    """IndexIndex is an index of deck indexes."""

    def __init__(self, name: str, indexes: list[Index]) -> None:
        self.name: str = name
        self.indexes: list[Index] = indexes

        cells: list[HeaderCell] = []
        cells.append(HeaderCell("Home", HOME))
        cells.append(HeaderCell("Search", SEARCH))
        self.header: str = Headerer(cells).header()
        # The subindex header is the same as the index header, with one extra
        # cell pointing to the index that this subindex belongs to.
        cells.append(HeaderCell(self.name, self._basename()))
        self.subindex_header: str = Headerer(cells).header()
        del cells

    def _basename(self) -> str:
        return file_name(self.name) + ".html"

    def _iter_subindex_heads(self) -> abc.Generator[str]:
        for i, index in enumerate(self.indexes):
            prv = self.indexes[i - 1].basename() if i > 0 else ""
            nxt = (
                self.indexes[i + 1].basename()
                if i < len(self.indexes) - 1
                else ""
            )
            yield page.html_head(
                title=index.title,
                search=SEARCH,
                scripts=[JS],
                prev_href=prv,
                next_href=nxt,
                css=CSS,
            )

    def _write_subindex(
        self,
        args: tuple[str | pathlib.Path, Index, str],
    ) -> None:
        dir_, subindex, head = args
        subindex.write(dir_, head, self.subindex_header)

    def write(self, dir_: str | pathlib.Path):
        # A subindex header includes a link to the index that contains
        # this subindex.
        with concur.thread_pool_executor() as executor:
            _ = list(
                executor.map(
                    self._write_subindex,
                    zip(
                        [dir_] * len(self.indexes),
                        self.indexes,
                        self._iter_subindex_heads(),
                    ),
                ),
            )

        # Write the index index!
        head: str = page.html_head(
            title=self.name,
            search=SEARCH,
            scripts=[JS],
            css=CSS,
        )

        file.writelines(
            page.html_aux(
                head,
                INDEX_INDEX_CLASS,
                *self.header,
                *self._body_aux(),
            ),
            os.path.join(dir_, self._basename()),
            report=False,
        )

    def _body_aux(self) -> abc.Generator[str]:
        yield f"<h1>{self.name}</h1>"
        yield '<ol class="index-index-list">'
        for index in self.indexes:
            yield '<li class="index-view">'
            yield f'<a class="navigate" \
                    href="{index.basename()}">'
            yield index.title
            yield "</a>"
            yield f' <span class="index-count">({index.count})</span>'
            yield "</li>"
        yield "</ol>"


class Indexer(Mother):
    """CrumIndexer generates indexes and index indexes for Crum's
    dictionary."""

    def _generate_index_body_aux(
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

    def _generate_indexes(
        self,
        keys: list[str],
        indexes: list[list[str]],
    ) -> list[Index]:
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
            Index(
                index_name,
                len(keys),
                self._generate_index_body_aux(index_name, keys),
            )
            for index_name, keys in sorted(
                index_to_keys.items(),
                key=lambda pair: pair[0],
            )
        ]

    def generate_indexes(self) -> list[IndexIndex]:
        keys: list[str] = []
        types: list[list[str]] = []
        categories: list[list[str]] = []
        for _, root in Crum.roots.items():
            keys.append(root.key)
            types.append([root.type_name])
            categories.append(root.categories)

        return [
            IndexIndex("Categories", self._generate_indexes(keys, categories)),
            IndexIndex("Types", self._generate_indexes(keys, types)),
        ]


@functools.cache
def _key_to_sister() -> dict[str, Sister]:
    return {
        root.key: Sister(
            root.key,
            page.no_line_breaks(
                root.word_parsed_classify(include_references=False),
            ),
            root.meaning,
            root.type_name,
        )
        for _, root in Crum.roots.items()
    }


@functools.cache
def _mother() -> Mother:
    return Mother(_key_to_sister(), SisterWithFrag)


@functools.cache
def _stepmother() -> Mother:
    # NOTE: TLA sister elements possess IDs that are often identical, which
    # we remove here in order to avoid having HTML element ID conflicts,
    # given that, in this view, we can include several TLA entries in the
    # same HTML page.
    key_to_stepsister = {
        key: Sister(
            key,
            page.no_ids(word.orthstring.table()),
            page.no_ids(word.merge_langs().table()),
            "",
        )
        for key, word in kellia.greek().items()
    }
    return Mother(key_to_stepsister, StepsisterWithFrag)


@functools.cache
def indexer() -> Indexer:
    return Indexer(_key_to_sister(), SisterWithFrag)


def notes_aux(dialects: set[str] | None = None) -> abc.Generator[deck.Note]:
    for _, root in Crum.roots.items():
        if dialects and not dialects.intersection(root.all_dialects):
            continue
        yield root.note(dialects)


# Xooxle search will work fine even if we don't retain any HTML tags, because it
# relies entirely on searching the text payloads of the HTML. However, we retain
# the subset of the classes that are needed for highlighting, in order to make
# the Xooxle search results pretty.

_CRUM_RETAIN_CLASSES: set[str] = {
    "word",
    "dialect",
    "spelling",
    "type",
    "roman",
    "heading",
    "greek",
} | set(constants.DIALECTS)

_CRUM_RETAIN_ELEMENTS_FOR_CLASSES = {"comma"}

XOOXLE: xooxle.Xooxle = xooxle.Xooxle(
    source=notes_aux,
    extract=[
        xooxle.Selector({"name": "title"}, force=False),
        xooxle.Selector({"id": "header"}, force=False),
        xooxle.Selector({"class_": "dictionary"}, force=False),
        xooxle.Selector({"class_": "crum-page"}, force=False),
        xooxle.Selector({"class_": "drv-key"}, force=False),
        xooxle.Selector({"id": "images"}, force=False),
        xooxle.Selector({"class_": "nag-hammadi"}, force=False),
        xooxle.Selector({"class_": "sisters"}, force=False),
        xooxle.Selector({"id": "categories"}, force=False),
        xooxle.Selector({"id": "quality"}),
        xooxle.Selector({"id": "senses"}, force=False),
        xooxle.Selector({"class_": "footnote"}, force=False),
        xooxle.Selector({"class_": "mark"}, force=False),
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
            # TODO: (#578) Import class names from Wiki, instead of duplicating
            # them below.
            retain_classes={
                "wiki",
                "dialect",
                "headword",
                "bullet",
                "coptic",
                "greek",
                "arabic",
                "amharic",
                "hebrew",
                "aramaic",
                "demotic",
                "hieroglyphic",
                "gloss",
                "subparagraph",
                "manual",
                "addendum",
            },
            unit_tags={"p"},
            retain_tags=xooxle.RETAIN_TAGS_DEFAULT | {"p"},
            retain_attributes={"data-key", "data-page"},
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
            retain_classes=_CRUM_RETAIN_CLASSES | {"part-of-speech"},
            retain_attributes={"href", "target"},
            retain_tags=xooxle.RETAIN_TAGS_DEFAULT | {"a"},
            retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            unit_tags={"tr", "div", "hr"},
            block_elements=xooxle.BLOCK_ELEMENTS_DEFAULT | {"td"},
            # We would like to separate the part of speech from the meaning, so
            # the meaning will occupy its own line. This is useful for the
            # ranking algorithm, which takes into consideration the distance
            # between the match and the beginning-of-line.
            # We don't need to treat this as a block class for the root
            # field (called "marcion") because the HTML already produces a <br>
            # tag.
            # TODO: (#398) Handle this in a cleaner manner. The root and
            # derivations HTML should be uniform.
            block_classes={"part-of-speech"},
        ),
    ],
    layers=[["marcion", "meaning", "appendix"], ["wiki"]],
    output=paths.LEXICON_DIR / "crum.json",
)
