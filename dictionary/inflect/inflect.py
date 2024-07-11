import enum

import type_enforced


class Type(enum.Enum):
    NOUN_MASCULINE = 11
    NOUN_FEMININE = 12
    NOUN_PLURAL = 13
    NOUN_MASCULINE_OR_FEMININE = 14
    NOUN_UNKNOWN_GENDER = 15
    NOUN_NO_ARTICLE = 16

    VERB_INFINITIVE = 21
    VERB_PRENOMINAL = 22
    VERB_PRONOMINAL = 23
    VERB_QUALITATIVE = 24
    VERB_IMPERATIVE = 25


@type_enforced.Enforcer(enabled=True)
def inflect(morpheme: str, type: Type) -> list[str]:
    """
    Given a word, return a list of inflected forms.
    """
    raise NotImplementedError("Not implemented!")
