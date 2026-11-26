---
name: kellia-entry-type-conventions
description: How KELLIA types entries in super entries (compound/hom/untyped); which rules are checkable, which aren't
metadata:
  type: reference
---

In KELLIA's TEI, the `type` of an `<entry>` in a `<superEntry>` follows
conventions that the schema doesn't enforce:

- A parenthesized collocation (`ⲁⲗⲉ (ⲉϩⲣⲁⲓ)`) shares the type of its base
  word: untyped under an untyped base, `compound` under a compound. This is
  reliable (~280 cases agree), so violations are errors worth fixing in
  `data/input/` (see #814).
- `hom` is NOT checkable within a group. It points at homonyms across the whole
  dictionary (288 `hom` entries sit outside any super entry), and many repeated
  lemmas are both untyped. Only flag `hom` when a pair of identical
  collocations contradicts its own group's pattern.
- Unparenthesized verb + adverb (`ⲉⲓ ⲉⲃⲟⲗ`) has no convention: mostly
  `compound`, but also untyped and `hom`. Don't "fix" these.
- A collocation's form-level `type="compound"` says nothing about the entry's
  type; most untyped collocations have one.
