#!/usr/bin/env python3
import argparse
import collections
import json

import pandas as pd

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

    def validate_sisters(self, df: pd.DataFrame) -> None:
        keys: set[str] = {str(cell).strip() for cell in df["key"]}
        for key, sisters in zip(df["key"], df["sisters"]):
            if not sisters:
                continue
            for s in sisters.split(","):
                if s == key:
                    utils.fatal("Circular sisterhood at", key)
                if s not in keys:
                    utils.fatal("Nonexisting sister", s, "at", key)

    def validate(self, path: str) -> None:
        df = utils.read_tsv(path)
        for _, row in df.iterrows():
            key: str = row["key"]
            self.validate_senses(key, row["senses"])
        if "sisters" in df:
            self.validate_sisters(df)


argparser = argparse.ArgumentParser(
    description="""Find and process appendices.""",
)

argparser.add_argument(
    "--validate",
    action="store_true",
    default=False,
    help="Validate the appendices.",
)


def validate():
    validatoor = validator()
    validatoor.validate(ROOTS)
    validatoor.validate(DERIVATIONS)


def main():
    args = argparser.parse_args()
    actions: list = list(filter(None, [args.validate]))
    if len(actions) != 1:
        utils.fatal("Exactly one command is required.")

    if args.validate:
        validate()


if __name__ == "__main__":
    main()
