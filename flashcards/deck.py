# TODO: For text generation, it's likely more efficient to use generators
# and avoid concatenating the strings, unless necessary.
# You can also use `writelines` instead of `write` to write a file, thus
# avoiding saving the data in memory at any point.
import os
import re
import subprocess
import typing
from collections import abc

import genanki  # type: ignore[import-untyped]

import utils

NOTE_CLASS = "NOTE"
ANKI_NOTE_CLASS = "ANKI"
INDEX_CLASS = "INDEX"
INDEX_INDEX_CLASS = "INDEX_INDEX"

IMG_SRC_FMT: re.Pattern[str] = re.compile(r'<img src="([^"]+)"')
FONT_SRC_RE: re.Pattern[str] = re.compile(r"src: url\('([^']*)'\)")


def _html_src_to_basename(match: re.Match[str]) -> str:
    return f'<img src="{os.path.basename(match.group(1))}"'


def _css_src_to_basename(match: re.Match[str]) -> str:
    return f"src: url('{os.path.basename(match.group(1))}')"


class GenankiNote(genanki.Note):
    @property
    @typing.override
    # TODO: Resolve this error:
    #   "guid" incorrectly overrides property of same name in class "Note"
    #   Property method "fset" is missing in override
    #   [reportIncompatibleMethodOverride]
    def guid(self):
        # Only use the key field to generate a GUID.
        assert self.fields
        return genanki.guid_for(self.fields[2])


def _to_file_name(name: str) -> str:
    return name.replace("/", "_").lower()


class HeaderCell:
    def __init__(self, title: str, link: str) -> None:
        self.title: str = title
        self.link: str = link

    def td(self) -> abc.Generator[str]:
        yield "<td>"
        yield f'<a class="navigate" href="{self.link}">{self.title}</a>'
        yield "</td>"


class Headerer:
    def __init__(self, base_cells: list[HeaderCell]) -> None:
        self.cells: list[HeaderCell] = base_cells

    def header(self) -> str:
        return "".join(self.header_aux())

    def header_aux(self) -> abc.Generator[str]:
        yield '<table id="header" class="header">'
        yield "<tr>"
        for cell in self.cells:
            yield from cell.td()
        yield "</tr>"
        yield "</table>"


# TODO: Rename index to subindex, and rename index_index to index.
class Index:
    def __init__(
        self,
        title: str,
        count: int,
        body: abc.Generator[str],
    ) -> None:
        self.title: str = title
        self.count: int = count
        self.body: abc.Generator[str] = body

    def basename(self) -> str:
        return _to_file_name(self.title) + ".html"

    def write(self, dir_: str, head: str, header: str) -> None:
        content = utils.html_aux(head, header, *self.body)
        path = os.path.join(dir_, self.basename())
        utils.writelines(content, path, log=False)


class IndexIndex:
    def __init__(
        self,
        name: str,
        indexes: list[Index],
        home: str,
        search: str,
        scripts: list[str],
    ):
        self.name: str = name
        self.indexes: list[Index] = indexes
        self.home: str = home
        self.search: str = search
        self.scripts: list[str] = scripts

        cells: list[HeaderCell] = []
        if home:
            cells.append(HeaderCell("Home", home))
        if search:
            cells.append(HeaderCell("Search", search))
        self.header: str = Headerer(cells).header()
        # The subindex header is the same as the index header, with one extra
        # cell pointing to the index that this subindex belongs to.
        cells.append(HeaderCell(self.name, self.__basename()))
        self.subindex_header: str = Headerer(cells).header()
        del cells

    def __basename(self) -> str:
        return _to_file_name(self.name) + ".html"

    def __iter_subindex_heads(self) -> abc.Generator[str]:
        for i, index in enumerate(self.indexes):
            prv = self.indexes[i - 1].basename() if i > 0 else ""
            nxt = (
                self.indexes[i + 1].basename()
                if i < len(self.indexes) - 1
                else ""
            )
            yield utils.html_head(
                title=index.title,
                page_class=INDEX_CLASS,
                search=self.search,
                scripts=self.scripts,
                prev_href=prv,
                next_href=nxt,
            )

    def __write_subindex(self, args: tuple[str, Index, str]) -> None:
        dir_, subindex, head = args
        subindex.write(dir_, head, self.subindex_header)

    def write(self, dir_: str):
        # A subindex header includes a link to the index that contains
        # this subindex.
        with utils.thread_pool_executor() as executor:
            m = executor.map(
                self.__write_subindex,
                zip(
                    [dir_] * len(self.indexes),
                    self.indexes,
                    self.__iter_subindex_heads(),
                ),
            )
            list(m)

        # Write the index index!
        head = utils.html_head(
            title=self.name,
            page_class=INDEX_INDEX_CLASS,
            search=self.search,
            scripts=self.scripts,
        )
        html = utils.html_aux(
            head,
            *self.header,
            *self.__body_aux(),
        )
        path = os.path.join(dir_, self.__basename())
        utils.writelines(html, path, log=False)

    def __body_aux(self) -> abc.Generator[str]:
        yield f"<h1>{self.name}</h2>"
        yield '<ol class="index-index-list">'
        for index in self.indexes:
            yield '<li class="index-view">'
            yield f'<a class="navigate" \
                    href="{_to_file_name(index.title)}.html">'
            yield index.title
            yield "</a>"
            yield f' <span class="index-count">({index.count})</span>'
            yield "</li>"
        yield "</ol>"


class Note:
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
        self.head: str = utils.html_head(
            title=title,
            page_class=NOTE_CLASS,
            search=search,
            next_href=nxt,
            prev_href=prv,
            scripts=[js_path] if js_path else [],
        )
        self.html: str = "".join(self.__html_aux())
        self.js_start: str = js_start

    def __html_aux(self) -> abc.Generator[str]:
        return utils.html_aux(
            self.head,
            '<div class="front" id="front">',
            self.front,
            "</div>",
            "<hr/>",
            '<div class="back" id="back">',
            self.back,
            "</div>",
        )

    def write(self, dir_: str) -> None:
        path: str = os.path.join(dir_, self.key + ".html")
        utils.write(self.html, path, log=False)


class Deck:
    def __init__(
        self,
        deck_name: str,
        deck_id: int,
        deck_description: str,
        css_path: str,
        # TODO: Use a generator instead of a list.
        notes: list[Note],
        html_dir: str = "",
        index_indexes: list[IndexIndex] | None = None,
        write_html: bool = False,
    ) -> None:

        self.deck_name: str = deck_name
        self.deck_id: int = deck_id
        self.deck_description: str = deck_description
        self.css_dir: str = os.path.dirname(css_path)
        self.css: str = utils.read(css_path)
        self.notes: list[Note] = notes
        utils.verify_unique(
            (note.key for note in self.notes),
            "Note keys must be unique!",
        )
        self.index_indexes: list[IndexIndex] = index_indexes or []
        self.html_dir: str = html_dir
        self.write_html: bool = write_html

    def __write_html(self, o: Note | IndexIndex) -> None:
        o.write(self.html_dir)

    def write_html_if_needed(self) -> None:
        if not self.write_html:
            return
        assert self.html_dir
        with utils.thread_pool_executor() as executor:
            list(executor.map(self.__write_html, self.notes))
            list(executor.map(self.__write_html, self.index_indexes))
        utils.wrote(self.html_dir)

    def __anki_html(self, html: str) -> str:
        return IMG_SRC_FMT.sub(_html_src_to_basename, html)

    def __anki_css(self) -> str:
        return FONT_SRC_RE.sub(_css_src_to_basename, self.css)

    def __anki_js_aux(self) -> abc.Generator[str]:
        # We don't allow notes to have different JavaScript, because in our Anki
        # package, we define the JavaScript in the template.
        js_path: str = utils.assert_one({note.js_path for note in self.notes})
        js_start: str = utils.assert_one(
            {note.js_start for note in self.notes},
        )

        yield js_start
        # We use this JavaScript twice in our card template, once in the front,
        # and once in the back. It may be due to this that global variables are
        # problematic.
        # We use `var` instead of `const` in order to avoid issues with
        # redefining a variable twice.
        yield f"var {ANKI_NOTE_CLASS} = true;"

        if not js_path:
            return

        # Like the media files, the JavaScript path is relative to the HTML
        # write directory.
        js_path = os.path.join(self.html_dir, js_path)
        result = subprocess.run(
            ["npx", "esbuild", js_path, "--bundle"],
            check=True,
            capture_output=True,
            text=True,
        )
        yield result.stdout

    def anki(self) -> tuple[genanki.Deck, abc.Iterable[str]]:
        # Anki can't pick up the JavaScript. It must be inserted into the
        # template.
        javascript = "".join(self.__anki_js_aux())
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
                    "afmt": '<div class="front"> {{Front}} </div>'
                    + "<hr/>"
                    + '<div class="back"> {{Back}} </div>'
                    + f'<script type="text/javascript">{javascript}</script>',
                },
            ],
            css=self.__anki_css(),
        )

        deck = genanki.Deck(
            deck_id=self.deck_id,
            name=self.deck_name,
            description=self.deck_description,
        )

        for note in self.notes:
            front = self.__anki_html(note.front)
            back = self.__anki_html(note.back)
            key = f"{self.deck_name} - {note.key}"
            deck.add_note(GenankiNote(model=model, fields=[front, back, key]))

        # Pick up the media.
        font_paths = {
            os.path.join(self.css_dir, path)
            for path in FONT_SRC_RE.findall(self.css)
        }
        assert font_paths  # We know we have fonts in our CSS.
        # Fonts must have an underscore prefix. See
        # https://docs.ankiweb.net/templates/styling.html#installing-fonts.
        assert all(
            os.path.basename(path).startswith("_") for path in font_paths
        )

        image_paths = {
            os.path.join(self.html_dir, path)
            for note in self.notes
            for path in IMG_SRC_FMT.findall(note.html)
        }

        media = font_paths | image_paths
        del font_paths, image_paths
        assert all(os.path.isfile(path) for path in media)

        return deck, media
