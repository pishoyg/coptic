"""Path constants."""

import os

SITE_DIR: str = "docs"
DOMAIN: str = "remnqymi.com"
URL: str = f"https://{DOMAIN}"
CRUM: str = f"{URL}/crum"
# TODO: (#298) Stop using email.
EMAIL: str = "remnqymi@gmail.com"
JSON_KEYFILE_NAME: str = "google_cloud_keyfile.json"


def crum(key: str | int) -> str:
    return f"{CRUM}/{key}.html"


# Define the shared CSS, and verify its existence in the site directory.
_SHARED_CSS_BASENAME = "style.css"
assert os.path.exists(os.path.join(SITE_DIR, _SHARED_CSS_BASENAME))
# The CSS can be imported in HTML with a path that is relative to the root
# directory of the website.
SHARED_CSS = f"/{_SHARED_CSS_BASENAME}"
