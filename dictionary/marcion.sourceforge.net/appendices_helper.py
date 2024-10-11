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
GSPREAD_NAME = "Appendices"
GSPREAD_URL = "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"

argparser = argparse.ArgumentParser(
    description="""Find and process appendices.""",
)

argparser.add_argument(
    "--validate",
    action="store_true",
    default=False,
    help="Validate the appendices.",
)

argparser.add_argument(
    "--sisters",
    type=str,
    nargs="*",
    default=None,
    help="Read a list of keys, possessing a symmetric sisterhood relation,"
    " and mark them as sisters in the appendices sheet."
    " A symmetric relation is one such that whenever a relates to b, then b"
    " relates to a.",
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
            for s in utils.split(sisters, ","):
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


def sisters(arg: list[str]) -> None:
    # Worksheet 0 has the roots.
    # TODO: (#226) Google Sheets tracks the history of changes. Write one cell
    # at a time, instead of rewriting the whole sheet every time; in order to
    # make the `diff` more meaningful.
    sheet = utils.read_gspread(GSPREAD_NAME, worksheet=0)
    df = utils.as_dataframe(sheet).astype("string")
    col_idx = utils.get_column_index(sheet, "sisters")
    row_idx = 0
    for _, row in df.iterrows():
        # Googls Sheets uses 1-based indexing.
        row_idx += 1
        key = row["key"]
        if key not in arg:
            continue
        existing = utils.split(row["sisters"], ",")
        value = ",".join(
            existing + [s for s in arg if s != key and s not in existing],
        )
        # Add 1 to account for the header row.
        sheet.update_cell(row_idx + 1, col_idx, value)


def validate():
    validatoor = validator()
    validatoor.validate(ROOTS)
    validatoor.validate(DERIVATIONS)


def main():
    args = argparser.parse_args()
    actions: list = list(filter(None, [args.validate, args.sisters]))
    if len(actions) != 1:
        utils.fatal("Exactly one command is required.")

    if args.validate:
        validate()

    if args.sisters:
        sisters(args.sisters)


if __name__ == "__main__":
    main()
