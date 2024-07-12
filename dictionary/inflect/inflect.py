import enum
import re

import type_enforced

from dictionary.inflect import constants

COPTIC_ONLY_BLOCK = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ]+")


class Type(enum.Enum):
    NOUN_MASCULINE = 11
    NOUN_FEMININE = 12
    NOUN_PLURAL = 13
    NOUN_MASCULINE_OR_FEMININE = 14
    NOUN_UNKNOWN_GENDER = 15
    NOUN_NO_ARTICLE = 16  # Likely not prefix-inflectable.

    VERB_INFINITIVE = 21
    VERB_PRENOMINAL = 22
    VERB_PRONOMINAL = 23
    VERB_QUALITATIVE = 24
    VERB_IMPERATIVE = 25  # Likely not inflectable.

    def is_noun(self):
        return self in [
            self.NOUN_MASCULINE,
            self.NOUN_FEMININE,
            self.NOUN_PLURAL,
            self.NOUN_MASCULINE_OR_FEMININE,
            self.NOUN_UNKNOWN_GENDER,
            self.NOUN_NO_ARTICLE,
        ]

    def is_verb(self):
        return self in [
            self.VERB_INFINITIVE,
            self.VERB_PRENOMINAL,
            self.VERB_PRONOMINAL,
            self.VERB_QUALITATIVE,
            self.VERB_IMPERATIVE,
        ]


_TYPE_TO_PREFIX_LIST = {
    Type.NOUN_MASCULINE: constants.ALL_NOUN_MASCULINE,
    Type.NOUN_FEMININE: constants.ALL_NOUN_FEMININE,
    Type.NOUN_PLURAL: constants.ALL_NOUN_PLURAL,
    Type.NOUN_MASCULINE_OR_FEMININE: constants.ALL_NOUN,
    Type.NOUN_UNKNOWN_GENDER: constants.ALL_NOUN,
    Type.NOUN_NO_ARTICLE: constants.ALL_NOUN_NO_ARTICLE,
    Type.VERB_INFINITIVE: constants.ALL_VERB,
    Type.VERB_PRENOMINAL: constants.ALL_VERB,
    Type.VERB_PRONOMINAL: constants.ALL_VERB,
    Type.VERB_QUALITATIVE: constants.ALL_VERB_QUALITATIVE,
    Type.VERB_IMPERATIVE: [],
}


@type_enforced.Enforcer(enabled=True)
def inflect(morpheme: str, type: Type, strict=True) -> list[str]:
    """
    Given a word, return a list of inflected forms.
    """
    prefixes = _TYPE_TO_PREFIX_LIST[type]
    prefixes = sum(prefixes, [])
    # TODO: The input data should be a single Coptic block in the first place.
    # Fix at the source, and remove this regex search.
    if strict:
        assert COPTIC_ONLY_BLOCK.fullmatch(morpheme)
    else:
        search = COPTIC_ONLY_BLOCK.search(morpheme)
        if not search:
            return []
        morpheme = search.group()
    assert morpheme
    return [morpheme] + [p + morpheme for p in prefixes]
