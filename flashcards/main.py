import argparse
import tempfile

import constants
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
    "--output",
    type=str,
    default="flashcards/data/coptic.apkg",
    help="Path to the output collection.",
)

argparser.add_argument(
    "--debug",
    type=bool,
    default=True,
    help="If true, run in debug mode.",
)
args = argparser.parse_args()


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def verify_unique(lis: list):
    assert len(set(lis)) == len(lis)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def verify_unique_object_keys(decks: list[genanki.Deck]) -> None:
    verify_unique([d.deck_id for d in decks])
    verify_unique([d.name for d in decks])
    verify_unique([model.name for d in decks for model in d.models])
    verify_unique([model.id for d in decks for model in d.models])
    verify_unique([node.guid for d in decks for node in d.notes])


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main() -> None:
    work_dir = tempfile.TemporaryDirectory()
    field.init(work_dir.name)

    media_files = set()
    decks = []

    for pair in constants.DECKS(args.decks):
        cur_deck, cur_media_files = pair

        decks.append(cur_deck)
        media_files.update(cur_media_files)

    # Sorting the media files increases the chances that we will get an
    # identical Anki package in the output.
    media_files = sorted(list(media_files))

    verify_unique_object_keys(decks)
    package = genanki.Package(decks, media_files=media_files)
    package.write_to_file(args.output, timestamp=args.timestamp)

    work_dir.cleanup()


if __name__ == "__main__":
    main()
