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


def assert_unique(s, key):
    assert key not in s, f"{s} already contains {key}"
    s.add(key)


def validate_unique_object_keys(decks):
    deck_ids = set()
    deck_names = set()
    model_ids = set()
    model_names = set()
    note_keys = set()
    for d in decks:
        assert_unique(deck_ids, d.deck_id)
        assert_unique(deck_names, d.name)
        for model in d.models:
            assert_unique(model_names, model.name)
            assert_unique(model_ids, model.id)
        for note in d.notes:
            assert_unique(note_keys, note.guid)


@type_enforced.Enforcer
def main():
    media_files = set()
    decks = []

    for pair in constants.DECKS:
        cur_decks, cur_media_files = pair

        decks.extend(cur_decks)
        media_files.update(cur_media_files)

    media_files = list(media_files)

    validate_unique_object_keys(decks)
    package = genanki.Package(decks, media_files=list(set(media_files)))
    package.write_to_file(args.output)

    field.WORK_DIR.cleanup()


if __name__ == "__main__":
    main()
