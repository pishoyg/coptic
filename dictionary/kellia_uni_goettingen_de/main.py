#!/usr/bin/env python3
"""Process KELLIA's Dictionary."""

import argparse

from dictionary.kellia_uni_goettingen_de import cdo, kellia

_argparser = argparse.ArgumentParser("Process KELLIA's dictionary.")

_ = _argparser.add_argument(
    "--cdo",
    action="store_true",
    default=False,
    help="Refresh the snapshot of the Coptic Dictionary Online's entries, and"
    " exit.",
)

_DEFAULT_JOBS: int = 16

_ = _argparser.add_argument(
    "--jobs",
    type=int,
    default=None,
    help="The number of parallel downloads, with `--cdo`. Defaults to"
    f" {_DEFAULT_JOBS}.",
)


def main():
    args = _argparser.parse_args()

    if args.jobs is not None and not args.cdo:
        _argparser.error("--jobs requires --cdo")

    if args.cdo:
        cdo.download(_DEFAULT_JOBS if args.jobs is None else args.jobs)
        return

    kellia.XOOXLE.build()


if __name__ == "__main__":
    main()
