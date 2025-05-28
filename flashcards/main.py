#!/usr/bin/env python3
"""Generate Lexicon data in HTML, Anki, and Xooxle formats."""

import argparse
import os

import genanki  # type: ignore[import-untyped]

import utils
import xooxle
from flashcards import constants, deck

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
    utils.verify_unique([d.deck_id for d in decks], "Deck ids")
    utils.verify_unique([d.name for d in decks], "Deck names")
    utils.verify_unique(
        [model.name for d in decks for model in d.models],
        "Model names",
    )
    utils.verify_unique(
        [model.id for d in decks for model in d.models],
        "Model ids",
    )
    utils.verify_unique(
        [node.guid for d in decks for node in d.notes],
        "Node GUIDs.",
    )


def write_anki(decks: list[deck.Deck]) -> None:
    utils.mk_parent_dir(ANKI_PATH)
    media_files: set[str] = set()
    anki_decks = []

    for d in decks:
        anki_deck, anki_media = d.anki()
        anki_decks.append(anki_deck)
        media_files.update(anki_media)

    # Anki doesn't allow duplicate basename.
    assert len(set(map(os.path.basename, media_files))) == len(media_files)
    verify_unique_object_keys(anki_decks)

    package = genanki.Package(anki_decks, media_files=media_files)
    package.write_to_file(ANKI_PATH)
    utils.wrote(ANKI_PATH)


def _decker_deck(decker: constants.Decker) -> deck.Deck:
    return decker.deck_()


def main() -> None:
    args = argparser.parse_args()

    # Write HTML output.
    if args.crum:
        constants.NAME_TO_DECKER[constants.CRUM_ALL].html()

    # Write Anki output.
    if args.anki:
        with utils.thread_pool_executor() as executor:
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
    with utils.thread_pool_executor() as executor:
        _ = list(executor.map(xooxle.Index.build, indexes))


if __name__ == "__main__":
    main()
