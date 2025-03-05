#!/usr/bin/env python3
import argparse
import os
import tempfile

import constants
import deck
import field
import genanki  # type: ignore[import-untyped]

import utils

argparser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description="Regenerate the Anki package.",
)

LEXICON_DIR = os.path.join(utils.SITE_DIR, "crum/")

argparser.add_argument(
    "--decks",
    type=str,
    nargs="*",
    # TODO: This assumes that the dictionary keys will be sorted in a certain
    # way!
    default=list(constants.LAMBDAS.keys()),
    help="The list of deck names to export. If None, export all.",
)

argparser.add_argument(
    "--html",
    type=str,
    default=[LEXICON_DIR, "", "", "", "", "", "", ""],
    help="Path to the HTML output directory, per deck.",
)

argparser.add_argument(
    "--anki",
    type=str,
    default=os.path.join(LEXICON_DIR, "anki/coptic.apkg"),
    help="If given, will write a single Anki package to this path containing"
    " all decks combined.",
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


def write_anki(decks: list[deck.deck], path: str) -> None:
    media_files_set: set[str] = set()
    anki_decks = []

    for d in decks:
        anki_deck, anki_media = d.anki()

        anki_decks.append(anki_deck)
        media_files_set.update(anki_media)

    # Sorting the media files increases the chances that we will get an
    # identical Anki package in the output.
    media_files: list[str] = sorted(list(media_files_set))
    del media_files_set

    verify_unique_object_keys(anki_decks)
    package = genanki.Package(anki_decks, media_files=media_files)
    assert path
    package.write_to_file(path)
    utils.wrote(path)


def main() -> None:
    args = argparser.parse_args()
    assert len(args.decks) == len(args.html)

    work_dir = tempfile.TemporaryDirectory()
    field.init(work_dir.name)
    decks = [constants.LAMBDAS[name](name) for name in args.decks]

    for d, html_path in zip(decks, args.html):
        if not html_path:
            continue
        utils.mkdir(html_path)
        d.write_web(html_path)

    if args.anki:
        utils.mk_parent_dir(args.anki)
        write_anki(decks, args.anki)

    work_dir.cleanup()


if __name__ == "__main__":
    main()
