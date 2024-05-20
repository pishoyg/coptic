import hashlib

import field
import genanki
import type_enforced

MAX_ID = 1 << 31


class Note(genanki.Note):
    @property
    @type_enforced.Enforcer
    def guid(self):
        # Only use the key field to generate a GUID.
        return genanki.guid_for(self.fields[0])


@type_enforced.Enforcer
def _hash(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest(), 17) % MAX_ID


@type_enforced.Enforcer
def deck(key, front, back, model_name, model_id, css, name, id, description):
    # The key can not be constant.
    assert type(key) is not field.txt
    # The front and back must have defined lengths, and those must be
    # equal.
    assert front.length() == back.length() and front.length() > 0
    # The model information must be constant.
    assert type(model_name) is field.txt
    assert type(model_id) is field.txt
    assert type(css) is field.txt, type(css)
    # The name and id are elusive. They are either both constants, or we
    # get an array of names and no id.
    assert type(id) is field.txt
    if id.str():
        # An ID is given. This generates a single deck.
        assert type(name) is field.txt
    else:
        # The ID is absent. It will be generated as a hash of the name.
        # The name must be non-constant.
        assert name.length() > 0
    # The description must be a constant.
    assert type(description) is field.txt

    model_name = model_name.str()
    model_id = int(model_id.str())
    css = css.str()
    id = int(id.str()) if id.str() else 0
    description = description.str()

    model = genanki.Model(
        model_id=model_id,
        name=model_name,
        fields=[
            {"name": "Key"},
            {"name": "Front"},
            {"name": "Back"},
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

    length = field.num_entries(key, front, back, name)
    assert length != field.NO_LENGTH
    decks = {}
    seen_keys = set()
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
            continue
        if k in seen_keys:
            # Key already seen! Do nothing!
            pass
        seen_keys.add(k)
        if not f:
            # No front! Skip!
            continue
        if not b:
            # No back! Do nothing!
            pass

        if n not in decks:
            decks[n] = genanki.Deck(
                deck_id=id or _hash(n),
                name=n,
                description=description,
            )
        note = Note(model=model, fields=[k, f, b])
        decks[n].add_note(note)

    return decks.values(), field.merge_media_files(key, front, back, name)
