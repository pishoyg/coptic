import itertools
import os
import shutil
import typing

import enforcer
import gspread
import type_enforced
from oauth2client import service_account

import utils

NO_LENGTH = -1

GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]

AUDIO_FMT = '<audio controls><source src="{basename}"/></audio>'
AUDIO_FMT_L = '<audio controls><source src="'
AUDIO_FMT_R = '"/></audio>'
assert AUDIO_FMT_L + "{basename}" + AUDIO_FMT_R == AUDIO_FMT

_work_dir = ""
_initialized = False
_in_work_dir = {}
_tsv = {}
_gsheet = {}


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def init(work_dir: str) -> None:
    global _work_dir, _initialized
    _work_dir = work_dir
    _initialized = True


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _add_to_work_dir(path: str) -> str:
    assert _initialized
    if path in _in_work_dir:
        return _in_work_dir[path]
    basename = path.replace("/", "_")
    new_path = os.path.join(_work_dir, basename)
    shutil.copyfile(path, new_path)
    _in_work_dir[path] = new_path
    return new_path


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class field:
    def next(self) -> str | list[str]:
        raise ValueError("Unimplemented!")

    def length(self) -> int:
        raise ValueError("Unimplemented!")

    def media_files(self) -> list[str]:
        raise ValueError("Unimplemented!")


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class _primitive_field(field):

    def length(self) -> int:
        return NO_LENGTH

    def media_files(self) -> list[str]:
        return []


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class txt(_primitive_field):
    """
    A constant text field.
    """

    def __init__(self, text: str, line_br: bool = False, force: bool = True) -> None:
        if force:
            assert text
        if line_br:
            text = utils.use_html_line_breaks(text)
        self._text = text

    def next(self) -> str:
        return self._text

    def str(self) -> str:
        return self._text


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class seq(_primitive_field):
    """
    A numerical sequence field.
    """

    def __init__(self, start: int = 1, step: int = 1) -> None:
        self._counter = itertools.count(start=start, step=step)

    def next(self) -> str:
        return str(next(self._counter))


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
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
        val = self._content[self._counter]
        self._counter += 1
        return val

    def length(self) -> int:
        return len(self._content)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class tsv(_content_field):
    """
    A TSV column field.
    """

    def __init__(
        self,
        file_path: str,
        column_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> None:
        if file_path in _tsv:
            df = _tsv[file_path]
        else:
            df = utils.read_tsv(file_path)
            _tsv[file_path] = df
        content = [str(cell).strip() for cell in df[column_name]]
        if line_br:
            content = list(map(utils.use_html_line_breaks, content))
        super().__init__(content, [], force=force)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class tsvs(_content_field):
    """
    A TSVS column field.
    """

    def __init__(
        self,
        tsvs: str,
        column_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> None:
        if tsvs in _tsv:
            df = _tsv[tsvs]
        else:
            df = utils.read_tsvs(tsvs)
            _tsv[tsvs] = df
        content = [str(cell).strip() for cell in df[column_name]]
        if line_br:
            content = list(map(utils.use_html_line_breaks, content))
        super().__init__(content, [], force=force)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class gsheet(_content_field):
    """
    A column from a Google sheet.
    """

    def __init__(
        self,
        json_keyfile_name: str,
        gspread_url: str,
        column_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> None:
        assert json_keyfile_name
        assert gspread_url
        assert column_name
        if gspread_url in _gsheet:
            sheet = _gsheet[gspread_url]
        else:
            credentials = (
                service_account.ServiceAccountCredentials.from_json_keyfile_name(
                    json_keyfile_name, GSPREAD_SCOPE
                )
            )
            sheet = gspread.authorize(credentials).open_by_url(gspread_url)
        records = sheet.get_worksheet(0).get_all_records()
        content = [str(row[column_name]).strip() for row in records]
        if line_br:
            content = list(map(utils.use_html_line_breaks, content))
        super().__init__(content, [], force=force)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class grp(_content_field):
    """
    Group entries in a TSV or gsheet column using another column.
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
        keys,
        group_by,
        selected,
        force: bool = True,
        unique: bool = False,
    ) -> None:
        keys = [keys.next() for _ in range(keys.length())]
        key_to_selected = {k: [] for k in keys}
        for _ in range(num_entries(group_by, selected)):
            key_to_selected[group_by.next()].append(selected.next())
        if unique:
            assert all(len(value) == 1 for value in key_to_selected.values())
            key_to_selected = {key: value[0] for key, value in key_to_selected.items()}
        content = [key_to_selected[k] for k in keys]
        super().__init__(content, [], force)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class media(_content_field):

    def __init__(
        self,
        # HTML format string.
        html_fmt: str,
        keys,
        # Map key to list of paths.
        get_paths: enforcer.Callable,
        # Sort list of paths.
        sort_paths: enforcer.OptionalCallable = None,
        # Map path to `format` arguments.
        # Your final HTML will be `html_fmt.format(fmt_args(path))`.
        fmt_args: enforcer.OptionalCallable = None,
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
        for _ in range(keys.length()):
            key = keys.next()
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
                new_path = _add_to_work_dir(path)
                args = {
                    "basename": os.path.basename(new_path),
                    "alt": utils.stem(path),
                }
                if fmt_args:
                    args.update(fmt_args(path))
                cur += html_fmt.format(**args)
                media_files.add(new_path)
            content.append(cur)

        media_files = list(media_files)
        super().__init__(content, media_files, force=force)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def img(
    keys,
    get_paths: enforcer.Callable,
    sort_paths: enforcer.OptionalCallable = None,
    fmt_args: enforcer.OptionalCallable = None,
    caption: bool = True,
    id: bool = True,
    force: bool = True,
) -> media:
    """
    Args:
        fmt_args: A lambda that, given the path, would return the HTML format
        kwargs.
        If `caption` is set to True, then "caption" must also exist.
        If `id` is set to True, then "id" must also exist.
        The `alt` key is optional, and can be used to override the alternative
        text (which defaults to the stem).
    """
    html_fmt = '<img src="{basename}" alt="{alt}"><br/>'
    if id:
        html_fmt = '<img src="{basename}" alt="{alt}" id="{id}"><br/>'
    if caption:
        html_fmt = (
            "<figure>"
            + html_fmt
            + "<figcaption> {caption} </figcaption> </figure> <br/>"
        )

    return media(
        html_fmt=html_fmt,
        keys=keys,
        get_paths=get_paths,
        sort_paths=sort_paths,
        fmt_args=fmt_args,
        force=force,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def snd(
    keys,
    get_paths: enforcer.Callable,
    sort_paths: enforcer.OptionalCallable = None,
    force: bool = True,
) -> media:
    return media(
        html_fmt=AUDIO_FMT,
        keys=keys,
        get_paths=get_paths,
        sort_paths=sort_paths,
        force=force,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class apl(field):
    """
    Apply a lambda to a field.
    """

    def __init__(self, lam: enforcer.Callable, *fields) -> None:
        self._lambda = lam
        self._fields = _convert_strings(*fields)

    def media_files(self) -> list[str]:
        return merge_media_files(*self._fields)

    def next(self) -> str | list[str]:
        return self._lambda(*[f.next() for f in self._fields])

    def length(self) -> int:
        return num_entries(*self._fields)


# N.B. This must follow the last field subclass definition.
Field = type_enforced.utils.WithSubclasses(field)
OptionalField = Field + [None]
FieldOrStr = Field + [str]


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def fmt(
    fmt: str,
    key_to_field: dict[str, Field],
    force: bool = True,
    aon: typing.Optional[bool] = None,
) -> apl:
    """
    A string formatting field.
    """
    keys = list(key_to_field.keys())
    if not force and aon is None:
        utils.fatal(
            "If the format data is allowed to be absent, then the"
            "all-or-nothing behaviour must be specified"
        )

    def format(*nexts: str) -> str:
        assert len(nexts) == len(keys)
        all_present = all(nexts)
        assert all_present or not force
        if aon and not all_present:
            return ""
        return fmt.format(**{key: next for key, next in zip(keys, nexts)})

    return apl(format, *[key_to_field[k] for k in keys])


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def aon(*fields: FieldOrStr) -> apl:
    """
    Construct an all-or-nothing field.
    """

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def all_or_nothing(*nexts: str) -> str:
        return "".join(nexts) if all(nexts) else ""

    return apl(all_or_nothing, *fields)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def cat(*fields: FieldOrStr) -> apl:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def concatenate(*nexts: str) -> str:
        return "".join(nexts)

    return apl(concatenate, *fields)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def xor(*fields: FieldOrStr) -> apl:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def first_match(*nexts: str) -> str:
        for n in nexts:
            if n:
                return n
        return ""

    return apl(first_match, *fields)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def jne(sep: str, *fields: FieldOrStr) -> apl:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def join_non_empty(*nexts: str) -> str:
        return sep.join(filter(None, nexts))

    return apl(join_non_empty, *fields)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _convert_strings(
    *fields: FieldOrStr,
) -> list[*Field]:
    return [
        txt(f, line_br=False, force=False) if isinstance(f, str) else f for f in fields
    ]


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def num_entries(*fields: Field) -> int:
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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def merge_media_files(*fields: Field) -> list[str]:
    m = sum([f.media_files() for f in fields], [])
    # Eliminate duplicates. This significantly reduces the package size.
    # While this is handled by Anki, it's not supported in genanki.
    return sorted(list(set(m)))
