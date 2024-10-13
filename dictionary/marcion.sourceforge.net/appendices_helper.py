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

KEY_COL = "key"
SISTERS_COL = "sisters"
ANTONYMS_COL = "antonyms"

argparser = argparse.ArgumentParser(
    description="""Find and process appendices.""",
    formatter_class=argparse.RawTextHelpFormatter,
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
    default=[],
    help="Read a list of keys, possessing a symmetric sisterhood relation,"
    "\nand mark them as sisters in the appendices sheet."
    "\nA symmetric relation is one such that whenever a relates to b, then b"
    "\nrelates to a."
    "\nIf used in combination with --antonyms, then all entries in --antonyms"
    "\nwill also be marked as antonyms of the given sisters."
    "\n\nExamples:"
    "\n\n`${SCRIPT} --sisters ${KEY_1} ${KEY_2}`:"
    "\n- Mark ${KEY_1} and ${KEY_2} as sisters of one another."
    "\n\n`${SCRIPT} --sisters ${KEY_1} ${KEY_2} --antonyms ${KEY_3} ${KEY_4}`:"
    "\n- Mark ${KEY_1} and ${KEY_2} as sisters of one another."
    "\n- Mark ${KEY_3} and ${KEY_4} as sisters of one another."
    "\n- Mark ${KEY_3} and ${KEY_4} as antonyms of ${KEY_1} and ${KEY_2}."
    "\n- Mark ${KEY_1} and ${KEY_2} as antonyms of ${KEY_3} and ${KEY_4}."
    "\n\n`${SCRIPT} --antonyms ${KEY_3} ${KEY_4}`:"
    "\n- Error!"
    "\nAlthough we could obtain partial behaviour in this case (mark ${KEY_3}"
    "\nand ${KEY_4} as sisters of one another), we don't allow it in order to"
    "\navoid confusing, as it may be interpreted by some users as marking"
    "\n${KEY_3} and ${KEY_4} as antonyms of one another.",
)

argparser.add_argument(
    "--antonyms",
    type=str,
    nargs="*",
    default=[],
    help="Must be used in combination with --antonyms."
    " See --sisters for usage.",
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
        keys: set[str] = {str(cell).strip() for cell in df[KEY_COL]}
        for key, sisters, antonyms in zip(
            df[KEY_COL],
            df[SISTERS_COL],
            df[ANTONYMS_COL],
        ):
            sisters = ",".join(filter(None, [sisters, antonyms]))
            del antonyms
            if not sisters:
                continue
            split = utils.split(sisters, ",")
            del sisters
            if len(set(split)) < len(split):
                utils.fatal("Duplicate sisters found at", key)
            for s in split:
                if s == key:
                    utils.fatal("Circular sisterhood at", key)
                if s not in keys:
                    utils.fatal("Nonexisting sister", s, "at", key)

    def validate(self, path: str, roots: bool = False) -> None:
        df = utils.read_tsv(path)
        for _, row in df.iterrows():
            key: str = row[KEY_COL]
            self.validate_senses(key, row["senses"])
        if not roots:
            return
        self.validate_sisters(df)


def sisters(sisters: list[str], antonyms: list[str] = []) -> None:
    # Worksheet 0 has the roots.
    sheet = utils.read_gspread(GSPREAD_NAME, worksheet=0)
    df = utils.as_dataframe(sheet).astype("string")
    keys: set[str] = set(df[KEY_COL])

    col_idx = {
        SISTERS_COL: utils.get_column_index(sheet, SISTERS_COL),
        ANTONYMS_COL: utils.get_column_index(sheet, ANTONYMS_COL),
    }

    def update(row_idx: int, row: pd.Series, col: str, add: list[str]) -> None:
        cur = row[col]
        key = row[KEY_COL]
        existing = utils.split(cur, ",")
        if all(a == key or a in existing for a in add):
            # All values are there already.
            return
        value = ",".join(
            existing + [a for a in add if a != key and a not in existing],
        )
        # Verify the value.
        split = utils.split(value, ",")
        utils.verify_unique(split, "Sisters:")
        utils.verify_all_belong_to_set(split, keys, "Sister keys:")
        assert value != cur
        assert value.startswith(cur)
        # Update.
        sheet.update_cell(row_idx, col_idx[col], value)

    row_idx = 0
    for _, row in df.iterrows():
        # Googls Sheets uses 1-based indexing.
        row_idx += 1
        key = row[KEY_COL]
        if key in sisters:
            # Add 1 to account for the header row.
            assert key not in antonyms
            update(row_idx + 1, row, SISTERS_COL, sisters)
            update(row_idx + 1, row, ANTONYMS_COL, antonyms)
            continue
        if key in antonyms:
            assert key not in sisters
            update(row_idx + 1, row, SISTERS_COL, antonyms)
            update(row_idx + 1, row, ANTONYMS_COL, sisters)
            continue


def validate():
    validatoor = validator()
    validatoor.validate(ROOTS, roots=True)
    validatoor.validate(DERIVATIONS)


def main():
    args = argparser.parse_args()
    actions: list = list(
        filter(
            None,
            [
                args.validate,
                args.sisters or args.antonyms,
            ],
        ),
    )
    if len(actions) != 1:
        utils.fatal("Exactly one command is required.")

    if args.validate:
        validate()

    if args.sisters or args.antonyms:
        sisters(args.sisters, args.antonyms)


if __name__ == "__main__":
    main()
