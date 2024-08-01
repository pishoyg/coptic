import json
import os
import pathlib
import shutil

import colorama
import enforcer
import field
import genanki
import pandas as pd
import type_enforced

HTML_FMT = f"""<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
    <meta name="deck_id" content="{{deck_id}}"/>
    <meta name="deck_name" content="{{deck_name}}"/>
    <meta name="deck_description" content="{{deck_description}}"/>
    <style>
      {{css}}
    </style>
  </head>
  <body>
    <div class="front">
        {{front}}
    </div>
    <hr/>
    <div class="back">
        {{back}}
    </div>
  </body>
</html>
"""


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class stats:

    def __init__(self) -> None:
        self._exported_notes = 0
        self._no_key = 0
        self._no_front = 0
        self._no_back = 0
        self._duplicate_key = 0

    def problematic(self, count: int, message: str) -> None:
        print(
            "- "
            + (colorama.Fore.RED if count else colorama.Fore.GREEN)
            + str(count)
            + colorama.Fore.RESET
            + message
        )

    def print(self) -> None:
        print(
            "- Exported "
            + colorama.Fore.GREEN
            + str(self._exported_notes)
            + colorama.Fore.RESET
            + " notes."
        )
        self.problematic(self._no_key, " notes are missing a key.")
        self.problematic(self._no_front, " notes are missing a front.")
        self.problematic(self._no_back, " notes are missing a back.")
        self.problematic(self._duplicate_key, " notes have duplicate keys.")


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class Note(genanki.Note):
    @property
    def guid(self):
        # Only use the key field to generate a GUID.
        assert self.fields
        return genanki.guid_for(self.fields[2])


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class deck:
    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        deck_description: str,
        css: str,
        key: field.Field,
        front: field.Field,
        back: field.Field,
        force_key: bool = True,
        force_no_duplicate_keys: bool = True,
        force_front: bool = True,
        force_back: bool = True,
        back_for_front: bool = False,
    ) -> None:
        """Generate an Anki package.

        Args:
            key:
            This is a critical field. The note keys will be used as database
            keys to enable synchronization. It is important for the keys to be (1)
            unique, and (2) persistent. Use a different key for each note. And do
            not change the keys liberally between different version of the code
            and the generated package.
            The note keys must also be unique across decks.,

            front:
            Format of the card fronts. See description for syntax.

            back:
            Format of the card backs. See description for syntax.,

            css:
            Global CSS. Please notice that the front will be given the id
            "front" and the back will have the id "back". You can use these IDs if'
            you want to make your CSS format side-specific."
            Only TXT fields are allowed for this flag.,

            deck_name:
            Deck name in the generated Anki package.

            deck_id:
            Deck ID in the generated Anki package.,

            deck_description:
            Deck description in the generated Anki package. Only TXT fields are
            allowed here.,

            back_for_front:
            If true, and the front is absent, use the back instead.
        """

        self.deck_name: str = deck_name
        self.deck_id: int = deck_id
        self.deck_description: str = deck_description
        self.css: str = css
        self.keys: list[str] = []
        self.raw_keys: list[str] = []
        self.fronts: list[str] = []
        self.backs: list[str] = []
        self.length: int = field.num_entries(key, front, back)

        assert self.length != field.NO_LENGTH
        seen_keys = set()
        ss = stats()
        for _ in range(self.length):
            k = key.next()
            f = front.next()
            b = back.next()

            assert k or not force_key
            assert k not in seen_keys or not force_no_duplicate_keys
            assert f or not force_front
            assert b or not force_back

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

            self.keys.append(f"{deck_name} - {k}")
            self.fronts.append(f)
            self.backs.append(b)
            ss._exported_notes += 1
            self.raw_keys.append(k)

        print(deck_name + ":")
        ss.print()
        print("____________________")
        self.media = field.merge_media_files(key, front, back)

    def clean_dir(self, dir: str) -> None:
        if os.path.exists(dir):
            assert os.path.isdir(dir)
            shutil.rmtree(dir)
        pathlib.Path(dir).mkdir(parents=True)

    def write_to_dir(self, dir: str) -> None:
        self.clean_dir(dir)
        metadata = json.dumps(
            {
                "deck_name": self.deck_name,
                "deck_id": self.deck_id,
                "deck_description": self.deck_description,
                "css": self.css,
            },
            ensure_ascii=False,
            allow_nan=False,
            indent=2,
            sort_keys=True,
        )
        with open(os.path.join(dir, "metadata.json"), "w") as f:
            f.write(metadata + "\n")

        records: list[dict[str, str]] = [
            {"key": k, "front": f, "back": b}
            for k, f, b in zip(self.keys, self.fronts, self.backs)
        ]
        df = pd.DataFrame(records)
        df.to_csv(
            os.path.join(dir, "data.tsv"),
            sep="\t",
            index=False,
            columns=["key", "front", "back"],
        )

    def write_html(self, dir: str) -> None:
        self.clean_dir(dir)
        for rk, front, back in zip(self.raw_keys, self.fronts, self.backs):
            with open(os.path.join(dir, rk + ".html"), "w") as f:
                f.write(
                    HTML_FMT.format(
                        deck_id=self.deck_id,
                        deck_name=self.deck_name,
                        deck_description=self.deck_description,
                        css=self.css,
                        title=rk,
                        front=front,
                        back=back,
                    )
                )
        for f in self.media:
            shutil.copy(f, dir)

    # TODO: Make the logic for the two export formats (anki, dir) uniform.
    def anki(self) -> tuple[genanki.Deck, list[str]]:
        model = genanki.Model(
            model_id=self.deck_id,
            name=self.deck_name,
            fields=[
                {"name": "Front"},
                {"name": "Back"},
                {"name": "Key"},
            ],
            templates=[
                {
                    "name": "template 1",
                    "qfmt": '<div class="front"> {{Front}} </div>',
                    "afmt": '<div class="front"> {{Front}} </div> <hr/> <div class="back"> {{Back}} </div>',
                },
            ],
            css=self.css,
        )

        deck = genanki.Deck(
            deck_id=self.deck_id,
            name=self.deck_name,
            description=self.deck_description,
        )
        for k, f, b in zip(self.keys, self.fronts, self.backs):
            # Notice that the field order is not uniform across our code.
            note = Note(model=model, fields=[f, b, k])
            deck.add_note(note)
        return deck, self.media
