# This was forked from:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py
# The original file was snapshotted on 2024.06.01.
# Edits made to the original file beyond that data should be incorporated.
# View history at:
# https://github.com/KELLIA/dictionary/commits/master/utils/dictionary_reader.py

import glob
import io
import os
import re
import xml.etree.ElementTree as ET
from argparse import ArgumentParser
from collections import OrderedDict, defaultdict

import pandas as pd

CLEAN = set("ⲁⲃⲅⲇⲉⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱϣϥⳉϧϩϫϭϯ ")


def strip(text: str) -> str:
    return " ".join(text.split())


def clean(text: str) -> str:
    text = "".join(c for c in text if c in CLEAN)
    return strip(text)


def cdo(entry_xml_id: str) -> str:
    return f"https://coptic-dictionary.org/entry.cgi?tla={entry_xml_id}"


class Reformat:
    def __init__(self):
        self._amir = ""

    def amir(self):
        return self._amir

    def pishoy(self):
        raise ValueError("Not implemented!")


class Line:
    def __init__(self, gram_grp, orth, geo, form_id):
        self._gram_grp = gram_grp
        self._orth = orth
        self._geo = geo
        self._form_id = form_id

    def pishoy_tr(self) -> str:
        fmt = '<td><span id="{id}">{text}</span></td>'
        content = [
            ("orth", self._orth),
            ("geo", self._geo),
            ("gram_grp", self._gram_grp),
        ]
        content = [fmt.format(id=pair[0], text=pair[1]) for pair in content]
        content = "<tr>" + "".join(content) + "</tr>"
        return content


class OrthString(Reformat):
    def __init__(self):
        super().__init__()
        self._pishoy = []

    # For each entry, you add one grammar group, then several orth's per form.
    def add_gram_grp(self, gramGrp) -> None:
        gram_string = " ".join(strip(child.text) for child in gramGrp)
        self._last_gram_grp = gram_string
        self._amir += gram_string + "\n"

    def add_orth_geo_id(self, orth_text, geos, form_id) -> None:
        if not geos:
            geos = ["S"]
        for g in geos:
            self._pishoy.append(Line(self._last_gram_grp, orth_text, g, form_id))
        geos = [g + "^^" + form_id for g in geos]
        for g in geos:
            self._amir += orth_text + "~" + g + "\n"

    def pishoy(self):
        out = []
        out.append("<table>")
        for line in self._pishoy:
            out.append(line.pishoy_tr())
        out.append("</table>")
        return "".join(out)


class EtymString(Reformat):
    def __init__(self, etym, xrs) -> None:
        super().__init__()
        self._greek_id = ""
        if etym is not None:
            greek_dict = OrderedDict()
            for child in etym:
                if child.tag == "{http://www.tei-c.org/ns/1.0}note":
                    self._amir += strip(child.text)
                elif child.tag == "{http://www.tei-c.org/ns/1.0}ref":
                    if "type" in child.attrib and "target" in child.attrib:
                        self._amir += (
                            child.attrib["type"] + ": " + child.attrib["target"] + " "
                        )
                    elif "targetLang" in child.attrib:
                        self._amir += (
                            child.attrib["targetLang"] + ": " + child.text + " "
                        )
                    elif "type" in child.attrib:
                        if "greek" in child.attrib["type"]:
                            greek_dict[child.attrib["type"]] = child.text
                elif child.tag == "{http://www.tei-c.org/ns/1.0}xr":
                    for ref in child:
                        self._amir += (
                            child.attrib["type"]
                            + ". "
                            + ref.attrib["target"]
                            + "# "
                            + ref.text
                            + " "
                        )
            if len(greek_dict) > 0:
                greek_parts = []
                self._greek_id = ""
                for key in sorted(list(greek_dict.keys())):
                    if greek_dict[key] is None:
                        # import sys
                        # sys.stderr.write(str(greek_dict))
                        # Incomplete Greek entry
                        greek_parts = []
                        break
                    val = greek_dict[key].strip()
                    if "grl_ID" in key:
                        self._greek_id = val
                    if "grl_lemma" in key:
                        part = '<span style="color:darkred">cf. Gr.'
                        if self._greek_id != "":
                            part += " (DDGLC lemma ID " + self._greek_id + ")"
                        part += "</span> " + val
                        greek_parts.append(part)
                    elif "meaning" in key:
                        greek_parts.append("<i>" + val + "</i>.")
                    elif "_pos" in key and len(val) > 0:
                        greek_parts.append(
                            '<span style="color:grey">' + val + "</span>"
                        )
                    elif "grl_ref" in key:
                        greek_parts.append(
                            '<span style="color:grey">(' + val + ")</span>"
                        )
                self._amir += " ".join(greek_parts)

        for xr in xrs:
            for ref in xr:
                ref_target = clean(ref.attrib["target"])
                self._amir += (
                    xr.attrib["type"] + ". " + "#" + ref_target + "# " + ref.text + " "
                )

    def greek_id(self):
        return self._greek_id

    pass


class Sense:
    def __init__(self, sense_n, sense_id) -> None:
        self._sense_n = sense_n
        self._sense_id = sense_id
        self._content = []

    def extend_quotes(self, quotes: list[str]) -> None:
        for q in quotes:
            self._content.append(("quote", q))

    def add_definition(self, definition):
        self._content.append(("definition", definition))

    def add_bibl(self, bibl):
        self._content.append(("bibl", bibl))

    def add_ref(self, ref):
        self._content.append(("ref", ref))

    def add_xr(self, xr):
        self._content.append(("xr", xr))

    def pishoy(self):
        fmt = '<span id="{id}">{text}</span>'
        content = [
            fmt.format(id="sense_n", text=self._sense_n)
            + " "
            + fmt.format(id="sense_id", text=self._sense_id),
        ]
        content.extend(fmt.format(id=pair[0], text=pair[1]) for pair in self._content)
        return "\n".join(content)


class Lang(Reformat):
    def __init__(self, name):
        super().__init__()
        assert name in ["de", "en", "fr"]
        self._name = name
        self._pishoy = []

    def add_sense(self, sense_n, sense_id):
        self._amir += str(sense_n) + "@" + sense_id + "|"
        self._pishoy.append(Sense(sense_n, sense_id))

    def _last_sense(self) -> Sense:
        return self._pishoy[-1]

    def add_quote(self, quote) -> None:
        self._amir += quote.amir()
        self._last_sense().extend_quotes(quote.pishoy())

    def add_definition(self, definition) -> None:
        self._last_sense().add_definition(strip(definition.text))
        if self._amir.endswith("|"):
            self._amir += "~~~"
        definition_text = strip(definition.text) + ";;;"
        self._amir += definition_text

    def add_bibl(self, bibl):
        if bibl is None:
            return
        if not bibl.text:
            return
        self._amir += bibl.text + " "
        self._last_sense().add_bibl(bibl.text)

    def add_ref(self, ref):
        self._last_sense().add_ref(ref.text)
        self._amir += "ref: " + ref.text + " "

    def add_xr(self, xr):
        for ref in xr:
            text = xr.tag[29:] + ". " + ref.attrib["target"] + "# " + ref.text
            self._amir += text + " "
            self._last_sense().add_xr(text)

    def finalize(self):
        self._amir = strip(self._amir)

    def pishoy(self):
        return "\n\n".join(sense.pishoy() for sense in self._pishoy)


class Quote(Reformat):
    def __init__(self):
        super().__init__()
        self.reset()

    def add_quote(self, quote) -> None:
        text = strip(quote.text)
        self._amir += text
        self._pishoy.append(text)

    def reset(self) -> None:
        self._amir = "~~~"
        self._pishoy = []

    def no_definitions(self) -> None:
        self._amir += ";;;"

    def yes_definitions(self) -> None:
        self._amir += "; "

    def pishoy(self) -> list[str]:
        return self._pishoy


def order_forms(formlist):
    temp = []
    for form in formlist:
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        text = ""
        dialect = ""
        for orth in orths:
            text = orth.text.replace("⸗", "--")  # Sort angle dash after hyphen
            geo = form.find("{http://www.tei-c.org/ns/1.0}usg")
            if geo is not None:
                dialect = geo.text.replace("Ak", "K")
                if dialect != "S":
                    dialect = "_" + dialect  # Sahidic always first

        temp.append((text, dialect, form))

    output = []
    for _, _, f in sorted(temp, key=lambda x: (x[0], x[1])):
        output.append(f)

    return output


def get(attr, line):
    return re.search(" " + attr + r'="([^"]*)"', line).group(1)


def get_entity_types(pub_corpora_dir):
    if not pub_corpora_dir.endswith(os.sep):
        pub_corpora_dir += os.sep
    tt_files = glob.glob(pub_corpora_dir + "**" + os.sep + "*.tt", recursive=True)
    entity_types = defaultdict(set)
    for file_ in tt_files:
        sgml = io.open(file_, encoding="utf8").read()
        if ' entities="gold"' not in sgml:
            continue  # Only use gold entities
        lines = sgml.split("\n")
        # Pass 1 - get head lemmas
        id2lemma = {}
        for line in lines:
            if "norm" in line and "xml:id" in line:
                xml_id = get("xml:id", line)
                lemma = get("lemma", line)
                id2lemma[xml_id] = lemma
        # Pass 2 - get entity types for each lemma
        for line in lines:
            if ' entity="' in line:
                ent_type = get("entity", line)
                head_id = get("head_tok", line).replace("#", "")
                lemma = id2lemma[head_id]
                entity_types[lemma].add(ent_type)
    return entity_types


def process_entry(id, super_id, entry, entry_xml_id):
    """
    :param id: int, id of the entry
    :param super_id: int, id of the superentry
    :param entry: Element representing the entry
    :return: tuple representing new row to add to the db
    """

    if "status" in entry.attrib:
        if entry.attrib["status"] == "deprecated":
            return None  # Entire entry is deprecated, used by DDGLC entries
    if "change" in entry.attrib:
        if "deprecated" in entry.attrib["change"]:
            return None  # Same for @change notation

    forms = entry.findall("{http://www.tei-c.org/ns/1.0}form")

    # ORTHSTRING -- "name" column in the db
    # Includes morphological info, followed by orthographic forms and corresponding dialect (geo) info
    # ||| separates forms
    # \n separates orth-geo pairs
    # ~ separates orth from geo

    # SEARCHSTRING -- "search" column in db
    # similar to orthstring but forms are stripped of anything but coptic letters and spaces
    # morphological info not included
    orthstring = OrthString()
    oref_string = ""
    oref_text = ""
    search_string = "\n"

    lemma = None
    for form in forms:
        is_lemma = False
        if "status" in form.attrib:
            if form.attrib["status"] == "deprecated":
                continue
        if "change" in form.attrib:
            if "deprecated" in form.attrib["change"]:
                continue
        if "type" in form.attrib:
            if form.attrib["type"] == "lemma":
                is_lemma = True
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if len(orths) > 0:
            first_orth = orths[0]
            if is_lemma:
                lemma = first_orth
    if lemma is None:
        print("No lemma type for entry of " + orths[0].text)

    first = []
    last = []
    for form in forms:
        if "status" in form.attrib:
            if form.attrib["status"] == "deprecated":
                continue
        if "change" in form.attrib:
            if "deprecated" in form.attrib["change"]:
                continue
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        if form.text is not None and form.text.strip():
            orths.append(form)
        if type(lemma).__name__ == "Element":
            if any([orth.text == lemma.text for orth in orths]):
                first.append(form)
            else:
                last.append(form)
        else:
            if any([orth.text == lemma for orth in orths]):
                first.append(form)
            else:
                last.append(form)

    first = order_forms(first)
    last = order_forms(last)
    ordered_forms = first + last

    for form in ordered_forms:
        if "type" in form.attrib:
            if form.attrib["type"] == "lemma":
                continue
        orths = form.findall("{http://www.tei-c.org/ns/1.0}orth")
        if form.text is not None and form.text.strip():
            orths.append(form)

        orefs = form.findall("{http://www.tei-c.org/ns/1.0}oRef")

        gramGrp = form.find("{http://www.tei-c.org/ns/1.0}gramGrp")
        if gramGrp is None:
            gramGrp = entry.find("{http://www.tei-c.org/ns/1.0}gramGrp")
        if gramGrp is not None:
            orthstring.add_gram_grp(gramGrp)

        all_geos = form.find("{http://www.tei-c.org/ns/1.0}usg")
        if all_geos is not None:
            if all_geos.text is not None:
                geos = re.sub(r"[\(\)]", r"", all_geos.text)
                geos = re.sub(r"Ak", r"K", geos).split(" ")
                geos = list(filter(lambda g: len(g) == 1, geos))
            else:
                geos = []
        else:
            geos = []

        form_id = (
            form.attrib["{http://www.w3.org/XML/1998/namespace}id"]
            if "{http://www.w3.org/XML/1998/namespace}id" in form.attrib
            else ""
        )

        geos_with_id = [g + "^^" + form_id for g in geos]
        for orth in orths:
            orth_text = orth.text.strip()

            if len(orefs) > 0:
                oref_text = orefs[0].text
            else:
                oref_text = orth_text

            search_text = clean(orth_text)
            oref_text = clean(oref_text)

            orthstring.add_orth_geo_id(orth_text, geos, form_id)
            for geo in geos_with_id:
                search_string += search_text + "~" + geo + "\n"
            if len(list(geos_with_id)) == 0:
                search_string += search_text + "~S\n"

        oref_string += oref_text
        oref_string += "|||"
        orthstring._amir += "|||"
        # search_string += "|||"
    orthstring._amir = re.sub(r"\|\|\|$", "", orthstring._amir)
    oref_string = re.sub(r"\|\|\|$", "", oref_string)
    # search_string = re.sub(r'\|\|\|$', '', search_string)

    first_orth_re = re.search(r"\n(.*?)~", orthstring._amir)
    if first_orth_re is not None:
        first_orth = first_orth_re.group(1)
        ascii_orth = ""
        mapping = {
            "ⲁ": "A",
            "ⲃ": "B",
            "ⲅ": "C",
            "ⲇ": "D",
            "ⲉ": "E",
            "ⲍ": "F",
            "ⲏ": "G",
            "ⲑ": "H",
            "ⲓ": "I",
            "ⲕ": "J",
            "ⲗ": "K",
            "ⲙ": "L",
            "ⲛ": "M",
            "ⲝ": "N",
            "ⲟ": "O",
            "ⲡ": "P",
            "ⲣ": "Q",
            "ⲥ": "R",
            "ⲧ": "S",
            "ⲩ": "T",
            "ⲫ": "U",
            "ⲭ": "V",
            "ⲯ": "W",
            "ⲱ": "X",
            "ϣ": "Y",
            "ϥ": "Z",
            "ⳉ": "a",
            "ϧ": "b",
            "ϩ": "c",
            "ϫ": "d",
            "ϭ": "e",
            "ϯ": "SI",
            " ": " ",
        }
        for char in first_orth:
            if char in mapping:
                ascii_orth += mapping[char]
    else:
        ascii_orth = ""

    # SENSES -- 3 different columns for the 3 languages: de, en, fr
    # each string contains definitions as well as corresponding bibl/ref/xr info
    # definition part, which may come from 'quote' or 'def' in the xml or both, is preceded by ~~~ and followed by ;;;
    # different senses separated by |||
    de = Lang("de")
    en = Lang("en")
    fr = Lang("fr")

    senses = entry.findall("{http://www.tei-c.org/ns/1.0}sense")
    sense_n = 1
    for sense in senses:
        sense_id = (
            sense.attrib["{http://www.w3.org/XML/1998/namespace}id"]
            if "{http://www.w3.org/XML/1998/namespace}id" in sense.attrib
            else ""
        )
        de.add_sense(sense_n, sense_id)
        en.add_sense(sense_n, sense_id)
        fr.add_sense(sense_n, sense_id)
        for sense_child in sense:
            if sense_child.tag == "{http://www.tei-c.org/ns/1.0}cit":
                bibl = sense_child.find("{http://www.tei-c.org/ns/1.0}bibl")
                quotes = sense_child.findall("{http://www.tei-c.org/ns/1.0}quote")
                definitions = sense_child.findall("{http://www.tei-c.org/ns/1.0}def")

                q = Quote()
                for quote in quotes:
                    if quote is not None and quote.text is not None:
                        q.add_quote(quote)
                        if definitions is None or len(definitions) == 0:
                            q.no_definitions()
                        else:
                            q.yes_definitions()
                        lang = quote.get("{http://www.w3.org/XML/1998/namespace}lang")
                        if lang == "de":
                            de.add_quote(q)
                        elif lang == "en":
                            en.add_quote(q)
                        elif lang == "fr":
                            fr.add_quote(q)
                        q.reset()
                for definition in definitions:
                    if definition is not None:
                        if definition.text is not None:
                            lang = definition.get(
                                "{http://www.w3.org/XML/1998/namespace}lang"
                            )
                            if lang == "de":
                                de.add_definition(definition)
                            elif lang == "en":
                                en.add_definition(definition)
                            elif lang == "fr":
                                fr.add_definition(definition)
                de.add_bibl(bibl)
                en.add_bibl(bibl)
                fr.add_bibl(bibl)
            elif sense_child.tag == "{http://www.tei-c.org/ns/1.0}ref":
                de.add_ref(sense_child)
                en.add_ref(sense_child)
                fr.add_ref(sense_child)
            elif sense_child.tag == "{http://www.tei-c.org/ns/1.0}xr":
                de.add_xr(sense_child)
                en.add_xr(sense_child)
                fr.add_xr(sense_child)

        de._amir += "|||"
        en._amir += "|||"
        fr._amir += "|||"
        sense_n += 1

    de._amir = re.sub(r"\|\|\|$", r"", de._amir)
    en._amir = re.sub(r"\|\|\|$", r"", en._amir)
    fr._amir = re.sub(r"\|\|\|$", r"", fr._amir)
    de.finalize()
    en.finalize()
    fr.finalize()

    # POS -- a single Scriptorium POS tag for each entry
    pos_list = []
    for gramgrp in entry.iter("{http://www.tei-c.org/ns/1.0}gramGrp"):
        pos = gramgrp.find("{http://www.tei-c.org/ns/1.0}pos")
        if pos is not None:
            pos_text = pos.text
        else:
            pos_text = "None"
        subc = gramgrp.find("{http://www.tei-c.org/ns/1.0}subc")
        if subc is not None:
            subc_text = subc.text
        else:
            subc_text = "None"
        new_pos = pos_map(pos_text, subc_text, orthstring._amir)
        if new_pos not in pos_list:
            pos_list.append(new_pos)
    if len(list(pos_list)) > 1:
        pos_list = filter(lambda p: p not in ["NULL", "NONE", "?"], pos_list)
        pos_list = list(pos_list)
    if len(pos_list) == 0:
        pos_list.append("NULL")
    pos_string = pos_list[
        0
    ]  # on the rare occasion pos_list has len > 1 at this point, the first one is the most valid

    # ETYM
    etym = entry.find("{http://www.tei-c.org/ns/1.0}etym")
    xrs = entry.findall("{http://www.tei-c.org/ns/1.0}xr")
    etym_string = EtymString(etym, xrs)
    ents = ""
    global entity_types
    if "~" in search_string:
        row_lemma = search_string.strip().split("~")[0]
        if row_lemma == "ⲉⲓⲱⲧ":  # Hardwired behavior for barley vs. father
            if entry_xml_id == "C998":
                ents = "plant"
            else:
                ents = "person"
        elif row_lemma in entity_types and pos_string in [
            "ART",
            "PDEM",
            "PPOS",
            "N",
            "NUM",
            "PINT",
        ]:
            ents = ";".join(sorted(list(entity_types[row_lemma])))

    return {
        "id": id,
        "super_id": super_id,
        "orthstring": orthstring.amir(),
        "pos_string": pos_string,
        "de": de.amir(),
        "de-pishoy": de.pishoy(),
        "en": en.amir(),
        "en-pishoy": en.pishoy(),
        "fr": fr.amir(),
        "fr-pishoy": fr.pishoy(),
        "etym_string": etym_string.amir(),
        "ascii_orth": ascii_orth,
        "search_string": search_string,
        "oref_string": oref_string,
        "greek_id": etym_string.greek_id(),
        "ents": ents,
        "orthstring-pishoy": orthstring.pishoy(),
    }


def process_super_entry(entry_id, super_id, super_entry):
    row_list = []
    for entry in super_entry:
        entry_xml_id = (
            entry.attrib["{http://www.w3.org/XML/1998/namespace}id"]
            if "{http://www.w3.org/XML/1998/namespace}id" in entry.attrib
            else ""
        )

        # Get lemma form ID
        forms = [
            f
            for f in entry.findall("{http://www.tei-c.org/ns/1.0}form")
            if "type" in f.attrib
        ]
        lemma = [f for f in forms if f.attrib["type"] == "lemma"]
        if len(lemma) > 0:
            lemma_form_id = lemma[0].attrib["{http://www.w3.org/XML/1998/namespace}id"]
        else:
            lemma_form_id = ""

        cur = process_entry(entry_id, super_id, entry, entry_xml_id)
        if cur is None:
            continue
        cur["lemma_form_id"] = lemma_form_id
        cur["entry_xml_id"] = entry_xml_id
        row_list.append(cur)
        entry_id += 1

    return row_list


def pos_map(pos, subc, orthstring):
    """
    :param pos: string
    :param subc: string
    :return: string
    """
    pos = pos.replace("?", "")
    if (
        pos == "Subst."
        or pos == "Adj."
        or pos == "Nominalpräfix"
        or pos == "Adjektivpräfix"
        or pos == "Kompositum"
    ):
        return "N"
    elif "Ausdruck der Nichtexistenz" in subc or "Ausdruck des Nicht-Habens" in subc:
        return "EXIST"
    elif pos == "Adv.":
        return "ADV"
    elif pos == "Vb." or pos == "unpersönlicher Ausdruck":
        if subc == "Qualitativ":
            return "VSTAT"
        elif subc == "Suffixkonjugation":
            return "VBD"
        elif subc == "Imperativ":
            return "VIMP"
        elif "ⲟⲩⲛ-" in orthstring or "ⲟⲩⲛⲧⲉ-" in orthstring:
            return "EXIST"
        else:
            return "V"
    elif pos == "Präp.":
        return "PREP"
    elif pos == "Zahlzeichen" or pos == "Zahlwort" or pos == "Präfix der Ordinalzahlen":
        return "NUM"
    elif pos == "Partikel" or pos == "Interjektion" or pos == "Partikel, enklitisch":
        return "PTC"
    elif (
        pos == "Selbst. Pers. Pron."
        or pos == "Suffixpronomen"
        or pos == "Präfixpronomen (Präsens I)"
    ):
        return "PPER"
    elif pos == "Konj.":
        return "CONJ"
    elif pos == "Dem. Pron.":
        return "PDEM"
    elif pos == "bestimmter Artikel" or pos == "unbestimmter Artikel":
        return "ART"
    elif pos == "Possessivartikel" or pos == "Possessivpräfix":
        return "PPOS"
    elif pos == "Poss. Pron.":
        return "PPERO"
    elif pos == "Interr. Pron.":
        return "PINT"
    elif pos == "Verbalpräfix":
        if subc == "Imperativpräfix ⲁ-" or subc == "Negierter Imperativ ⲙⲡⲣ-":
            return "NEG"
        if subc == "im negativen Bedingungssatz" or subc == "Perfekt II ⲉⲛⲧⲁ-":
            return "NONE"
        else:
            return "A"
    elif pos == "Pron.":
        if subc == "None":
            return "PPER"
        elif subc == "Indefinitpronomen" or subc == "Fragepronomen":
            return "PINT"
        elif subc == "Reflexivpronomen":
            return "PREP"
    elif pos == "Satzkonverter":
        return "C"
    elif pos == "Präfix":
        if "ⲧⲁ-" in orthstring:
            return "PPOS"
        elif "ⲧⲃⲁⲓ-" in orthstring:
            return "N"
        elif "ⲧⲣⲉ-" in orthstring:
            return "A"
    elif pos == "None" or pos == "?":
        if subc == "None":
            return "NULL"
        if subc == "Qualitativ":
            return "VSTAT"
    elif "ϭⲁⲛⲛⲁⲥ" in orthstring:
        return "NULL"

    return "?"


parser = ArgumentParser()
parser.add_argument(
    "--xml_path",
    type=str,
    nargs="*",
    default=[
        "dictionary/kellia.uni-goettingen.de/data/v1.2/BBAW_Lexicon_of_Coptic_Egyptian-v4-2020.xml",
        "dictionary/kellia.uni-goettingen.de/data/v1.2/DDGLC_Lexicon_of_Greek_Loanwords_in_Coptic-v2-2020.xml",
        "dictionary/kellia.uni-goettingen.de/data/v1.2/Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
    ],
    help="directory with dictionary XML files",
)
# TODO: Support entity types.
parser.add_argument(
    "--pub_corpora",
    default=None,
    help="directory with dictionary Coptic Scriptorium Corpora repo",
)
parser.add_argument(
    "--output",
    type=str,
    nargs="*",
    default=[
        "dictionary/kellia.uni-goettingen.de/data/output/egyptian.tsv",
        "dictionary/kellia.uni-goettingen.de/data/output/greek.tsv",
        "dictionary/kellia.uni-goettingen.de/data/output/comprehensive.tsv",
    ],
    help="Path to the output TSV.",
)
args = parser.parse_args()

# Gather entity data
entity_types = defaultdict(set)
if args.pub_corpora is not None:
    entity_types = get_entity_types(args.pub_corpora)


def main():
    super_id = 1
    entry_id = 1

    assert len(args.xml_path) == len(args.output)
    for xml_path, output in zip(args.xml_path, args.output):
        body = (
            ET.parse(xml_path)
            .getroot()
            .find("{http://www.tei-c.org/ns/1.0}text")
            .find("{http://www.tei-c.org/ns/1.0}body")
        )

        rows = []
        for child in body:
            if child.tag == "{http://www.tei-c.org/ns/1.0}entry":
                entry_xml_id = (
                    child.attrib["{http://www.w3.org/XML/1998/namespace}id"]
                    if "{http://www.w3.org/XML/1998/namespace}id" in child.attrib
                    else ""
                )

                # Get lemma form ID
                forms = [
                    f
                    for f in child.findall("{http://www.tei-c.org/ns/1.0}form")
                    if "type" in f.attrib
                ]
                lemma = [f for f in forms if f.attrib["type"] == "lemma"]
                if len(lemma) > 0:
                    lemma_form_id = lemma[0].attrib[
                        "{http://www.w3.org/XML/1998/namespace}id"
                    ]
                else:
                    lemma_form_id = ""

                cur = process_entry(entry_id, super_id, child, entry_xml_id)
                if cur is None:
                    continue
                cur["lemma_form_id"] = lemma_form_id
                cur["entry_xml_id"] = entry_xml_id
                rows.append(cur)
                super_id += 1
                entry_id += 1
            elif child.tag == "{http://www.tei-c.org/ns/1.0}superEntry":
                cur = process_super_entry(entry_id, super_id, child)
                rows.extend(cur)
                super_id += 1
                entry_id += len(cur)

        df = pd.DataFrame(rows)
        df["cdo"] = [cdo(entry) for entry in df["entry_xml_id"]]

        columns = [
            "entry_xml_id",
            "orthstring-pishoy",
            "de-pishoy",
            "en-pishoy",
            "fr-pishoy",
            "cdo",
            "lemma_form_id",
            "id",
            "super_id",
            "orthstring",
            "pos_string",
            "de",
            "en",
            "fr",
            "etym_string",
            "ascii_orth",
            "search_string",
            "oref_string",
            "greek_id",
            "ents",
        ]

        col_to_idx = {col_name: idx for idx, col_name in enumerate(columns)}
        columns = sorted(
            df.columns, key=lambda col_name: col_to_idx.get(col_name, 1000)
        )
        df.to_csv(output, sep="\t", index=False, columns=columns)
        # TODO: Add network graphs.


if __name__ == "__main__":
    main()
