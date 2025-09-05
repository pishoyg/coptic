"""Parse Crum's dictionary."""

import collections
import functools
import itertools
import json
import typing
from collections import abc

import gspread

from dictionary.marcion_sourceforge_net import categories as cat
from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from dictionary.marcion_sourceforge_net import parse, sheet
from utils import cache, ensure, gcp, log, page, text

_NUM_DRV_COLS: int = 10
_HUNDRED: int = 100
assert not _HUNDRED % _NUM_DRV_COLS


# TODO: (#399): Export images as part of this interface, instead of relying on
# users querying the image directory directly.
# TODO: (#399) Move image validation from the images helper to this file.
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
        num: int = int(self.key)
        assert constants.MIN_KEY <= num <= constants.MAX_KEY
        return num

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
            self.get(sheet.COL.WORD),
            self.grammatical_type,
            self.root,
            detach_types=False,
            use_coptic_symbol=False,
            normalize_optional=False,
            normalize_assumed=False,
        )

    def word_parsed_classify(self) -> str:
        return page.html_line_breaks(
            "\n".join(w.string(classify=True) for w in self.parsing_1),
        )

    @functools.cached_property
    def parsing_2(self) -> list[lex.Line]:
        return parse.parse_word_cell(
            self.get(sheet.COL.WORD),
            self.grammatical_type,
            self.root,
            detach_types=True,
            use_coptic_symbol=True,
            normalize_optional=True,
            normalize_assumed=True,
        )

    def word_parsed_prettify(self) -> str:
        return page.html_line_breaks(
            "\n".join(
                w.string(append_root_type=True, classify=True)
                for w in self.parsing_2
            ),
        )

    @functools.cached_property
    def meaning(self) -> str:
        return page.html_line_breaks(
            parse.parse_english_cell(self.get(sheet.COL.EN)),
        )

    @functools.cached_property
    def dialects(self) -> list[str]:
        line_dialects: list[list[str] | None] = [
            w.dialects() for w in self.parsing_2
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
    def crum(self) -> lex.CrumPage:
        return lex.CrumPage(self.get(sheet.COL.CRUM))


# NOTE: As of now, derivations are somewhat of second-class citizens in our
# database. Many of the methods defined under `Root` may belong under the base
# class `Row if the derivations were to acquire additional properties.
class Derivation(Row):
    """Derivation represents a derivation row."""

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
        return sheet.DERIVATIONS

    @functools.cached_property
    def key_word(self) -> str:
        return self.get(sheet.COL.KEY_WORD)


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


class Root(Row):
    """Root represents a root row."""

    @typing.override
    @classmethod
    def worksheet(cls) -> gspread.worksheet.Worksheet:
        return sheet.ROOTS

    def __init__(
        self,
        row_num: int,
        row: abc.Mapping[str, str | int | float],
        derivations: abc.Iterable[Derivation],
    ) -> None:
        super().__init__(row_num, row, root=True)
        self._derivations: list[Derivation] = list(derivations)
        assert all(d.key_word == self.key for d in self._derivations)

    @functools.cached_property
    def wiki(self) -> str:
        return self.get(sheet.COL.WIKI)

    @functools.cached_property
    def wiki_wip(self) -> str:
        return self.get(sheet.COL.WIKI_WIP)

    @typing.override
    def update(self, col_name: str, value: str) -> bool:
        if super().update(col_name, value):
            log.info("Updated", col_name, "under", self.key)
            return True
        return False

    def has_complete_wiki(self) -> bool:
        return bool(self.wiki and not self.wiki_wip)

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
    def crum_page_range(self) -> str:
        # TODO: (#399) Consider returning page objects instead of a string.
        # Same for Dawoud!
        pages: list[lex.CrumPage] = [d.crum for d in self.tree()]
        pages = list(filter(None, pages))
        # TODO: (#0) Some crum words have derivations that are not sorted! This
        # is confusing! Investigate!
        pages = sorted(pages)
        if not pages:
            assert not self.crum_last_page
            return ""
        assert all(pages)
        first: lex.CrumPage = pages[0]
        last: lex.CrumPage = self.crum_last_page or pages[-1]
        if first == last:
            return str(ensure.singleton(pages))
        return f"{first}-{last}"

    @functools.cached_property
    def senses(self) -> dict[int, str]:
        # TODO: (#189) Once all senses are present, don't allow the field to be
        # absent.
        raw: str = self.get(sheet.COL.SENSES)
        if not raw:
            return {}
        parsed: dict[str, str] = json.loads(raw)
        del raw
        senses: dict[int, str] = {int(k): v for k, v in parsed.items()}
        del parsed
        ensure.unique(senses.keys())
        ensure.unique(senses.values())
        ensure.ensure(
            min(senses.keys()) == 1 and max(senses.keys()) == len(senses),
            self.key,
            "has a gap in senses!",
        )
        return senses

    @functools.cached_property
    def quality(self) -> str:
        quality: str = self.get(sheet.COL.QUALITY)
        assert quality in constants.QUALITY
        return quality

    @functools.cached_property
    def crum_last_page(self) -> lex.CrumPage:
        return lex.CrumPage(self.get(sheet.COL.CRUM_LAST_PAGE))

    @functools.cached_property
    def dawoud_pages(self) -> str:
        # TODO: (#399) Validate Dawoud pages.
        return self.get(sheet.COL.DAWOUD_PAGES)

    @functools.cached_property
    def categories(self) -> list[str]:
        cats: list[str] = text.ssplit(self.get(sheet.COL.CATEGORIES), ",")
        ensure.members(
            cats,
            cat.KNOWN_CATEGORIES,
            self.key,
            "has unknown categories",
        )
        return cats

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

    def _house(
        self,
        col: sheet.COL,
        container: abc.Container[str] | None,
    ) -> House:
        self._validate_unique_relations()
        verify_relation_symmetry()
        house: House = House(text.ssplit(self.get(col), ";"))
        ensure.ensure(
            self.key not in house,
            self.key,
            "can't be a relation of itself",
        )
        if container is not None:
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
        # TODO: (#271): Add validation for Greek sisters as well.
        return self._house(sheet.COL.GREEK_SISTERS, None)

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

    def tree(self) -> abc.Generator[Row]:
        yield self
        yield from self.derivations

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
            hyperlink = (
                f'<span hidden="" class="drv-key dev right">{d.key}</span>'
            )
            # New row.
            yield f'<tr id="drv{d.key}" class="drv">'
            # Margin.
            yield f'<td colspan="{d.depth}"></td>' if d.depth else ""
            # Word.
            if word_width:
                yield f'<td colspan="{word_width}" class="marcion bordered">'
                yield word
                if not meaning_width:
                    yield hyperlink
                yield "</td>"
            # Meaning.
            if meaning_width:
                yield f'<td colspan="{meaning_width}" class="meaning bordered">'
                if d.type_name not in ["-", "HEADER"]:
                    yield f"<b>({d.type_name})</b><br/>"
                yield d.meaning
                yield hyperlink
                yield "</td>"
            if crum_span:
                yield f'<td rowspan="{crum_span}" class="dictionary bordered">'
                yield "<b>Crum: </b>"
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
            meaning: str = parse.lighten_greek(d.meaning)
            assert word or (d.type_name == "HEADER" and meaning)
            if d.type_name and d.type_name not in ["-", "HEADER"]:
                meaning = f"({d.type_name}) {meaning}"
            yield "<li>"
            yield "<br/>".join(filter(None, [word, meaning]))
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
        derivations: dict[str, Derivation] = {}

        # NOTE: In order for this method to work properly, derivations must be
        # provided in sorted order—a parent derivation must always precede its
        # children.
        def depth(derivation: gcp.Record) -> int:
            key_deriv: str = derivation.row[sheet.COL.KEY_DERIV.value]
            if key_deriv == "0":
                # This derivation has no parents.
                return 0
            d: int = 1 + derivations[key_deriv].depth
            assert d <= constants.MAX_DERIVATION_DEPTH
            return d

        for record in sheet.derivations():
            d: Derivation = Derivation(
                record.row_num,
                record.row,
                depth(record),
            )
            derivations[d.key] = d

        by_key_word: collections.defaultdict[str, list[Derivation]] = (
            collections.defaultdict(list)
        )
        for d in derivations.values():
            by_key_word[d.key_word].append(d)

        roots: dict[str, Root] = {}
        for record in sheet.roots():
            key: str = record.row[sheet.COL.KEY.value]
            roots[key] = Root(record.row_num, record.row, by_key_word[key])

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
    def next_key(root: Root) -> str | None:
        num: int | None = Crum.next_num(root)
        return None if num is None else str(num)

    @staticmethod
    def prev_key(root: Root) -> str | None:
        num: int | None = Crum.prev_num(root)
        return None if num is None else str(num)


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
