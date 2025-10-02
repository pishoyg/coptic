"""This package defines the structure of the input JSON."""

# pylint: disable=invalid-name
import typing


class ColoredWord(typing.TypedDict):
    """ColoredWord represents a colored word in a verse."""

    word: str
    light: str
    dark: str


class Verse(typing.TypedDict):
    """Verse represents a verse entry in a chapter."""

    Bohairic: str
    Akhmimic: str
    Fayyumic: str
    OldBohairic: str
    Mesokemic: str
    DialectP: str
    Lycopolitan: str
    Greek: str
    English: str
    Sahidic: str
    verseNumber: str
    coloredWords: list[ColoredWord]
    italicWords: list[str]


class Chapter(typing.TypedDict):
    """Chapter represents a chapter."""

    sectionNameEnglish: str
    sectionNameBohairic: str
    sectionNameSahidic: str
    bookAbbreviation: str
    sectionId: str
    data: list[Verse]


Book: typing.TypeAlias = list[Chapter]
# pylint: enable=invalid-name
