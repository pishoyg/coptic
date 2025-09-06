"""System utilities."""

import subprocess

from utils import log


def run(*command: str) -> str:
    try:
        result = subprocess.run(
            " ".join(command),
            check=True,
            capture_output=True,
            text=True,
            shell=True,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        log.fatal(
            "Subprocess exited with status",
            e.returncode,
            "cmd:",
            e.cmd,
            "stdout:",
            e.stdout,
            "stderr:",
            e.stderr,
        )


def open_files(*args: str):
    if not args:
        return
    _ = run("open", *args)
