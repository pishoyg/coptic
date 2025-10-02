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


# The types below define the schema of the index.
class BookInfo(typing.TypedDict):
    title: str
    crum: list[str]


SectionInfo: typing.TypeAlias = list[BookInfo]
TestamentInfo: typing.TypeAlias = dict[str, SectionInfo]
BibleInfo: typing.TypeAlias = dict[str, TestamentInfo]

# pylint: enable=invalid-name
