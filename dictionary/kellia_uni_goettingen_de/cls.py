"""KELLIA HTML class names."""

BIBL: str = "bibl"
# CITATION is a citation in the bibliography of a sense.
CITATION: str = "citation"
# DEFINITION is a definition of a sense, as opposed to a translation.
DEFINITION: str = "definition"
# DELIMITER separates the citations in the bibliography of a sense.
DELIMITER: str = "delimiter"
# ETYM_NOTE is a note in an etymology, or the note of an entry, which is
# rendered along with the etymology because it's mostly etymological (see
# `kellia.Etymology`).
ETYM_NOTE: str = "etym-note"
# EXAMPLE is a compound or a set phrase that illustrates a sense.
EXAMPLE: str = "example"
# GREEK_REF cites the lexicons that list the Greek lemma of a loanword.
GREEK_REF: str = "greek-ref"
LANG: str = "lang"
ORTHS: str = "orths"
# REF lists the Greek equivalents of an Egyptian sense.
REF: str = "ref"
REF_XR: str = "ref_xr"
# REMARK is a remark on a word form, such as how rare it is.
REMARK: str = "remark"
# SENSES is prefixed, because Crum uses `senses` for something else.
SENSES: str = "kellia-senses"
XR: str = "xr"
# XR_TARGET is the word that a cross-reference refers to. The frontend links
# it to Coptic Dictionary Online.
XR_TARGET: str = "xr-target"
