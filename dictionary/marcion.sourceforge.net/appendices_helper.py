#!/usr/bin/env python3
import argparse
import collections
import json
import shlex
import urllib

import pandas as pd

import utils

ROOTS: str = (
    "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
)
DERIVATIONS: str = (
    "dictionary/marcion.sourceforge.net/data/input/derivation_appendices.tsv"
)
GSPREAD_NAME: str = "Appendices"
GSPREAD_URL: str = (
    "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"
)

KEY_COL: str = "key"
SISTERS_COL: str = "sisters"
ANTONYMS_COL: str = "antonyms"
HOMONYMS_COL: str = "homonyms"
GREEK_SISTERS_COL: str = "TLA-sisters"

SENSES_COL: str = "senses"

CATEGORIES_COL: str = "categories"

TEXT_FRAG_PREFIX: str = ":~:text="

KNOWN_CATEGORIES: set[str] = (
    {  # Biology
        "species",
        "anatomy",
        "person",
        # "biology" includes everything biology-related, which doesn't fit
        # in a more precise category, such as "species", "person", or "anatomy".
        "biology",
    }
    | {  # Physics & Chemistry
        "substance",
        "geography",
        # "physics" includes everything physics-related, which doesn't fit
        # in a more precise category, such as "substance" or "geography".
        "physics",
    }
    | {  # Man-made
        "building",
        "tool",
        "vehicle",
    }
    | {  # Conceptual
        "time",
        "number",
        "measure",
        "direction",
        "emotion",
        "concept",
    }
)

argparser: argparse.ArgumentParser = argparse.ArgumentParser(
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
    "-c",
    "--cat",
    type=str,
    nargs="*",
    default=[],
    help="If used with --keys, assign the given categories to the words with"
    "\nthe given keys. Otherwise, print the list of words belonging to ANY of"
    "\nthe given categories.",
)

argparser.add_argument(
    "-k",
    "--keys",
    type=str,
    nargs="*",
    default=[],
    help="A list of word keys, to assign the given categories to.",
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

argparser.add_argument(
    "-d",
    "--delete_empty_fragment",
    action="store_true",
    default=False,
    help="In normal situations, when a new sisterhood relation is proposed, if"
    " the relation already exists, we just update the fragment."
    " However, we do NOT update the fragment if the new fragment is empty,"
    " because we assume that this is not intentional."
    " Use this flag to update this behaviour, so we will delete the existing"
    " fragment if requested.",
)


def split(cell: str) -> list[str]:
    return utils.ssplit(cell, ";")


def stringify(row: dict) -> dict[str, str]:
    return {key: str(value) for key, value in row.items()}


class person:
    def __init__(self, raw: str) -> None:
        # TODO: (#226) Validate that the fragment, if present, actually exists
        # in this person's page.
        # This can be done by caching a parsed HTML tree of every person there
        # is. Out of the tree, you only need to store all the anchors, and all
        # the text.
        raw = raw.strip()
        assert raw
        split = raw.split()
        self.key: str = split[0]
        self.fragment: str = " ".join(split[1:])

    def string(self) -> str:
        return " ".join(filter(None, [self.key, self.fragment]))


class house:
    """A house represents a branch of the family."""

    delete_empty_fragment: bool = False

    def __init__(self, key: str, cell: str) -> None:
        # key is the key of the current house.
        self.key: str = key
        # ancestors_raw is the raw format of the ancestor house. If your house
        # has new joiners, they won't show here.
        self.ancestors_raw: str = cell
        # member is the current list of house members.
        self.members: list[person] = [person(raw) for raw in split(cell)]
        # ancestors_formatted is a formatted representation of the list of the
        # original members.
        self.ancestors_formatted: str = self.string()

    def string(self) -> str:
        return "; ".join(m.string() for m in self.members)

    def has(self, p: person | str) -> bool:
        key: str = ""
        if isinstance(p, person):
            key = p.key
        else:
            assert isinstance(p, str)
            key = p
        del p
        return any(m.key == key for m in self.members)

    def marry(
        self,
        spouses: list[person],
    ) -> tuple[list[person], list[person]]:
        """Marry the given spouses into your house.

        Return:
            A boolean indicating whether any changes were made.
        """
        added, updated = [], []

        for spouse in spouses:
            if spouse.key == self.key:
                # Nothing to be done here! Even if this spouse (representing
                # us).
                # has a fragment, we never update ourselves, we only update our relations.
                # It's our relations that need to have the fragments in their
                # contact books.
                continue
            # Check if the spouse is already a member.
            existing_member: person | None = next(
                (m for m in self.members if m.key == spouse.key),
                None,
            )
            if not existing_member:
                # Add new member.
                self.members.append(spouse)
                added.append(spouse)
                continue
            # Update the fragment if it has changed.
            if existing_member.fragment != spouse.fragment:
                if not spouse.fragment and not house.delete_empty_fragment:
                    # The new spouse doesn't have a fragment. We still retain
                    # this member's fragment! It's likely that the deletion is
                    # not intended.
                    continue
                existing_member.fragment = spouse.fragment
                updated.append(spouse)

        return added, updated


class family:
    """A family is made up of several houses, currently four."""

    def __init__(self, row: pd.Series | dict) -> None:
        self.key: str = row[KEY_COL]
        self.sisters: house = house(row[KEY_COL], row[SISTERS_COL])
        self.antonyms: house = house(row[KEY_COL], row[ANTONYMS_COL])
        self.homonyms: house = house(row[KEY_COL], row[HOMONYMS_COL])
        self.greek_sisters: house = house(row[KEY_COL], row[GREEK_SISTERS_COL])

    def all_except_you(self) -> list[person]:
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

    def natives_except_you(self) -> list[person]:
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
        relatives: list[str] = [r.key for r in self.all_except_you()]
        # Verify no relative is recorded twice.
        if len(relatives) != len(set(relatives)):
            utils.throw("Duplicate sisters found at", self.key)
        # Verify that you haven't been mistakenly counted as a relative of
        # yourself.
        if self.key in relatives:
            utils.throw("Circular sisterhood at", self.key)
        # Restrict the checks from here on to the native relatives.
        relatives = [r.key for r in self.natives_except_you()]
        for house, name in [
            (self.sisters, "sisters"),
            (self.antonyms, "antonyms"),
            (self.homonyms, "homonyms"),
        ]:
            if house.string() != house.ancestors_raw:
                utils.throw("House", self.key, "/", name, "needs formatting!")
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
            key_to_family[m.key].sisters.has(self.key)
            for m in self.sisters.members
        )
        # If a is antonym to b, then b is antonym to a.
        assert all(
            key_to_family[m.key].antonyms.has(self.key)
            for m in self.antonyms.members
        )
        # If a is homonym to b, then b is homonym to a.
        assert all(
            key_to_family[m.key].homonyms.has(self.key)
            for m in self.homonyms.members
        )


class validator:
    def __init__(self) -> None:
        self.decoder: json.JSONDecoder = json.JSONDecoder(
            object_pairs_hook=self.dupe_checking_hook,
        )

    def dupe_checking_hook(self, pairs: list) -> dict[str, str]:
        if any(
            count > 1
            for _, count in collections.Counter(
                map(lambda p: p[0], pairs),
            ).items()
        ):
            utils.throw("duplicate elements in JSON:", pairs)
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
            utils.throw(
                key,
                "has a sense with an invalid key",
                sense_id,
                "sense keys must be integers.",
            )
        largest: int = max(map(int, parsed.keys()))
        if largest != len(parsed):
            utils.throw(key, "has a gap in the senses!")

    def validate_sisters(self, df: pd.DataFrame) -> None:
        key_to_family: dict[str, family] = {
            row[KEY_COL]: family(row) for _, row in df.iterrows()
        }
        for fam in key_to_family.values():
            fam.validate(key_to_family)

    def validate_categories(self, key: str, raw_categories: str) -> None:
        categories = utils.ssplit(raw_categories, ",")
        for cat in categories:
            if cat not in KNOWN_CATEGORIES:
                utils.throw(key, "has an unknown category:", cat)

    def validate(self, path: str, roots: bool = False) -> None:
        df: pd.DataFrame = utils.read_tsv(path)
        for _, row in df.iterrows():
            key: str = row[KEY_COL]
            self.validate_senses(key, row[SENSES_COL])
            self.validate_categories(key, row[CATEGORIES_COL])
        if not roots:
            return
        self.validate_sisters(df)


class _matriarch:
    def __init__(self) -> None:
        # Worksheet 0 has the roots.
        self.sheet = utils.read_gspread(GSPREAD_NAME, worksheet=0)
        self.keys: set[str] = {
            str(record[KEY_COL]) for record in self.sheet.get_all_records()
        }

        self.col_idx: dict[str, int] = {
            SISTERS_COL: utils.get_column_index(self.sheet, SISTERS_COL),
            ANTONYMS_COL: utils.get_column_index(self.sheet, ANTONYMS_COL),
            HOMONYMS_COL: utils.get_column_index(self.sheet, HOMONYMS_COL),
            GREEK_SISTERS_COL: utils.get_column_index(
                self.sheet,
                GREEK_SISTERS_COL,
            ),
            CATEGORIES_COL: utils.get_column_index(self.sheet, CATEGORIES_COL),
        }

    def marry_house(self, row: dict, col: str, spouses: list[person]) -> house:
        """Given a row and its index, and a column name, and a list of values
        to add, update the call with the new values.

        Given a house (cell) in the family (row), marry new members to
        the house.

        Return the new house.
        """
        huis: house = house(row[KEY_COL], row[col])
        added, updated = huis.marry(spouses)
        if added or updated:
            args: list[str] = []
            if added:
                args.extend(["Adding", "; ".join(m.string() for m in added)])
            if updated:
                args.extend(
                    ["Updating", "; ".join(m.string() for m in updated)],
                )
            args.extend(["in", huis.key, "/", col])
            utils.info(*args)
        elif huis.string() != huis.ancestors_raw:
            utils.info("Reformatting", huis.key, "/", col)
        else:
            if spouses:
                # We only log this line when verbosity is warranted.
                # Verbosity is warranted if we have an actual update request.
                utils.warn("No changes to", huis.key, "/", col)
        return huis

    def marry_family(
        self,
        sisters: list[person] = [],
        antonyms: list[person] = [],
        homonyms: list[person] = [],
    ) -> None:
        assert bool(homonyms) != bool(sisters or antonyms)
        assert not antonyms or sisters

        def has(members: list[person], key: str) -> bool:
            return any(m.key == key for m in members)

        # Googls Sheets uses 1-based indexing.
        # We also add 1 to account for the header row.
        all_records: list[dict] = self.sheet.get_all_records()
        all_records = list(map(stringify, all_records))
        key_to_family: dict[str, family] = {
            row[KEY_COL]: family(row) for row in all_records
        }
        row_idx: int = 1
        for row in all_records:
            row_idx += 1
            key: str = row[KEY_COL]
            s, a, h = [], [], []
            if has(sisters, key):
                assert not has(antonyms, key)
                s, a = sisters, antonyms
            elif has(antonyms, key):
                assert not has(sisters, key)
                a, s = sisters, antonyms
            elif has(homonyms, key):
                h = homonyms

            houses: dict[str, house] = {
                SISTERS_COL: self.marry_house(row, SISTERS_COL, s),
                ANTONYMS_COL: self.marry_house(row, ANTONYMS_COL, a),
                HOMONYMS_COL: self.marry_house(row, HOMONYMS_COL, h),
            }
            # Validate the proposed marriages.
            family(
                {
                    KEY_COL: key,
                    GREEK_SISTERS_COL: str(row[GREEK_SISTERS_COL]),
                }
                | {col: huis.string() for col, huis in houses.items()},
            ).validate(key_to_family, symmetry=False)

            for col, huis in houses.items():
                new: str = huis.string()
                if new != huis.ancestors_raw:
                    self.sheet.update_cell(row_idx, self.col_idx[col], new)


class runner:

    mother: _matriarch | None = None

    def preprocess_args(self, args: list[str] | None = None) -> bool:
        """
        Return:
            A boolean indicating whether any *action* arguments have been
            provided. *Option* argument don't affect this return value.
        """
        self.args: argparse.Namespace = argparser.parse_args(args)
        house.delete_empty_fragment = self.args.delete_empty_fragment

        utils.verify_unique(self.args.cat, "Duplicate categories!")
        for c in self.args.cat:
            if c not in KNOWN_CATEGORIES:
                utils.throw(c, "is not a known category!")

        def url_to_person(url_or_raw: str) -> person:
            """Given a URL, return a string representing an encoded person
            initializer.

            Examples:
                - Input: "https://remnqymi.com/crum/26.html#drv895"
                - Output: "26 #drv895"

                - Input: "https://remnqymi.com/crum/26.html#:~:text=calf"
                - Output: "26 calf"
            """
            # NOTE: The following replacement of back slashes might be problematic.
            # It was introduced to appease an idiosyncratic shell!
            url_or_raw = url_or_raw.replace("\\", "")
            if not url_or_raw.startswith("http"):
                # This is not a URL, this is already a key.
                return person(url_or_raw)
            url: str = url_or_raw
            del url_or_raw
            url = urllib.parse.unquote(url)
            parsed = urllib.parse.urlparse(url)
            basename: str = parsed.path.split("/")[-1]
            assert basename.endswith(".html")
            key: str = basename[:-5]
            del basename
            assert key.isdigit()
            raw: str = ""
            if parsed.fragment.startswith(TEXT_FRAG_PREFIX):
                raw = key + " " + parsed.fragment[len(TEXT_FRAG_PREFIX) :]
            elif parsed.fragment:
                # This is not a text fragment, but a regular fragment.
                raw = f"{key} #{parsed.fragment}"
            else:
                # No fragment!
                raw = key
            return person(raw)

        self.args.sisters = list(map(url_to_person, self.args.sisters))
        self.args.antonyms = list(map(url_to_person, self.args.antonyms))
        self.args.homonyms = list(map(url_to_person, self.args.homonyms))

        num_actions: int = sum(
            map(
                bool,
                [
                    self.args.validate,
                    self.args.cat or self.args.keys,
                    self.args.sisters or self.args.antonyms,
                    self.args.homonyms,
                ],
            ),
        )

        if num_actions > 1:
            utils.throw("At most one command is required.")
        return bool(num_actions)

    def validate(self) -> None:
        validatoor: validator = validator()
        validatoor.validate(ROOTS, roots=True)
        validatoor.validate(DERIVATIONS)

    def categories(self) -> None:
        self.init()
        assert self.mother
        if not self.args.keys:
            for row in self.mother.sheet.get_all_records():
                cat = row[CATEGORIES_COL]
                assert isinstance(cat, str)
                if any(c in self.args.cat for c in utils.ssplit(cat)):
                    print(row[KEY_COL])
            return
        for key in self.args.keys:
            assert key in self.mother.keys
        cat = ", ".join(self.args.cat)
        row_idx = 1
        col_idx = self.mother.col_idx[CATEGORIES_COL]
        for record in self.mother.sheet.get_all_records():
            row_idx += 1
            key = str(record[KEY_COL])
            if key not in self.args.keys:
                continue
            # TODO: (#287) Make it possible to choose between *adding*
            # categories or *replacing* them.
            utils.info("Updating categories of", key, "to", cat)
            self.mother.sheet.update_cell(row_idx, col_idx, cat)

    def once(self) -> None:
        # NOTE: We perform validation before initialization to speed it up, as
        # we don't need to initialize if we just need a one-off validation.
        if self.args.validate:
            self.validate()

        if self.args.cat:
            self.categories()
            return

        self.init()
        assert self.mother
        if self.args.sisters or self.args.antonyms:
            self.mother.marry_family(
                sisters=self.args.sisters,
                antonyms=self.args.antonyms,
            )

        if self.args.homonyms:
            self.mother.marry_family(homonyms=self.args.homonyms)

    def init(self) -> None:
        if self.mother:
            return
        utils.info("Initializing...")
        self.mother = _matriarch()

    def run(self) -> None:
        oneoff: bool = self.preprocess_args()
        if oneoff:
            # This is a one-off, because there are action commands provided on
            # the invocation.
            self.once()
            return

        # This is not a one-off. Read the commands interactively, until the
        # user decides to exit.
        while True:
            try:
                self.preprocess_args(shlex.split(input("Command: ")))
                self.once()
            except Exception as e:
                utils.error(e)


def main() -> None:
    r: runner = runner()
    r.run()


if __name__ == "__main__":
    main()
