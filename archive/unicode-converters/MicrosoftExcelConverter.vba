' A Microsoft Excel macro for converting from one of the well-known Coptic
' character mapping conventions to the Coptic unicode.
' The character mapping can be easily changed, in case you have been using
' a different convention.
'
' Please see https://support.microsoft.com/en-us/office/quick-start-create-a-macro-741130ca-080d-49f5-9471-1e5fb3d581a8
' for instructions on how to use the macro in your file.
'

Sub ToCoptic()
Set TO_COPTIC = CreateObject("Scripting.Dictionary")

TO_COPTIC.Add "(", "("

TO_COPTIC.Add ",", ChrW$(11403)

TO_COPTIC.Add "<", ChrW$(11402)

TO_COPTIC.Add "D", ChrW$(11398)

TO_COPTIC.Add "H", ChrW$(11406)

TO_COPTIC.Add "L", ChrW$(11414)

TO_COPTIC.Add "P", ChrW$(11424)

TO_COPTIC.Add "b", ChrW$(11395)

TO_COPTIC.Add "T", ChrW$(11430)

TO_COPTIC.Add "X", ChrW$(11436)

TO_COPTIC.Add "\", ChrW$(1001)

TO_COPTIC.Add "`", ChrW$(768)

TO_COPTIC.Add "d", ChrW$(11399)

TO_COPTIC.Add "h", ChrW$(11407)

TO_COPTIC.Add "f", ChrW$(997)

TO_COPTIC.Add "l", ChrW$(11415)

TO_COPTIC.Add "p", ChrW$(11425)

TO_COPTIC.Add "t", ChrW$(11431)

TO_COPTIC.Add "x", ChrW$(11437)

TO_COPTIC.Add "|", ChrW$(1000)

TO_COPTIC.Add "'", ChrW$(999)

TO_COPTIC.Add "+", ChrW$(11495)

TO_COPTIC.Add "/", ChrW$(65062)

TO_COPTIC.Add ";", ChrW$(1007)

TO_COPTIC.Add "?", ChrW$(773)

TO_COPTIC.Add "C", ChrW$(11428)

TO_COPTIC.Add "G", ChrW$(11396)

TO_COPTIC.Add ChrW$(8482), """"

TO_COPTIC.Add "K", ChrW$(11412)

TO_COPTIC.Add "O", ChrW$(11422)

TO_COPTIC.Add "S", ChrW$(1004)

TO_COPTIC.Add "W", ChrW$(11440)

TO_COPTIC.Add "[", ChrW$(11421)

TO_COPTIC.Add "_", ChrW$(11498)

TO_COPTIC.Add "c", ChrW$(11429)

TO_COPTIC.Add "g", ChrW$(11397)

TO_COPTIC.Add "k", ChrW$(11413)

TO_COPTIC.Add "o", ChrW$(11423)

TO_COPTIC.Add "s", ChrW$(1005)

TO_COPTIC.Add "w", ChrW$(11441)

TO_COPTIC.Add "{", ChrW$(11420)

TO_COPTIC.Add """", ChrW$(998)

TO_COPTIC.Add ".", "."

TO_COPTIC.Add ChrW$(254), ChrW$(11799)

TO_COPTIC.Add ":", ChrW$(1006)

TO_COPTIC.Add ">", ":"

TO_COPTIC.Add "B", ChrW$(11394)

TO_COPTIC.Add "F", ChrW$(996)

TO_COPTIC.Add "J", ChrW$(1002)

TO_COPTIC.Add "N", ChrW$(11418)

TO_COPTIC.Add "R", ChrW$(11426)

TO_COPTIC.Add "V", ChrW$(11434)

TO_COPTIC.Add "Z", ChrW$(11404)

TO_COPTIC.Add "^", ";"

TO_COPTIC.Add ChrW$(167), "+"

TO_COPTIC.Add ChrW$(161), "!"

TO_COPTIC.Add "j", ChrW$(1003)

TO_COPTIC.Add ChrW$(170), "["

TO_COPTIC.Add "n", ChrW$(11419)

TO_COPTIC.Add "r", ChrW$(11427)

TO_COPTIC.Add "v", ChrW$(11435)

TO_COPTIC.Add "z", ChrW$(11405)

TO_COPTIC.Add ChrW$(186), "]"

TO_COPTIC.Add "~", ChrW$(11519)

TO_COPTIC.Add "%", ","

TO_COPTIC.Add ")", ")"

TO_COPTIC.Add "-", "-"

TO_COPTIC.Add "=", ChrW$(11493)

TO_COPTIC.Add "A", ChrW$(11392)

TO_COPTIC.Add "E", ChrW$(11400)

TO_COPTIC.Add "I", ChrW$(11410)

TO_COPTIC.Add "M", ChrW$(11416)

TO_COPTIC.Add "Q", ChrW$(11408)

TO_COPTIC.Add ChrW$(8226), "="

TO_COPTIC.Add "U", ChrW$(11432)

TO_COPTIC.Add "Y", ChrW$(11438)

TO_COPTIC.Add "]", ChrW$(995)

TO_COPTIC.Add "a", ChrW$(11393)

TO_COPTIC.Add "e", ChrW$(11401)

TO_COPTIC.Add "i", ChrW$(11411)

TO_COPTIC.Add "m", ChrW$(11417)

TO_COPTIC.Add "q", ChrW$(11409)

TO_COPTIC.Add "u", ChrW$(11433)

TO_COPTIC.Add "y", ChrW$(11439)

TO_COPTIC.Add "}", ChrW$(994)


Dim Rng As Range
For Each Rng In Selection.Cells
    Dim original As String
    Dim transliteration As String
    original = Rng.Value
    transliteration = ""
    For Counter = 1 To Len(original)
        Dim c As String
        c = Mid(original, Counter, 1)
        If TO_COPTIC.Exists(c) Then
        transliteration = transliteration + TO_COPTIC(c)
        Else
        transliteration = transliteration + c
        End If
    Next
    Rng.Value = transliteration
Next Rng

End Sub


Sub ToLatin()
Set TO_LATIN = CreateObject("Scripting.Dictionary")

TO_LATIN.Add "(", "("

TO_LATIN.Add ChrW$(11403), ","

TO_LATIN.Add ChrW$(11402), "<"

TO_LATIN.Add ChrW$(11398), "D"

TO_LATIN.Add ChrW$(11406), "H"

TO_LATIN.Add ChrW$(11414), "L"

TO_LATIN.Add ChrW$(11424), "P"

TO_LATIN.Add ChrW$(11395), "b"

TO_LATIN.Add ChrW$(11430), "T"

TO_LATIN.Add ChrW$(11436), "X"

TO_LATIN.Add ChrW$(1001), "\"

TO_LATIN.Add ChrW$(768), "`"

TO_LATIN.Add ChrW$(11399), "d"

TO_LATIN.Add ChrW$(11407), "h"

TO_LATIN.Add ChrW$(997), "f"

TO_LATIN.Add ChrW$(11415), "l"

TO_LATIN.Add ChrW$(11425), "p"

TO_LATIN.Add ChrW$(11431), "t"

TO_LATIN.Add ChrW$(11437), "x"

TO_LATIN.Add ChrW$(1000), "|"

TO_LATIN.Add ChrW$(999), "'"

TO_LATIN.Add ChrW$(11495), "+"

TO_LATIN.Add ChrW$(65062), "/"

TO_LATIN.Add ChrW$(1007), ";"

TO_LATIN.Add ChrW$(773), "?"

TO_LATIN.Add ChrW$(11428), "C"

TO_LATIN.Add ChrW$(11396), "G"

TO_LATIN.Add """", ChrW$(8482)

TO_LATIN.Add ChrW$(11412), "K"

TO_LATIN.Add ChrW$(11422), "O"

TO_LATIN.Add ChrW$(1004), "S"

TO_LATIN.Add ChrW$(11440), "W"

TO_LATIN.Add ChrW$(11421), "["

TO_LATIN.Add ChrW$(11498), "_"

TO_LATIN.Add ChrW$(11429), "c"

TO_LATIN.Add ChrW$(11397), "g"

TO_LATIN.Add ChrW$(11413), "k"

TO_LATIN.Add ChrW$(11423), "o"

TO_LATIN.Add ChrW$(1005), "s"

TO_LATIN.Add ChrW$(11441), "w"

TO_LATIN.Add ChrW$(11420), "{"

TO_LATIN.Add ChrW$(998), """"

TO_LATIN.Add ".", "."

TO_LATIN.Add ChrW$(11799), ChrW$(254)

TO_LATIN.Add ChrW$(1006), ":"

TO_LATIN.Add ":", ">"

TO_LATIN.Add ChrW$(11394), "B"

TO_LATIN.Add ChrW$(996), "F"

TO_LATIN.Add ChrW$(1002), "J"

TO_LATIN.Add ChrW$(11418), "N"

TO_LATIN.Add ChrW$(11426), "R"

TO_LATIN.Add ChrW$(11434), "V"

TO_LATIN.Add ChrW$(11404), "Z"

TO_LATIN.Add ";", "^"

TO_LATIN.Add "+", ChrW$(167)

TO_LATIN.Add "!", ChrW$(161)

TO_LATIN.Add ChrW$(1003), "j"

TO_LATIN.Add "[", ChrW$(170)

TO_LATIN.Add ChrW$(11419), "n"

TO_LATIN.Add ChrW$(11427), "r"

TO_LATIN.Add ChrW$(11435), "v"

TO_LATIN.Add ChrW$(11405), "z"

TO_LATIN.Add "]", ChrW$(186)

TO_LATIN.Add ChrW$(11519), "~"

TO_LATIN.Add ",", "%"

TO_LATIN.Add ")", ")"

TO_LATIN.Add "-", "-"

TO_LATIN.Add ChrW$(11493), "="

TO_LATIN.Add ChrW$(11392), "A"

TO_LATIN.Add ChrW$(11400), "E"

TO_LATIN.Add ChrW$(11410), "I"

TO_LATIN.Add ChrW$(11416), "M"

TO_LATIN.Add ChrW$(11408), "Q"

TO_LATIN.Add "=", ChrW$(8226)

TO_LATIN.Add ChrW$(11432), "U"

TO_LATIN.Add ChrW$(11438), "Y"

TO_LATIN.Add ChrW$(995), "]"

TO_LATIN.Add ChrW$(11393), "a"

TO_LATIN.Add ChrW$(11401), "e"

TO_LATIN.Add ChrW$(11411), "i"

TO_LATIN.Add ChrW$(11417), "m"

TO_LATIN.Add ChrW$(11409), "q"

TO_LATIN.Add ChrW$(11433), "u"

TO_LATIN.Add ChrW$(11439), "y"

TO_LATIN.Add ChrW$(994), "}"


Dim Rng As Range
For Each Rng In Selection.Cells
    Dim original As String
    Dim transliteration As String
    original = Rng.Value
    transliteration = ""
    For Counter = 1 To Len(original)
        Dim c As String
        c = Mid(original, Counter, 1)
        If TO_LATIN.Exists(c) Then
        transliteration = transliteration + TO_LATIN(c)
        Else
        transliteration = transliteration + c
        End If
    Next
    Rng.Value = transliteration
Next Rng

End Sub
