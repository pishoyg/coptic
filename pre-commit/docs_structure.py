#!/usr/bin/env python3
"""Enforce a known structure of `docs/`.

This script has two purposes:
  - Maintain a reference for developers to return to whenever they need to
    examine the structure of the `docs/` subdirectory (which is the root
    directory of our website).
  - Maintain the integrity of pieces of code that depend on the structure of
    `docs/`, such as the `findexx` env helper and the Playwright tests.
    Whenever the content of `docs/` changes in such a way that an update needs
    to be done to `findexx` or Playwright tests, this test will act as a
    reminder.

"""


# TODO: (#0) fnmatch is not strict enough! For example, it was found that
# `dir/*.txt` can match the file path `dir/dir/file.txt`! Figure this out!

import argparse
import collections
import fnmatch
import pathlib
import typing
from collections import abc

import bs4

from utils import concur, ensure, log, paths

parser = argparse.ArgumentParser(
    description="Validate the structure of `docs/`."
    " Or report on HTML class usage.",
)
_ = parser.add_argument(
    "-c",
    "--html_classes",
    action="store_true",
    help="Report on HTML class usage.",
)


class Pattern:
    """A file pattern."""

    def __init__(
        self,
        patterns: list[str],
        required: bool = True,
        print_: bool = True,
    ):
        self._patterns: list[str] = patterns
        assert self._patterns
        self._required: bool = required
        self.print: bool = print_

    def is_html(self) -> bool:
        return ensure.singleton(
            pattern.endswith("html") for pattern in self._patterns
        )

    @typing.override
    def __str__(self) -> str:
        return " | ".join(self._patterns)

    def match(self, file_paths: list[str]) -> tuple[list[str], list[str]]:
        results: dict[bool, list[str]] = {True: [], False: []}
        # hit stores whether any of our patterns achieved a hit at least once.
        hit = [False for _ in self._patterns]
        for path in file_paths:
            match = [
                fnmatch.fnmatch(path, pattern) for pattern in self._patterns
            ]
            hit = [h or m for h, m in zip(hit, match)]
            results[any(match)].append(path)

        assert len(results[True]) + len(results[False]) == len(file_paths)
        if self._required:
            assert len(hit) == len(self._patterns)
            for p, h in zip(self._patterns, hit):
                ensure.ensure(h, p, "did not match any files!")
        return results[True], results[False]

    def __lt__(self, other: typing.Self) -> bool:
        return self._patterns < other._patterns


# NOTE: If you change this list, the following may need to change:
# - The `findexx` helper
# - The list of HTML files included in Playwright tests (currently living at
# `test/test.ts`)

# I have a idea. How about, instead of reminding users to manually update the
# Playwright tests, we simply have the Playwright tests import this list of
# patterns? This way, the tests get updated automatically whenever this list
# changes.
# This is currently not possible because Playwright tests are written in
# TypeScript, while this is Python. I considered migrating this file to
# TypeScript, but it seemed that a TypeScript version of the code would be much
# larger.
# I also considered defining the Pattern class as a Protocol Buffer, and storing
# the list of patterns in a prototext file. But this is way too much work!
# As of now, this solution seems optimal.
# See https://github.com/pishoyg/coptic/issues/183.
PATTERNS: list[Pattern] = [
    # Manually-written code files:
    Pattern(["index.html"]),
    Pattern(["keyboard.html"]),
    Pattern(["**.css"]),
    Pattern(["crum/index.html"]),
    Pattern(["dawoud/index.html", "crum/crum/index.html"]),
    Pattern(["**.ts"]),
    # Data files:
    Pattern(["dawoud/*.tsv"]),
    Pattern(["img/**"]),
    Pattern(["fonts/**"]),
    Pattern([".nojekyll"]),
    Pattern(["CNAME"]),
    # Auto-generated (JavaScript):
    Pattern(["**.js"]),
    # Auto-generated (lexicon):
    Pattern(["crum/*.html"]),
    Pattern(
        [
            "crum/crum.json",
            "crum/wiki.json",
            "crum/kellia.json",
            "crum/copticsite.json",
        ],
    ),
    Pattern(["crum/crum/*.png"]),  # Crum scan.
    Pattern(["crum/explanatory/*-*-*.*"]),  # Explanatory images.
    Pattern(["crum/anki/*"], required=False),  # Anki is not tracked in Git.
    # Auto-generated (bible):
    Pattern(["bible/index.html"]),
    Pattern(["bible/*.html"]),
    Pattern(
        ["bible/epub/*"],
        required=False,
    ),  # Epub files are not tracked in Git.
    # Auto-generated (dawoud):
    Pattern(["dawoud/*.png"]),  # Dawoud scan is a PNG.
    # Garbage:
    Pattern([".DS_Store"], required=False, print_=False),
]


def _classes_in_file(path: pathlib.Path) -> set[str]:
    soup = bs4.BeautifulSoup(path.read_text(), "html.parser")
    return {cls for tag in soup.find_all(class_=True) for cls in tag["class"]}


def _join(items: abc.Iterable[Pattern | str]) -> str:
    return "".join("\n - " + str(cls) for cls in sorted(items))


def _print_classes(pattern_to_classes: dict[Pattern, set[str]]):
    assert pattern_to_classes
    for pattern, classes in pattern_to_classes.items():
        if not pattern.print:
            return
        log.info(f"{pattern}:", _join(classes), level=False)

    class_to_patterns: collections.defaultdict[str, list[Pattern]] = (
        collections.defaultdict(list)
    )
    for pattern, classes in pattern_to_classes.items():
        for cls in classes:
            class_to_patterns[cls].append(pattern)

    if all(len(patterns) <= 1 for patterns in class_to_patterns.values()):
        return
    log.error("Classes shared between different modules:", level=False)
    for cls, patterns in class_to_patterns.items():
        if len(patterns) >= 2:
            log.warn(f"{cls}:", _join(patterns), level=False)


def main():
    args = parser.parse_args()
    directory: pathlib.Path = pathlib.Path(paths.SITE_DIR).resolve()

    files: list[str] = [
        str(f.relative_to(directory))
        for f in directory.rglob("*")
        if f.is_file()
    ]

    pattern_to_classes: dict[Pattern, set[str]] = {}
    for pattern in PATTERNS:
        matched, files = pattern.match(files)
        # See if we need to print the classes.
        if not args.html_classes:
            # Classes not requested.
            continue
        if not pattern.is_html():
            # Not HTML files.
            continue

        with concur.process_pool_executor() as executor:
            mapped = executor.map(
                _classes_in_file,
                [directory / f for f in matched],
            )
            classes: set[str] = {cls for classes in mapped for cls in classes}
            pattern_to_classes[pattern] = classes

    ensure.ensure(not files, files, "did not match any patterns!")

    if args.html_classes:
        _print_classes(pattern_to_classes)


if __name__ == "__main__":
    main()
