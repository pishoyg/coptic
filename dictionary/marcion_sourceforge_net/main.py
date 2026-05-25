#!/usr/bin/env python3
"""Generate Crum artifacts, and run helpers."""

import argparse
import itertools
import pathlib
from collections import abc

import pandas as pd

from dictionary.marcion_sourceforge_net import constants, crum, wiki
from flashcards import deck
from utils import concur, file, log, paths

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

_ = _argparser.add_argument(
    "--html",
    action="store_true",
    default=False,
    help="Generate HTMl and exit.",
)

_ = _argparser.add_argument(
    "--xooxle",
    action="store_true",
    default=False,
    help="Generate the Xooxle index and exit.",
)


def _print_next_key(keys: abc.Container[str]) -> None:
    print(next(i for i in itertools.count(1) if str(i) not in keys))


# We have difficulty reading JSON files on Anki, so we generate the row number
# mapping in a JavaScript file.
def _row_nums_js(mapping: abc.Iterable[tuple[int, int]]) -> abc.Generator[str]:
    yield "export const MAPPING = {"
    for row in mapping:
        key, value = row
        yield f"{key}: {value},"
    yield "};"


def _write_row_nums(
    mapping: abc.Iterable[tuple[int, int]],
    dst: pathlib.Path,
) -> None:
    file.write("".join(_row_nums_js(mapping)), dst)


class Page:
    """Page represents the range of a page in Crum's dictionary."""

    def __init__(self, num: int, start: str, end: str) -> None:
        self.num: int = num
        self.start: str = start
        self.end: str = end

    def entry(self) -> dict[str, str | int]:
        return {"page": self.num, "start": self.start, "end": self.end}


def _scan_index() -> abc.Generator[Page]:
    """
    Generate the Crum scan index, filling in gaps.

    Yields:
        Page objects representing pages in Crum's dictionary and their range.
    """
    last: Page | None = None
    for page_num, group_iter in itertools.groupby(
        (w for w in wiki.wikis() if not w.addendum()),
        key=lambda w: w.crum.num(),
    ):
        assert 1 <= page_num <= constants.CRUM_LAST_PAGE
        if last:
            assert page_num >= last.num
        group = list(group_iter)
        cur: Page = Page(
            page_num,
            group[0].lexicographic_key,
            group[-1].lexicographic_key,
        )
        # Some pages don't have headwords and aren't represented in the list of
        # Wiki objects. Fill in such gaps.
        if last:
            for num in range(last.num + 1, cur.num):
                yield Page(num, last.end, last.end)
        yield cur
        last = cur


def _write_one(obj: deck.Note | crum.IndexIndex) -> None:
    obj.write(paths.LEXICON_DIR)


def _write_html() -> None:
    with concur.thread_pool_executor() as executor:
        _ = [
            *executor.map(_write_one, crum.notes_aux()),
            *executor.map(_write_one, crum.indexer().generate_indexes()),
        ]
    log.wrote(paths.LEXICON_DIR)


def _write_page_index() -> None:
    df: pd.DataFrame = pd.DataFrame(p.entry() for p in _scan_index())
    assert len(df) == constants.CRUM_LAST_PAGE
    file.to_tsv(df, paths.file(paths.CRUM_SCAN_DIR, "coptic.tsv"))


def _write_sheet_index() -> None:
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


def _write_headword_index() -> None:
    headword_to_page: dict[str, str] = {}
    for w in wiki.wikis():
        for headword in w.headword_variants():
            # Entries are processed in order, so the first occurrence has the
            # smallest page. In case there are duplicate headwords, we want to
            # retain the first Crum page encountered. Use `setdefault` to insert
            # only if the entry doesn't exist already.
            _ = headword_to_page.setdefault(headword, str(w.crum))
    file.write(str(headword_to_page), paths.CRUM_HEADWORD_PAGE_MAP)


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

    if args.xooxle:
        crum.XOOXLE.build()
        return

    if args.html:
        _write_html()
        return

    _write_html()
    crum.XOOXLE.build()
    _write_page_index()
    _write_sheet_index()
    _write_headword_index()


if __name__ == "__main__":
    main()
