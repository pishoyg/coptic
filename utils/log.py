"""Logging and error checking / reporting helpers."""

import argparse
import enum
import os
import pathlib
import sys
import typing

import colorama


class Level(enum.IntEnum):
    """Logging severity levels, ordered from least to most severe."""

    INFO = 0
    WARN = 1
    ERROR = 2
    FATAL = 3  # dead: disable


def _level_from_argv() -> Level:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(add_help=False)
    _ = parser.add_argument(
        "--log",
        type=lambda name: Level[name.upper()],
        default=Level.INFO,
        metavar="LEVEL",
        help="Minimum severity to log; one of: "
        + ", ".join(level.name.lower() for level in Level),
    )
    # Consume `--log` so importing scripts don't see (and reject) it via
    # their own strict `parse_args`. Everything else is left untouched.
    args, remaining = parser.parse_known_args()
    sys.argv[1:] = remaining
    return args.log


# The minimum severity that gets logged. Messages below this level are
# silently dropped. Shared by all scripts importing this package.
#
# Controlled by the `--log` command-line flag (e.g. `--log error`), read from
# any importing script's command line.
_LEVEL: Level = _level_from_argv()


def _print(
    color: str,
    recolor: str,
    *args: object,
    severity: typing.Literal["", "info", "warn", "error", "fatal"] = "",
    exception: bool = False,
):
    message: str = (
        colorama.Style.DIM
        + color
        + (severity.capitalize() + ": " if severity else "")
        + colorama.Style.NORMAL
        + " ".join(
            [
                (recolor if idx % 2 else color) + str(arg)
                for idx, arg in enumerate(args)
            ],
        )
        + colorama.Style.RESET_ALL
    )

    if exception:
        raise Exception(message)  # pylint: disable=broad-exception-raised
    else:
        print(message)


def info(*args: object, level: bool = True):
    """Log an informational message.

    Args:
        *args: Arguments to print.
        level: Whether to prepend the level to the message.

    """
    if _LEVEL > Level.INFO:
        return
    _print(
        colorama.Fore.GREEN,
        colorama.Fore.BLUE,
        severity="info" if level else "",
        *args,
    )


def warn(*args: object, level: bool = True):
    """Log a warning.

    Args:
        *args: Arguments to print.
        level: Whether to prepend the level to the message.

    """
    if _LEVEL > Level.WARN:
        return
    _print(
        colorama.Fore.YELLOW,
        colorama.Fore.CYAN,
        severity="warn" if level else "",
        *args,
    )


def error(*args: object, level: bool = True):
    """Log an error.

    Args:
        *args: Arguments to print.
        level: Whether to prepend the level to the message.

    """
    if _LEVEL > Level.ERROR:
        return
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="error" if level else "",
        *args,
    )


def fatal(*args: object, level: bool = True) -> typing.NoReturn:
    """Log an error and throw an exception.

    Args:
        *args: Arguments to print.
        level: Whether to prepend the level to the message.

    """
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="fatal" if level else "",
        exception=True,
        *args,
    )
    assert False  # This should never execute.


def wrote(path: str | pathlib.Path) -> None:
    if not os.path.exists(path):
        fatal(path, "doesn't exist!")
    info("Wrote", path)
