---
name: anki-desktop-tooltip-stretch
description: Anki Desktop runs Chrome 140; tooltips far down a card once opened at height 0 there, though newer engines were fine
metadata:
  type: project
---

Anki Desktop 26.9.4 renders cards in QtWebEngine 6.11, which is Chrome 140.
That's far behind Playwright's Chromium and AnkiDroid's WebView. Until
2026-11-15, `tooltip.css` used `position: absolute` with `bottom: 8px` and
`max-height: stretch`. In Chrome 140, every tooltip whose trigger sat more than
one viewport down the card (Wiki, sisters) opened at height 0, invisible. The
front's sigla worked.

The fix moved to `position: fixed` with flip and half-height fallbacks. The
NOTE in `docs/tooltip.css` lists the engine traps found along the way, such as
Chromium's five-fallback limit, and Chrome 140 ignoring `max-height` inside
`@position-try`.

**Why:** Playwright E2E runs only modern Chromium, so it can't catch
regressions that show up only in Anki Desktop.

**How to apply:** For any tooltip CSS change, test in Anki's Chrome 140 too.
See [[anki-desktop-remote-debugging]]. Open every tooltip on a real card with
its trigger at the top, middle, and bottom of the viewport. Wait a frame after
each scroll, since Chrome 140 updates its anchor scroll compensation per
frame.
