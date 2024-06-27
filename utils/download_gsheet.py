import argparse

import gspread
import pandas as pd
import type_enforced
from oauth2client import service_account

GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]

argparser = argparse.ArgumentParser("Download from gsheet to TSV.")

argparser.add_argument(
    "--json_keyfile_name",
    type=str,
    default="",
    help="Path to the credentials file.",
)

argparser.add_argument(
    "--gspread_url",
    type=str,
    default="",
    help="Gsheet URL.",
)

argparser.add_argument(
    "--column_names",
    type=str,
    nargs="*",
    default="",
    help="List of column names to include in the output.",
)

argparser.add_argument(
    "--out_tsv",
    type=str,
    default="",
    help="Path to the output file.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def main() -> None:
    credentials = service_account.ServiceAccountCredentials.from_json_keyfile_name(
        args.json_keyfile_name, GSPREAD_SCOPE
    )
    sheet = gspread.authorize(credentials).open_by_url(args.gspread_url)
    records = sheet.get_worksheet(0).get_all_records()
    df = pd.DataFrame(records)
    df.to_csv(args.out_tsv, sep="\t", index=False, columns=args.column_names)


if __name__ == "__main__":
    main()
