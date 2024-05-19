import argparse
import parser

import constants
import gspread
import pandas as pd
from oauth2client.service_account import ServiceAccountCredentials

argparser = argparse.ArgumentParser(
    description="Parse and process the Marcion digital Coptic database,"
    "which is in turn based on the Crum Coptic dictionary."
)

# Input arguments.#############################################################
argparser.add_argument(
    "--coptwrd_tsv",
    type=str,
    default="data/marcion-input/coptwrd.tsv",
    help="Path to the input TSV file containing the words.",
)

argparser.add_argument(
    "--coptdrv_tsv",
    type=str,
    default="data/marcion-input/coptdrv.tsv",
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
    default="data/output/roots.tsv",
    help="Path to the output TSV file containing the roots.",
)

argparser.add_argument(
    "--derivations_tsv",
    type=str,
    default="data/output/derivations.tsv",
    help="Path to the output TSV file containing the derivations.",
)

# TODO: Generate a combined TSV.
argparser.add_argument(
    "--combined_tsv",
    type=str,
    default="data/output/combined.tsv",
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


def main():
    # Process roots.
    df = pd.read_csv(args.coptwrd_tsv, sep="\t", encoding="utf-8").fillna("")
    process_data(df, strict=True)
    df.to_csv(args.roots_tsv, sep="\t", index=False)

    if args.gspread_owner:
        write_to_gspread(df)
    parser.verify(constants.ROOTS_REFERENCE_COUNT * 2)
    parser.reset()

    # Process derivations.
    df = pd.read_csv(args.coptdrv_tsv, sep="\t", encoding="utf-8").fillna("")
    process_data(df, strict=False)
    df.to_csv(args.derivations_tsv, sep="\t", index=False)

    if args.gspread_owner:
        write_to_gspread(df)
    parser.verify(constants.DERIVATIONS_REFERENCE_COUNT * 2)
    parser.reset()


def process_data(df: pd.DataFrame, strict: bool):
    extra_cols = {}

    def insert(prefix, col, cell):
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
        insert(WORD_COL, "-parsed", "\n".join(w.str() for w in word))
        insert(
            WORD_COL,
            "-parsed-no-ref",
            "\n".join(w.str(include_references=False) for w in word),
        )
        insert(
            WORD_COL,
            "-parsed-no-html",
            parser.remove_html("\n".join(w.str() for w in word)),
        )
        insert(
            WORD_COL,
            "-parsed-no-ref-no-html",
            parser.remove_html(
                "\n".join(w.str(include_references=False) for w in word)
            ),
        )
        word = parser.parse_word_cell(
            row[WORD_COL], root_type, strict, detach_types=True, use_coptic_symbol=True
        )
        # TODO: Reconsider the "prettify" format.
        insert(
            WORD_COL,
            "-parsed-prettify",
            "\n".join(
                w.str(include_references=False, append_root_type=True) for w in word
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
        insert(EN_COL, "-parsed-no-greek-no-html", parser.remove_greek_and_html(ep))
        crum_page, crum_column = parser.parse_crum_cell(row[CRUM_COL])
        insert(CRUM_COL, "-page", crum_page)
        insert(CRUM_COL, "-pages", two_pages(crum_page))
        insert(CRUM_COL, "-column", crum_column)
        for d in args.filter_dialects:
            entry = "\n".join(
                w.undialected_str(include_references=False, append_root_type=True)
                for w in word
                if w.is_dialect(d)
            )
            insert("dialect-", d, entry)

    for col, values in extra_cols.items():
        df[col] = values


def write_to_gspread(df):
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


def two_pages(first_page):
    first_page = int(first_page)
    assert first_page <= constants.CRUM_LAST_PAGE_NUM
    if first_page == constants.CRUM_LAST_PAGE_NUM:
        return str(first_page)
    return "{},{}".format(first_page, first_page + 1)


if __name__ == "__main__":
    main()
