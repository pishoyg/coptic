import unittest

import inflect


class TestInflect(unittest.TestCase):

    def test_inflect(self):
        pass


class TestIsType(unittest.TestCase):
    def test_is_type(self):
        nouns = [
            inflect.Type.NOUN_MASCULINE,
            inflect.Type.NOUN_FEMININE,
            inflect.Type.NOUN_PLURAL,
            inflect.Type.NOUN_MASCULINE_OR_FEMININE,
            inflect.Type.NOUN_UNKNOWN_GENDER,
            inflect.Type.NOUN_NO_ARTICLE,
        ]

        verbs = [
            inflect.Type.VERB_INFINITIVE,
            inflect.Type.VERB_PRENOMINAL,
            inflect.Type.VERB_PRONOMINAL,
            inflect.Type.VERB_QUALITATIVE,
            inflect.Type.VERB_IMPERATIVE,
        ]

        for n in nouns:
            self.assertTrue(n.is_noun())
            self.assertFalse(n.is_verb())
        for v in verbs:
            self.assertTrue(v.is_verb())
            self.assertFalse(v.is_noun())


if __name__ == "__main__":
    unittest.main()
