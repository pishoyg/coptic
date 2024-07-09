import hashlib

import enforcer
import field
import genanki
import type_enforced

MAX_ID = 1 << 31


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
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
                    f"- {self._duplicate_key} notes have duplicate keys.",
                ]
            )
        )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class Note(genanki.Note):
    @property
    def guid(self):
        # Only use the key field to generate a GUID.
        return genanki.guid_for(self.fields[2])


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _hash(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest(), 17) % MAX_ID


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def deck(
    deck_name: str,
    deck_id: int,
    deck_description: str,
    css: str,
    name: field.OptionalField,
    key: field.Field,
    front: field.Field,
    back: field.Field,
    force_single_deck: bool = True,
    force_key: bool = True,
    force_no_duplicate_keys: bool = True,
    force_front: bool = True,
    force_back: bool = True,
    back_for_front: bool = False,
):
    """Generate an Anki package.

    Args:
        key:
        This is a critical field. The note keys will be used as database
        keys to enable synchronization. It is important for the keys to be (1)
        unique, and (2) persistent. Use a different key for each note. And do
        not change the names liberally between different version of the code
        and the generated package.
        The note keys must also be unique across decks.,

        front:
        Format of the card fronts. See description for syntax.

        back:
        Format of the card backs. See description for syntax.,

        model_name:
        Model name in the generated Anki package.,

        model_id:
        Deck ID in the generated Anki package.,

        css:
        Global CSS. Please notice that the front will be given the id
        "front" and the back will have the id "back". You can use these IDs if'
        you want to make your CSS format side-specific."
        Only TXT fields are allowed for this flag.,

        name:
        Deck name in the generated Anki package.
        N.B. If a deck ID is not
        given, a hash of this field will be used to key the decks. Thus, it is
        important to ensure that the deck names are (1) unique, and
        (2) persistent. Use a different deck name for each deck that you want
        to support. And do not change the names liberally between different
        version of the code and the generated package.,

        id:
        Deck ID in the generated Anki package.,

        description:
        Deck description in the generated Anki package. Only TXT fields are
        allowed here.,

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

    assert single_deck or not force_single_deck

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

        assert k or not force_key
        assert k not in seen_keys or not force_no_duplicate_keys
        assert f or not force_front
        assert b or not force_back

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
    return list(decks.values()), field.merge_media_files(key, front, back, name)
