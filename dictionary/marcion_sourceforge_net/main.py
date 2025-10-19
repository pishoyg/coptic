#!/usr/bin/env python3
"""Crum 's main could run helpers.

TODO: (#448) This file should import flashcards and generate artifacts as a
primary function. The helpers should be secondary.
"""

import argparse
import itertools
from collections import abc

from dictionary.marcion_sourceforge_net import crum
from utils import log

_argparser = argparse.ArgumentParser()

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


def print_next_key(keys: abc.Container[str]) -> None:
    print(next(i for i in itertools.count(1) if str(i) not in keys))


def main():
    args = _argparser.parse_args()
    if args.root_key:
        print_next_key({r.key for r in crum.Crum.roots.values()})
        return
    if args.drv_key:
        print_next_key(
            {d.key for r in crum.Crum.roots.values() for d in r.derivations},
        )
        return
    log.fatal("No commands given!")


if __name__ == "__main__":
    main()
