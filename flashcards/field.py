# TODO: Change the default strict to strict. Leniency should be the exception.
import glob
import os
import re
import shutil
import tempfile
import typing

import numexpr
import pandas as pd
import pillow_avif
import type_enforced
from PIL import Image

# The pillow_avif import is necessary, in order to enable processing of AVIF
# files.

# N.B. Pillow might be tricky for our requirements generators. You might have
# to add it to requirements.txt manually.

# TODO: Create the work directory in main.
WORK_DIR = tempfile.TemporaryDirectory()

NO_LENGTH = -1
INTEGER_RE = re.compile("[0-9]+")
NUMEXPR_RE = re.compile(r"numexpr\((.*)\)")
MAX_INTEGER_LENGTH = 10
MAX_THUMBNAIL_HEIGHT = 100000


class field:
    pass


# aon = all or none.
class aon(field):
    @type_enforced.Enforcer
    def __init__(self, *fields) -> None:
        fields = _convert_strings(*fields)
        self._len = num_entries(*fields)
        self._fields = fields
        self._media_files = sum([f.media_files() for f in fields], [])
        self._media_files = list(set(self._media_files))

    @type_enforced.Enforcer
    def next(self) -> str:
        n = [f.next() for f in self._fields]
        if all(n):
            return "".join(n)
        return ""

    @type_enforced.Enforcer
    def length(self) -> int:
        return self._len

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return self._media_files


class cat(field):
    """
    Produce a field by concatenating several fields.
    """

    @type_enforced.Enforcer
    def __init__(self, *fields) -> None:
        fields = _convert_strings(*fields)
        self._len = num_entries(*fields)
        self._fields = fields
        self._media_files = sum([f.media_files() for f in fields], [])
        self._media_files = list(set(self._media_files))

    @type_enforced.Enforcer
    def next(self) -> str:
        return "".join(f.next() for f in self._fields)

    @type_enforced.Enforcer
    def length(self) -> int:
        return self._len

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return self._media_files


class xor(field):
    """
    Produce a field by returning the first non-empty entry from a set of
    fields.
    """

    @type_enforced.Enforcer
    def __init__(self, *fields) -> None:
        fields = _convert_strings(*fields)
        self._fields = fields

    @type_enforced.Enforcer
    def next(self) -> str:
        n = [f.next() for f in self._fields]
        n = list(filter(None, n))
        if not n:
            return ""
        return n[0]

    @type_enforced.Enforcer
    def length(self) -> int:
        num_entries(self._fields)

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return merge_media_files(*self._fields)


class txt(field):
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
    def length(self) -> int:
        return -1

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return []

    @type_enforced.Enforcer
    def str(self) -> str:
        return self._text


class seq(field):
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

    @type_enforced.Enforcer
    def length(self) -> int:
        return -1

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return []


class tsv(field):
    """
    A TSV column field.
    """

    @type_enforced.Enforcer
    def __init__(self, file_path: str, column_name: str, force: bool = False) -> None:
        self._content = _read_tsv_column(file_path, column_name)
        self._content = map(str, self._content)
        self._content = list(map(use_html_line_breaks, self._content))
        if force:
            assert all(self._content)
        self._counter = 0

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return []

    @type_enforced.Enforcer
    def next(self) -> str:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    @type_enforced.Enforcer
    def length(self) -> int:
        return len(self._content)


class grp(field):
    """
    Group entries in a TSV column using another column.
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
        self._content = [key_to_selected[k] for k in keys]
        self._counter = 0

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return []

    @type_enforced.Enforcer
    def next(self) -> list[str]:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    @type_enforced.Enforcer
    def length(self) -> int:
        return len(self._content)


class apl(field):
    """
    Apply a lambda to a field.
    """

    @type_enforced.Enforcer
    def __init__(self, l, *fields) -> None:
        self._lambda = l
        self._fields = fields

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return merge_media_files(*self._fields)

    @type_enforced.Enforcer
    def next(self):
        return self._lambda(*[f.next() for f in self._fields])

    @type_enforced.Enforcer
    def length(self) -> int:
        return num_entries(*self._fields)


class img(field):
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
        dir_path: str,
        file_name_fmt: str,
        caption_source: str,
        width: typing.Optional[int] = None,
        force: bool = False,
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
            html_fmt = '<img src="{{basename}}" width="{width}"><br>'
            html_fmt = html_fmt.format(width=width)
        html_fmt = (
            "<figure>"
            + html_fmt
            + "<figcaption> {caption} </figcaption> </figure> <br>"
        )

        # Each entry in the keys column is not a single key, but a
        # comma-separated list of key patterns.
        keys = _read_tsv_column(tsv_path, column_name)

        self._content = []
        self._media_files = set()
        for cs_keys in keys:
            if force:
                assert cs_keys
            cur = ""
            if not cs_keys:
                self._content.append(cur)
                continue
            for key in cs_keys.split(","):
                assert key
                paths = _glob(dir_path, file_name_fmt, key)
                if force:
                    assert paths
                for path in paths:
                    caption = self._get_caption(caption_source, key, path)
                    basename = path.replace("/", "_")
                    cur += html_fmt.format(basename=basename, caption=caption)
                    new_location = os.path.join(WORK_DIR.name, basename)
                    self._media_files.add(new_location)
                    if width:
                        image = Image.open(path)
                        cur_width, _ = image.size
                        if cur_width > width:
                            image.thumbnail((width, MAX_THUMBNAIL_HEIGHT))
                        image.save(new_location)
                    else:
                        shutil.copyfile(path, new_location)
            self._content.append(cur)

        self._media_files = list(self._media_files)
        self._counter = 0

    @type_enforced.Enforcer
    def _get_caption(self, caption_source: str, key: str, path: str) -> str:
        if caption_source == "KEY":
            return key
        if caption_source == "STEM":
            stem, _ = os.path.splitext(os.path.basename(path))
            return stem
        raise ValueError(f"Unknown caption source: {caption_source}")

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return self._media_files

    @type_enforced.Enforcer
    def next(self) -> str:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    @type_enforced.Enforcer
    def length(self) -> int:
        return len(self._content)


class fil(field):
    """
    - FIL::${TSV_FILE_PATH}::${KEY_COLUMN_NAME}::${DIR_PATH}::${FILE_NAME_FMT}

      Files that will be imported and embedded. Use this for plain text or HTML
      content.

    """

    @type_enforced.Enforcer
    def __init__(
        self,
        file_path: str,
        column_name: str,
        dir_path: str,
        file_name_fmt: str,
        force: bool = False,
    ) -> None:
        keys = _read_tsv_column(file_path, column_name)
        if force:
            assert keys and all(keys)

        self._content = []
        for cs_keys in keys:
            paths = _glob(dir_path, file_name_fmt, cs_keys)
            cur = ""
            for path in paths:
                with open(path) as f:
                    cur += f.read()
            cur = use_html_line_breaks(cur)
            cur = cur.strip()
            self._content.append(cur)
        self._counter = 0

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return []

    @type_enforced.Enforcer
    def next(self) -> str:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    @type_enforced.Enforcer
    def length(self) -> int:
        return len(self._content)


@type_enforced.Enforcer
def _convert_strings(
    *fields: [str] + type_enforced.utils.WithSubclasses(field),
) -> list[*type_enforced.utils.WithSubclasses(field)]:
    return [txt(f) if isinstance(f, str) else f for f in fields]


@type_enforced.Enforcer
def num_entries(*fields: [str] + type_enforced.utils.WithSubclasses(field)) -> int:
    cur = -1
    for f in fields:
        length = f.length()
        if length == -1:
            continue
        if cur == -1:
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
def _path_sort_key(path: str) -> list[str]:
    path = os.path.basename(path)
    return [x.zfill(MAX_INTEGER_LENGTH) for x in INTEGER_RE.findall(path)] + [path]


@type_enforced.Enforcer
def use_html_line_breaks(text: str) -> str:
    return text.replace("\n", "<br>")


@type_enforced.Enforcer
def _substitute_key_and_numexpr(file_name_fmt: str, key: str) -> str:
    file_name_fmt = file_name_fmt.format(key=key)
    match = NUMEXPR_RE.match(file_name_fmt)
    if not match:
        return file_name_fmt
    expr = numexpr.evaluate(match.group(1)).item()
    return NUMEXPR_RE.sub(str(expr), file_name_fmt)


@type_enforced.Enforcer
def _glob(dir_path: str, file_name_fmt: str, cs_keys: str) -> list[str]:
    paths = set()
    for key in cs_keys.split(","):
        pattern = _substitute_key_and_numexpr(file_name_fmt, key)
        pattern = os.path.join(dir_path, pattern)
        paths.update(glob.glob(pattern))
    return list(sorted(paths, key=_path_sort_key))


@type_enforced.Enforcer
def _read_tsv_column(file_path: str, column_name: str) -> list[str]:
    df = pd.read_csv(file_path, sep="\t", encoding="utf-8").fillna("")
    return [str(cell).strip() for cell in df[column_name]]
