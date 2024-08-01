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
    default=None,
    help="The list of deck names to export. If None, export all.",
)

argparser.add_argument(
    "--timestamp",
    type=float,
    default=None,
    help="Timestamp to use for the database.",
)

argparser.add_argument(
    "--anki",
    type=str,
    default="flashcards/data/output/anki/coptic.apkg",
    help="Path to the output Anki package.",
)

argparser.add_argument(
    "--dir",
    type=str,
    default="",
    help="Path to the output DIR directory. If given, for each deck, we will"
    " write a subdirectory containing the data in DIR format.",
)

argparser.add_argument(
    "--html",
    type=str,
    default="",
    help="Path to the output HTML directory. If given, for each deck, we will"
    " write a subdirectory containing the data in DIR format.",
)

argparser.add_argument(
    "--debug",
    type=bool,
    default=True,
    help="If true, run in debug mode.",
)
args = argparser.parse_args()


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
def write_anki(decks: list[deck.deck]) -> None:
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
    package.write_to_file(args.anki, timestamp=args.timestamp)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main() -> None:
    work_dir = tempfile.TemporaryDirectory()
    field.init(work_dir.name)
    decks = constants.DECKS(args.decks)

    for d in decks:
        filename = constants.file_name(d.deck_name)
        if args.dir:
            d.write_to_dir(os.path.join(args.dir, filename))
        if args.html:
            d.write_html(os.path.join(args.html, filename))

    if args.anki:
        pathlib.Path(os.path.dirname(args.anki)).mkdir(parents=True, exist_ok=True)
        write_anki(decks)

    work_dir.cleanup()


if __name__ == "__main__":
    main()
