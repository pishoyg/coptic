#!/usr/bin/env python3
"""Process Andreas's Dictionary."""

import argparse

from dictionary.stmacariusmonastery_org import andreas
from utils import log

argparser = argparse.ArgumentParser()

_ = argparser.add_argument(
    "--hebrew",
    action="store_true",
    default=False,
    help="Print unknown Hebrew letters.",
)


def main():
    args: argparse.Namespace = argparser.parse_args()

    andreas.XOOXLE.build()

    if args.hebrew:
        # First parse the dataset.
        _ = list(andreas.words())

        log.warn("Unknown Hebrew characters:", len(andreas.hebrew_freq))
        for char, count in andreas.hebrew_freq.most_common():
            log.warn(f"{char}\t", count, level=False)
        return


if __name__ == "__main__":
    main()
