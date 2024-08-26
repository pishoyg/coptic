import argparse
import os
import pathlib
import tempfile

import constants
import deck
import enforcer
import field
import genanki
import type_enforced

import utils

argparser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description="Regenerate the Anki package.",
)


argparser.add_argument(
    "--decks",
    type=str,
    nargs="*",
    default=list(constants.LAMBDAS.keys()),
    help="The list of deck names to export. If None, export all.",
)

argparser.add_argument(
    "--output_dir",
    type=str,
    default="flashcards/data/output",
    help="Path to the output directory."
    "The output path for each file is ${OUTPUT_DIR}/${FORMAT}/${NAME}.${FORMAT}",
)

argparser.add_argument(
    "--anki",
    type=str,
    default="coptic.apkg",
    help="If given, will write a single Anki package to this path containing"
    " all decks combined, using this arg as the basename."
    "The output path will be ${OUTPUT_DIR}/anki/${VALUE_OF_THIS_ARG}",
)

argparser.add_argument(
    "--web_mask",
    type=bool,
    nargs="*",
    default=[True] + [False] * (len(constants.LAMBDAS) - 1),
    help="A mask indicating whether to write output for deck_i in WEB format."
    "The path will be ${OUTPUT_DIR}/web/${DECK_NAME_NORMALIZED}/${FILE_BASENAME}",
)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def verify_unique_object_keys(decks: list[genanki.Deck]) -> None:
    utils.verify_unique([d.deck_id for d in decks], "Deck ids")
    utils.verify_unique([d.name for d in decks], "Deck names")
    utils.verify_unique(
        [model.name for d in decks for model in d.models], "Model names"
    )
    utils.verify_unique(
        [model.id for d in decks for model in d.models], "Model ids"
    )
    utils.verify_unique(
        [node.guid for d in decks for node in d.notes], "Node GUIDs."
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def write_anki(decks: list[deck.deck], path: str) -> None:
    media_files = set()
    anki_decks = []

    for d in decks:
        anki_deck, anki_media = d.anki()

        anki_decks.append(anki_deck)
        media_files.update(anki_media)

    # Sorting the media files increases the chances that we will get an
    # identical Anki package in the output.
    media_files = sorted(list(media_files))

    verify_unique_object_keys(anki_decks)
    package = genanki.Package(anki_decks, media_files=media_files)
    assert path
    package.write_to_file(path)
    utils.wrote(path)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main() -> None:
    args = argparser.parse_args()

    work_dir = tempfile.TemporaryDirectory()
    field.init(work_dir.name)
    decks = [constants.LAMBDAS[name](name) for name in args.decks]
    assert len(decks) == len(args.web_mask)

    for idx, d in enumerate(decks):
        filename = constants.file_name(d.deck_name)
        if args.web_mask[idx]:
            dir = os.path.join(args.output_dir, "web", filename)
            pathlib.Path(dir).mkdir(exist_ok=True)
            d.write_web(dir)

    if args.anki:
        write_anki(decks, os.path.join(args.output_dir, "anki", args.anki))

    work_dir.cleanup()


if __name__ == "__main__":
    main()
