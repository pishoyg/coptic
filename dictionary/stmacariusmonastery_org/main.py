#!/usr/bin/env python3
"""Process Andreas's Dictionary."""
import argparse
import functools

import gspread

from dictionary.stmacariusmonastery_org import andreas
from utils import gcp, log

argparser = argparse.ArgumentParser()

_ = argparser.add_argument(
    "--hebrew",
    action="store_true",
    default=False,
    help="Print unknown Hebrew letters.",
)

_ = argparser.add_argument(
    "--sheet",
    action="store_true",
    default=False,
    help="Populate the sheet.",
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

    if args.sheet:
        sheet: gspread.worksheet.Worksheet = _sheet()
        gcp.overwrite_column(
            sheet,
            "Key",
            [word.key for word in andreas.words()],
        )
        gcp.overwrite_column(
            sheet,
            "Front",
            [word.front(html=False) for word in andreas.words()],
        )
        gcp.overwrite_column(
            sheet,
            "Back",
            [word.back(html=False) for word in andreas.words()],
        )

    if args.hebrew:
        # First parse the dataset.
        _ = list(andreas.words())

        log.warn("Unknown Hebrew characters:", len(andreas.hebrew_freq))
        for char, count in andreas.hebrew_freq.most_common():
            log.warn(f"{char}\t", count, level=False)
        return


if __name__ == "__main__":
    main()
