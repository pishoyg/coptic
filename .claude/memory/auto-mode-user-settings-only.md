---
name: auto-mode-user-settings-only
description: "permissions.defaultMode \"auto\" and autoMode only take effect from user settings; the repo's copies are deliberate, inert duplicates"
metadata:
  type: project
---

`permissions.defaultMode: "auto"`, `autoMode`, and `autoContinueAtUsageLimit`
take effect only from `~/.claude/settings.json` (or managed settings). The
repo's `.claude/settings.json` duplicates them on purpose (2026-10-08): the
repo's Claude settings are kept self-contained, even where a copy is ignored.

**Why:** an ignored `"auto"` in project settings makes Claude Code skip the
user-level `defaultMode` and use the built-in default. Since v2.1.283 the
built-in default is also `auto`, so the duplicate is harmless. Before that it
made sessions start in Manual, which is why it was removed on 2026-08-08.

Caveat (docs, v2.1.294): when user settings don't set
`autoContinueAtUsageLimit`, a project file that sets it turns the feature
*off*. The repo copy is a harmless backup only while the user-level key exists.

**How to apply:** keep both copies in sync, except for machine-specific
details (e.g. the local checkout path in `autoMode.environment`), which stay
in user settings only. Don't remove the repo copies as "ineffective". If
sessions start in Manual, check `claude --version` first.
