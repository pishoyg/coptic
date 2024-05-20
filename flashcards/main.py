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
    "--output",
    type=str,
    default="flashcards/data/coptic.apkg",
    help="Path to the output collection.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def main():
    media_files = set()
    decks = []

    for pair in constants.DECKS:
        cur_decks, cur_media_files = pair

        decks.extend(cur_decks)
        media_files.update(cur_media_files)

    media_files = list(media_files)
    package = genanki.Package(decks, media_files=media_files)
    package.write_to_file(args.output)

    field.WORK_DIR.cleanup()


if __name__ == "__main__":
    main()
