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
def listdir_sorted(dir: str) -> list[str]:
    return utils.sort_semver(utils.paths(dir))


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def main():
    images = listdir_sorted(IMG_DIR)
    converted_images = listdir_sorted(IMG_300_DIR)
    sources = listdir_sorted(IMG_SOURCES_DIR)

    utils.verify_unique(utils.stems(images), "images:")
    utils.verify_unique(utils.stems(converted_images), "converted images:")
    utils.verify_unique(utils.stems(sources), "sources:")

    # Checking that extensions are valid.
    utils.verify_all_belong_to_set(
        utils.exts(images), VALID_EXTENSIONS, "Images: Unknown extension:"
    )
    utils.verify_all_belong_to_set(
        utils.exts(converted_images),
        VALID_EXTENSIONS_300,
        "Converted Images: Unknown extension:",
    )
    utils.verify_all_belong_to_set(
        utils.exts(sources), {".txt"}, "Sources: Unknown extension:"
    )

    # Verify that all three directories have the same set of IDs.
    utils.verify_equal_sets(
        utils.stems(images),
        utils.stems(converted_images),
        "Images and converted images:",
    )
    utils.verify_equal_sets(
        utils.stems(images), utils.stems(sources), "Images and sources:"
    )

    # Check that all images have valid IDs.
    for stem in utils.stems(images):
        match = STEM_RE.fullmatch(stem)
        if match:
            continue
        utils.fatal("Invalid stem:", stem)

    # Check that the sources and converted images are more recent than the
    # original ones.
    offending: list[str] = []
    for image, converted, source in zip(images, converted_images, sources):
        # Sanity check!
        assert utils.stem(image) == utils.stem(converted) == utils.stem(source)
        mtime = os.stat(image).st_mtime
        if mtime > os.stat(converted).st_mtime:
            offending.append(converted)
        if mtime > os.stat(source).st_mtime:
            offending.append(source)
    if offending:
        utils.fatal("Artifacts may be obsolete:", offending)


if __name__ == "__main__":
    main()
