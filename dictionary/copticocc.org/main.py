#!/usr/bin/env python3

import typing

import utils

COPTIC = "docs/dawoud/coptic.tsv"
ARABIC = "docs/dawoud/arabic.tsv"
GREEK = "docs/dawoud/greek.tsv"


COPTIC_LETTERS: list[list[str]] = [
    ["Ⲁ", "ⲱ"],
    ["Ⳉ", "ⳉ"],
    ["Ϣ", "ϯ"],
]


class word:
    _mapping: dict[str, str] = {}

    def __init__(self, word: str):
        self.word = word.lower()
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
            for start, end in COPTIC_LETTERS
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
    def __init__(self, num: int, s: str, e: str) -> None:
        self.num: int = num
        self.start: word = word(s)
        self.end: word = word(e)


# TODO: Expect headers. Use pandas to read the TSV.
def read_tsv(path: str) -> typing.Generator[page]:
    with open(path) as f:
        for line in f.readlines():
            num, s, e = map(str.strip, line.split("\t"))
            yield page(int(num), s, e)


def valid(a: word, b: word) -> bool:
    if not a.word or not b.word:
        # Skip check, since we now allow empty entries.
        return True
    return a.leq(b)


def validate(sheet: str):
    pages: list[page] = list(read_tsv(sheet))
    for idx, p in enumerate(pages):
        if not valid(p.start, p.end):
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
        if not valid(prev.end, p.start):
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
    validate(COPTIC)
    validate(ARABIC)
    validate(GREEK)


if __name__ == "__main__":
    main()
