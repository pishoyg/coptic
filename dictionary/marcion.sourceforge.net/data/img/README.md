# Image File Names

The image file names should have the format
`${KEY}-${SENSE}-${SEQUENCE}.${EXTENSION}` or `${KEY}-${SEQUENCE}.${EXTENSION}`.

If three fields are given, the second field (the sense) is used to indicate
which sense of the word the image represents. This is useful for words that have
different (potentially unrelated or even conflicting) meanings. The second
field is optional. If two fields are given in the image name, the image will be
understood as representing some basic sense of the words.
If, for a certain words, images are given in both formats, the senseless images
will precede the sense-indicated images, and the sense-indicated images will be
sorted according to the integer used to represent the sense.
