#!/usr/bin/env python3
"""Validate the TSV content by simply reading it.

Our reader performs validation.
"""

from . import tsv


def main():
    _ = tsv.roots()
    _ = tsv.derivations()


if __name__ == "__main__":
    main()
