#!/usr/bin/env python3
"""Process Andreas's Dictionary."""

import argparse
import functools

import gspread

from dictionary.stmacariusmonastery_org import andreas
from utils import gcp

argparser = argparse.ArgumentParser()

_ = argparser.add_argument(
    "--sheet",
    action="store_true",
    default=False,
    help="Update the Andreas sheet.",
)

GSPREAD_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1ZWfAw3L-7mWCfTuijmlC20eL3cj9xdzT6hM8ZTKAxgk"
)


@functools.cache
def _sheet() -> gspread.worksheet.Worksheet:
    return gcp.spreadsheet(GSPREAD_URL).get_worksheet(0)


def main():
    args: argparse.Namespace = argparser.parse_args()

    andreas.XOOXLE.build()

    words: list[andreas.DictionaryEntry] = andreas.words()
    if args.sheet:
        sheet: gspread.worksheet.Worksheet = _sheet()
        # TODO: (#595) Extract the Greek equivalent of Greek loanwords to a
        # separate column.
        gcp.overwrite_column(sheet, "Key", [w.key for w in words])
        gcp.overwrite_column(
            sheet,
            "Coptic",
            [w.front(html=False) for w in words],
        )
        gcp.overwrite_column(
            sheet,
            "Arabic",
            [w.back(html=False) for w in words],
        )


if __name__ == "__main__":
    main()
