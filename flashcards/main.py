import argparse

import constants
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


@type_enforced.Enforcer
def verify_unique(lis: list):
    assert len(set(lis)) == len(lis)


@type_enforced.Enforcer
def verify_unique_object_keys(decks: list[genanki.Deck]) -> None:
    verify_unique([d.deck_id for d in decks])
    verify_unique([d.name for d in decks])
    verify_unique([model.name for d in decks for model in d.models])
    verify_unique([model.id for d in decks for model in d.models])
    verify_unique([node.guid for d in decks for node in d.notes])


@type_enforced.Enforcer
def main() -> None:
    media_files = set()
    decks = []

    for pair in constants.DECKS(args.decks):
        cur_decks, cur_media_files = pair

        decks.extend(cur_decks)
        media_files.update(cur_media_files)

    media_files = list(media_files)

    verify_unique_object_keys(decks)
    package = genanki.Package(decks, media_files=list(set(media_files)))
    package.write_to_file(args.output)

    field.WORK_DIR.cleanup()


if __name__ == "__main__":
    main()
