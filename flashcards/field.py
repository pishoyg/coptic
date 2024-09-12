import itertools
import os
import shutil
import typing

import pandas as pd

import utils

NO_LENGTH = -1

AUDIO_FMT = '<audio controls><source src="{basename}"/></audio>'
AUDIO_FMT_L = '<audio controls><source src="'
AUDIO_FMT_R = '"/></audio>'
assert AUDIO_FMT_L + "{basename}" + AUDIO_FMT_R == AUDIO_FMT

_work_dir = ""
_initialized = False
_in_work_dir: dict[str, str] = {}
_tsv: dict[str, pd.DataFrame] = {}


def init(work_dir: str) -> None:
    global _work_dir, _initialized
    _work_dir = work_dir
    _initialized = True


def _add_to_work_dir(path: str) -> str:
    assert _initialized
    if path in _in_work_dir:
        return _in_work_dir[path]
    basename = path.replace("/", "_")
    new_path = os.path.join(_work_dir, basename)
    shutil.copyfile(path, new_path)
    _in_work_dir[path] = new_path
    return new_path


class field:
    def next(self) -> str | list[str]:
        raise NotImplementedError()

    def length(self) -> int:
        raise NotImplementedError()

    def media_files(self) -> list[str]:
        raise NotImplementedError()


class _primitive_field(field):
    def length(self) -> int:
        return NO_LENGTH

    def media_files(self) -> list[str]:
        return []


class txt(_primitive_field):
    """A constant text field."""

    def __init__(
        self,
        text: str,
        line_br: bool = False,
        force: bool = True,
    ) -> None:
        if force:
            assert text
        if line_br:
            text = utils.use_html_line_breaks(text)
        self._text = text

    def next(self) -> str:
        return self._text

    def str(self) -> str:
        return self._text


class seq(_primitive_field):
    """A numerical sequence field."""

    def __init__(self, start: int = 1, step: int = 1) -> None:
        self._counter = itertools.count(start=start, step=step)

    def next(self) -> str:
        return str(next(self._counter))


class _content_field(field):
    def __init__(
        self,
        content: list[str],
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

    def next(self) -> str:
        val = self._content[self._counter]
        self._counter += 1
        return val

    def length(self) -> int:
        return len(self._content)


class tsv(_content_field):
    """A TSV column field."""

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


class tsvs(_content_field):
    """A TSVS column field."""

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


class media(_content_field):
    def __init__(
        self,
        # HTML format string.
        html_fmt: str,
        keys,
        # Map key to list of paths.
        get_paths: typing.Callable,
        # Map path to `format` arguments.
        # Your final HTML will be `html_fmt.format(fmt_args(path))`.
        fmt_args: typing.Optional[typing.Callable] = None,
        force: bool = True,
    ) -> None:
        """The final path to a media file must be a basename. Directories are
        not allowed. This implies that all basenames must be unique. See
        github.com/kerrickstaley/genanki?tab=readme-ov-file#media-files.

        We have media files from multiple source directories, and their
        basenames may be conflicting.
        We solve this problem by doing the following:
        We copy all files to a temporary work directory, assigning them unique
        basenames. We use the new basenames in our HTML. We pass the files in
        the temporary directory to the package generator in order for the
        basenames to match, and we forget about the original paths and names.
        """

        content = []
        media_files: set[str] = set()
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
            cur = ""
            for path in paths:
                new_path = _add_to_work_dir(path)
                args = {
                    "basename": os.path.basename(new_path),
                    "width": "auto",
                    "alt": utils.stem(path),
                }
                if fmt_args:
                    args.update(fmt_args(path))
                cur += html_fmt.format(**args)
                media_files.add(new_path)
            content.append(cur)

        super().__init__(content, list(media_files), force=force)


def img(
    keys,
    get_paths: typing.Callable,
    fmt_args: typing.Optional[typing.Callable] = None,
    force: bool = True,
    line_br: bool = True,
) -> media:
    """
    Args:
        fmt_args: A lambda that, given the path, would return the HTML format
        kwargs.
        The following keys are required:
            - "caption"
            - "id"
        The following keys are optional:
            - "alt": defaults to the stem of the file.
            - "width": defaults to "auto".
    """
    html_fmt: str = (
        "<figure>"
        '<img src="{basename}" alt="{alt}" id="{id}" class="{class}" style="width: {width}">'
        "<figcaption> {caption} </figcaption>"
        "</figure>"
    )
    if line_br:
        html_fmt += "<br>"

    return media(
        html_fmt=html_fmt,
        keys=keys,
        get_paths=get_paths,
        fmt_args=fmt_args,
        force=force,
    )


def snd(
    keys,
    get_paths: typing.Callable,
    force: bool = True,
) -> media:
    return media(
        html_fmt=AUDIO_FMT,
        keys=keys,
        get_paths=get_paths,
        force=force,
    )


class apl(field):
    """Apply a lambda to a field."""

    def __init__(self, lam: typing.Callable, *fields) -> None:
        self._lambda = lam
        self._fields = _convert_strings(*fields)

    def media_files(self) -> list[str]:
        return merge_media_files(*self._fields)

    def next(self) -> str | list[str]:
        return self._lambda(*[f.next() for f in self._fields])

    def length(self) -> int:
        return num_entries(*self._fields)


def fmt(
    fmt: str,
    key_to_field: dict[str, field],
    force: bool = True,
    aon: typing.Optional[bool] = None,
) -> apl:
    """A string formatting field."""
    keys = list(key_to_field.keys())
    if not force and aon is None:
        utils.fatal(
            "If the format data is allowed to be absent, then the"
            "all-or-nothing behaviour must be specified",
        )

    def format(*nexts: str) -> str:
        assert len(nexts) == len(keys)
        all_present = all(nexts)
        assert all_present or not force
        if aon and not all_present:
            return ""
        return fmt.format(**{key: next for key, next in zip(keys, nexts)})

    return apl(format, *[key_to_field[k] for k in keys])


def aon(*fields: field | str) -> apl:
    """Construct an all-or-nothing field."""

    def all_or_nothing(*nexts: str) -> str:
        return "".join(nexts) if all(nexts) else ""

    return apl(all_or_nothing, *fields)


def cat(*fields: field | str) -> apl:
    def concatenate(*nexts: str) -> str:
        return "".join(nexts)

    return apl(concatenate, *fields)


def xor(*fields: field | str) -> apl:
    def first_match(*nexts: str) -> str:
        for n in nexts:
            if n:
                return n
        return ""

    return apl(first_match, *fields)


def jne(sep: str, *fields: field | str) -> apl:
    def join_non_empty(*nexts: str) -> str:
        return sep.join(filter(None, nexts))

    return apl(join_non_empty, *fields)


def _convert_strings(*fields: field | str) -> list[field]:
    return [
        txt(f, line_br=False, force=False) if isinstance(f, str) else f
        for f in fields
    ]


def num_entries(*fields: field) -> int:
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


def merge_media_files(*fields: field) -> list[str]:
    m = sum([f.media_files() for f in fields], [])
    # Eliminate duplicates. This significantly reduces the package size.
    # While this is handled by Anki, it's not supported in genanki.
    return sorted(list(set(m)))
