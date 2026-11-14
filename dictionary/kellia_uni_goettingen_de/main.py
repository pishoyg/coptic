#!/usr/bin/env python3
"""Process KELLIA's Dictionary."""

import argparse

from dictionary.kellia_uni_goettingen_de import kellia

_argparser = argparse.ArgumentParser("Process KELLIA's dictionary.")

# Unlike in the Crum pipeline, no other flag short-circuits the run, so
# `argparse` can reject the combination of these two by itself.
_tsv_flags = _argparser.add_mutually_exclusive_group()

_ = _tsv_flags.add_argument(
    "--tsv",
    action="store_true",
    default=False,
    help="Refresh the Bohairic supplemental TSV snapshot and exit.",
)

_ = _tsv_flags.add_argument(
    "--notsv",
    action="store_true",
    default=False,
    help="Skip refreshing the Bohairic supplemental TSV snapshot; read the"
    " tracked copy as is.",
)


def main():
    args = _argparser.parse_args()

    if not args.notsv:
        # Refresh the snapshot before anything can read it. The parsed records
        # are cached on their first read, so a stale read can not be corrected
        # later in the run.
        kellia.snapshot()

    if args.tsv:
        return

    kellia.XOOXLE.build()


if __name__ == "__main__":
    main()
