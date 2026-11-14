---
name: anki-desktop-remote-debugging
description: Inspect Anki Desktop's webview over Chrome DevTools Protocol via QTWEBENGINE_REMOTE_DEBUGGING
metadata:
  type: reference
---

Launch Anki with `QTWEBENGINE_REMOTE_DEBUGGING=9222
/Applications/Anki.app/Contents/MacOS/Anki`. `http://localhost:9222/json`
then lists the webviews ("main webview", "top toolbar", "bottom toolbar"),
and Node's built-in `WebSocket` can drive CDP (`Runtime.evaluate`,
`Input.dispatchMouseEvent`, `Page.captureScreenshot`).

If no cards are due, you can still render one without touching scheduling.
Load `/_anki/js/reviewer.js` and `/_anki/css/reviewer.css` into the main
webview, build the reviewer skeleton (`#_mark`, `#_flag`, `#qa`), and call
`_showQuestion(q, "", "card card1")` / `_showAnswer(a, "card card1")`. Get
`q`/`a` as `<style>{css}</style>` plus the template with its fields filled
in. Templates and CSS sit protobuf-encoded in `templates.config` and
`notetypes.config` of a *copy* of `collection.anki2` (Anki locks the live
one; register a dummy `unicase` collation). Afterwards, relaunch Anki
normally to close the port. Used for [[anki-desktop-tooltip-stretch]].
