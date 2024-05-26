import argparse
import parser

import constants
import gspread
import pandas as pd
import tree
import type_enforced
import word as lexical
from oauth2client.service_account import ServiceAccountCredentials

argparser = argparse.ArgumentParser(
    description="Parse and process the Marcion digital Coptic database,"
    "which is in turn based on the Crum Coptic dictionary."
)

# Input arguments.#############################################################
argparser.add_argument(
    "--coptwrd_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/marcion-input/coptwrd.tsv",
    help="Path to the input TSV file containing the words.",
)

argparser.add_argument(
    "--coptdrv_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/marcion-input/coptdrv.tsv",
    help="Path to the input TSV file containing the derivations.",
)

# The following are names of input columns.
WORD_COL = "word"
QUALITY_COL = "quality"
TYPE_COL = "type"
GR_COL = "gr"
EN_COL = "en"
CRUM_COL = "crum"

# Output arguments.############################################################
argparser.add_argument(
    "--roots_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
    help="Path to the output TSV file containing the roots.",
)

argparser.add_argument(
    "--derivations_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/output/derivations.tsv",
    help="Path to the output TSV file containing the derivations.",
)

argparser.add_argument(
    "--combined_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/output/combined.tsv",
    help="Path to the output TSV file containing the combined roots and"
    " derivations.",
)

argparser.add_argument(
    "--filter_dialects",
    type=str,
    nargs="+",
    default=constants.DIALECTS,
    help="For each of the provided dialect symboles, an extra column will be"
    " added to the sheet, containing only the words that belong to this"
    " dialect.",
)

argparser.add_argument(
    "--sort_roots",
    type=str,
    nargs="+",
    default=["key"],
    help="Fields to use for sorting the roots",
)

argparser.add_argument(
    "--sort_derivations",
    type=str,
    nargs="+",
    default=["key_word", "pos"],
    help="Fields to sort the derivations by. The current default results in"
    " the derivations showing the way they would show underneath their root"
    " word.",
)

# Gspread arguments.###########################################################
GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]

argparser.add_argument(
    "--gspread_credentials_json",
    type=str,
    help="Credentials file, used to write output to google sheet.",
)

argparser.add_argument(
    "--gspread_name",
    type=str,
    default="marcion-crum-parser",
    help="Name of the Google sheet to open / create."
    "If opening a sheet with this name fails, will try to create one instead.",
)

argparser.add_argument(
    "--gspread_owner",
    type=str,
    help="In case a new sheet is created, assign this as the owner of the sheet.",
)

args = argparser.parse_args()


# Main.########################################################################


@type_enforced.Enforcer
def series_to_int(series: pd.Series) -> list[int]:
    return [int(cell) for cell in series]


@type_enforced.Enforcer
def main() -> None:
    # Process roots.
    roots = pd.read_csv(args.coptwrd_tsv, sep="\t", dtype=str, encoding="utf-8").fillna(
        ""
    )
    process_data(roots, strict=True)
    parser.verify(constants.ROOTS_REFERENCE_COUNT * 2)
    parser.reset()

    # Process derivations.
    derivations = pd.read_csv(
        args.coptdrv_tsv, sep="\t", dtype=str, encoding="utf-8"
    ).fillna("")
    process_data(derivations, strict=False)
    parser.verify(constants.DERIVATIONS_REFERENCE_COUNT * 2)
    parser.reset()

    # Gain tree insights.
    build_trees(roots, derivations)

    # Write the roots.
    roots.sort_values(by=args.sort_roots, key=series_to_int, inplace=True)
    roots.to_csv(args.roots_tsv, sep="\t", index=False)
    if args.gspread_owner:
        write_to_gspread(roots)

    # Write the derivations.
    derivations.sort_values(by=args.sort_derivations, key=series_to_int, inplace=True)
    derivations.to_csv(args.derivations_tsv, sep="\t", index=False)
    if args.gspread_owner:
        write_to_gspread(derivations)


@type_enforced.Enforcer
def process_data(df: pd.DataFrame, strict: bool) -> None:
    extra_cols = {}

    @type_enforced.Enforcer
    def insert(prefix: str, col: str, cell: str) -> None:
        col = prefix + col
        del prefix
        if col not in extra_cols:
            extra_cols[col] = []
        extra_cols[col].append(cell)

    for _, row in df.iterrows():
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
            "-parsed-no-ref",
            "\n".join(w.string(include_references=False) for w in word),
        )
        insert(
            WORD_COL,
            "-parsed-no-html",
            parser.remove_html("\n".join(w.string() for w in word)),
        )
        insert(
            WORD_COL,
            "-parsed-no-ref-no-html",
            parser.remove_html(
                "\n".join(w.string(include_references=False) for w in word)
            ),
        )
        if strict:
            insert(
                WORD_COL,
                "dawoud-sort-key",
                dawoud_sort_key(word),
            )
        word = parser.parse_word_cell(
            row[WORD_COL], root_type, strict, detach_types=True, use_coptic_symbol=True
        )
        insert(
            WORD_COL,
            "-parsed-prettify",
            "\n".join(
                w.string(include_references=False, append_root_type=True) for w in word
            ),
        )

        if strict:
            insert(QUALITY_COL, "-parsed", parser.parse_quality_cell(row[QUALITY_COL]))
        insert(TYPE_COL, "-parsed", root_type.marcion())
        insert(GR_COL, "-parsed", parser.parse_greek_cell(row[GR_COL]))
        ep = parser.parse_english_cell(row[EN_COL])
        insert(EN_COL, "-parsed", ep)
        insert(EN_COL, "-parsed-no-html", parser.remove_html(ep))
        insert(EN_COL, "-parsed-no-greek", parser.remove_greek(ep))
        insert(EN_COL, "-parsed-light-greek", parser.lighten_greek(ep))
        insert(EN_COL, "-parsed-no-greek-no-html", parser.remove_greek_and_html(ep))
        crum_page, crum_column = parser.parse_crum_cell(row[CRUM_COL])
        insert(CRUM_COL, "-page", crum_page)
        insert(CRUM_COL, "-column", crum_column)
        for d in args.filter_dialects:
            entry = "\n".join(
                w.undialected_string(include_references=False, append_root_type=True)
                for w in word
                if w.is_dialect(d, undialected_is_all=True)
            )
            insert("dialect-", d, entry)

    for col, values in extra_cols.items():
        df[col] = values


@type_enforced.Enforcer
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
    roots["derivations-table"] = [trees[key].html() for key in keys]
    for d in args.filter_dialects:
        roots[f"dialect-{d}-derivations-table"] = [
            trees[key].html(dialect=d) for key in keys
        ]


@type_enforced.Enforcer
def dawoud_sort_key(words: list[lexical.structured_word]) -> str:
    for w in words:
        if w.is_dialect("B") and w.spellings():
            return w.spellings()[0]

    for w in words:
        if w.is_dialect("S") and w.spellings():
            return w.spellings()[0]

    return ""


@type_enforced.Enforcer
def write_to_gspread(df: pd.DataFrame) -> None:
    # TODO: Parameterize to make it possible to write to multiple sheets at the
    # same time, particularly for roots and derivations.
    credentials = ServiceAccountCredentials.from_json_keyfile_name(
        args.gspread_credentials_json, GSPREAD_SCOPE
    )
    client = gspread.authorize(credentials)

    try:
        spreadsheet = client.open(args.gspread_name)
    except:
        spreadsheet = client.create(args.gspread_name)
        spreadsheet.share(args.gspread_owner, perm_type="user", role="owner")

    spreadsheet.get_worksheet(0).update(
        [df.columns.values.tolist()] + df.values.tolist()
    )


if __name__ == "__main__":
    main()
