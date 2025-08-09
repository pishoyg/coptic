#!/usr/bin/env python3
"""Print non-empty Cells in a TSV Column."""
# TODO: (#183) Get rid of this file after migrating all of `stats.sh` to Python.
import sys

import pandas as pd

from utils import file


def main():
    path: str = sys.argv[1]
    col: str = sys.argv[2]
    df: pd.DataFrame = file.read_tsv(path)
    for cell in df.loc[df[col] != "", col]:
        print(cell)


if __name__ == "__main__":
    main()
