"""A dictionary deck.

### Anki Keys and Synchronization

When you import a package into your (personal) Anki database, Anki uses the
IDs to eliminate duplicates.

Uniqueness is therefore important. But what is trickier, and perhaps more
important, is persistence. If we export new versions of a certain deck
regularly, we should maintain persistent IDs to ensure correct
synchronization. Otherwise, identical pieces of data that have distinct IDs
will result in duplicates.

There are three types of IDs in the generated package:

1. Note ID

`genanki` suggests[1] defining the GUID as a hash of a subset of fields that
uniquely identify a note.

*The GUID must be unique across decks.* Therefore, this subset of field
values must be unique, including across decks. You can solve this by
prefixing the keys with the name of the deck.

In our script, we ask the user to provide a list of keys as part of their
input, along the list of fronts, backs, deck names, ... etc.
The users of the package must assign the keys properly, ensuring uniqueness,
and refraining from changing / reassigning them afterwards.

This is somewhat straightforward for Crum's dictionary, as the use of the
Marcion keys for synchronization should suffice. It is also straightforward for
the KELLIA dictionary.

For other data creators without programming expertise, a sequence number
works as long as nobody inserts a new row in the middle of their data, which
would mess up the keys. Discuss keying with those creators. As of today,
only Andreas's data has this problem.

2. Deck ID

Deck IDs are hardcoded.

3. Model ID

Model IDs are hardcoded.

[1] https://github.com/kerrickstaley/genanki?tab=readme-ov-file#note-guids

"""

# TODO: (#0) For text generation, it's likely more efficient to use generators
# and avoid concatenating the strings, unless necessary.
# You can also use `writelines` instead of `write` to write a file, thus
# avoiding saving the data in memory at any point.

import os
import pathlib
import re
import shutil
import tempfile
import typing
from collections import abc

import genanki  # type: ignore[import-untyped]

from utils import ensure, file, page, paths, system

NOTE_CLASS = "note"

IMG_SRC_FMT: re.Pattern[str] = re.compile(r'<img src="([^"]+)"')
FONT_SRC_RE: re.Pattern[str] = re.compile(r"src: url\('([^']*)'\)")


class GenankiNote(genanki.Note):
    """GenankiNote represents an Anki Note.

    As of the time of writing, this is merely a wrapper used to override a
    method.

    """

    @property
    @typing.override
    def guid(self):
        # Only use the key field to generate a GUID.
        assert self.fields
        return genanki.guid_for(self.fields[2])

    @guid.setter
    def guid(self, val):  # dead: disable
        del val
        # We should never directly use the setter.
        raise AttributeError


class Note:
    """Note is a single note in a deck."""

    def __init__(
        self,
        key: str,
        front: str,
        back: str,
        title: str,
        prv: str = "",
        nxt: str = "",
        search: str = "",
        js_start: str = "",
        js_path: str = "",
        css: list[str] | None = None,
        force_content: bool = True,
    ) -> None:

        assert key
        assert title
        if force_content:
            assert front
            assert back
        else:
            assert front or back

        self.key: str = key
        self.front: str = front
        self.back: str = back
        self.js_path: str = js_path
        self.css: list[str] = css or []
        self.head: str = page.html_head(
            title=title,
            search=search,
            next_href=nxt,
            prev_href=prv,
            scripts=[js_path] if js_path else [],
            css=css,
        )
        self.html: str = "".join(self.__html_aux())
        self.js_start: str = js_start

    def __html_aux(self) -> abc.Generator[str]:
        return page.html_aux(
            self.head,
            NOTE_CLASS,
            '<div class="front" id="front">',
            self.front,
            "</div>",
            '<div class="back" id="back">',
            self.back,
            "</div>",
        )

    def write(self, dir_: str | pathlib.Path) -> None:
        path: str = os.path.join(dir_, self.key + ".html")
        file.write(self.html, path, report=False)


class MediaFile:
    """MediaFile represents a media file.

    Anki doesn't allow duplicate basenames in the media, so we must make sure
    each media file has a unique basename.

    """

    _temp_dir: str = tempfile.mkdtemp()

    def __init__(self, path: str, underscore: bool = False) -> None:
        """Construct a MediaFile object.

        Args:
            path: Path to the file on the system.
            underscore: Whether this file should be prefixed with an underscore
                in Anki. Some media files, such as fonts, must have an
                underscore prefix. See
                https://docs.ankiweb.net/templates/styling.html#installing-fonts.
        """
        self._path: str = path
        self._prefix: str = "_" if underscore else ""

    def basename(self) -> str:
        """Get the basename of the file in the destination directory.

        Returns:
            The basename of the file in the destination directory.
        """
        return self._prefix + self._path.replace(os.sep, "_")

    def path(self) -> str:
        """Get the full path of the file in the destination directory.

        Returns:
            The full path of the file in the destination directory.
        """
        return os.path.join(MediaFile._temp_dir, self.basename())

    def materialize(self) -> None:
        """Copy the file to the destination directory."""
        _ = shutil.copy2(self._path, self.path())

    @staticmethod
    def clean() -> None:
        shutil.rmtree(MediaFile._temp_dir)

    @typing.override
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, MediaFile):
            return NotImplemented
        return self._path == other._path

    @typing.override
    def __hash__(self) -> int:
        return hash(self._path)


class Deck:
    """Deck represents a dictionary deck."""

    def __init__(
        self,
        name: str,
        deck_id: int,
        notes_aux: abc.Generator[Note],
        description: str = f"https://{paths.DOMAIN}",
        html_dir: str | pathlib.Path = paths.LEXICON_DIR,
    ) -> None:

        self.name: str = name
        self.deck_id: int = deck_id
        self.description: str = description
        self.html_dir: str | pathlib.Path = html_dir
        self.media_files: set[MediaFile] = set()
        self.notes: list[Note] = list(notes_aux)
        ensure.unique(
            (note.key for note in self.notes),
            "Note keys must be unique!",
        )

    def __anki_html(self, html: str) -> str:
        def src_to_basename(match: re.Match[str]) -> str:
            path: str = os.path.join(self.html_dir, match.group(1))
            f: MediaFile = MediaFile(path)
            self.media_files.add(f)
            return f'<img src="{f.basename()}"'

        html = IMG_SRC_FMT.sub(src_to_basename, html)
        return html

    def src_to_basename(
        self,
        directory: str,
    ) -> typing.Callable[[re.Match[str]], str]:
        """Construct a function that reformats font references in a CSS file.

        NOTE: Font paths in the CSS must be relative.

        Args:
            directory: The directory containing the CSS file.

        Returns:
            A function that can be used to substitute font rules in the CSS
            file. The relative path to a font file will be replaced with the
            path inside Anki.
        """

        def f(match: re.Match[str]) -> str:
            path: str = os.path.join(directory, match.group(1))
            path = os.path.normpath(path)
            ensure.ensure(
                os.path.isfile(path),
                "font file",
                path,
                "not found!",
            )
            f: MediaFile = MediaFile(path, underscore=True)
            self.media_files.add(f)
            return f"src: url('{f.basename()}')"

        return f

    def __anki_css(self) -> abc.Generator[str]:
        files: list[str] = ensure.singleton(note.css for note in self.notes)
        # Get absolute paths, so you can read them.
        files = [os.path.join(self.html_dir, f) for f in files]
        # There is a shared CSS that is always included.
        files.append(str(paths.SHARED_CSS))
        files = list(map(os.path.normpath, files))
        ensure.unique(files)
        for path in files:
            yield FONT_SRC_RE.sub(
                self.src_to_basename(os.path.dirname(path)),
                file.read(path),
            )

    def __anki_js_aux(self) -> abc.Generator[str]:
        # We don't allow notes to have different JavaScript, because in our Anki
        # package, we define the JavaScript in the template.
        js_path: str = ensure.singleton(note.js_path for note in self.notes)
        js_start: str = ensure.singleton(note.js_start for note in self.notes)

        yield js_start

        if not js_path:
            return

        # Like the media files, the JavaScript path is relative to the HTML
        # write directory.
        js_path = os.path.join(self.html_dir, js_path)
        yield system.run("npx", "esbuild", js_path, "--bundle")

    def anki(self) -> tuple[genanki.Deck, abc.Iterable[MediaFile]]:
        # Anki can't pick up the JavaScript. It must be inserted into the
        # template.
        javascript = "".join(self.__anki_js_aux())
        model = genanki.Model(
            model_id=self.deck_id,
            name=self.name,
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
                    "afmt": '<div class="front"> {{Front}} </div>'
                    + '<div class="back"> {{Back}} </div>'
                    + f'<script type="text/javascript">{javascript}</script>',
                },
            ],
            css="".join(self.__anki_css()),
        )

        deck = genanki.Deck(
            deck_id=self.deck_id,
            name=self.name,
            description=self.description,
        )

        for note in self.notes:
            front = self.__anki_html(note.front)
            back = self.__anki_html(note.back)
            key = f"{self.name} - {note.key}"
            deck.add_note(GenankiNote(model=model, fields=[front, back, key]))

        return deck, self.media_files
