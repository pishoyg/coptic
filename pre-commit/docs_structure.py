#!/usr/bin/env python3
# In case the structure changes in in an unexpected way, this script will act as
# a reminder for the developers to update `.env` accordingly, particularly the
# `findex` / `findexx` helpers.

import argparse
import collections
import fnmatch
import pathlib
import typing

import bs4

import utils

parser = argparse.ArgumentParser(
    description="Validate the structure of docs/. Or report on HTML class usage.",
)
parser.add_argument(
    "-c",
    "--html_classes",
    action="store_true",
    help="Report on HTML class usage.",
)


class Pattern:
    def __init__(self, patterns: list[str], required: bool = True):
        self._patterns: list[str] = patterns
        assert self._patterns
        self._required: bool = required

    def is_html(self) -> bool:
        arr = [pattern.endswith("html") for pattern in self._patterns]
        assert len(set(arr)) == 1
        return any(arr)

    def string(self) -> str:
        return " | ".join(self._patterns)

    def match(self, paths: list[str]) -> tuple[list[str], list[str]]:
        results: dict[bool, list[str]] = {True: [], False: []}
        # hit stores whether any of our patterns achieved a hit at least once.
        hit = [False for _ in self._patterns]
        for path in paths:
            match = [
                fnmatch.fnmatch(path, pattern) for pattern in self._patterns
            ]
            hit = [h or m for h, m in zip(hit, match)]
            results[any(match)].append(path)

        assert len(results[True]) + len(results[False]) == len(paths)
        if self._required:
            assert len(hit) == len(self._patterns)
            for p, h in zip(self._patterns, hit):
                utils.assass(h, p, "did not match any files!")
        return results[True], results[False]


PATTERNS: list[Pattern] = [
    # Manually-written code files:
    Pattern(["index.html"]),
    Pattern(["style.css"]),
    Pattern(["crum/index.html", "crum/bashandy.html"]),
    Pattern(["dawoud/index.html"]),
    Pattern([".nojekyll"]),
    Pattern(["**.ts"]),
    # Data files:
    Pattern(["img/**"]),
    Pattern(["fonts/**"]),
    Pattern(["CNAME"]),
    # Auto-generated (JavaScript):
    Pattern(["**.js"]),
    # Auto-generated (lexicon):
    Pattern(["crum/*.html"]),
    Pattern(["crum/xooxle.json"]),
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
]


def __classes_in_file(path: pathlib.Path) -> set[str]:
    soup = bs4.BeautifulSoup(path.read_text(), "html.parser")
    return {cls for tag in soup.find_all(class_=True) for cls in tag["class"]}


def __join(items: typing.Iterable[str]) -> str:
    assert not isinstance(items, str)
    return "".join("\n - " + cls for cls in sorted(items))


def __print_classes(pattern_to_classes: dict[str, set[str]]):
    assert pattern_to_classes
    for pattern, classes in pattern_to_classes.items():
        utils.info(pattern, __join(classes), level=False)

    class_to_sets: collections.defaultdict[str, set[str]] = (
        collections.defaultdict(set)
    )
    for pattern, classes in pattern_to_classes.items():
        for cls in classes:
            class_to_sets[cls].add(pattern)

    for cls, patterns in class_to_sets.items():
        if len(patterns) >= 2:
            utils.warn(cls, __join(patterns), level=False)


def main():
    args = parser.parse_args()
    directory: pathlib.Path = pathlib.Path(utils.SITE_DIR).resolve()

    files: list[str] = [
        str(f.relative_to(directory))
        for f in directory.rglob("*")
        if f.is_file()
    ]

    pattern_to_classes: dict[str, set[str]] = {}
    for pattern in PATTERNS:
        matched, files = pattern.match(files)
        # See if we need to print the classes.
        if not args.html_classes:
            # Classes not requested.
            continue
        if not pattern.is_html():
            # Not HTML files.
            continue

        with utils.ProcessPoolExecutor() as executor:
            mapped = executor.map(
                __classes_in_file,
                [directory / f for f in matched],
            )
            classes: set[str] = {cls for classes in mapped for cls in classes}
            pattern_to_classes[pattern.string()] = classes

    utils.assass(
        not files,
        "The following files were not matched by any pattern:",
        files,
    )

    if args.html_classes:
        __print_classes(pattern_to_classes)


if __name__ == "__main__":
    main()
