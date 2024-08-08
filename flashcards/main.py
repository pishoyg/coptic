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

argparser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description="Regenerate the Anki package.",
)


argparser.add_argument(
    "--decks",
    type=str,
    nargs="*",
    default=[
        constants.CRUM_ALL,
        constants.CRUM_BOHAIRIC,
        constants.CRUM_SAHIDIC,
        constants.CRUM_BOHAIRIC_SAHIDIC,
        constants.COPTICSITE_NAME,
        constants.KELLIA_COMPREHENSIVE,
        constants.KELLIA_EGYPTIAN,
        constants.KELLIA_GREEK,
    ],
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
    "--tsvs_mask",
    type=bool,
    nargs="*",
    default=[False] * len(constants.LAMBDAS),
    help="A mask indicating whether to write output for deck_i in TSVS."
    "The path will be ${OUTPUT_DIR}/tsvs/${DECK_NAME_NORMALIZED}.tsvs.",
)

argparser.add_argument(
    "--html_mask",
    type=bool,
    nargs="*",
    default=[True, True, False, False, False, False, False, False],
    help="A mask indicating whether to write output for deck_i in HTML."
    "The path will be ${OUTPUT_DIR}/html/${DECK_NAME_NORMALIZED}.html.",
)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def verify_unique(lis: list) -> None:
    assert len(set(lis)) == len(lis)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def verify_unique_object_keys(decks: list[genanki.Deck]) -> None:
    verify_unique([d.deck_id for d in decks])
    verify_unique([d.name for d in decks])
    verify_unique([model.name for d in decks for model in d.models])
    verify_unique([model.id for d in decks for model in d.models])
    verify_unique([node.guid for d in decks for node in d.notes])


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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main() -> None:
    args = argparser.parse_args()

    work_dir = tempfile.TemporaryDirectory()
    field.init(work_dir.name)
    decks = constants.DECKS(args.decks)
    assert len(decks) == len(args.html_mask) == len(args.tsvs_mask)

    for idx, d in enumerate(decks):
        filename = constants.file_name(d.deck_name)
        if args.tsvs_mask[idx]:
            dir = os.path.join(args.output_dir, "tsvs", filename)
            pathlib.Path(dir).mkdir(exist_ok=True)
            d.write_tsvs(dir)
        if args.html_mask[idx]:
            dir = os.path.join(args.output_dir, "html", filename)
            pathlib.Path(dir).mkdir(exist_ok=True)
            d.write_html(dir)

    if args.anki:
        write_anki(decks, os.path.join(args.output_dir, "anki", args.anki))

    work_dir.cleanup()


if __name__ == "__main__":
    main()
