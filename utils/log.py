"""Logging and error checking / reporting helpers."""

# TODO: The use of variadic args makes function calls span multiple lines in
# due to Black style, and may be less readable. Consider changing the signatures
# to pass all the printable content in a single function argument.

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
    """Log an informational message."""
    _print(
        colorama.Fore.GREEN,
        colorama.Fore.BLUE,
        severity="info" if level else "",
        *args,
    )


def warn(*args: object, level: bool = True):
    """Log a warning."""
    _print(
        colorama.Fore.YELLOW,
        colorama.Fore.CYAN,
        severity="warn" if level else "",
        *args,
    )


def error(*args: object, level: bool = True):
    """Log an error."""
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="error" if level else "",
        *args,
    )


def err(cond: object, *args: object, level: bool = True):
    """If the condition is not satisfied, log an error."""
    if not cond:
        error(*args, level=level)


def throw(*args: object, level: bool = True):
    """Throw an exception."""
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="error" if level else "",
        *args,
        exception=True,
    )


def ass(cond: object, *args: object, level: bool = True):
    """Assert!

    If the condition is not satisfied, throw an error.
    """
    if not cond:
        throw(*args, level=level)


def fatal(*args: object, level: bool = True):
    """Log an error and exit with a nonzero status!"""
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="fatal" if level else "",
        *args,
    )
    exit(1)


def assass(cond: object, *args: object, level: bool = True):
    """Assassinate.

    If a condition is not satisfied, exit with a nonzero status.
    """
    if not cond:
        fatal(*args, level=level)


def wrote(path: str, verify: bool = True) -> None:
    if verify:
        assert os.path.exists(path)
    info("Wrote", path)
