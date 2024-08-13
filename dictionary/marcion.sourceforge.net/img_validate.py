import collections
import os
import re

import type_enforced

import utils

IMG_DIR = "dictionary/marcion.sourceforge.net/data/img"
IMG_300_DIR = "dictionary/marcion.sourceforge.net/data/img-300"
IMG_SOURCES_DIR = "dictionary/marcion.sourceforge.net/data/img-sources"

VALID_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".JPG", ".png", ".webp", ".svg"}
VALID_EXTENSIONS_300 = {".avif", ".gif", ".jpeg", ".jpg", ".JPG", ".webp"}

STEM_RE = re.compile(r"[0-9]+-[0-9]+-[0-9]+")

TYPE_ENFORCED = True


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def validate_extensions(images: list[str], accepted: set[str]) -> None:
    for file in images:
        ext = utils.ext(file)
        if ext in accepted:
            continue
        utils.fatal(
            "Unknown extension: ",
            ext,
            "Add it to the list if you're sure you can handle it.",
        )


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def validate_equal_sets(s1: set[str], s2: set[str], message: str) -> None:
    diff = s1.difference(s2)
    if diff:
        utils.fatal(message, diff, "present in the former but not the latter")

    diff = s2.difference(s1)
    if diff:
        utils.fatal(message, diff, "present in the latter but not the former")


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def stem_to_file(dir: str) -> dict[str, str]:
    paths = utils.paths(dir)
    # Check that all stems are unique.
    stems = list(map(utils.stem, paths))
    dupes = [stem for stem, count in collections.Counter(stems).items() if count > 1]
    if dupes:
        utils.fatal("The following keys are duplicate:", dupes)
    del dupes

    return {stem: path for stem, path in zip(stems, paths)}


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def main():
    images = stem_to_file(IMG_DIR)
    converted_images = stem_to_file(IMG_300_DIR)
    sources = stem_to_file(IMG_SOURCES_DIR)

    # Checking that extensions are valid.
    validate_extensions(list(images.values()), VALID_EXTENSIONS)
    validate_extensions(list(converted_images.values()), VALID_EXTENSIONS_300)
    validate_extensions(list(sources.values()), {".txt"})

    # Check that all images have valid names.
    for stem in images:
        match = STEM_RE.fullmatch(stem)
        if match:
            continue
        utils.fatal("Invalid stem: ", stem)

    # Verify that all three directories have the same set of IDs.
    validate_equal_sets(
        set(images.keys()), set(converted_images.keys()), "Images and converted images:"
    )
    validate_equal_sets(set(images.keys()), set(sources.keys()), "Images and sources:")

    # Check that the sources and converted images are more recent than the
    # original ones.
    offending: list[str] = []
    for k in images:
        image = images[k]
        converted = converted_images[k]
        source = sources[k]
        mtime = os.stat(image).st_mtime
        if mtime > os.stat(converted).st_mtime:
            offending.append(converted)
        if mtime > os.stat(source).st_mtime:
            offending.append(source)
    if offending:
        utils.fatal("Artifacts may be obsolete:", offending)


if __name__ == "__main__":
    main()
