import os
import re
import shutil
import tempfile
import typing

import enforcer
import pandas as pd
import pillow_avif  # This import is necessary to support AVID images.
import type_enforced
from PIL import Image

# N.B. Pillow might be tricky for our requirements generators. You might have
# to add it to requirements.txt manually.

# TODO: Create the work directory in main.
WORK_DIR = tempfile.TemporaryDirectory()

NO_LENGTH = -1
INTEGER_RE = re.compile("[0-9]+")
MAX_INTEGER_LENGTH = 10
MAX_THUMBNAIL_HEIGHT = 100000


@type_enforced.Enforcer
class field:
    def next(self) -> str | list[str]:
        raise ValueError("Unimplemented!")

    def length(self) -> int:
        raise ValueError("Unimplemented!")

    def media_files(self) -> list[str]:
        raise ValueError("Unimplemented!")


@type_enforced.Enforcer
class _primitive_field(field):

    def length(self) -> int:
        return NO_LENGTH

    def media_files(self) -> list[str]:
        return []


@type_enforced.Enforcer
class txt(_primitive_field):
    """
    A constant text field.
    """

    def __init__(self, text: str, force: bool = True) -> None:
        if force:
            assert text
        self._text = use_html_line_breaks(text)

    def next(self) -> str:
        return self._text

    def str(self) -> str:
        return self._text


@type_enforced.Enforcer
class seq(_primitive_field):
    """
    A numerical sequence field.
    """

    def __init__(self, start: int = 1) -> None:
        self._cur = start

    def next(self) -> str:
        ans = str(self._cur)
        self._cur += 1
        return ans


@type_enforced.Enforcer
class _content_field(field):

    def __init__(
        self,
        content: list[list[str]] | list[str],
        media_files: list[str],
        force: bool = True,
    ) -> None:
        if force:
            assert all(content)
        self._content = content
        self._media_files = media_files
        self._counter = 0

    def media_files(self) -> list[str]:
        return self._media_files

    def next(self) -> str | list[str]:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    def length(self) -> int:
        return len(self._content)


@type_enforced.Enforcer
class tsv(_content_field):
    """
    A TSV column field.
    """

    def __init__(self, file_path: str, column_name: str, force: bool = True) -> None:
        content = _read_tsv_column(file_path, column_name)
        content = list(map(use_html_line_breaks, content))
        super().__init__(content, [], force=force)


@type_enforced.Enforcer
class grp(_content_field):
    """
    Group entries in a TSV column using another column.
    See this example:
        keys: [1, 2, 3]
        groupby: [1, 2, 1, 2, 3, 3]
        selected: ["a", "b", "c", "d", "e", "f"]

        The first step is to zip `groupby` and `selected` to obtain the
        following:
            [(1, "a"),
             (2, "b"),
             (1, "c"),
             (2, "d"),
             (3, "e"),
             (e, f")]
        And then, for each call to next(), we return the selected entries with
        a corresponding gropuby that matches the key.

        This type is complicated and currently unused. Maybe we should just
        delete it!
    """

    def __init__(
        self,
        key_file_path: str,
        key_col_name: str,
        group_file_path: str,
        group_by_col_name: str,
        select_col: str,
        force: bool = True,
    ) -> None:
        keys = tsv(key_file_path, key_col_name, force=True)
        keys = [keys.next() for _ in range(keys.length())]
        group_by = tsv(group_file_path, group_by_col_name, force=True)
        selected = tsv(group_file_path, select_col, force=force)
        key_to_selected = {k: [] for k in keys}
        for _ in range(num_entries(group_by, selected)):
            key_to_selected[group_by.next()].append(selected.next())
        content = [key_to_selected[k] for k in keys]
        super().__init__(content, [], force)


@type_enforced.Enforcer
def img(
    tsv_path: str,
    column_name: str,
    get_paths: enforcer.Callable,
    sort_paths: typing.Optional[enforcer.Callable] = None,
    get_caption: typing.Optional[enforcer.Callable] = None,
    width: typing.Optional[int] = None,
    force: bool = True,
):  # -> type_enforced.utils.WithSubclasses(field):
    html_fmt = '<img src="{basename}"><br>'
    if width is not None:
        html_fmt = '<img src="{{basename}}" width="{width}"><br>'.format(width=width)
    if get_caption:
        html_fmt = (
            "<figure>"
            + html_fmt
            + "<figcaption> {caption} </figcaption> </figure> <br>"
        )

    return media(
        html_fmt=html_fmt,
        tsv_path=tsv_path,
        column_name=column_name,
        get_paths=get_paths,
        copy=build_copy_resized(width),
        sort_paths=sort_paths,
        get_caption=get_caption,
        force=force,
    )


@type_enforced.Enforcer
def snd(
    tsv_path: str,
    column_name: str,
    get_paths: enforcer.Callable,
    sort_paths: typing.Optional[enforcer.Callable] = None,
    force: bool = True,
):
    return media(
        html_fmt="[sound:{basename}]",
        tsv_path=tsv_path,
        column_name=column_name,
        get_paths=get_paths,
        sort_paths=sort_paths,
        force=force,
    )


@type_enforced.Enforcer
class media(_content_field):

    def __init__(
        self,
        # HTML format string.
        html_fmt: str,
        tsv_path: str,
        column_name: str,
        # Map key to list of paths.
        get_paths: enforcer.Callable,
        # Copy the file to the destination.
        copy: enforcer.Callable = shutil.copy,
        # Sort list of paths.
        sort_paths: typing.Optional[enforcer.Callable] = None,
        # Map path to caption.
        get_caption: typing.Optional[enforcer.Callable] = None,
        force: bool = True,
    ) -> None:
        """
        The final path to a media file must be a basename. Directories
        are not allowed. This implies that all basenames must be unique.
        See github.com/kerrickstaley/genanki?tab=readme-ov-file#media-files.

        We have media files from multiple source directories, and their
        basenames may be conflicting.
        We solve this problem by doing the following:
        We copy all files to a temporary work directory, assigning them unique
        basenames. We use the new basenames in our HTML. We pass the files in
        the temporary directory to the package generator in order for the
        basenames to match, and we forget about the original paths and names.
        """

        content = []
        media_files = set()
        for key in _read_tsv_column(tsv_path, column_name):
            if force:
                assert key
            if not key:
                content.append("")
                continue
            paths = get_paths(key)
            if force:
                assert paths
            if sort_paths:
                paths = sort_paths(paths)
            cur = ""
            for path in paths:
                basename = path.replace("/", "_")
                args = {"basename": basename}
                if get_caption:
                    args["caption"] = get_caption(path)
                cur += html_fmt.format(**args)
                new_location = os.path.join(WORK_DIR.name, basename)
                copy(path, new_location)
                media_files.add(new_location)
            content.append(cur)

        media_files = list(media_files)
        super().__init__(content, media_files, force=force)


@type_enforced.Enforcer
class apl(field):
    """
    Apply a lambda to a field.
    """

    def __init__(self, l, *fields) -> None:
        self._lambda = l
        self._fields = _convert_strings(*fields)

    def media_files(self) -> list[str]:
        return merge_media_files(*self._fields)

    def next(self):
        return self._lambda(*[f.next() for f in self._fields])

    def length(self) -> int:
        return num_entries(*self._fields)


# aon = all or none.
@type_enforced.Enforcer
def aon(*fields):
    @type_enforced.Enforcer
    def all_or_nothing(*nexts: str) -> str:
        return "".join(nexts) if all(nexts) else ""

    return apl(all_or_nothing, *fields)


@type_enforced.Enforcer
def cat(*fields):
    @type_enforced.Enforcer
    def concatenate(*nexts: str) -> str:
        return "".join(nexts)

    return apl(concatenate, *fields)


@type_enforced.Enforcer
def xor(*fields):
    @type_enforced.Enforcer
    def first_match(*nexts: str) -> str:
        for n in nexts:
            if n:
                return n
        return ""

    return apl(first_match, *fields)


@type_enforced.Enforcer
def _convert_strings(
    *fields: [str] + type_enforced.utils.WithSubclasses(field),
) -> list[*type_enforced.utils.WithSubclasses(field)]:
    return [txt(f) if isinstance(f, str) else f for f in fields]


@type_enforced.Enforcer
def num_entries(*fields: [str] + type_enforced.utils.WithSubclasses(field)) -> int:
    cur = NO_LENGTH
    for f in fields:
        length = f.length()
        if length == NO_LENGTH:
            continue
        if cur == NO_LENGTH:
            cur = length
            continue
        assert cur == length
    return cur


@type_enforced.Enforcer
def merge_media_files(*fields) -> list[str]:
    m = sum([f.media_files() for f in fields], [])
    # Eliminate duplicates. This significantly reduces the package size.
    # While this is handled by Anki, it's not supported in genanki.
    return list(set(m))


@type_enforced.Enforcer
def use_html_line_breaks(text: str) -> str:
    return text.replace("\n", "<br>")


@type_enforced.Enforcer
def _read_tsv_column(file_path: str, column_name: str) -> list[str]:
    df = pd.read_csv(file_path, sep="\t", encoding="utf-8").fillna("")
    return [str(cell).strip() for cell in df[column_name]]


@type_enforced.Enforcer
def stem(s: str) -> str:
    s = os.path.basename(s)
    s, _ = os.path.splitext(s)
    return s


@type_enforced.Enforcer
def _semver_sort_key(path: str) -> list[str]:
    path = os.path.basename(path)
    return [x.zfill(MAX_INTEGER_LENGTH) for x in INTEGER_RE.findall(path)] + [path]


def sort_semver(paths: list[str]) -> list[str]:
    return sorted(paths, key=_semver_sort_key)


@type_enforced.Enforcer
def page_numbers(page_ranges: str) -> list[int]:
    """
    page_ranges is a comma-separated list of integers or integer ranges, just
    like what you type when you're using your printer.
    For example, "1,3-5,8-9" means [1, 3, 4, 5, 8, 9].
    """
    out = []
    for int_range in page_ranges.split(","):
        if int_range.isdigit():
            out.append(int(int_range))
            continue
        int_range = int_range.split("-")
        assert len(int_range) == 2
        start, end = int(int_range[0]), int(int_range[1])
        assert end > start
        for x in range(start, end + 1):
            out.append(x)
    return out


@type_enforced.Enforcer
def build_copy_resized(width: typing.Optional[int] = None) -> enforcer.Callable:
    if not width:
        return shutil.copyfile

    @type_enforced.Enforcer
    def copy_resized(path: str, new_location: str) -> None:
        assert width > 0
        image = Image.open(path)
        cur_width, _ = image.size
        if cur_width > width:
            image.thumbnail((width, MAX_THUMBNAIL_HEIGHT))
        image.save(new_location)

    return copy_resized
