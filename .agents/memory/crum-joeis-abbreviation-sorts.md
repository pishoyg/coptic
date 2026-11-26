---
name: crum-joeis-abbreviation-sorts
description: How to tell Crum's three ϫⲟⲉⲓⲥ-family abbreviation sorts apart in the page scans
metadata:
  type: reference
---

Crum sets three visually distinct sorts for the ϫⲟⲉⲓⲥ family, and prints all
three side by side at page 832a (`ϭ︤ⲥ︥, ⳪̅, ⲟ︤ⲥ︥ BF v ϫⲟⲉⲓⲥ`) — use that line as
the calibration reference.

- `⳪` — a circle with a straight bar through it, **joined** to the ⲥ.
- `ⲟ︤ⲥ︥` — a plain circle, **separate** from the ⲥ.
- `ϭ︤ⲥ︥` — a circle with a curled rising hook, **separate** from the ⲥ.

**Why:** the eye is unreliable here. In interpolated (LANCZOS) enlargements, a
heavily inked ⲟ beside a ⲥ reads as joined, and template matching is
systematically blind to `ϭ︤ⲥ︥`.

**How to apply:** discriminate by connected components: under the overline, ⳪
is ONE ink blob; the other two are TWO. Render at 10-14x with NEAREST, or
better, measure. The bar at the join is 3-5 px across every ⳪ in the book, so
an accidental ink bridge would be an obvious outlier. To locate every
instance, sweep for the supralinear stroke geometrically (horizontal run
50-110 px, 2-12 px thick, blank band beneath) rather than template-matching the
glyph. See also [[crum-scan-page-offset]].
