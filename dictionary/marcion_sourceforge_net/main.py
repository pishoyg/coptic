#!/usr/bin/env python3
"""Generate Crum artifacts, and run helpers."""
# TODO: (#448) This file should import flashcards and generate all Crum
# artifacts by default.

import argparse
import itertools
import pathlib
from collections import abc

from dictionary.marcion_sourceforge_net import crum
from utils import file, paths

_argparser = argparse.ArgumentParser("Generate Crum artifacts (by default).")

_ = _argparser.add_argument(
    "-r",
    "--root-key",
    action="store_true",
    default=False,
    help="Print the smallest unused root key and exit.",
)

_ = _argparser.add_argument(
    "-d",
    "--drv-key",
    action="store_true",
    default=False,
    help="Print the smallest unused derivation key and exit.",
)


def _print_next_key(keys: abc.Container[str]) -> None:
    print(next(i for i in itertools.count(1) if str(i) not in keys))


# We have difficulty reading JSON files on Anki, so we generate the row number
# mapping in a JavaScript file.
def _row_nums_js(mapping: abc.Iterable[tuple[int, int]]) -> abc.Generator[str]:
    yield "/* eslint-disable max-lines */"
    yield "export const MAPPING = {"
    for row in mapping:
        key, value = row
        yield f"{key}: {value},"
    yield "};"
    yield "/* eslint-enable max-lines */"


def _write_row_nums(
    mapping: abc.Iterable[tuple[int, int]],
    dst: pathlib.Path,
) -> None:
    file.write("".join(_row_nums_js(mapping)), dst)


def main():
    args = _argparser.parse_args()
    if args.root_key:
        _print_next_key({r.key for r in crum.Crum.roots.values()})
        return
    if args.drv_key:
        _print_next_key(
            {d.key for r in crum.Crum.roots.values() for d in r.derivations},
        )
        return
    _write_row_nums(
        ((root.num, root.row_num) for root in crum.Crum.roots.values()),
        paths.CRUM_ROOTS_ROW_NUMS,
    )
    # For derivations, we only record the row number of the first derivations.
    # The rest can be inferred.
    _write_row_nums(
        (
            (root.num, root.derivations[0].row_num)
            for root in crum.Crum.roots.values()
            if root.derivations
        ),
        paths.CRUM_DERIVATIONS_ROW_NUMS,
    )


if __name__ == "__main__":
    main()
