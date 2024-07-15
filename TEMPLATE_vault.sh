#!/bin/bash

# JSON_KEYFILE_NAME contains access tokens for a Google Cloud project.
# See
# https://oauth2client.readthedocs.io/en/latest/source/oauth2client.service_account.html.
# This is required for publishing content to Drive.
# You see, we export to Drive using two methods here. The first one (which is
# somewhat simple) is to set up a local directory that automatically
# synchronizes with a Drive directory every time it's updated.
# But this doesn't work when the data is, for example, a gsheet.
# In such a case, we use the Google Cloud API.
# As of today, Jul. 9th, 2024, this isn't used, but it may be used in the
# future if we support better integration with Drive, or if we stop using the
# first method as this method is cleaner.
export JSON_KEYFILE_NAME=""

# FLASHCARD_DIR is a destination directory, used to publish the final versions
# of the flashcard packages.
# You can use any directory. Personally, I am using a directory that
# automatically synchronizes with Google Drive. And I have been sharing with
# people a link to that Drive directory and the files within it.
# So copying the new files to that directory essentially publishes the new
# version of the package to whoever has the link.
# See https://www.google.com/drive/download/.
export FLASHCARD_DIR="~/Desktop"

# KINDLE_DIR is the destination directory for Kindle dictionaries.
export KINDLE_DIR="~/Desktop/"

# BIBLE_DIR is the destination directory for the Bible EPUBs.
export BIBLE_DIR="~/Desktop/"

# TEST_DIR is used to publish temporary versions of the flashcard packages
# during testing. Use it in the testing or verification rules, which are
# written to avoid overriding the published version prematurely.
export TEST_DIR="/tmp/"

# BREAK_SYSTEM_PACKAGES is passed to `pip` commands. Its value should either be
# "" (the empty string), or "--break-system-packages". In the latter case,
# you're instructing pip to install python packages even if system packages
# break.
export BREAK_SYSTEM_PACKAGES=""

# START_AT_KEY is used in Marcion's image-finding assistance script.
export START_AT_KEY="0"

# SKIP_EXISTING defines whether Marcion's image setup script should skip
# existing targets. In order to turn it on, set:
#		SKIP_EXISTING="--skip_existing"
#	TODO: Clean up this mess. Your repo should be smart enough to update the
#	pictures that have been modified.
export SKIP_EXISTING=""
