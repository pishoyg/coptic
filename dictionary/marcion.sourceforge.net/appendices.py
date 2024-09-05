import argparse
import collections
import json

import utils

argparser = argparse.ArgumentParser(
    description="""Process Crum's Appendices Sheet.""",
)

argparser.add_argument(
    "--download",
    action="store_true",
    default=False,
    help="Download the sheets.",
)

argparser.add_argument(
    "--validate",
    action="store_true",
    default=False,
    help="Validate the local (TSV) mirrors of the sheets.",
)

# TODO: (#223) Publish the sheet to the web so you can download it without
# credentials. It's good for the project portability.
SHEET = "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"
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

    args = argparser.parse_args()

    if not any([args.download, args.validate]):
        utils.fatal("No actions specified, please run with", "--help")

    if args.download:
        utils.download_gsheet(SHEET, ROOTS, 0)
        utils.download_gsheet(SHEET, DERIVATIONS, 1)

    if args.validate:
        validatoor = validator()
        validatoor.validate(ROOTS)
        validatoor.validate(DERIVATIONS)


if __name__ == "__main__":
    main()
