#!/usr/bin/env python3
"""Generate Lexicon data in HTML, Anki, and Xooxle formats."""

import argparse
import os

import genanki  # type: ignore[import-untyped]

from flashcards import constants, deck
from utils import concur, file, log, sane
from xooxle import xooxle

ANKI_PATH = os.path.join(constants.LEXICON_DIR, "anki/coptic.apkg")

argparser = argparse.ArgumentParser(
    description="Generate Lexicon data in HTML, Anki, and Xooxle formats.",
)

_ = argparser.add_argument(
    "--crum",
    action="store_true",
    default=False,
    help="Generate the Crum HTML and Xooxle index.",
)

_ = argparser.add_argument(
    "--kellia",
    action="store_true",
    default=False,
    help="Generate the KELLIA Xooxle index.",
)

_ = argparser.add_argument(
    "--copticsite",
    action="store_true",
    default=False,
    help="Generate the copticsite Xooxle index.",
)

_ = argparser.add_argument(
    "--anki",
    action="store_true",
    default=False,
    help="Generate the combined Anki package.",
)


def verify_unique_object_keys(decks: list[genanki.Deck]) -> None:
    sane.verify_unique([d.deck_id for d in decks], "Deck ids")
    sane.verify_unique([d.name for d in decks], "Deck names")
    sane.verify_unique(
        [model.name for d in decks for model in d.models],
        "Model names",
    )
    sane.verify_unique(
        [model.id for d in decks for model in d.models],
        "Model ids",
    )
    sane.verify_unique(
        [node.guid for d in decks for node in d.notes],
        "Node GUIDs.",
    )


def write_anki(decks: list[deck.Deck]) -> None:
    file.mk_parent_dir(ANKI_PATH)
    media_files: set[deck.MediaFile] = set()
    anki_decks: list[genanki.Deck] = []

    for d in decks:
        anki_deck, anki_media = d.anki()
        anki_decks.append(anki_deck)
        media_files.update(anki_media)

    verify_unique_object_keys(anki_decks)

    with concur.thread_pool_executor() as executor:
        _ = list(executor.map(deck.MediaFile.materialize, media_files))

    package = genanki.Package(
        anki_decks,
        media_files=[f.path() for f in media_files],
    )
    package.write_to_file(ANKI_PATH)
    log.wrote(ANKI_PATH)
    deck.MediaFile.clean()


def _decker_deck(decker: constants.Decker) -> deck.Deck:
    return decker.deck_()


def main() -> None:
    args = argparser.parse_args()

    # Write HTML output.
    if args.crum:
        constants.NAME_TO_DECKER[constants.CRUM_ALL].html()

    # Write Anki output.
    if args.anki:
        with concur.thread_pool_executor() as executor:
            decks = list(executor.map(_decker_deck, constants.DECKERS))
            write_anki(decks)

    # Write Xooxle output.
    indexes: list[xooxle.Index] = []
    if args.crum:
        indexes.append(constants.CRUM_XOOXLE)
    if args.kellia:
        indexes.append(constants.KELLIA_XOOXLE)
    if args.copticsite:
        indexes.append(constants.COPTICSITE_XOOXLE)
    with concur.thread_pool_executor() as executor:
        _ = list(executor.map(xooxle.Index.build, indexes))


if __name__ == "__main__":
    main()
