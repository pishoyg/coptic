#!/usr/bin/env python3
import argparse
import os

import constants
import deck
import genanki  # type: ignore[import-untyped]

import utils
from web import xooxle

ANKI_PATH = os.path.join(constants.LEXICON_DIR, "anki/coptic.apkg")

argparser = argparse.ArgumentParser(
    description="Process Dictionary Data into HTML Pages, Anki Flashcards, and a JSON Index.",
)

argparser.add_argument(
    "--decks",
    type=str,
    nargs="*",
    default=[d.name() for d in constants.DECKERS],
    help="The list of deck names to process.",
)

argparser.add_argument(
    "--anki",
    action="store_true",
    help="If true, generate and write Anki output.",
)

argparser.add_argument(
    "--html",
    action="store_true",
    help="If true, generate and write HTML output.",
)

argparser.add_argument(
    "--xooxle",
    action="store_true",
    help="If true, generate and write the Xooxle index.",
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


def write_anki(decks: list[deck.deck]) -> None:
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


def _decker_deck(decker: constants.decker) -> deck.deck:
    return decker.deck_()


def main() -> None:
    args = argparser.parse_args()
    if not args.html and not args.anki and not args.xooxle:
        argparser.print_help()
        utils.throw("No commands specified!")

    deckers: list[constants.decker] = [
        d for d in constants.DECKERS if d.name() in args.decks
    ]

    if args.html:
        with utils.ThreadPoolExecutor() as executor:
            list(executor.map(constants.decker.html, deckers))

    if args.anki:
        with utils.ThreadPoolExecutor() as executor:
            decks = list(executor.map(_decker_deck, deckers))
            write_anki(decks)

    if args.xooxle:
        indexes = [idx for idx in constants.XOOXLE if idx.name in args.decks]
        with utils.ThreadPoolExecutor() as executor:
            list(executor.map(xooxle.index.build, indexes))


if __name__ == "__main__":
    main()
