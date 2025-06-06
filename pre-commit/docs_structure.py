#!/usr/bin/env python3
"""Enforce a known structure of `docs/`.

This script has two purposes:
    - Help developers track the structure of the `docs/` subdirectory.
    - Maintain the integrity of the `findexx` env helper.
The former is achieved by maintaining the structure defined in the list of
patterns below. Developers can refer to this list for the contents of the
subdirectory, which is otherwise hard to analyze using `ls` or `tree`.

The latter is achieved by having the script remind users to update the helper
whenever the content of the subdirectory changes.
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

from utils import concur, log, paths

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
        arr = [pattern.endswith("html") for pattern in self._patterns]
        assert len(set(arr)) == 1
        return any(arr)

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
                log.assass(h, p, "did not match any files!")
        return results[True], results[False]

    def __lt__(self, other: typing.Self) -> bool:
        return self._patterns < other._patterns


PATTERNS: list[Pattern] = [
    # NOTE: If you change this list, see if the `findexx` helper needs updating
    # as well.
    # Manually-written code files:
    Pattern(["index.html"]),
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
    Pattern(["crum/crum.json", "crum/kellia.json", "crum/copticsite.json"]),
    Pattern(["crum/crum/*.png"]),  # Old Crum scan.
    Pattern(["crum/crum/*.jpeg"]),  # New Crum scan.
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
    Pattern(["dawoud/*.jpg"]),  # Dawoud scan is a JPG.
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

    log.assass(
        not files,
        "The following files were not matched by any pattern:",
        files,
    )

    if args.html_classes:
        _print_classes(pattern_to_classes)


if __name__ == "__main__":
    main()
