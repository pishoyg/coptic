---
name: screenshots-go-in-tmp
description: Store all screenshots (Playwright, manual, etc.) in /tmp/ or a subdirectory, never in the repo
metadata:
  type: feedback
---

Store screenshots in `/tmp/` or a subdirectory of it (e.g.,
`/tmp/screenshots/`). Do not write screenshots into the repository working
tree.

**Why:** Keeps the repo clean and avoids accidentally committing binary
artifacts.

**How to apply:** When taking screenshots via Playwright MCP, Bash, or any
other tool, default the output path to `/tmp/...`. If multiple screenshots are
needed for a task, create a subdirectory under `/tmp/` to keep them organized.
