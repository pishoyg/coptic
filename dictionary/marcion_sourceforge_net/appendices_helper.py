#!/usr/bin/env python3
"""Crum appendices helper."""


# TODO: (#399) This module was intended as a generic helper for all appendices,
# back when the appendices lived in a separate sheet from the main dictionary
# data (see #325). At the moment, we no longer have such a separation, and we
# should probably group the logic differently. This should be part of the more
# generic redesign of Crum's dictionary.

# TODO: (#399) Use the new Crum interface, instead of reading raw sheet data.

import argparse
import shlex
import subprocess
import threading
import urllib

import gspread

from dictionary.marcion_sourceforge_net import categories as cat
from dictionary.marcion_sourceforge_net import main as crum
from dictionary.marcion_sourceforge_net import sheet
from utils import ensure, gcp, log, text

# TODO: (#399) There should be a central location for storing column names, so
# they don't get duplicated all over the place.
# Define a `Record` object in the `tsv` module. The module should export raw
# data through methods, so users don't need to know the column names.
# For writing, column names should be an enum, but should never be spelled out
# by users of the interface.
_KEY_COL: str = "key"
_SISTERS_COL: str = "sisters"
_ANTONYMS_COL: str = "antonyms"
_HOMONYMS_COL: str = "homonyms"
_GREEK_SISTERS_COL: str = "greek-sisters"

_TEXT_FRAG_PREFIX: str = ":~:text="

_SISTER_SEP: str = "; "  # Sister separator.
_CAT_SEP: str = ", "  # Category separator.

_argparser: argparse.ArgumentParser = argparse.ArgumentParser(
    description="Find and process appendices.",
    formatter_class=argparse.RawTextHelpFormatter,
    exit_on_error=False,
)

_ = _argparser.add_argument(
    "-c",
    "--cat",
    type=str,
    nargs="*",
    default=[],
    help="If used with --keys, assign the given categories to the words with"
    "\nthe given keys. Otherwise, print the list of words belonging to ANY of"
    "\nthe given categories.",
)

_ = _argparser.add_argument(
    "-k",
    "--keys",
    type=str,
    nargs="*",
    default=[],
    help="A list of word keys, to assign the given categories to. If no"
    " categories given, we will assume that the desired behavior is to delete"
    " the existing categories. Since that behavior requires the --override_cat"
    " flag, it's an error not to use it in that case."
    " Thus, --keys must be used in combination with either --cat or"
    " --override_cat.",
)

_ = _argparser.add_argument(
    "-r",
    "--override_cat",
    action="store_true",
    default=False,
    help="Normally, we append categories. This flag overrides the behavior, so"
    "we will delete the existing categories before replacing them.",
)

_ = _argparser.add_argument(
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

_ = _argparser.add_argument(
    "-a",
    "--antonyms",
    type=str,
    nargs="*",
    default=[],
    help="Must be used in combination with --sisters."
    " See --sisters for usage.",
)

_ = _argparser.add_argument(
    "-o",
    "--homonyms",
    type=str,
    nargs="*",
    default=[],
    help="Record a group of words as homonyms."
    " This flag can only be used alone.",
)

_ = _argparser.add_argument(
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

_ = _argparser.add_argument(
    "-p",
    "--cat_prompt",
    action="store_true",
    default=False,
    help="Prompt for manually entering categories.",
)

_ = _argparser.add_argument(
    "-f",
    "--first",
    type=int,
    default=0,
    help="First item to start prompting at!",
)


def _ssplit(cell: str) -> list[str]:
    return text.ssplit(cell, _SISTER_SEP.strip())


class _Person:
    """A member of a house."""

    def __init__(self, raw: str) -> None:
        # TODO: (#340) Validate that the fragment, if present, actually exists
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


class _House:
    """A house represents a branch of the family."""

    delete_empty_fragment: bool = False

    def __init__(self, key: str, cell: str) -> None:
        # key is the key of the current house.
        self.key: str = key
        # ancestors_raw is the raw format of the ancestor house. If your house
        # has new joiners, they won't show here.
        self.ancestors_raw: str = cell
        # member is the current list of house members.
        self.members: list[_Person] = [_Person(raw) for raw in _ssplit(cell)]

    def string(self) -> str:
        return _SISTER_SEP.join(m.string() for m in self.members)

    def has(self, p: _Person | str) -> bool:
        key: str = ""
        if isinstance(p, _Person):
            key = p.key
        else:
            assert isinstance(p, str)
            key = p
        del p
        return any(m.key == key for m in self.members)

    def marry(
        self,
        spouses: list[_Person],
    ) -> tuple[list[_Person], list[_Person]]:
        """Marry the given spouses into your house.

        Args:
            spouses: List of people to marry.

        Returns:
            A boolean indicating whether any changes were made.

        """
        added: list[_Person] = []
        updated: list[_Person] = []

        for spouse in spouses:
            if spouse.key == self.key:
                # Nothing to be done here! Even if this spouse (representing
                # us).
                # has a fragment, we never update ourselves, we only update our
                # relations. It's our relations that need to have the fragments
                # in their contact books.
                continue
            # Check if the spouse is already a member.
            existing_member: _Person | None = next(
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
                if not spouse.fragment and not _House.delete_empty_fragment:
                    # The new spouse doesn't have a fragment. We still retain
                    # this member's fragment! It's likely that the deletion is
                    # not intended.
                    continue
                existing_member.fragment = spouse.fragment
                updated.append(spouse)

        return added, updated


class _Family:
    """A family is made up of several houses, currently four."""

    def __init__(self, row: dict[str, str]) -> None:
        self.key: str = row[_KEY_COL]
        self.sisters: _House = _House(row[_KEY_COL], row[_SISTERS_COL])
        self.antonyms: _House = _House(row[_KEY_COL], row[_ANTONYMS_COL])
        self.homonyms: _House = _House(row[_KEY_COL], row[_HOMONYMS_COL])
        self.greek_sisters: _House = _House(
            row[_KEY_COL],
            row[_GREEK_SISTERS_COL],
        )

    def all_except_you(self) -> list[_Person]:
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

    def natives_except_you(self) -> list[_Person]:
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

    # TODO: (#399) Move the Family type to `main.py`, and perform validation
    # during retrieval as well.
    def validate(self, key_to_family: dict, symmetry: bool = True) -> None:
        """
        Args:
            key_to_family: A dictionary mapping a key to a family.
            symmetry: If true, validate symmetric relations as well.
        """
        # TODO: (#271) Add validation for Greek sisters as well.
        relatives: list[str] = [r.key for r in self.all_except_you()]
        # Verify no relative is recorded twice.
        ensure.unique(relatives, "duplicate sisters found at", self.key)
        # Verify that you haven't been mistakenly counted as a relative of
        # yourself.
        ensure.ensure(
            self.key not in relatives,
            "circular sisterhood at",
            self.key,
        )
        # Restrict the checks from here on to the native relatives.
        relatives = [r.key for r in self.natives_except_you()]
        for house, name in [
            (self.sisters, "sisters"),
            (self.antonyms, "antonyms"),
            (self.homonyms, "homonyms"),
        ]:
            ensure.ensure(
                house.string() == house.ancestors_raw,
                "House",
                self.key,
                "/",
                name,
                "needs formatting!",
            )
        if not key_to_family:
            # We can't perform further validation.
            return
        # Verify that all relatives are documented.
        ensure.members(relatives, key_to_family, "Nonexisting sister")
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


class _Matriarch:
    """Matriarch controls family relations."""

    def __init__(self) -> None:
        # Worksheet 0 has the roots.
        # TODO: (#399): Define the sheet and record writing interface, instead
        # of having your pipelines directly use the Google Sheets API.
        self.sheet: gspread.worksheet.Worksheet = sheet.ROOTS

        self.col_idx: dict[str, int] = gcp.column_nums(self.sheet)

    def marry_house(
        self,
        row: dict[str, str],
        col: str,
        spouses: list[_Person],
    ) -> _House:
        """Marry the given spouses to the given house.

        Args:
            row: A row representing a family.
            col: The name of the column indicating which house in the family the
                spouses are marrying into.
            spouses: Persons marrying into this house.

        Returns:
            New house.
        """
        house: _House = _House(row[_KEY_COL], row[col])
        added, updated = house.marry(spouses)
        if added or updated:
            args: list[str] = []
            if added:
                args.extend(
                    ["Adding", _SISTER_SEP.join(m.string() for m in added)],
                )
            if updated:
                args.extend(
                    [
                        "Updating",
                        _SISTER_SEP.join(m.string() for m in updated),
                    ],
                )
            args.extend(["in", house.key, "/", col])
            log.info(*args)
        elif house.string() != house.ancestors_raw:
            log.info("Reformatting", house.key, "/", col)
        else:
            if spouses:
                # We only log this line when verbosity is warranted.
                # Verbosity is warranted if we have an actual update request.
                log.warn("No changes to", house.key, "/", col)
        return house

    def marry_family(
        self,
        sisters: list[_Person] | None = None,
        antonyms: list[_Person] | None = None,
        homonyms: list[_Person] | None = None,
    ) -> None:
        sisters = sisters or []
        antonyms = antonyms or []
        homonyms = homonyms or []
        assert bool(homonyms) != bool(sisters or antonyms)
        assert not antonyms or sisters

        def has(members: list[_Person], key: str) -> bool:
            return any(m.key == key for m in members)

        # Googls Sheets uses 1-based indexing.
        # We also add 1 to account for the header row.
        roots: dict[str, crum.Root] = crum.Crum.roots_live()
        key_to_family: dict[str, _Family] = {
            root.key: _Family(root.row) for root in roots.values()
        }
        for root in roots.values():
            s, a, h = [], [], []
            if has(sisters, root.key):
                assert not has(antonyms, root.key)
                s, a = sisters, antonyms
            elif has(antonyms, root.key):
                assert not has(sisters, root.key)
                a, s = sisters, antonyms
            elif has(homonyms, root.key):
                h = homonyms

            houses: dict[str, _House] = {
                _SISTERS_COL: self.marry_house(root.row, _SISTERS_COL, s),
                _ANTONYMS_COL: self.marry_house(root.row, _ANTONYMS_COL, a),
                _HOMONYMS_COL: self.marry_house(root.row, _HOMONYMS_COL, h),
            }

            # Validate the proposed marriages.
            _Family(
                {
                    _KEY_COL: root.key,
                    _GREEK_SISTERS_COL: root.row[_GREEK_SISTERS_COL],
                }
                | {col: huis.string() for col, huis in houses.items()},
            ).validate(key_to_family, symmetry=False)

            for col, huis in houses.items():
                if root.update(col, huis.string()):
                    log.info("Updated", col, "under", root.key)


class Runner:
    """Program runner."""

    mother: _Matriarch | None = None

    def preprocess_args(self, args: list[str] | None = None) -> bool:
        """
        Args:
            args: Raw commandline arguments.

        Returns:
            A boolean indicating whether any *action* arguments have been
            provided. *Option* argument don't affect this return value.
        """
        self.args: argparse.Namespace = _argparser.parse_args(args)
        _House.delete_empty_fragment = self.args.delete_empty_fragment

        self.args.cat = sorted(self.args.cat)
        ensure.unique(self.args.cat, "Duplicate categories!")
        ensure.members(self.args.cat, cat.KNOWN_CATEGORIES)

        def url_to_person(url_or_raw: str) -> _Person:
            """Convert a URL to a person initializer.

            Args:
                url_or_raw: Either the URL of the person, or the person key.

            Returns:
                The person key, potentially with a fragment.

            Examples:
                - Input: "https://remnqymi.com/crum/26.html#drv895"
                - Output: "26 #drv895"

                - Input: "https://remnqymi.com/crum/26.html#:~:text=calf"
                - Output: "26 calf"
            """
            # NOTE: The following replacement of back slashes might be
            # problematic. It was introduced to appease an idiosyncratic shell!
            url_or_raw = url_or_raw.replace("\\", "")
            if not url_or_raw.startswith("http"):
                # This is not a URL, this is already a key.
                return _Person(url_or_raw)
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
            if parsed.fragment.startswith(_TEXT_FRAG_PREFIX):
                raw = key + " " + parsed.fragment[len(_TEXT_FRAG_PREFIX) :]
            elif parsed.fragment:
                # This is not a text fragment, but a regular fragment.
                raw = f"{key} #{parsed.fragment}"
            else:
                # No fragment!
                raw = key
            return _Person(raw)

        self.args.sisters = list(map(url_to_person, self.args.sisters))
        self.args.antonyms = list(map(url_to_person, self.args.antonyms))
        self.args.homonyms = list(map(url_to_person, self.args.homonyms))

        if self.args.keys:
            ensure.ensure(
                self.args.cat or self.args.override_cat,
                "--keys must be used in combination with either",
                "--cat",
                "or",
                "--override_cat.",
            )
        if self.args.delete_empty_fragment:
            ensure.ensure(
                self.args.sisters or self.args.antonyms or self.args.homonyms,
                "--delete_empty_fragment",
                "used without any sisterhood arguments!",
            )
        # NOTE: The --delete_empty_fragment flag is not accounted for below!
        num_actions: int = sum(
            map(
                bool,
                [
                    self.args.cat or self.args.keys or self.args.override_cat,
                    self.args.sisters or self.args.antonyms,
                    self.args.homonyms,
                    self.args.cat_prompt or self.args.first,
                ],
            ),
        )

        ensure.ensure(num_actions <= 1, "At most one command is allowed!")
        return bool(num_actions)

    def categories(self) -> None:
        self.init()
        assert self.mother
        if not self.args.keys:
            # If no keys are given, the ask is to print keys of words belonging
            # to a given category.
            for root in crum.Crum.roots.values():
                if any(c in self.args.cat for c in root.categories):
                    print(root.key)
            return
        # Assign the given categories to the given words.
        roots: dict[str, crum.Root] = crum.Crum.roots_live()
        ensure.members(self.args.keys, roots)
        for key in self.args.keys:
            root = roots[key]
            if self.args.override_cat:
                new_cat = _CAT_SEP.join(self.args.cat)
            else:
                new_cat = _CAT_SEP.join(
                    sorted(set(root.categories) | set(self.args.cat)),
                )
            root.update_cell(sheet.COL.CATEGORIES, new_cat)

    def categories_prompt(self) -> None:
        for root in crum.Crum.roots_live().values():
            if root.num < self.args.first:
                continue
            if root.categories:
                # This record already has a category.
                continue
            if root.type_name in {
                "-",
                "adjective",
                "conjunction",
                "interjection",
                "interrogative adverb",
                "interrogative particle",
                "interrogative pronoun",
                "particle",
                "personal pronoun",
                "preposition",
                "pronoun",
                "verb",
                "verbal prefix",
            }:
                # This type is of little interest at the moment.
                continue
            cats: list[str] = []
            _ = subprocess.run(["open", root.url], check=True)
            while True:
                cats = text.ssplit(
                    input(f"Key = {root.key}. Categories (empty to skip): "),
                )
                unknown: list[str] = [
                    c for c in cats if c not in cat.KNOWN_CATEGORIES
                ]
                if unknown:
                    log.error("Unknown categories:", unknown)
                    continue
                break
            if not cats:
                # The user didn't input anything!
                continue
            threading.Thread(
                target=root.update_cell,
                args=(sheet.COL.CATEGORIES, _CAT_SEP.join(cats)),
            ).start()

    def once(self) -> None:
        # If --keys is present but --cat is absent, we still
        if self.args.cat or self.args.keys:
            self.categories()
            return

        if self.args.cat_prompt:
            self.categories_prompt()
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
        log.info("Initializing...")
        self.mother = _Matriarch()

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
            except Exception as e:  # pylint: disable=broad-exception-caught
                log.error(e)


def main() -> None:
    r: Runner = Runner()
    r.run()


if __name__ == "__main__":
    main()
