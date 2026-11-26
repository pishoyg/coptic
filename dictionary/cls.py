"""HTML class names shared across the dictionary pipelines."""

DIALECT: str = "dialect"
GLOSS: str = "gloss"
# GREEK is a Greek word.
GREEK: str = "greek"
MEANING: str = "meaning"
# PART_OF_SPEECH is a grammatical type that occupies a line of its own. An
# inlined type is a TYPE.
PART_OF_SPEECH: str = "part-of-speech"
# REMARK is a remark on a word form, such as how rare it is.
# TODO: (#64) Apply it to Marcion's remarks, which are currently rendered
# as plain text.
REMARK: str = "remark"
SPELLING: str = "spelling"
TYPE: str = "type"
WORD: str = "word"
