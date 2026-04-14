#!/usr/bin/env python3
"""Write the Anki package."""

import genanki  # type: ignore[import-untyped]

from dictionary.kellia_uni_goettingen_de import kellia
from dictionary.marcion_sourceforge_net import crum
from dictionary.stmacariusmonastery_org import andreas
from flashcards import deck
from utils import concur, ensure, file, log, paths

# NOTE: The deck IDs are protected fields. They are used as database keys for
# the decks. Do NOT change them!
#
# The deck names are protected fields. Do NOT change them. They are used for:
# 1. Display in the Anki UI, including nesting.
# 2. Prefixes for the note keys, to prevent collisions between notes in
#    different decks.
# 3. Model names (largely irrelevant).
#
# NOTE: If the `name` argument is provided, it overrides the first use case
# (display), but the deck names continue to be used for prefixing and model
# names.
# It's for the second reason, and to a lesser extend the first as well, that
# the names should NOT change. If the DB keys diverge, synchronization will
# mess up the data! Importing a new deck will result in the notes being
# duplicated rather than replaced or updated.

# NOTE: Besides the constants hardcoded below, the "name" and "key" fields in
# the deck generation logic are also protected.
# The "name" argument is used to generate deck names for datasets that generate
# multiple decks.
# The "key" field is used to key the notes.

DECKS: list[deck.Deck] = [
    deck.Deck(
        "A Coptic Dictionary::All Dialects",
        1284010387,
        crum.notes_aux(),
    ),
    deck.Deck(
        "A Coptic Dictionary::Bohairic",
        1284010383,
        crum.notes_aux({"B"}),
    ),
    deck.Deck(
        "A Coptic Dictionary::Sahidic",
        1284010386,
        crum.notes_aux({"S"}),
    ),
    deck.Deck(
        "A Coptic Dictionary::Bohairic / Sahidic",
        1284010390,
        crum.notes_aux({"B", "S"}),
    ),
    deck.Deck(
        "KELLIA::Comprehensive",
        1284010391,
        kellia.notes_aux(kellia.comprehensive()),
    ),
    deck.Deck(
        "KELLIA::Egyptian",
        1284010392,
        kellia.notes_aux(kellia.egyptian()),
    ),
    deck.Deck("KELLIA::Greek", 1284010393, kellia.notes_aux(kellia.greek())),
    deck.Deck(
        "KELLIA::Greek::Bohairic",
        1284010395,
        kellia.notes_aux(kellia.greek(("B",))),
    ),
    deck.Deck("Andreas of St. Macarius", 1284010394, andreas.notes_aux()),
]


def verify_unique_object_keys(decks: list[genanki.Deck]) -> None:
    ensure.unique((d.deck_id for d in decks), "Deck ids")
    ensure.unique((d.name for d in decks), "Deck names")
    ensure.unique(
        (model.name for d in decks for model in d.models),
        "Model names",
    )
    ensure.unique((model.id for d in decks for model in d.models), "Model ids")
    ensure.unique(
        (node.guid for d in decks for node in d.notes),
        "Node GUIDs.",
    )


def main() -> None:
    file.mk_parent_dir(paths.ANKI_DIR)
    media_files: set[deck.MediaFile] = set()
    anki_decks: list[genanki.Deck] = []

    for d in DECKS:
        anki_deck, anki_media = d.anki()
        anki_decks.append(anki_deck)
        media_files.update(anki_media)

    verify_unique_object_keys(anki_decks)

    with concur.thread_pool_executor() as executor:
        _ = list(executor.map(deck.MediaFile.materialize, media_files))

    package = genanki.Package(
        anki_decks,
        media_files=[f.path() for f in media_files],
    )
    package.write_to_file(paths.ANKI_DIR)
    log.wrote(paths.ANKI_DIR)
    deck.MediaFile.clean()


if __name__ == "__main__":
    main()
