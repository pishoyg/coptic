import hashlib

import field
import genanki
import type_enforced

MAX_ID = 1 << 31


class stats:

    def __init__(self):
        self._exported_notes = 0
        self._no_key = 0
        self._no_front = 0
        self._no_back = 0
        self._duplicate_key = 0

    def print(self):
        print(
            "\n".join(
                [
                    f"- Exported {self._exported_notes} notes.",
                    f"- {self._no_key} notes are missing a key.",
                    f"- {self._no_front} notes are missing a front.",
                    f"- {self._no_back} notes are missing a back.",
                    f"- {self._duplicate_key} notes are have duplicate keys.",
                ]
            )
        )


class Note(genanki.Note):
    @property
    @type_enforced.Enforcer
    def guid(self):
        # Only use the key field to generate a GUID.
        return genanki.guid_for(self.fields[2])


@type_enforced.Enforcer
def _hash(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest(), 17) % MAX_ID


# TODO: Add more type hints.
@type_enforced.Enforcer
def deck(
    deck_name: str,
    deck_id: int,
    deck_description: str,
    css: str,
    name: [None] + type_enforced.utils.WithSubclasses(field.field),
    key: type_enforced.utils.WithSubclasses(field.field),
    front: type_enforced.utils.WithSubclasses(field.field),
    back: type_enforced.utils.WithSubclasses(field.field),
    back_for_front: bool = False,
):
    """
    back_for_front:
        If true, and the front is absent, use the back instead.
    """
    single_deck = False
    if name is None:
        name = field.txt(deck_name)
        single_deck = True
    elif isinstance(name, field.txt):
        # The name is a field, but it's a constant-type field.
        assert deck_name == name.str()
        single_deck = True

    model = genanki.Model(
        model_id=deck_id,
        name=deck_name,
        fields=[
            {"name": "Front"},
            {"name": "Back"},
            {"name": "Key"},
        ],
        templates=[
            {
                "name": "template 1",
                "qfmt": '<div id="front"> {{Front}} </div>',
                "afmt": '<div id="front"> {{Front}} </div> <hr> <div id="back"> {{Back}} </div>',
            },
        ],
        css=css,
    )

    length = field.num_entries(name, key, front, back)
    assert length != field.NO_LENGTH
    decks = {}
    seen_keys = set()
    ss = stats()
    for _ in range(length):
        n = name.next()
        k = key.next()
        f = front.next()
        b = back.next()

        # TODO: Consider parameterizing leniency. Some decks have better data
        # sources, so your code is allowed to be more strict.
        assert n
        if not k:
            # No key! Skip!
            ss._no_key += 1
            continue
        if k in seen_keys:
            # Key already seen! Skip!
            ss._duplicate_key += 1
            continue
        seen_keys.add(k)
        if not f:
            # No front!
            ss._no_front += 1
            if back_for_front:
                f = b
            else:
                continue
        if not b:
            # No back! Do nothing!
            ss._no_back += 1
            pass

        if n not in decks:
            decks[n] = genanki.Deck(
                deck_id=deck_id if single_deck else _hash(n),
                name=n,
                description=deck_description,
            )
        note = Note(model=model, fields=[f, b, f"{deck_name} - {k}"])
        decks[n].add_note(note)
        ss._exported_notes += 1

    print(deck_name + ":")
    ss.print()
    print("____________________")
    return decks.values(), field.merge_media_files(key, front, back, name)
