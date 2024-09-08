import collections
import json

import utils

ROOTS = "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
DERIVATIONS = (
    "dictionary/marcion.sourceforge.net/data/input/derivation_appendices.tsv"
)


class validator:
    def __init__(self):
        self.decoder = json.JSONDecoder(
            object_pairs_hook=self.dupe_checking_hook,
        )

    def dupe_checking_hook(self, pairs: list) -> dict[str, str]:
        if any(
            count > 1
            for _, count in collections.Counter(
                map(lambda p: p[0], pairs),
            ).items()
        ):
            utils.fatal("duplicate elements in JSON:", pairs)
        return {key: value for key, value in pairs}

    def parse_senses(self, senses: str) -> dict[str, str]:
        # TODO: (#189) Once all senses are present, don't allow the field to be
        # absent.
        if not senses:
            return {}

        return self.decoder.decode(senses)

    def validate_senses(self, key: str, senses: str) -> None:
        parsed: dict[str, str] = self.parse_senses(senses)
        if not parsed:
            return
        for sense_id in parsed:
            if sense_id.isdigit():
                continue
            utils.fatal(
                key,
                "has a sense with an invalid key",
                sense_id,
                "sense keys must be integers.",
            )
        largest = max(map(int, parsed.keys()))
        if largest != len(parsed):
            utils.fatal(key, "has a gap in the senses!")

    def validate(self, path: str) -> None:
        df = utils.read_tsv(path)
        for _, row in df.iterrows():
            key: str = row["key"]
            self.validate_senses(key, row["senses"])


def main():
    validatoor = validator()
    validatoor.validate(ROOTS)
    validatoor.validate(DERIVATIONS)


if __name__ == "__main__":
    main()
