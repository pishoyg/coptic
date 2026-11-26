---
name: anki-document-outlives-card
description: On Anki, card scripts re-run per side in a persistent document; document/body state accumulates
metadata:
  type: project
---

Anki's reviewer most likely keeps one `document` for the whole review session
and runs the card template's inlined script (`flashcards/deck.py`) again on
every side it shows. Anything attached to `document` or appended to
`document.body` therefore piles up from side to side, while elements inside
the card's fields are fresh on each side.

**Why:** This is the likely cause of the old "elements duplicated on some Anki
platforms" bug (the Help panel appended to `document.body`). It also broke the
header's Dev button (#203): each side added another `EVENT.DEV` toggle
listener, so an even number of them cancelled out.

**How to apply:** In code that runs on cards (`docs/crum/main.ts`), a
`document` listener must be idempotent, or must claim the event (header events
are cancelable; see `dev.Highlighter.addEventListeners`). Attach per-card
behaviour to elements inside the card rather than to `document` or `body`.
