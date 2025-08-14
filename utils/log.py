"""Logging and error checking / reporting helpers."""

import os
import typing

import colorama


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


def wrote(path: str) -> None:
    assert os.path.exists(path)
    info("Wrote", path)
