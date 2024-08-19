import argparse
import os
import parser

import constants
import enforcer
import gspread
import pandas as pd
import tree
import type_enforced
import word as lexical
from oauth2client.service_account import ServiceAccountCredentials

import utils

# Input arguments.#############################################################
COPTWRD_TSV = "dictionary/marcion.sourceforge.net/data/input/coptwrd.tsv"
COPTDRV_TSV = "dictionary/marcion.sourceforge.net/data/input/coptdrv.tsv"

WORD_COL = "word"
QUALITY_COL = "quality"
TYPE_COL = "type"
GR_COL = "gr"
EN_COL = "en"
CRUM_COL = "crum"

MIN_KEY = 1
MAX_KEY = 3385

# Output arguments.############################################################
OUTPUT = "dictionary/marcion.sourceforge.net/data/output"
FILTER_DIALECTS = constants.DIALECTS
SORT_ROOTS = ["key"]
SORT_DERIVATIONS = ["key_word", "pos"]
# TODO: Generate the definitions and morphemes.
# For each dialect in MORPH_DIALECTS, we will generate definitions and
# morphemes tables, consumable by a morphology pipeline.
MORPH_DIALECTS = ["B"]
# SIMPLE_DEFINITION_FMT is used to generate a simple definition display, for
# use in situations where the full definition (likely generated by the
# flashcards) is not feasible.
SIMPLE_DEFINITION_FMT = "(<b>{type}</b>) <b>Crum: </b> {crum} <hr/> {meaning} <hr/> {word} <hr/> {derivations} <hr/>"

# Gspread arguments.###########################################################
GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]

GSPREAD_NAME = "marcion-crum-parser"

argparser = argparse.ArgumentParser(
    description="Parse and process the Marcion digital Coptic database,"
    "which is in turn based on the Crum Coptic dictionary."
)

argparser.add_argument(
    "--gspread_credentials_json",
    type=str,
    help="Credentials file, used to write output to google sheet.",
)
argparser.add_argument(
    "--gspread_owner",
    type=str,
    help="In case a new sheet is created, assign this as the owner of the sheet.",
)

# Main.########################################################################


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def series_to_int(series: pd.Series) -> list[int]:
    return [int(cell) for cell in series]


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def write(
    df: pd.DataFrame, name: str, gspread_credentials_json: str, gspread_owner: str
) -> None:
    utils.write_tsvs(df, os.path.join(OUTPUT, "tsvs", name + ".tsvs"))
    if not gspread_owner:
        return

    # TODO: Parameterize to make it possible to write to multiple sheets at the
    # same time, particularly for roots and derivations.
    credentials = ServiceAccountCredentials.from_json_keyfile_name(
        gspread_credentials_json, GSPREAD_SCOPE
    )
    client = gspread.authorize(credentials)

    try:
        spreadsheet = client.open(GSPREAD_NAME)
    except Exception:
        spreadsheet = client.create(GSPREAD_NAME)
        spreadsheet.share(gspread_owner, perm_type="user", role="owner")

    spreadsheet.get_worksheet(0).update(
        [df.columns.values.tolist()] + df.values.tolist()
    )


def main() -> None:
    args = argparser.parse_args()
    # Process roots.
    roots = utils.read_tsv(COPTWRD_TSV)
    process_data(roots, strict=True)
    parser.verify(constants.ROOTS_REFERENCE_COUNT * 2)
    parser.reset()

    # Process derivations.
    derivations = utils.read_tsv(COPTDRV_TSV)
    process_data(derivations, strict=False)
    parser.verify(constants.DERIVATIONS_REFERENCE_COUNT * 2)
    parser.reset()

    # Gain tree insights.
    build_trees(roots, derivations)

    # Write the roots.
    roots.sort_values(by=SORT_ROOTS, key=series_to_int, inplace=True)
    write(roots, "roots", args.gspread_credentials_json, args.gspread_owner)

    # Write the derivations.
    derivations.sort_values(by=SORT_DERIVATIONS, key=series_to_int, inplace=True)
    write(derivations, "derivations", args.gspread_credentials_json, args.gspread_owner)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class keyer:
    def __init__(self, df: pd.DataFrame):
        self.keys = {str(row["key"]) for _, row in df.iterrows()}

    def assert_valid_key(self, key: int) -> None:
        assert key >= MIN_KEY and key <= MAX_KEY

    def next(self, key: int) -> str:
        self.assert_valid_key(key)
        if key == MAX_KEY:
            return ""
        next = int(key) + 1
        while str(next) not in self.keys:
            next += 1
        self.assert_valid_key(next)
        return str(next)

    def prev(self, key: int) -> str:
        self.assert_valid_key(key)
        if key == MIN_KEY:
            return ""
        prev = key - 1
        while str(prev) not in self.keys:
            prev -= 1
        self.assert_valid_key(prev)
        return str(prev)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def title(word: list[lexical.structured_word]) -> str:
    return ", ".join(
        w.string(
            include_dialects=False,
            include_references=False,
            append_root_type=False,
            parenthesize_assumed=True,
            append_types=False,
            classify=False,
        )
        for w in word
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def process_data(df: pd.DataFrame, strict: bool) -> None:
    extra_cols = {}

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def insert(prefix: str, col: str, cell: str) -> None:
        col = prefix + col
        del prefix
        if col not in extra_cols:
            extra_cols[col] = []
        extra_cols[col].append(cell)

    keysmith = keyer(df)
    for _, row in df.iterrows():
        if strict:
            insert("key", "-link", constants.CARD_LINK_FMT.format(key=row["key"]))
        else:
            insert(
                "key",
                "-link",
                constants.CARD_LINK_FMT.format(key=row["key_word"])
                + "#drv"
                + row["key"],
            )
        root_type = parser.parse_type_cell(row[TYPE_COL])
        word = parser.parse_word_cell(
            row[WORD_COL],
            root_type,
            strict,
            detach_types=False,
            use_coptic_symbol=False,
        )
        insert(WORD_COL, "-parsed", "\n".join(w.string() for w in word))
        insert(
            WORD_COL,
            "-parsed-classify",
            "\n".join(w.string(classify=True) for w in word),
        )
        word = parser.parse_word_cell(
            row[WORD_COL], root_type, strict, detach_types=True, use_coptic_symbol=True
        )
        insert(WORD_COL, "-title", title(word))
        insert(
            WORD_COL,
            "-parsed-prettify",
            "\n".join(
                w.string(include_references=False, append_root_type=True, classify=True)
                for w in word
            ),
        )
        if strict:
            # The following columns don't have any data because they are meant
            # to be provided externally.
            insert("", "dawoud-pages", "")
            insert(CRUM_COL, "-last-page", "")

        if strict:
            insert(QUALITY_COL, "-parsed", parser.parse_quality_cell(row[QUALITY_COL]))
        insert(TYPE_COL, "-parsed", root_type.marcion())
        insert(GR_COL, "-parsed", parser.parse_greek_cell(row[GR_COL]))
        ep = parser.parse_english_cell(row[EN_COL])
        insert(EN_COL, "-parsed", ep)
        insert(EN_COL, "-parsed-no-greek", parser.remove_greek(ep))
        crum = row[CRUM_COL]
        insert(CRUM_COL, "-link", constants.CRUM_PAGE_FMT.format(key=crum))
        for d in FILTER_DIALECTS:
            subset = [w for w in word if w.is_dialect(d, undialected_is_all=True)]
            entry = "\n".join(
                w.string(
                    include_dialects=False,
                    include_references=False,
                    append_root_type=True,
                )
                for w in subset
            )
            insert("dialect-", d, entry)
        if strict:
            insert("key", "-next", keysmith.next(int(row["key"])))
            insert("key", "-prev", keysmith.prev(int(row["key"])))

    for col, values in extra_cols.items():
        df[col] = values


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def dedupe(i: list[str]) -> list[str]:
    """
    Deduplicate elements from a list of strings, while maintaining the order.
    """
    seen: set[str] = set()
    o: list[str] = []
    for x in i:
        if x not in seen:
            seen.add(x)
            o.append(x)
    return o


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def build_trees(roots: pd.DataFrame, derivations: pd.DataFrame) -> None:
    derivations["depth"] = tree.depths(derivations)
    # Build trees.
    keys = [row["key"] for _, row in roots.iterrows()]
    trees = {row["key"]: tree.node(row) for _, row in roots.iterrows()}
    for _, row in derivations.iterrows():
        trees[row["key_word"]].add_descendant(tree.node(row))
    for _, t in trees.items():
        t.preprocess()

    # Add extra columns to the parents, using the derivations.
    roots[CRUM_COL + "-pages"] = [",".join(trees[key].crum_pages()) for key in keys]
    roots["derivations-table"] = [trees[key].html_table() for key in keys]
    roots["derivations-list"] = [trees[key].html_list() for key in keys]


if __name__ == "__main__":
    main()
