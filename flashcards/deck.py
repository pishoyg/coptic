import os
import pathlib
import shutil
import typing

import field
import genanki  # type: ignore[import-untyped]

import utils

JS_BASENAME = "script.js"
CSS_BASENAME = "style.css"
HTML_HEAD = f"""
  <head>
    <title>{{title}}</title>
    <link rel="stylesheet" type="text/css" href="{CSS_BASENAME}">
    <script>const {{page_class}} = true;</script>
    <script type="text/javascript" src="{JS_BASENAME}" defer></script>
    {{links}}
  </head>
"""

HTML_FMT = f"""<!DOCTYPE html>
<html>
  {HTML_HEAD}
  <body>
    <div class="front" id="front">
        {{front}}
    </div>
    <hr/>
    <div class="back" id="back">
        {{back}}
    </div>
  </body>
</html>
"""

# The HTML FMT string for a category index.
HTML_CAT_FMT = f"""<!DOCTYPE html>
<html>
  {HTML_HEAD}
  <body>
  {{body}}
  </body>
</html>
"""

# NOTE: In the Anki version of JavaScript, everything is wrapped in a function,
# because global variables have been problematic with Anki.
# See https://github.com/pishoyg/coptic/issues/186.
ANKI_JS_FMT = """(() => {{
    const ANKI = true;
    {javascript}
}})();"""


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


class Note(genanki.Note):
    @property
    def guid(self):
        # Only use the key field to generate a GUID.
        assert self.fields
        return genanki.guid_for(self.fields[2])


class deck:
    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        deck_description: str,
        css: str,
        javascript: str,
        key: field.field,
        front: field.field,
        back: field.field,
        title: field.field,
        prev: typing.Optional[field.field] = None,
        next: typing.Optional[field.field] = None,
        search: str = "",
        force_key: bool = True,
        force_no_duplicate_keys: bool = True,
        force_front: bool = True,
        force_back: bool = True,
        force_title: bool = True,
        back_for_front: bool = False,
        key_for_title: bool = False,
        category_generate: typing.Callable | None = None,
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
        self.prevs: list[str] = []
        self.nexts: list[str] = []
        self.search: str = search
        self.length: int = field.num_entries(key, front, back)

        assert self.length != field.NO_LENGTH
        seen_keys = set()
        ss = stats()
        for _ in range(self.length):
            k = key.next()
            f = front.next()
            b = back.next()
            t = title.next()
            p = prev.next() if prev else ""
            n = next.next() if next else ""

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

            assert isinstance(k, str)
            assert isinstance(f, str)
            assert isinstance(b, str)
            assert isinstance(t, str)
            assert isinstance(n, str)
            assert isinstance(p, str)
            self.keys.append(f"{deck_name} - {k}")
            self.raw_keys.append(k)
            self.fronts.append(f)
            self.backs.append(b)
            self.titles.append(t)
            self.nexts.append(n)
            self.prevs.append(p)
            ss._exported_notes += 1

        utils.info("Deck:", deck_name)
        ss.print()
        utils.info("____________________")
        self.media = field.merge_media_files(key, front, back)
        self.category_generate = category_generate

    def clean_dir(self, dir: str) -> None:
        if os.path.exists(dir):
            assert os.path.isdir(dir)
            shutil.rmtree(dir)
        pathlib.Path(dir).mkdir(parents=True)

    def write_web(self, dir: str) -> None:
        self.clean_dir(dir)
        for rk, front, back, title, prev, next in zip(
            self.raw_keys,
            self.fronts,
            self.backs,
            self.titles,
            self.prevs,
            self.nexts,
        ):
            with open(os.path.join(dir, rk + ".html"), "w") as f:
                links: list[str] = []
                if prev:
                    links.append(f'<link rel="prev" href="{prev}">')
                if next:
                    links.append(f'<link rel="next" href="{next}">')
                if self.search:
                    links.append(f'<link rel="search" href="{self.search}">')

                f.write(
                    HTML_FMT.format(
                        title=title,
                        page_class="NOTE",
                        front=front,
                        back=back,
                        links="\n".join(links),
                    ),
                )
        if self.javascript:
            with open(os.path.join(dir, JS_BASENAME), "w") as f:
                f.write(self.javascript)
        with open(os.path.join(dir, CSS_BASENAME), "w") as f:
            f.write(self.css)
        for path in self.media:
            shutil.copy(path, dir)
        utils.wrote(dir)

        if not self.category_generate:
            return
        for title, html_body in self.category_generate():
            with open(os.path.join(dir, title + ".html"), "w") as f:
                f.write(
                    HTML_CAT_FMT.format(
                        title=title,
                        page_class="CATEGORY",
                        links="",
                        body=html_body,
                    ),
                )
        utils.wrote(dir)

    def html_to_anki(self, html: str) -> str:
        # TODO: This won't work if the HTML gets formatted before making it to
        # this step. Reimplement.
        html = html.replace(field.AUDIO_FMT_L, "[sound:")
        html = html.replace(field.AUDIO_FMT_R, "]")
        return html

    def anki(self) -> tuple[genanki.Deck, list[str]]:
        javascript = ANKI_JS_FMT.format(javascript=self.javascript)
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
                    + f'<script type="text/javascript">{javascript}</script>',
                    "afmt": '<div class="front"> {{Front}} </div> <hr/> <div class="back"> {{Back}} </div>'
                    + f'<script type="text/javascript">{javascript}</script>',
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
