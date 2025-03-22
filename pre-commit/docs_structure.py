#!/usr/bin/env python3
# In case the structure changes in in an unexpected way, this script will act as
# a reminder for the developers to update `.env` accordingly, particularly the
# `findex` / `findexx` helpers.

import fnmatch
import pathlib

import utils


class Pattern:
    def __init__(self, pattern: str, required: bool = True):
        self.pattern: str = pattern
        self.required: bool = required

    def match(self, paths: list[str]) -> tuple[list[str], list[str]]:
        results: dict[bool, list[str]] = {True: [], False: []}
        for path in paths:
            match = fnmatch.fnmatch(path, self.pattern)
            results[bool(match)].append(path)
        assert len(results[True]) + len(results[False]) == len(paths)
        return results[True], results[False]


PATTERNS: list[Pattern] = [
    # Manually-written code files:
    Pattern("index.html"),
    Pattern("style.css"),
    Pattern("crum/index.html"),
    Pattern("dawoud/index.html"),
    Pattern(".nojekyll"),
    Pattern("**.ts"),
    # Data files:
    Pattern("img/**"),
    Pattern("fonts/**"),
    Pattern("CNAME"),
    # Auto-generated (JavaScript):
    Pattern("**.js"),
    # Auto-generated (lexicon):
    Pattern("crum/*.html"),
    Pattern("crum/xooxle.json"),
    Pattern("crum/crum/*.png"),  # Crum scan.
    Pattern("crum/explanatory/*-*-*.*"),  # Explanatory images.
    Pattern("crum/anki/*", required=False),  # Anki is not tracked in Git.
    # Auto-generated (bible):
    Pattern("bible/index.html"),
    Pattern("bible/*.html"),
    Pattern(
        "bible/epub/*",
        required=False,
    ),  # Epub files are not tracked in Git.
    # Auto-generated (dawoud):
    Pattern("dawoud/*.jpg"),  # Dawoud scan is a JPG.
]


def main():
    directory: pathlib.Path = pathlib.Path(utils.SITE_DIR).resolve()

    files: list[str] = [
        str(f.relative_to(directory))
        for f in directory.rglob("*")
        if f.is_file()
    ]

    for pattern in PATTERNS:
        matched, files = pattern.match(files)
        if not pattern.required:
            continue
        utils.assass(matched, pattern.pattern, "did not match any files!")

    utils.assass(
        not files,
        "The following files were not matched by any pattern:",
        files,
    )


if __name__ == "__main__":
    main()
