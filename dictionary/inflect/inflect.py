import enum

import constants
import type_enforced


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
def inflect(morpheme: str, type: Type) -> list[str]:
    """
    Given a word, return a list of inflected forms.
    """
    prefixes = _TYPE_TO_PREFIX_LIST[type]
    prefixes = sum(prefixes, [])
    return [p + morpheme for p in prefixes]
