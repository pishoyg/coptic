import os
import re
import shutil
import tempfile
import typing

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


class field:
    @type_enforced.Enforcer
    def next(self) -> str | list[str]:
        raise ValueError("Unimplemented!")

    @type_enforced.Enforcer
    def length(self) -> int:
        raise ValueError("Unimplemented!")

    def media_files(self) -> list[str]:
        raise ValueError("Unimplemented!")


class _primitive_field(field):

    @type_enforced.Enforcer
    def length(self) -> int:
        return NO_LENGTH

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return []


class txt(_primitive_field):
    """
    A constant text field.
    """

    @type_enforced.Enforcer
    def __init__(self, text: str, force: bool = True) -> None:
        if force:
            assert text
        self._text = use_html_line_breaks(text)

    @type_enforced.Enforcer
    def next(self) -> str:
        return self._text

    @type_enforced.Enforcer
    def str(self) -> str:
        return self._text


class seq(_primitive_field):
    """
    A numerical sequence field.
    """

    @type_enforced.Enforcer
    def __init__(self, start: int = 1) -> None:
        self._cur = start

    @type_enforced.Enforcer
    def next(self) -> str:
        ans = str(self._cur)
        self._cur += 1
        return ans


class _content_field(field):

    @type_enforced.Enforcer
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

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return self._media_files

    @type_enforced.Enforcer
    def next(self) -> str | list[str]:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    @type_enforced.Enforcer
    def length(self) -> int:
        return len(self._content)


class tsv(_content_field):
    """
    A TSV column field.
    """

    @type_enforced.Enforcer
    def __init__(self, file_path: str, column_name: str, force: bool = True) -> None:
        content = _read_tsv_column(file_path, column_name)
        content = list(map(use_html_line_breaks, content))
        super().__init__(content, [], force=force)


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

    @type_enforced.Enforcer
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


class img(_content_field):
    """
    Images. Retrieve keys from the column named ${KEY_COLUMN_NAME} in the TSV
    found at ${TSV_FILE_PATH}. The images are to be found at:
      ${DIR_PATH}/format(${FILE_NAME_FMT}, key=key)
    The FILE_NAME_FMT can use the "{key}" string for key substitutions. If the
    string numexpr(.*) were to be found inside ${FILE_NAME_FMT}, we perform a
    number expression as well. If this were the case, it's allowed to exist only
    once, with a single pair of parentheses, to allow simple parsing behavior
    that should suffice for most use cases.
    The final format string is allowed to have a glob pattern to fetch multiple
    files.

    For example, consider the following entry:

    - IMG::marcion.tsv::crum-page-number::crum/::numexpr({key}+17).jpg

      This results in the retrieval of a list of keys from the file at
      "marcion.tsv", and for each entry in the "crum-page-number" column, we
      retrieve the image at "crum/numexpr({key}+17).png". For example, for key 1,
      we will retrieve "crum/18.png".

    - IMG::marcion.tsv::key::img/{key}-*.*

      This results in the retrieval of a list of keys from the file at
      "marcion.tsv", and for each key in the "key" column, we retrieve all the
      images that match the pattern "{key}-*.*". For example, for `key=1`, all
      the following will be included if found: 1-1.png, 1-2.png, 1-1-1.jpg, ...

    ${WIDTH} (optionally) gives the image width.

    Image / file sorting:
      TL;DR: Use integer sections in your file names to control the order.
      For example, "{key}-1-1.txt", "{key}-1-2.txt", "{key}-3-4.txt".

      The files will be sorted in the output based first on the integers contained
      within the name, then lexicographically. For example, the following are
      possible orders produced by our sorting algorithm:
          - ["1.png", "2.png", ..., "11.png"],
          - ["1-1.png", "1-2.png", "2-1.png", "2-2.png"]
          - ["b1.txt", "a2.txt"]
          - ["a.txt", "b.txt"]
      The string "11" is lexicographically smaller than the string "2", but the
      integer 11 is lexicographically larger, which is why it appears later.
      Similarly, even though "b" is lexicographically larger than "a", we
      prioritize the integers, so we bring "b1" before "a2".
      If the string doesn't contain any integers, pure lexicographical ordering
      will be used.

    """

    @type_enforced.Enforcer
    def __init__(
        self,
        tsv_path: str,
        column_name: str,
        get_paths,  # Map key to list of paths.
        sort_paths=None,  # Sort list of paths.
        get_caption=None,  # Map path to caption.
        width: typing.Optional[int] = None,
        force: bool = True,
    ) -> None:
        """
        The "src" field of the <img> HTML tag must bear basenames. Directories
        are not allowed. This implies that all basenames must be unique.
        See github.com/kerrickstaley/genanki?tab=readme-ov-file#media-files.

        We have images from multiple source directories, and their basenames
        could be conflicting.
        We solve this problem by doing the following:
        We copy all files to a temporary working, assigning them unique
        basenames. We use the new basenames in our HTML. We pass the files in
        the temporary directory to the package generator in order for the
        basenames to match, and we forget about the original paths and names.
        """

        html_fmt = '<img src="{basename}"><br>'
        if width is not None:
            html_fmt = '<img src="{{basename}}" width="{width}"><br>'.format(
                width=width
            )
        if get_caption:
            html_fmt = (
                "<figure>"
                + html_fmt
                + "<figcaption> {caption} </figcaption> </figure> <br>"
            )

        # Each entry in the keys column is not a single key, but a
        # comma-separated list of key patterns.
        keys = _read_tsv_column(tsv_path, column_name)

        content = []
        media_files = set()
        for key in keys:
            if force:
                assert key
            cur = ""
            if not key:
                content.append(cur)
                continue
            paths = get_paths(key)
            if force:
                assert paths
            if sort_paths:
                paths = sort_paths(paths)
            for path in paths:
                basename = path.replace("/", "_")
                args = {"basename": basename}
                if get_caption:
                    args["caption"] = get_caption(path)
                cur += html_fmt.format(**args)
                new_location = os.path.join(WORK_DIR.name, basename)
                if width:
                    image = Image.open(path)
                    cur_width, _ = image.size
                    if cur_width > width:
                        image.thumbnail((width, MAX_THUMBNAIL_HEIGHT))
                    image.save(new_location)
                else:
                    shutil.copyfile(path, new_location)
                media_files.add(new_location)
            content.append(cur)

        media_files = list(media_files)
        super().__init__(content, media_files)


class apl(field):
    """
    Apply a lambda to a field.
    """

    @type_enforced.Enforcer
    def __init__(self, l, *fields) -> None:
        self._lambda = l
        self._fields = _convert_strings(*fields)

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return merge_media_files(*self._fields)

    @type_enforced.Enforcer
    def next(self):
        return self._lambda(*[f.next() for f in self._fields])

    @type_enforced.Enforcer
    def length(self) -> int:
        return num_entries(*self._fields)


# aon = all or none.
def aon(*fields):
    @type_enforced.Enforcer
    def all_or_nothing(*nexts: str) -> str:
        return "".join(nexts) if all(nexts) else ""

    return apl(all_or_nothing, *fields)


def cat(*fields):
    @type_enforced.Enforcer
    def concatenate(*nexts: str) -> str:
        return "".join(nexts)

    return apl(concatenate, *fields)


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
