"""This package defines bibliography sources."""

import re

# pylint: disable=line-too-long
_SOURCES: list[tuple[str, str]] = [
    (
        r"(Kasser )?CDC",
        r"R. Kasser, Compléments au dictionnaire copte de Crum, Kairo: Inst. Français d'Archéologie Orientale, 1964",
    ),
    (r"KoptHWb", r"Koptisches Handw&ouml;rterbuch /\nW. Westendorf"),
    (
        r"CED",
        r"J. Černý, Coptic Etymological Dictionary, Cambridge: Cambridge Univ. Press, 1976",
    ),
    (
        r"DELC",
        r"W. Vycichl, Dictionnaire étymologique de la langue copte, Leuven: Peeters, 1983",
    ),
    (
        r"ChLCS",
        r"P. Cherix, Lexique Copte (dialecte sahidique), Copticherix, 2006-2018",
    ),
    (
        r"ONB",
        r"T. Orlandi, Koptische Papyri theologischen Inhalts (Mitteilungen aus der Papyrussammlung der Österreichischen Nationalbibliothek (Papyrus Erzherzog Rainer) / Neue Serie, 9), Wien: Hollinek, 1974",
    ),
    (
        r"WbGWKDT",
        r"H. Förster, Wörterbuch der griechischen Wörter in den koptischen dokumentarischen Texten. Berlin/Boston: de Gruyter, 2002",
    ),
    (
        r"LCG",
        r"B. Layton, A Coptic grammar: with a chrestomathy and glossary; Sahidic dialect, Wiesbaden: Harrassowitz, 2000",
    ),
    (
        r"Till D\.?",
        r"W. Till, Koptische Dialektgrammatik: mit Lesestücken und Wörterbuch, München: Beck, 1961",
    ),
    (
        r"Osing, Pap. Ox.",
        r"J. Osing: Der spätägyptische Papyrus BM 10808, Harrassowitz, Wiesbaden 1976",
    ),
    (
        r"Bauer",
        r"W. Bauer, K. Aland, B. Aland, Griechisch-deutsches Wörterbuch zu den Schriften des Neuen Testaments und der frühchristlichen Literatur, Berlin: de Gruyter, 1988",
    ),
    (
        r"BDAG",
        r"F.W. Danker, W. Bauer, A Greek-English Lexicon of the New Testament and other Early Christian Literature, Chicago/London: University of Chicago Press, 2000",
    ),
    (
        r"Daris 1991",
        r"S. Daris, Il lessico Latino nel Greco d'Egitto (Estudis de Papirologia i Filologia Biblica 2), Barcelona: Ediciones Aldecoa, 1991",
    ),
    (
        r"Denniston 1959",
        r"J.D. Denniston, The Greek Particles, London: Clarendon Press, 1959",
    ),
    (
        r"du Cange",
        r"C. F. du Cange, Glossarium ad scriptores mediae et infimae Graecitatis I-II, Graz: Akademische Druck- und Verlagsanstalt, 1958",
    ),
    (
        r"Hatch/Redpath 1906",
        r"E. Hatch, H.A. Redpath, A concordance to the Septuagint and the other Greek versions of the Old Testament (including the apocryphal books), Supplement, Graz: Akademische Druck- und Verlagsanstalt, 1906",
    ),
    (
        r"Kontopoulos",
        r"N. Kontopoulos, A Lexicon of Modern Greek-English and English-Modern Greek, Smyrna/London: B. Tatikidos, Trübner & Co., 1868",
    ),
    (
        r"Lampe",
        r"G.W.H. Lampe, A patristic Greek lexicon, Oxford: Clarendon Press, 1978",
    ),
    (
        r"LBG",
        r"E. Trapp, Lexikon zur byzantinischen Gräzität, besonderes des 9.-12. Jahrhunderts, Philosophisch-historische Klasse, Denkschriften (Veröffentlichungen der Kommission für Byzantinistik 238; VI/1-4) , Wien: Österreichische Akademie der Wissenschaften, 2001",
    ),
    (
        r"LSJ",
        r"H.G. Liddell, R. Scott, H.S. Jones, A Greek-English lexicon, Oxford: Clarendon Press, 1968",
    ),
    (
        r"LSJ Suppl\.",
        r"H.G. Liddell, R. Scott, H.S. Jones, E.A. Barber, A Greek-English lexicon/Supplement, Oxford: Clarendon Press, 1968",
    ),
    (
        r"Muraoka 2009",
        r"T. Muraoka, A Greek-English Lexicon of the Septuagint, Louvain/Paris/Walpole: Peeters, 2009",
    ),
    (
        r"Passow",
        r"F. Passow, V.C.F Rost, F. Palm, Handwörterbuch der griechischen Sprache, Leipzig: Vogel, 1841",
    ),
    (
        r"Preisigke",
        r"F. Preisigke, Wörterbuch der griechischen Papyrusurkunden mit Einschluß der griechischen Inschriften, Aufschriften, Ostraka, Mumienschilder usw. aus Ägypten, Berlin: Selbstverlag der Erben, 1925-1931",
    ),
    (
        r"Sophocles",
        r"E.A. Sophocles, Greek Lexicon of the Roman and Byzantine Periods (From B. C. 146 to A. D. 1100. Memorial Edition), Cambridge/Leipzig: Harvard University Press/Harrassowitz, 1914",
    ),
    (
        r"T. S. Richter 2014b",
        r"T.S. Richter, Neue koptische medizinische Rezepte (Zeitschrift für Ägyptische Sprache und Altertumskunde ZÄS 141(2), 154-194), 2014",
    ),
    (
        r"Till 1951a",
        r"W.C. Till, Arzneikunde der Kopten, Berlin: Akademie Verlag, 1951",
    ),
    (
        r"TLG",
        r"L. Berkowitz, K.A. Squitier, Thesaurus Linguae Graecae (Canon of Greek Authors and Works), New York/Oxford: University Press, 1990",
    ),
]
# pylint: enable=line-too-long

SOURCES: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(rf"(?:{regex}(?: §)? ?[0-9A-Za-z:]+(?:, ?[0-9A-Za-z:]+)*)"),
        rf'\g<0><a class="hint" data-tooltip="{repl}">?</a>',
    )
    for regex, repl in _SOURCES
]
