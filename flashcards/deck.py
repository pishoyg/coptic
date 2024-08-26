import os
import pathlib
import shutil

import enforcer
import field
import genanki
import type_enforced

import utils

JS_BASENAME = "script.js"
CSS_BASENAME = "style.css"
HTML_FMT = f"""<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
    <link rel="stylesheet" type="text/css" href="{CSS_BASENAME}">
    <script type="text/javascript" src="{JS_BASENAME}" defer></script>
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

JS_FMT = """'use strict';
window.addEventListener("load", () => {{ {javascript} }});
"""


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class stats:
    def __init__(self) -> None:
        self._exported_notes = 0
        self._no_key = 0
        self._no_front = 0
        self._no_back = 0
        self._no_title = 0
        self._duplicate_key = 0

    def problematic(self, count: int, message: str) -> None:
        if count:
            utils.warn("", count, message)
            return
        utils.info("", count, message)

    def print(self) -> None:
        utils.info("Exported", self._exported_notes, "notes.")
        self.problematic(self._no_key, "notes are missing a key.")
        self.problematic(self._no_front, "notes are missing a front.")
        self.problematic(self._no_back, "notes are missing a back.")
        self.problematic(self._no_title, "notes are missing a title.")
        self.problematic(self._duplicate_key, "notes have duplicate keys.")


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
        javascript: str,
        key: field.Field,
        front: field.Field,
        back: field.Field,
        title: field.Field,
        force_key: bool = True,
        force_no_duplicate_keys: bool = True,
        force_front: bool = True,
        force_back: bool = True,
        force_title: bool = True,
        back_for_front: bool = False,
        key_for_title: bool = False,
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
            Format of the card backs. See description for syntax.

            title:
            The "title" field. If absent, the keys will be used as title.

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
        self.javascript: str = javascript
        self.keys: list[str] = []
        self.raw_keys: list[str] = []
        self.fronts: list[str] = []
        self.backs: list[str] = []
        self.titles: list[str] = []
        self.length: int = field.num_entries(key, front, back)

        assert self.length != field.NO_LENGTH
        seen_keys = set()
        ss = stats()
        for _ in range(self.length):
            k = key.next()
            f = front.next()
            b = back.next()
            t = title.next()

            assert k or not force_key
            assert k not in seen_keys or not force_no_duplicate_keys
            assert f or not force_front
            assert b or not force_back
            assert t or not force_title

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
            if not t:
                # No title!
                ss._no_title += 1
                if key_for_title:
                    t = k
                else:
                    continue

            self.keys.append(f"{deck_name} - {k}")
            self.fronts.append(f)
            self.backs.append(b)
            self.titles.append(t)
            ss._exported_notes += 1
            self.raw_keys.append(k)

        utils.info("Deck:", deck_name)
        ss.print()
        utils.info("____________________")
        self.media = field.merge_media_files(key, front, back)

    def clean_dir(self, dir: str) -> None:
        if os.path.exists(dir):
            assert os.path.isdir(dir)
            shutil.rmtree(dir)
        pathlib.Path(dir).mkdir(parents=True)

    def write_web(self, dir: str) -> None:
        self.clean_dir(dir)
        for rk, front, back, title in zip(
            self.raw_keys,
            self.fronts,
            self.backs,
            self.titles,
        ):
            with open(os.path.join(dir, rk + ".html"), "w") as f:
                f.write(
                    HTML_FMT.format(
                        css=self.css,
                        javascript=self.javascript,
                        title=title,
                        front=front,
                        back=back,
                    ),
                )
        with open(os.path.join(dir, JS_BASENAME), "w") as f:
            f.write(
                JS_FMT.format(
                    javascript=self.javascript.replace("'use strict';", ""),
                ),
            )
        with open(os.path.join(dir, CSS_BASENAME), "w") as f:
            f.write(self.css)
        for f in self.media:
            shutil.copy(f, dir)
        utils.wrote(dir)

    def html_to_anki(self, html: str) -> str:
        # TODO: This won't work if the HTML gets formatted before making it to
        # this step. Reimplement.
        html = html.replace(field.AUDIO_FMT_L, "[sound:")
        html = html.replace(field.AUDIO_FMT_R, "]")
        return html

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
                    "qfmt": '<div class="front"> {{Front}} </div>'
                    + f'<script type="text/javascript">{self.javascript}</script>',
                    "afmt": '<div class="front"> {{Front}} </div> <hr/> <div class="back"> {{Back}} </div>'
                    + f'<script type="text/javascript">{self.javascript}</script>',
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
            b = self.html_to_anki(b)
            note = Note(model=model, fields=[f, b, k])
            deck.add_note(note)
        return deck, self.media
