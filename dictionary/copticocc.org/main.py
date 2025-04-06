#!/usr/bin/env python3

import os
import typing

import pandas as pd

import utils

_DIR = "docs/dawoud"
_COPTIC = "coptic.tsv"
_ARABIC = "arabic.tsv"
_GREEK = "greek.tsv"
# TODO: Add validation for the Arabic index.
_ALL = [_COPTIC, _ARABIC, _GREEK]

# The Arabic sheet is not yet mature enough for validation.
_COPTIC_LETTERS: list[list[str]] = [
    ["Ⲁ", "ⲱ"],
    ["Ⳉ", "ⳉ"],
    ["Ϣ", "ϯ"],
]
_COLUMNS = ["page", "start", "end"]


class word:
    _mapping: dict[str, str] = {}

    def __init__(self, word: str):
        self.word = word.lower()
        del word
        # Verify that the word consists purely of Coptic letters.
        assert self.word
        mapping = self._get_mapping()
        assert all(c in mapping for c in self.word), self.word
        self.mapped = self._map(self.word)

    def leq(self, other: "word") -> bool:
        return self.mapped <= other.mapped

    @classmethod
    def is_coptic_word(cls, word: str) -> bool:
        return all(c in cls._get_mapping() for c in word)

    @classmethod
    def _map(cls, word: str) -> str:
        mapping = cls._get_mapping()
        return "".join(mapping.get(c, c) for c in word)

    @classmethod
    def _get_mapping(cls) -> dict[str, str]:
        if not cls._mapping:
            cls._mapping = cls._build_mapping()
        return cls._mapping

    @classmethod
    def _build_mapping(cls) -> dict[str, str]:
        letters = [
            char
            for start, end in _COPTIC_LETTERS
            for char in cls._between(start, end)
        ]
        return {char: chr(ord("a") + i) for i, char in enumerate(letters)}

    @staticmethod
    def _between(a: str, b: str) -> list[str]:
        return [chr(i) for i in range(ord(a), ord(b) + 1)]

    def __str__(self) -> str:
        return self.word


class dawoud_word(word):
    def leq(self, other: "word") -> bool:
        if self._ou(self) == self._ou(other):
            return super().leq(other)
        if not self._o(self) or not self._o(other):
            return super().leq(other)
        return not self._ou(self)

    @staticmethod
    def _o(w: word) -> bool:
        return w.word.startswith("ⲟ")

    @staticmethod
    def _ou(w: word) -> bool:
        return w.word.startswith("ⲟⲩ")


class page:
    def __init__(self, num: int, s: word, e: word) -> None:
        self.num: int = num
        self.start: word = s
        self.end: word = e


class validator:
    @staticmethod
    def read_tsv(
        path: str,
        w: typing.Callable[[str], word],
    ) -> typing.Generator[page]:
        df: pd.DataFrame = utils.read_tsv(path)
        assert list(df.columns[0:3]) == _COLUMNS, df.columns
        for _, row in df.iterrows():
            yield page(int(row["page"]), w(row["start"]), w(row["end"]))

    # TODO: (#405): Force the input to be sorted once you have figured out the few
    # messed up entries.
    @staticmethod
    def validate(sheet: str, w: typing.Callable[[str], word]):
        pages: list[page] = list(validator.read_tsv(sheet, w))
        for idx, p in enumerate(pages):
            # Verify that the words are sorted lexicographically.
            if not p.start.leq(p.end):
                utils.error(
                    "page",
                    p.num,
                    "has messed up columns",
                    p.start,
                    "and",
                    p.end,
                )
            if not idx:
                continue
            prev = pages[idx - 1]
            # Verify the page numbers are consecutive.
            assert p.num == prev.num + 1, p.num
            # Verify that the words are sorted lexicographically.
            if not prev.end.leq(p.start):
                utils.error(
                    p.start,
                    "on page",
                    p.num,
                    "is smaller than",
                    prev.end,
                    "on page",
                    prev.num,
                )


def main():
    assert all(os.path.isfile(os.path.join(_DIR, sheet)) for sheet in _ALL)
    validator.validate(os.path.join(_DIR, _COPTIC), dawoud_word)
    validator.validate(os.path.join(_DIR, _GREEK), word)


if __name__ == "__main__":
    main()
