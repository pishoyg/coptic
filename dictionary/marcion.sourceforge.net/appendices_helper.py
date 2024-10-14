#!/usr/bin/env python3
import argparse
import collections
import json
import shlex
import urllib

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
HOMONYMS_COL = "homonyms"
GREEK_SISTERS_COL = "TLA-sisters"

argparser = argparse.ArgumentParser(
    description="""Find and process appendices.""",
    formatter_class=argparse.RawTextHelpFormatter,
    exit_on_error=False,
)

argparser.add_argument(
    "-v",
    "--validate",
    action="store_true",
    default=False,
    help="Validate the appendices.",
)

argparser.add_argument(
    "-s",
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
    "-a",
    "--antonyms",
    type=str,
    nargs="*",
    default=[],
    help="Must be used in combination with --sisters."
    " See --sisters for usage.",
)

argparser.add_argument(
    "-o",
    "--homonyms",
    type=str,
    nargs="*",
    default=[],
    help="Record a group of words as homonyms."
    " This flag can only be used alone.",
)


def split(cell: str) -> list[str]:
    return utils.ssplit(cell, ";")


class house:
    """A house represents a branch of the family."""

    def __init__(self, key: str, cell: str) -> None:
        # key is the key of the current house.
        self.key = key
        # ancestors_raw is the raw format of the ancestor house. If your house
        # has new joiners, they won't show here.
        self.ancestors_raw = cell
        # member is the current list of house members.
        self.members: list[str] = split(cell)
        self.members = [" ".join(m.split()) for m in self.members]
        # ancestors_formatted is a formatted representation of the list of the
        # original members.
        self.ancestors_formatted = self.string()

    def string(self) -> str:
        return "; ".join(self.members)

    def has(self, key: str) -> bool:
        return key in self.members

    def strangers(self, joiners: list[str]) -> list[str]:
        """Given a list of joiners, retrieve the strangers leaving out the
        current members (including yourself)."""
        return [j for j in joiners if j != self.key and not self.has(j)]

    def marry(self, spouses: list[str], strangers: bool = True) -> list[str]:
        """Marry the given spouses into your house.

        Args:
            strangers: If true, force all new spouses to be strangers.
        Return:
            The list of spouses that have been married to the family. This
            should be all the spouses in the input if all of them are strangers.
        """
        if strangers:
            assert self.strangers(spouses) == spouses
        else:
            spouses = self.strangers(spouses)
        self.members = self.members + spouses
        assert self.string().startswith(self.ancestors_formatted)
        return spouses


class family:
    """A family is made up of several houses, currently four."""

    def __init__(self, row: pd.Series | dict) -> None:
        self.key: str = row[KEY_COL]
        self.sisters: house = house(row[KEY_COL], row[SISTERS_COL])
        self.antonyms: house = house(row[KEY_COL], row[ANTONYMS_COL])
        self.homonyms: house = house(row[KEY_COL], row[HOMONYMS_COL])
        self.greek_sisters: house = house(row[KEY_COL], row[GREEK_SISTERS_COL])

    def all_except_you(self) -> list[str]:
        return sum(
            [
                house.members
                for house in [
                    self.sisters,
                    self.antonyms,
                    self.homonyms,
                    self.greek_sisters,
                ]
            ],
            [],
        )

    def natives_except_you(self) -> list[str]:
        return sum(
            [
                house.members
                for house in [
                    self.sisters,
                    self.antonyms,
                    self.homonyms,
                ]
            ],
            [],
        )

    def validate(self, key_to_family: dict, symmetry: bool = True) -> None:
        """
        Args:
            symmetry: If true, validate symmetric relations as well.
        """
        # TODO: (#271) Add validation for Greek sisters as well.
        relatives: list[str] = self.all_except_you()
        # Verify no relative is recorded twice.
        if len(relatives) != len(set(relatives)):
            utils.fatal("Duplicate sisters found at", self.key)
        # Verify that you haven't been mistakenly counted as a relative of
        # yourself.
        if self.key in relatives:
            utils.fatal("Circular sisterhood at", self.key)
        # Restrict the checks from here on to the native relatives.
        relatives = self.natives_except_you()
        for house, name in [
            (self.sisters, "sisters"),
            (self.antonyms, "antonyms"),
            (self.homonyms, "homonyms"),
        ]:
            if house.string() != house.ancestors_raw:
                utils.fatal("House", self.key, "/", name, "needs formatting!")
        if not key_to_family:
            # We can't perform further validation.
            return
        # Verify that all relatives are documented.
        utils.verify_all_belong_to_set(
            relatives,
            key_to_family,
            "Nonexisting sister",
        )
        if not symmetry:
            return
        # If a is sister to b, then b is sister to a.
        assert all(
            key_to_family[s].sisters.has(self.key)
            for s in self.sisters.members
        )
        # If a is antonym to b, then b is antonym to a.
        assert all(
            key_to_family[s].antonyms.has(self.key)
            for s in self.antonyms.members
        )
        # If a is homonym to b, then b is homonym to a.
        assert all(
            key_to_family[s].homonyms.has(self.key)
            for s in self.homonyms.members
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
        key_to_family: dict[str, family] = {
            row[KEY_COL]: family(row) for _, row in df.iterrows()
        }
        for fam in key_to_family.values():
            fam.validate(key_to_family)

    def validate(self, path: str, roots: bool = False) -> None:
        df = utils.read_tsv(path)
        for _, row in df.iterrows():
            key: str = row[KEY_COL]
            self.validate_senses(key, row["senses"])
        if not roots:
            return
        self.validate_sisters(df)


def stringify(row: dict) -> dict[str, str]:
    return {key: str(value) for key, value in row.items()}


class _matriarch:

    def __init__(self):
        # Worksheet 0 has the roots.
        self.sheet = utils.read_gspread(GSPREAD_NAME, worksheet=0)
        self.keys: set[str] = {
            str(record[KEY_COL]) for record in self.sheet.get_all_records()
        }

        self.col_idx = {
            SISTERS_COL: utils.get_column_index(self.sheet, SISTERS_COL),
            ANTONYMS_COL: utils.get_column_index(self.sheet, ANTONYMS_COL),
            HOMONYMS_COL: utils.get_column_index(self.sheet, HOMONYMS_COL),
        }

    def marry_house(
        self,
        row_idx: int,
        row: dict,
        col: str,
        spouses: list[str],
    ) -> house:
        """Given a row and its index, and a column name, and a list of values
        to add, update the call with the new values.

        Given a house (cell) in the family (row), marry new members to
        the house.

        Return the new house.
        """
        huis = house(row[KEY_COL], row[col])
        married = huis.marry(spouses, strangers=False)
        if married:
            utils.info("Adding", ", ".join(married), "to", huis.key, "/", col)
        elif huis.string() != huis.ancestors_raw:
            utils.info("Reformatting", huis.key, "/", col)
        else:
            if spouses:
                # We only log this line when verbosity is warranted.
                utils.warn("No changes to", huis.key, "/", col)
        return huis

    def marry_family(
        self,
        sisters: list[str] = [],
        antonyms: list[str] = [],
        homonyms: list[str] = [],
    ) -> None:
        assert bool(homonyms) != bool(sisters or antonyms)
        assert not antonyms or sisters

        # Googls Sheets uses 1-based indexing.
        # We also add 1 to account for the header row.
        all_records = self.sheet.get_all_records()
        all_records = list(map(stringify, all_records))
        key_to_family: dict[str, family] = {
            row[KEY_COL]: family(row) for row in all_records
        }
        row_idx = 1
        for row in all_records:
            row_idx += 1
            key = row[KEY_COL]
            s, a, h = [], [], []
            if key in sisters:
                assert key not in antonyms
                s, a = sisters, antonyms
            elif key in antonyms:
                assert key not in sisters
                a, s = sisters, antonyms
            elif key in homonyms:
                h = homonyms

            houses = {
                SISTERS_COL: self.marry_house(row_idx, row, SISTERS_COL, s),
                ANTONYMS_COL: self.marry_house(row_idx, row, ANTONYMS_COL, a),
                HOMONYMS_COL: self.marry_house(row_idx, row, HOMONYMS_COL, h),
            }
            new_fam = family(
                {
                    KEY_COL: key,
                    GREEK_SISTERS_COL: str(row[GREEK_SISTERS_COL]),
                }
                | {col: house.string() for col, house in houses.items()},
            )
            # Validate the proposed marriages.
            new_fam.validate(key_to_family, symmetry=False)

            for col, house in houses.items():
                new = house.string()
                if new != house.ancestors_raw:
                    self.sheet.update_cell(row_idx, self.col_idx[col], new)


def validate():
    validatoor = validator()
    validatoor.validate(ROOTS, roots=True)
    validatoor.validate(DERIVATIONS)


def preprocess_args(args) -> bool:
    def url_to_key(url_or_key: str) -> str:
        if not url_or_key.startswith("http"):
            # This is not a URL, this is already a key.
            return url_or_key
        url = url_or_key
        del url_or_key
        basename = urllib.parse.urlparse(url).path.split("/")[-1]
        assert basename.endswith(".html")
        basename = basename[:-5]
        assert basename.isdigit()
        return basename

    args.sisters = list(map(url_to_key, args.sisters))
    args.antonyms = list(map(url_to_key, args.antonyms))

    num_actions = sum(
        map(
            bool,
            [args.validate, args.sisters or args.antonyms, args.homonyms],
        ),
    )

    if num_actions > 1:
        utils.fatal("At most one command is required.")
    return bool(num_actions)


def main():
    args = argparser.parse_args()
    oneoff = preprocess_args(args)

    if args.validate:
        validate()
        return

    utils.info("Initializing...")
    mother = _matriarch()
    while True:
        try:
            if not oneoff:
                args = argparser.parse_args(shlex.split(input("Command: ")))
                if not preprocess_args(args):
                    # No arguments provided!
                    continue

            if args.validate:
                validate()

            if args.sisters or args.antonyms:
                mother.marry_family(
                    sisters=args.sisters,
                    antonyms=args.antonyms,
                )

            if args.homonyms:
                mother.marry_family(homonyms=args.homonyms)

        except Exception as e:
            utils.error(e)
        finally:
            if oneoff:
                break


if __name__ == "__main__":
    main()
