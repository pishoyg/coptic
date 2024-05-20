# flashcards

`anki.py` is used to generate Anki packages.

It is currently not possible to upload the packages to GitHub, so we are
keeping them in a drive. You can download the package [here](https://drive.google.com/file/d/1KV0fH23Zucmlvdc0dwTJiDdqKIvbuYY_/view?usp=sharing).

**TODO: rewrite the following in Markdown.**

"""Generate an Anki package.

Each deck object consists of the following parameters:

- key
    This is a critical field. The note keys will be used as database
    keys to enable synchronization. It is important for the keys to be (1)
    unique, and (2) persistent. Use a different key for each note. And do
    not change the names liberally between different version of the code
    and the generated package.
    The note keys must also be unique across decks.,

- front
    Format of the card fronts. See description for syntax.

- back
    Format of the card backs. See description for syntax.,

- model_name
    Model name in the generated Anki package.,

- model_id
    Deck ID in the generated Anki package.,

- css
    Global CSS. Please notice that the front will be given the id
    "front" and the back will have the id "back". You can use these IDs if'
    you want to make your CSS format side-specific."
    Only TXT fields are allowed for this flag.,

- name
    Deck name in the generated Anki package.
    N.B. If a deck ID is not
    given, a hash of this field will be used to key the decks. Thus, it is
    important to ensure that the deck names are (1) unique, and
    (2) persistent. Use a different deck name for each deck that you want to
    support. And do not change the names liberally between different version
    of the code and the generated package.,

- id
    Deck ID in the generated Anki package.,

- description
    Deck description in the generated Anki package. Only TXT fields are
    allowed here.,

Image / file sorting:
  TL;DR: Use integer sections in your file names to control the order.
  For example, "{key}-1-1.txt", "{key}-1-2.txt", "{key}-3-4.txt".

  The files will be sorted in the output based first on the integers contained
  within the name, then lexicographically. For example, the following are
  possible orders produced by our sorting algorithm:
      - ["1.png", "2.png", ..., "11.png"],
      - ["1-1.png", "1-2.png", "2-1.png", "2-2.png"]
      - ["b1.txt", "a2.txt"]
      - ["a.txt", "b.txt"]
  The string "11" is lexicographically smaller than the string "2", but the
  integer 11 is lexicographically larger, which is why it appears later.
  Similarly, even though "b" is lexicographically larger than "a", we
  prioritize the integers, so we bring "b1" before "a2".
  If the string doesn't contain any integers, pure lexicographical ordering
  will be used.
"""
