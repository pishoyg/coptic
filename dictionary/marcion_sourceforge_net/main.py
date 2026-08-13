#!/usr/bin/env python3
"""Generate Crum artifacts, and run helpers."""

import argparse
import itertools
import pathlib
from collections import abc

import pandas as pd

from dictionary.marcion_sourceforge_net import constants, crum, wiki
from flashcards import deck
from utils import concur, file, gcp, log, paths

# There is an asymmetry in the pipeline. We read the Marcion data straight from
# Google Sheets, but we take a snapshot of the Wiki sheet, track it in Git, and
# read that. This is motivated by the desire to review Wiki changes carefully:
# a snapshot turns a sheet edit into a `diff`.
# The Marcion format is much simpler, and a `diff` review of the output HTML
# serves it well enough.
# TODO: (#0) Consider tracking the Marcion source of truth in a local TSV as
# well.
_WIKI_SHEET_TSV_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1lhjcnkHS-pA3p5Vys-6ohKu7Y4ZCJ5NO/export?format=tsv"
)

_argparser = argparse.ArgumentParser("Generate Crum artifacts (by default).")

# Each of the following flags short-circuits the run, so at most one of them
# can be honored. Let `argparse` reject the combinations rather than let the
# order of the checks in `main` silently pick a winner.
_helpers = _argparser.add_mutually_exclusive_group()

_ = _helpers.add_argument(
    "-r",
    "--root-key",
    action="store_true",
    default=False,
    help="Print the smallest unused root key and exit.",
)

_ = _helpers.add_argument(
    "-d",
    "--drv-key",
    action="store_true",
    default=False,
    help="Print the smallest unused derivation key and exit.",
)

_ = _helpers.add_argument(
    "--tsv",
    action="store_true",
    default=False,
    help="Refresh the Wiki TSV snapshot and exit.",
)

_ = _helpers.add_argument(
    "--html",
    action="store_true",
    default=False,
    help="Generate HTMl and exit.",
)

_ = _helpers.add_argument(
    "--xooxle",
    action="store_true",
    default=False,
    help="Generate the Xooxle index and exit.",
)

# Unlike the flags above, this one doesn't short-circuit the run; it modifies
# how the run reads its input, so it must combine freely with them. It does
# conflict with `--tsv`, which exists to refresh the snapshot. `argparse` can't
# express that, since an action can only belong to one mutually exclusive
# group, so `main` rejects that pair itself.
_ = _argparser.add_argument(
    "--notsv",
    action="store_true",
    default=False,
    help="Skip refreshing the Wiki TSV snapshot; read the tracked copy as is.",
)


def _snapshot_wiki() -> None:
    """Refresh the local snapshot of the Wiki sheet, dropping the noise.

    We only save the columns used in the pipeline, which are listed in the
    `wiki.Col` enum. The sheet's other columns are the contributors' own
    bookkeeping, and they are pure noise in the snapshot: they would bloat the
    tracked file and fill its `diff` with churn that has no bearing on the
    output.
    """
    df: pd.DataFrame = gcp.tsv_spreadsheet(_WIKI_SHEET_TSV_URL)
    file.to_tsv(df[[col.value for col in wiki.Col]], paths.WIKI_TSV)


def _print_next_key(keys: abc.Container[str]) -> None:
    print(next(i for i in itertools.count(1) if str(i) not in keys))


# We have difficulty reading JSON files on Anki, so we generate the row number
# mapping in a JavaScript file.
def _row_nums_js(mapping: abc.Iterable[tuple[int, int]]) -> abc.Generator[str]:
    yield "export const MAPPING = {"
    for row in mapping:
        key, value = row
        yield f"{key}: {value},"
    yield "};\n"


def _write_row_nums(
    mapping: abc.Iterable[tuple[int, int]],
    dst: pathlib.Path,
) -> None:
    file.writelines(_row_nums_js(mapping), dst)


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
    # As of the time of writing, the root row number mapping is trivial. It's
    # simply:
    #   {x: x for x in range(1, MAX)}
    # We still store an explicit mapping so it will continue to work correctly
    # in case this variant no longer holds in the future.
    # The derivations mapping is larger, and it must be maintained as it's
    # non-trivial. We won't gain much from omitting the root row mapping.
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

    if args.tsv and args.notsv:
        log.fatal("--notsv", "not allowed with", "--tsv")

    if not args.notsv:
        # Refresh the snapshot before anything can read it. `wiki.wikis()`
        # caches the parsed records on its first call, so a stale read can not
        # be corrected later in the run.
        _snapshot_wiki()

    if args.tsv:
        return

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
