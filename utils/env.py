"""Environment variable helpers."""

import os

from utils import log


def boolean(name: str) -> bool:
    val = os.getenv(name, "0").lower()
    if val in ["false", "0", ""]:
        return False
    if val in ["true", "1"]:
        return True
    log.warn(name, "has an unparsable value:", val, "we assume", True)
    return True
