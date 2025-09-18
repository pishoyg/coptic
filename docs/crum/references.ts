/* eslint-disable max-lines */

export interface Source {
  /** name is the full title of the source.
   */
  title: string;
  /**
   * hyperlink bears a hpyerlink for a digitized copy of the source, if
   * available.
   *
   * In some cases, there are several hyperlinks, which are all stored in the
   * field.
   */
  hyperlink?: string | string[] | Record<string, string>;
  /** variant is a variant form used to cite this source in Crum's text. Sources
   * were often cited inconsistently. Use this field to specify variants, so we
   * can detect citations that used alternative forms.
   * If there is no variant (which is the case for most sources), this field
   * should be empty.
   * No abbreviation has been found to have more than two forms, so there is a
   * maximum of one variant needed.
   */
  variant?: string;
}

/** MAPPING maps an abbreviation to a Source object.
 *
 * The key of the mapping is the primary form used to cite this source in
 * Crum's text.
 *
 * NOTE: To make manual verification convenient, keep this in the same order
 * used by Crum.
 *
 * NOTE: This list (intentionally) excludes the following:
 * - Non-reference annotations (such as grammatical annotations or remarks).
 *   Those are handled in a separate module.
 * - Biblical references are handled by other modules.
 * - Cross references (when one abbreviation simply references another) are
 *   treated as variants, and do not have corresponding entries in this map.
 * All other cases must be included.
 *
 * NOTE: Crum often used abbreviated form inconsistently, which complicates our
 * parsing. In cases where there is inconsistency with spacing, the stored
 * abbreviated form should contain the spaces. Our algorithm should then
 * automatically search for both the stored form, and a generated space-free
 * form. There is no need to store the space-free form as a variant, as this
 * will be handled automatically. The form that Crum used in his list (generally
 * speaking, that's the space-free form) should, nevertheless, be mentioned in a
 * comment, to aid manual verification.
 *
 * TODO: (#419) Revisit multi-part abbreviations, and insert spaces where
 * appropriate. We have attempted to insert spaces for all abbreviations that
 * ever occurred with a space, but some may have evaded our detection.
 * How about we just write all abbreviations as several parts, so we can catch
 * all cases? There is no risk from that, eh?
 */
export const MAPPING: Record<string, Source> = {
  ShA: {
    title: 'E. Amélineau, Œuvres de Schenoudi, 1907 ff',
    hyperlink: [
      'https://archive.org/details/oeuvresdeschenou01shen/page/n5/mode/2up',
      'https://archive.org/details/oeuvresdeschenou02shen/page/n7/mode/2up',
    ],
  },
  Absal: {
    title:
      'Kitâb al-Abṣâlmudîyah al-Muḳaddasah al-Sanawîyah (Theotokia), Alexandria, 1908',
    // NOTE: CaiThe occurs as a standalone abbreviation in Crum, but we treat it
    // as a variant to simplify the pipeline.
    variant: 'CaiThe',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3276169',
  },
  Abst: {
    title: 'Kitâb al-Abṣâliyât wal-Ṭaruḥât, Old Cairo, 1913',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3336324',
  },
  Aeg: {
    title: 'Lagarde, Aegyptiaca, 1883',
    hyperlink:
      'https://archive.org/details/aegyptiaca01lagagoog/page/n4/mode/2up',
  },
  Aegyptus: {
    title: '(periodical), Milan, acc. to vols',
    hyperlink: 'https://www.jstor.org/journal/aegy',
  },
  AIssa: {
    title: 'Ahmed Issa, Dict. des Noms des Plantes, Cairo, 1930',
    hyperlink:
      'https://digitalcollections.aucegypt.edu/digital/collection/p15795coll33/id/321/rec/5',
  },
  AJSL: {
    title: 'American Journ. of Semit. Languages',
    hyperlink: 'https://www.jstor.org/journal/amerjsemilanglit',
  },
  Alex: {
    title: 'MSS. &c. in Graeco-Roman Museum, Alexandria',
  },
  'Almk 1': {
    title:
      'H. Almkvist, Kleine Beitr. z. Lexikographie d. vulg. Arabischen, 8th Or. Congr., 1891',
    hyperlink:
      'https://www.google.co.uk/books/edition/Kleine_Beiträge_zur_Lexikographie_des_V/KiYUAAAAYAAJ?hl=en&gbpv=1',
  },
  'Almk 2': {
    // TODO: (#545) Name doesn't make sense when it appears on its own!
    title:
      'continuation of the above, ed. K. V. Zetterstéen, in Le Monde Oriental, 1925',
    hyperlink:
      'https://www.google.co.uk/books/edition/Le_Monde_oriental/r9IbAAAAMAAJ?hl=en&gbpv=1&pg=PA293&printsec=frontcover',
  },
  ALR: {
    title: 'Accademia dei Lincei, Rendiconti',
    // NOTE: Rendiconti occurs as a standalone abbreviation in Crum, but we
    // treat it as a variant to simplify the pipeline.
    variant: 'Rendiconti',
    hyperlink:
      'http://periodici.librari.beniculturali.it/PeriodicoScheda.aspx?id_testata=30&Start=0',
  },
  AM: {
    title: 'H. Hyvernat, Actes des Martyrs, 1886',
    hyperlink:
      'https://archive.org/details/lesactesdesmarty01hyve/page/n5/mode/2up',
  },
  Ann: {
    title: 'Annales du Service Antiquités, Cairo',
    hyperlink: [
      'https://ancientworldonline.blogspot.com/2021/12/annales-du-service-des-antiquites-de.html',
      'https://catalog.hathitrust.org/Record/007151043',
    ],
  },
  AP: {
    title: 'Acta Pauli, ed. C. Schmidt, 1904, acc. to asterisked pp. of book',
    hyperlink:
      'https://archive.org/details/actapauliausder00papygoog/page/n6/mode/2up',
  },
  Asmus: {
    title:
      'H. Asmus, Über Fragmente im mitteläg. Dialekt (Dissert.), 1904, acc. to pp',
    hyperlink:
      'https://www.google.co.uk/books/edition/%C3%9Cber_Fragmente_in_mittel%C3%A4gyptischem_Di/D10UAQAAIAAJ?hl=en',
  },
  AZ: {
    title: 'Zeitschr. f. Aegyptische Sprache, acc. to vols',
    // NOTE: There are multiple other links per volume provided in the source.
    hyperlink: 'https://www.degruyterbrill.com/journal/key/zaes/html',
  },
  Bal: {
    title:
      'papyri from Balaizah, in Bodleian, in so far as not numbered in series “Bodl. Copt. (P)”',
  },
  Balestri: {
    title: 'Sacr. Bibl. Fragm. III, ed. I. Balestri, 1904',
    hyperlink:
      'https://archive.org/details/sacrorumbiblioru03unse/page/n5/mode/2up',
  },
  Baouit: {
    title: 'Le Monastère de B., ed. J. Clédat, I & II (= MIF. xii), 1904 ff',
    hyperlink: 'https://archive.org/details/MIFAO12et13/mode/2up',
  },
  BAp: {
    title: 'Budge, Coptic Apocrypha, 1913',
    hyperlink:
      'https://archive.org/details/copticapocryphai00budguoft/page/n5/mode/2up',
  },
  'Berl Or': {
    // NOTE: Listed as 'Berl.Or', but seemingly never cited as such!
    title: 'MSS. in the Staats(olim Kgl.)bibliothek, Berlin (Crum’s copies)',
  },
  'Berl Wörterb': {
    // NOTE: Listed as 'Berl. Wörterb', but seemingly never cited as such!
    title: 'Erman & Grapow, Wörterbuch d. Aeg. Sprache, 1926-31',
    hyperlink: [
      'https://www.ancientegyptfoundation.org/worterbuch_der_aegyptischen_sprache.shtml',
      'https://tla.digital/home',
    ],
  },
  Bess: {
    title: 'Bessarione (periodical), acc. to vols',
    hyperlink:
      'http://digitale.bnc.roma.sbn.it/tecadigitale/emeroteca/classic/TO00178193',
  },
  BG: {
    title:
      'Berlin Gnostic Papyrus 8502 (cf. Preuss. Akad., Sitz. xxxvi, 839), from photographs',
    hyperlink:
      'https://archive.org/details/sitzungsberichte1896deutsch/page/838/mode/2up',
  },
  BHom: {
    title: 'Budge, Coptic Homilies, 1910',
    hyperlink:
      'https://archive.org/details/coptichomiliesin00budgrich/page/n11/mode/2up',
  },
  BIF: {
    title: 'Bulletin de l’lnstit. français… au Caire',
    hyperlink: 'https://www.ifao.egnet.net/bifao/',
  },
  BKU: {
    title:
      'Berliner Kopt. Urkunden, acc. to vol., no. and, in long texts, lines',
    hyperlink: [
      'https://archive.org/details/mdp.39015020865393/page/n9/mode/2up',
      'https://berlpap.smb.museum/bku-i/',
    ],
  },
  Blake: {
    title:
      'Epiphanius, De XII Gemmis, ed. R. P. Blake, Coptic fragts. by H. De Vis, 1934 (in Lake’s Studies & Documents)',
    hyperlink: 'https://archive.org/details/MN41447ucmf_1/page/n7/mode/2up',
  },
  BM: {
    title: 'British Museum, Catalogue of Coptic MSS., 1905, acc. to numbers',
    hyperlink:
      'https://archive.org/details/catalogueofcopti00brituoft/page/ii/mode/2up',
  },
  BMar: {
    title: 'Budge, Coptic Martyrdoms, 1914',
    hyperlink:
      'https://archive.org/details/CopticMartyrdomshighResByEWallisBudgeVol01/mode/2up',
  },
  BMEA: {
    title:
      'British Museum, Dept. of Egyptian & Assyr. Antiquities (papyri, ostraca, inscriptions)',
  },
  BMis: {
    title: 'Budge, Miscellaneous Coptic Texts, 1915',
    hyperlink:
      'https://archive.org/details/miscellaneouscop00budguoft/page/n9/mode/2up',
  },
  Bodl: {
    title: 'Coptic MSS. in Bodleian, as (P) a i e, where italic = folio',
  },
  Bor: {
    title: 'Codex Borgianus (where not printed by Zoega)',
  },
  BP: {
    title: 'Papyri & ostraca in Staatsmuseum, Berlin',
  },
  Br: {
    title:
      'Gnostische Schr. in Kopt. Sprache (Pap. Bruce), ed. C. Schmidt, 1892',
    hyperlink:
      'https://www.google.com/search?q=https://www.google.co.uk/books/edition/Gnostische_Schriften_in_koptischer_Sprac/esVQJzTZIpgC%3Fhl%3Den%26gbpv%3D1',
  },
  BSG: {
    title: 'Budge, Martyrdom & Miracles of St. George, 1888',
    hyperlink:
      'https://archive.org/details/martyrdommiracle00budguoft/page/n9/mode/2up',
  },
  BSM: {
    title: 'Budge, St. Michael the Archangel, 1894',
    hyperlink:
      'https://archive.org/details/StMichael3Encomiums/page/n7/mode/2up',
  },
  C: {
    title:
      'Corpus Scriptorum Christian. Oriental., acc. to the “numéros d’ ordre”',
    hyperlink: {
      'T. 41':
        'https://archive.org/details/sinuthiiarchiman0000shen_i0u5/page/n7/mode/2up',
      'T. 42, 73':
        'https://archive.org/details/sinuthiiarchiman0000shen_z1m2/page/n7/mode/2up',
      'T. 43, 86':
        'https://archive.org/details/actamartyrum0043bale/page/n7/mode/2up',
      'T. 89, 99, 100':
        'https://archive.org/details/spachomiivitaboh0000unse/page/n7/mode/2up',
    },
  },
  Cai: {
    title: 'MSS. &c. in the Egyptian Museum, Cairo',
  },
  'Cai Copt Mus': {
    // NOTE: Listed as '(Cai)CoptMus'!
    title: 'MSS. &c. in Coptic Museum, Cairo',
    variant: 'Copt Mus',
  },
  CA: {
    title: 'Canons of Athanasius ed. Riedel & Crum (Text & Transl. Soc.), 1904',
    hyperlink:
      'https://archive.org/details/thecanonsofathan00rieduoft/page/n7/mode/2up',
  },
  CaiEuch: {
    title: 'Kitâb al-Khulâgy al-Muḳaddas (Euchologion), Cairo, 1902',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/1703331',
  },
  Cat: {
    title: 'Catenae in Evangelia, ed. Lagarde, 1886',
    hyperlink:
      'https://archive.org/details/catenaeinevangel00lagauoft/page/n3/mode/2up',
  },
  CCVaI: {
    title:
      'Codices Coptici Vaticani &c., T.I, edd. Hebbelynck & Lantschoot, Rome, 1937',
    hyperlink:
      'https://archive.org/details/BiblotacheaTomIcomplete/page/n7/mode/2up',
  },
  CDan: {
    title:
      'L. Clugnet, Vie de l’Abbé Daniel, wherein Guidi’s Coptic text, acc. to pp. of this work',
    hyperlink:
      'https://archive.org/details/VieDanielLeScetiote/page/n7/mode/2up',
  },
  Chaîne: {
    title: 'M. Chaîne, Eléments de gram. dialectale copte, 1933',
    hyperlink: 'https://catalog.hathitrust.org/Record/001231946',
  },
  Cl: {
    title:
      'F. Rösch, Bruchstücke des I. Clem. 1910, acc. to chh. of Greek text',
    hyperlink:
      'https://archive.org/details/bruchstckedese00clemuoft/bruchstckedese00clemuoft/page/n5/mode/2up',
  },
  ClPr: {
    title:
      'Woide’s MSS. belonging to the Clarendon Press (Crum’s copies & photographs)',
  },
  CMSS: {
    title: 'Crum, Coptic MSS. from Fayyûm, 1893, acc. to pp',
    hyperlink:
      'https://archive.org/details/copticmanuscript00crumuoft/page/n5/mode/2up',
  },
  CO: {
    title: 'Crum, Coptic Ostraca, 1902',
    hyperlink:
      'https://archive.org/details/copticostracafr00fundgoog/page/n4/mode/2up',
  },
  CR: {
    title: 'Comptes Rendus de l’Acad. des lnscr., Paris, acc. to year & page',
    hyperlink: 'https://www.persee.fr/collection/crai',
  },
  DeV: {
    title:
      'H. De Vis, Homélies Coptes (= Coptica I, V), 1922, 1929 (DeV alone = vol. I)',
    hyperlink: [
      'https://archive.org/details/homliescoptesd01devi/page/n1/mode/2up',
      'https://archive.org/details/homliescoptesdel0000devi_r2q2/page/n7/mode/2up',
    ],
  },
  Dif: {
    title: 'The Difnar, ed. O’Leary, I, II, III, 1926-30',
    hyperlink: [
      'https://iiif.lib.harvard.edu/manifests/view/drs:497805580$5i',
      'https://www.copticplace.org/files/Difnar2.pdf',
      'https://iiif.lib.harvard.edu/manifests/view/drs:497805854$1i',
    ],
  },
  DM: {
    title: 'Demotic Magical Papyrus, ed. Griffith & Thompson, 1904 ff',
    hyperlink: [
      'https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-1/page/n3/mode/2up',
      'https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-2/page/n1/mode/2up',
      'https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-3/page/n1/mode/2up',
    ],
  },
  Dozy: {
    title: 'R. Dozy, Supplém. aux diet. arabes, 1881',
    hyperlink: [
      'https://gallica.bnf.fr/ark:/12148/bpt6k6254645z.texteImage',
      'https://gallica.bnf.fr/ark:/12148/bpt6k6226013q.texteImage',
    ],
  },
  EES: {
    title:
      'Egypt Exploration Soc. (olim Fund), MSS. &c. in their possession (Crum’s copies)',
  },
  El: {
    title: 'Die Apokalypse d. Elias, ed. G. Steindorff, 1899',
    hyperlink:
      'https://archive.org/details/bub_gb_Tpbji86R09kC/page/n3/mode/2up',
  },
  EnPeterson: {
    title:
      'phot. of vellum leaves lent by Enoch P. (Univ. of Michigan). Originals not now traceable',
  },
  Ep: {
    title:
      'Monastery of Epiphanius, ed. Winlock, Crum & Evelyn White, 1926, acc. to numbers',
    hyperlink: [
      'https://archive.org/details/monasteryofepiph01winl/page/n7/mode/2up',
      'https://archive.org/details/monasteryofepiph02winl/page/n7/mode/2up',
    ],
  },
  EtLeem: {
    title: 'Études… dédiées à C. Leemans, 1885',
    hyperlink:
      'https://www.google.co.uk/books/edition/%C3%89tudes_arch%C3%A9ologiques/ByowAAAAYAAJ?hl=en&gbpv=1',
  },
  EW: {
    // NOTE: This was two separate entries (with an identical abbreviations)
    // in Crum's list.
    title:
      'New Texts from the Monastery of St. Macarius, ed. H. G. Evelyn White, 1926; his copies of MSS from Nitria (in Coptic Museum, Cairo)',
  },
  Faras: {
    title:
      'Griffith, Oxford Excavations in Nubia, in Liverpool Annals of Archaeol. & Anthropol. (1) xiii 17, (2) ib. 49, (3) xiv 57',
    hyperlink: [
      'https://archive.org/details/annals-of-archaeology-and-anthropology_1926_13_1-2/page/n37/mode/2up',
      'https://archive.org/details/annals-of-archaeology-and-anthropology_1926_13_3-4/page/48/mode/2up',
      'https://archive.org/details/annals-of-archaeology-and-anthropology_1927_14_3-4/page/56/mode/2up',
    ],
  },
  FR: {
    title:
      'Forbes Robinson, Coptic Apocr. Gospels (= Texts & Studies iv), 1896',
    hyperlink:
      'https://archive.org/details/copticapocryphal0000unse/page/n1/mode/2up',
  },
  GFr: {
    title: 'Georgi, Fragm. Evang. S. Iohannis, 1789',
    hyperlink:
      'https://www.google.co.uk/books/edition/Fragmentum_Evangelii_S_Iohannis_Graeco_C/tomXmGIDwOgC?hl=en&gbpv=1',
  },
  Glos: {
    title:
      'Greek-Coptic Glossary, ed. Bell & Crum, in Aegyptus vi 179, acc. to lines',
    hyperlink:
      'https://www.jstor.org/stable/41201189?read-now=1&seq=1#page_scan_tab_contents',
  },
  GMir: {
    title: 'Georgi, Miracula S. Coluthi, 1793',
    hyperlink:
      'https://archive.org/details/bub_gb_FLw7D7xionYC/page/n1/mode/2up',
  },
  GöttA: {
    title: 'Göttinger Abhandlungen',
    hyperlink: [
      'https://www.biodiversitylibrary.org/bibliography/51047',
      'https://catalog.hathitrust.org/Record/008602924',
    ],
  },
  GöttN: {
    // NOTE: In Crum's list, this appears as ‘do. Nachrichten’.
    title: 'Göttinger Nachrichten',
    hyperlink: [
      'https://onlinebooks.library.upenn.edu/webbin/serial?id=nachkongesgotph',
      'https://catalog.hathitrust.org/Record/000517694',
    ],
  },
  GPar: {
    title: 'S. Gaselee, Parerga Coptica, 1912, 1914',
    hyperlink: 'https://catalog.hathitrust.org/Record/001327863',
  },
  GriffStu: {
    title: 'Studies Presented to F. Ll. Griffith, 1932',
    hyperlink:
      'https://archive.org/details/studiespresented0000egyp/page/n7/mode/2up',
  },
  Gu: {
    title:
      'I. Guidi, Frammenti Copti I-VII (from ALR 1887 ff.), acc. to continuous pagination',
    hyperlink:
      'https://archive.org/details/frammenticopti00guid/page/46/mode/2up',
  },
  GuDorm: {
    title: 'I. Guidi, Teste… sopra i Sette Dormienti (Mem. Acad. Linc., 1884)',
    hyperlink:
      'https://archive.org/details/testiorientalii01guidgoog/page/n4/mode/2up',
  },
  H: {
    title: 'G. Horner’s text of N.T., 1898-1924',
    hyperlink: {
      'Northern Dialect': 'https://archive.org/details/copticversionofn01horn',
      'Southern Dialect': 'https://archive.org/details/copticversionofn01unse',
    },
  },
  Hall: {
    title: 'H. R. Hall, Coptic & Greek Texts… Brit. Museum, 1905, acc. to pp',
    hyperlink:
      'https://archive.org/details/mdp.39015020865567/page/n9/mode/2up',
  },
  HCons: {
    title: 'G. Horner, Consecration of Church & Altar, 1902',
    hyperlink:
      'https://archive.org/details/serviceforconsec00hornuoft/page/n3/mode/2up',
  },
  HengB: {
    title:
      'W. Hengstenberg in Beiträge z. Forschung… Heft III, J. Rosenthal, München, 1914',
    hyperlink:
      'https://archive.org/details/hvd.32044095331146/page/n131/mode/2up',
  },
  HL: {
    title:
      'E. Amélineau, De Historia Lausiaca, 1887; but Hist Laus = E. C. Butler’s edition of Greek text (= Texts & Studies vi)',
    hyperlink: [
      'https://archive.org/details/dehistorialausia00am/page/n1/mode/2up',
      'https://archive.org/details/lausiachistoryof01pall/page/n7/mode/2up',
    ],
  },
  Hor: {
    title:
      'Griffith, The Old Coptic Horoscope, in AZ 38 76 ff., acc. to pp. of publication',
    hyperlink:
      'https://archive.org/details/zeitschriftfr38brug/page/70/mode/2up',
  },
  HSt: {
    title: 'G. Horner, Statutes of the Apostles, 1904; v also Stat',
    hyperlink:
      'https://archive.org/details/statutesapostle00unkngoog/page/n6/mode/2up',
  },
  HT: {
    title:
      'Sir Herbert Thompson’s Sa’îdic MSS. (now in Cambridge Univ. Library), acc. to letters (B-Z) which distinguish them; or other references to him',
  },
  IF: {
    title:
      'Institut français, Cairo, MS. of Shenoute’s Epistles (H. Munier’s copy)',
  },
  lgR: {
    title: 'Ignazio Rossi, Etymologiae Aegyptiacae, 1808',
    hyperlink:
      'https://archive.org/details/bub_gb_IWhHswE1yv0C/page/n3/mode/2up',
  },
  'Imp Russ Ar S': {
    // NOTE: Listed as 'ImpRussArS'!
    title: 'Imperial Russian Archaeolog. Soc. xviii, 1907 (Turaief)',
    hyperlink:
      'https://archive.org/details/Notes-Imperial-Russian-Archaeological-Society/ZVORAO_18_1908/page/n55/mode/2up',
  },
  J: {
    title:
      'Crum & Steindorff, Kopt. Rechtsurkunden… aus Djême, acc. to no. & line',
    hyperlink:
      'https://archive.org/details/koptischerechtsu00crum/page/n3/mode/2up',
  },
  JLeip: {
    // TODO: (#545) Name doesn't make sense when it appears on its own!
    title:
      'two such papyri in Leipzig University, Aegyptologisches Institut (cf below)',
  },
  JA: {
    title: 'Journal Asiatique, acc. to year, vol. & page',
    hyperlink: 'https://gallica.bnf.fr/ark:/12148/cb34348774p/date',
  },
  'J & C': {
    // NOTE: Listed as 'J&C'!
    title: 'H. I. Bell, Jews & Christians, 1924, acc. to pp',
    hyperlink:
      'https://archive.org/details/jewschristiansin0000bell/page/n3/mode/2up',
  },
  JAOS: {
    title: 'Journ. of American Orient. Soc',
    hyperlink: 'https://www.jstor.org/journal/jameroriesoci',
  },
  Jern: {
    title:
      'P. Jernstedt, Kopt. Papyri d. Asiat. Mus. (Soc. Egyptol. Univ. Leningrad, no. 6, 1930), acc. to numbers',
    hyperlink:
      'https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/',
  },
  JKP: {
    title: 'H. Junker, Koptische Poesie, 1908, 1911 (from Oriens Christianus.)',
    hyperlink:
      'https://archive.org/details/koptischepoesied0000junk/page/n5/mode/2up',
  },
  JSch: {
    title:
      'A. A. Schiller, Ten Coptic Legal Texts, New York, 1932 (includes JLeip, v above), acc. to numbers & lines',
    hyperlink:
      'https://archive.org/details/in.ernet.dli.2015.44575/page/n5/mode/2up',
  },
  JTS: {
    title: 'Journal of Theological Studies',
    hyperlink: [
      'https://www.jstor.org/journal/jtheostud',
      'https://onlinebooks.library.upenn.edu/webbin/serial?id=jtheostudies',
    ],
  },
  K: {
    title:
      'A. Kircher, the Scalæ in Lingua Aegyptiaca Restituta, variants from Loret in Ann. I and other MSS',
    hyperlink: [
      'https://www.google.co.uk/books/edition/Athanasii_Kircheri_Lingua_Aegyptiaca_res/qEtB1x0frAIC?hl=en&gbpv=1',
      'https://archive.org/details/AnnalesDuServiceDesAntiquitsDeLegyptevolume1/page/n63/mode/2up',
    ],
  },
  Kam: {
    title:
      'Kambysesroman in BKU I, no. 31, acc. to pp. in lower margins & line',
    hyperlink: 'See BKU',
  },
  Kandil: {
    title:
      'ⲡϫⲱⲙ ⲛⲧⲉ ⲡⲓⲑⲱϩⲥ ⲉⲑ︦ⲩ︦ (Kitâb al-Masḥah, ay al-Ḳandîl), ed. C. Labîb, Cairo, AM. 1625, v TRit 144 ff',
    hyperlink:
      'https://mc.dlib.nyu.edu/files/books/columbia_aco003890/columbia_aco003890_hi.pdf',
  },
  KKS: {
    title: 'O. von Lemm, Kleine Kopt. Studien, acc. to continuous pagination',
    hyperlink: [
      'https://www.mathnet.ru/php/archive.phtml?wshow=paper&jrnid=im&paperid=4650&option_lang=eng',
      'https://www.orientalstudies.ru/rus/index.php?option=com_publications&Itemid=75&pub=8369',
    ],
  },
  Kr: {
    title: 'J. Krall, Kopt. Texte (Rainer Corpus II), acc. to numbers',
    hyperlink:
      'https://www.google.co.uk/books/edition/Koptische_Texte_Bd_Rechtsurkunden/VlcPAQAAMAAJ?hl=en&gbpv=1&pg=PR3&printsec=frontcover',
  },
  Kropp: {
    title:
      'A. Kropp, Ausgewählte Kopt. Zaubertexte, 1930-31, numbered by letters A, B &c',
    hyperlink: [
      'https://archive.org/details/ausgewhltekoptis0012krop/page/n9/mode/2up',
      'https://archive.org/details/ausgewhltekoptis0003krop/page/n5/mode/2up',
    ],
  },
  Lab: {
    title:
      'C. Labîb, Coptic-Arabic Dictionary (ⲡⲓⲗⲉⲝⲓⲕⲟⲛ ⲛϯⲁⲥⲡⲓ ⲛⲧⲉ ⲛⲓⲣⲉⲙⲛⲭⲏⲙⲓ Ḳâmûs al-Luġah al-Ḳibṭîyah al Maṣrîyah), Cairo, AM. 1611 ff',
    hyperlink:
      'https://archive.org/details/LAB1895COPAR/1.%D9%82%D8%A7%D9%85%D9%88%D8%B3%20%D8%A7%D9%84%D9%84%D8%BA%D8%A9%20%D8%A7%D9%84%D9%82%D8%A8%D8%B7%D9%8A%D8%A9%20%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%8A%D8%A9/',
  },
  Lacau: {
    title:
      'fragments of Jo & Ap F, copied by P. Lacau (v Bull. Corr. Hellén. xxv 400)',
    hyperlink: 'https://www.persee.fr/doc/bch_0007-4217_1901_num_25_1_3394',
  },
  Lacr: {
    title: 'M. V. La Croze, Lexicon Aegyptiaco-Latinum, 1775',
    hyperlink:
      'https://www.digitale-sammlungen.de/en/view/bsb10522488?page=6,7',
  },
  Lag: {
    title: 'P. de Lagarde, his editions of Coptic texts',
  },
  Lakan: {
    title: 'Kitâb al-Lakân, Cairo, 1921',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3209362',
  },
  LAI: {
    title: 'Lemm, Der Alexanderroman',
    hyperlink: 'https://phaidrabg.bg.ac.rs/open/o:556',
  },
  Lammayer: {
    title: 'Die sogen. Gnomen d. Concils v. Nicaea (Dissert.), Beirut, 1912',
    hyperlink:
      'https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/',
  },
  Lant: {
    // NOTE: Listed as 'Lant.' (with a period)!
    title:
      'A. van Lantschoot, Recueil de Colophons… sahidiques, 1929, acc. to numbers; also copies by',
    hyperlink:
      'https://archive.org/details/recueildescoloph0000lans/page/n5/mode/2up',
  },
  LAp: {
    title: 'Lemm, Apokryphe Apostelacten',
    hyperlink:
      'https://www.google.co.uk/books/edition/Koptische_Apokryphe_Apostelacten/7hJik4M60hoC?hl=en&gbpv=1',
  },
  LBib: {
    title: 'Lemm, Sahidische Bibelfragmente I, II, III',
    hyperlink: {
      I: 'https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_10_1890_02_lemm.pdf',
      II: 'https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_10_1890_04_lemm.pdf',
      III: 'https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_12_1902-1906_08_lemm.pdf',
    },
  },
  LCypr: {
    // NOTE: This occurs as LCypr in the list, but has been found to be cited
    // as LCyp in the text.
    title: 'Lemm, Cyprian v. Antiochien',
    variant: 'LCyp',
    hyperlink:
      'https://www.biodiversitylibrary.org/item/212311#page/559/mode/1up',
  },
  LDi: {
    title: 'Lemm, Eine dem Dionysios Areopag. zugeschr. Schrift',
    hyperlink:
      'https://www.biodiversitylibrary.org/item/94350#page/325/mode/1up',
  },
  Lect: { title: 'Lectionary' },
  Leip: {
    title: 'Leipzig University, Tischendorf’s Bohairic MSS. (Crum’s copies)',
  },
  LeipBer: {
    title:
      'Berichte d. phil.-histor. Klasse d. kgl. säch. Gesellsch. d. Wissensch',
    hyperlink: 'https://catalog.hathitrust.org/Record/008559830',
  },
  Leyd: {
    title: 'Manuscrits coptes du Musée… à Leide, 1897, acc. to pages',
    hyperlink:
      'https://archive.org/details/manuscrits-coptes-du-musee-d-antiquite/page/n1/mode/2up',
  },
  'Leyd AC': {
    title: 'Antiquités Coptes (Catal. du Musée), 1900, acc. to pp',
    // NOTE: Listed as 'LeydAC'!
    hyperlink: 'https://catalog.hathitrust.org/Record/008693139',
  },
  LIb: {
    title: 'Lemm, Iberica',
    hyperlink:
      'https://www.biodiversitylibrary.org/item/212314#page/653/mode/1up',
  },
  LMär: {
    title: 'Lemm, Bruchstücke Kopt. Märtyrerakten',
    hyperlink:
      'https://www.biodiversitylibrary.org/item/212319#page/10/mode/1up',
  },
  LMis: {
    title: 'Lemm, Koptische Miscellen, acc. to continuous pagination',
    hyperlink:
      'https://ancientworldonline.blogspot.com/2012/05/digitized-coptic-publications-of-oscar.html',
  },
  Löw: {
    title: 'Im. Löw, Aramäische Pflanzennamen, 1881, acc. to pp',
    hyperlink:
      'https://archive.org/details/AramaeischePflanzennamen/page/n7/mode/2up',
  },
  LöwF: {
    title: 'Flora der Juden, 1926 ff',
    hyperlink:
      'https://sammlungen.ub.uni-frankfurt.de/freimann/content/titleinfo/781127',
  },
  Mallon: {
    title: 'A. Mallon, Grammaire copte², 1907',
    hyperlink:
      'https://archive.org/details/grammairecopteav00mall/page/n7/mode/2up',
  },
  'Mani 1': {
    title:
      'copies of Chester Beatty’s unpublished Manichaean papyri by H. J. Polotsky & H. Thompson',
  },
  'Mani 2': {
    // TODO: (#545) Name doesn't make sense when it appears on its own!
    title: 'copies of sim. papyri at Berlin by Polotsky',
  },
  'Mani H': {
    // NOTE: Listed as 'ManiH'!
    title: 'Manichäische Homelien, ed. Polotsky, 1934',
    hyperlink:
      'https://archive.org/details/manichaischehomi0000polo/page/n5/mode/2up',
  },
  'Mani K': {
    // NOTE: Listed as 'ManiK'!
    title: 'Kephalaia, edd. Polotsky & A. Böhlig, 1934 ff',
    hyperlink: [
      'https://archive.org/details/kephalaia0000mani/page/n1/mode/2up',
      'https://archive.org/details/kephalaia0001staa/page/n5/mode/2up',
    ],
  },
  'Mani P': {
    // NOTE: While cases of ‘Mani P’ (with a space) in Crum's text remain
    // unconfirmed, we insert a space to maintain consistency with ‘Mani H’ and
    // ‘Mani K’, cases of which appearing with a space in Crum's text have been
    // confirmed.
    title: 'A Manichaean Psalm-book, Pt. ii, ed. C. R. C. Allberry, 1938',
    hyperlink:
      'https://archive.org/details/manichaeanpsalmb0000allb/page/n5/mode/2up',
  },
  'Mart Ign': {
    // NOTE: Listed as 'MartIgn'!
    title: 'Lightfoot, Ignatius¹, ii 1 865 ff',
    hyperlink: 'https://babel.hathitrust.org/cgi/pt?id=uc1.l0051084895&seq=289',
  },
  MélOr: {
    title: 'Mélanges de la Faculté Orientale, Université de Beyrouth',
    hyperlink: 'https://www.persee.fr/collection/mefao',
  },
  MG: {
    title: 'Annales du Musée Guimet, Paris',
    hyperlink: {
      General: 'https://fr.wikisource.org/wiki/Annales_du_Mus%C3%A9e_Guimet',
      'Tome 17':
        'https://archive.org/details/monumentspourser00amel/page/n5/mode/2up',
      'Tome 25':
        'https://archive.org/details/monumentspourser00amel_0/page/n8/mode/2up',
    },
  },
  'Mich 550': {
    title:
      'a series of vellum leaves at Michigan University, independently numbered thus (but cf note in Preface)',
  },
  MIE: {
    title: 'Mémoires de l’Instit. Égyptien, Cairo',
    hyperlink:
      'https://digi.ub.uni-heidelberg.de/diglit/meminstitutegyptien?ui_lang=eng',
  },
  MIF: {
    title: 'Mémoires… de l’Instit. franç. d’Archéol. orient. au Caire',
    hyperlink: 'https://www.egyptologyforum.org/EEFSeries.html#9.2',
  },
  Ming: {
    title: 'J. A. Mingarelli, Aegyptiorum Codd. Reliquiae, 1785',
    hyperlink:
      'https://archive.org/details/aegyptiorumcodic00ming/page/n3/mode/2up?ref=ol',
  },
  Miss: {
    title: 'Mémoires… de la Mission archéol. franç. au Caire',
    hyperlink: 'https://www.egyptologyforum.org/EEFSeries.html#9.1',
  },
  MMA: {
    title: 'MSS. & ostraca in the Metropolitan Museum of Art, New York',
  },
  Montp: {
    title:
      'Bohairic Scala in library of Faculté de Médecine, Montpellier (H. Munier’s copy)',
  },
  Mor: {
    title:
      'MSS. belonging to Mr. J. Pierpont Morgan, New York, as reproduced & numbered in 56 vols. of photographs, acc. to nos. & pp. of these volumes',
    hyperlink:
      'https://archive.org/details/PhantoouLibrary/m566%20Combined%20%28Bookmarked%29/page/n1/mode/2up',
  },
  MR: {
    title: 'Mittheilungen a. d. Papyrussamml. Erzh. Rainer',
    hyperlink:
      'https://ancientworldonline.blogspot.com/2013/02/open-access-journal-mitteilungen-aus.html',
  },
  Mun: {
    title:
      'Manuscrits coptes, par H. Munier (Catal. Gén. Musée du Caire, 1916), acc. to pages',
    hyperlink:
      'https://archive.org/details/manuscritscoptes00muni/page/n5/mode/2up',
  },
  Mus: {
    title: 'Le Muséon (periodical), acc. to vols',
    hyperlink: 'https://catalog.hathitrust.org/Record/000640676',
  },
  My: {
    title:
      'Le Mystère des Lettres grecques, ed. A. Hebbelynck (from Muséon, 1900, 1901)',
    hyperlink: [
      'https://archive.org/details/lemuson19soci/page/n11/mode/2up',
      'https://archive.org/details/lemuson20soci/page/n11/mode/2up',
    ],
  },
  'N & E': {
    // NOTE: Listed as 'N&E'!
    title: 'Notices et Extraits des MSS. de la Bibliothèque Nationale, Paris',
    hyperlink: 'https://gallica.bnf.fr/ark:/12148/cb345335088/date',
  },
  "O'Leary H": {
    // NOTE: Listed as ‘O'LearyH’!
    title: 'De Lacy O’Leary: Fragmentary Coptic Hymns, 1924',
    hyperlink:
      'https://archive.org/details/fragmentarycopti0000olea/page/n3/mode/2up',
  },
  "O'Leary Th": {
    title: 'De Lacy O’Leary: The Coptic Theotokia, 1923',
    // NOTE: Listed as '—The'!
    variant: "O'Leary The",
    hyperlink:
      'https://archive.org/details/coptictheotokia0000copt/page/n3/mode/2up',
  },
  OLZ: {
    title: 'Orientalistische Litteraturzeitung',
    hyperlink:
      'https://onlinebooks.library.upenn.edu/webbin/serial?id=orientliteraturzeitung',
  },
  Ora: {
    title: 'Orientalia (periodical), Rome',
    hyperlink: 'https://www.jstor.org/journal/orientalia',
  },
  'Orat Cyp': {
    // NOTE: Listed as 'OratCyp'!
    title:
      'Oratio Cypriani in Veröffentl. a. d. badischen Papyrussamml., Heft 5, 1934, p. 305 ff',
    // NOTE: PBad occurs as a standalone abbreviation in Crum, but we treat it
    // as a variant to simplify the pipeline.
    variant: 'PBad',
    hyperlink:
      'https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/',
  },
  OrChr: {
    title: 'Oriens Christianus (periodical)',
    hyperlink: 'https://archive.org/details/oriens-christianus',
  },
  Osir: {
    title: 'M.A. Murray, The Osireion, 1904',
    hyperlink:
      'https://archive.org/details/osireionatabydos00murr/page/n3/mode/2up',
  },
  'Ostr Chicago': {
    // NOTE: Listed as 'Ostr.Chicago', but seemingly never cited as such!
    title: 'Till’s copies of ostraca from Chicago Expedition, 1931',
  },
  P: {
    title: 'MSS. in the Bibliothèque Nationale, Paris (Crum’s copies)',
  },
  PAl: {
    title:
      'Papyri in Museum at Alexandria, ed. de Ricci & Winstedt in Sphinx x, also Crum’s copies',
    hyperlink: 'https://www.persee.fr/doc/sphin_2003-170x_1906_num_10_1_1192',
  },
  PAmh: {
    title: 'The Amherst Papyri, ed. Grenfell & Hunt, 1901',
    hyperlink:
      'https://archive.org/details/amherstpapyribei02grenuoft/page/n9/mode/2up',
  },
  PasH: {
    title:
      'Paschal Hymns: Kitâb Ṭaruḥât al-Baskhah al-Muḳaddasah, Old Cairo, 1914',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/4258076',
  },
  PasLect: {
    title: 'ⲡⲓϫⲱⲙ ⲛⲧⲉ ⲡⲓⲡⲁⲥⲭⲁ ⲉⲑ︦ⲃ︦, Cairo, 1921 (cf PO xxiv)',
    hyperlink:
      'https://coptic-treasures.com/book/%D9%83%D8%AA%D8%A7%D8%A8-%D8%A7%D9%84%D8%A8%D8%B5%D8%AE%D8%A9-%D8%A3%D9%85%D8%B1-%D8%A8%D8%B7%D8%A8%D8%B9%D8%A9-%D8%A7%D9%84%D8%A8%D8%A7%D8%A8%D8%A7-%D8%B4%D9%86%D9%88%D8%AF%D8%A9/',
  },
  'P Beatty': {
    // NOTE: Listed as 'P. Beatty', but seemingly never cited as such!
    title: 'Papyri in collection of Mr. Chester Beatty, London (Crum’s copies)',
  },
  PBu: {
    title:
      'Coptic legal papyrus olim penes Sir E. A. W. Budge (Crum’s copy), now at Columbia University',
  },
  PCai: {
    title:
      'Papyrus grecs d’ époque byzantine, ed. J. Maspero (Catal. Gén. Musée du Caire, 1911 ff.)',
    hyperlink:
      'https://archive.org/details/papyrusgrecsdp01masp/page/n5/mode/2up (Tome I)',
  },
  PChass: {
    title: 'Two medical papyri penes E. Chassinat',
  },
  Pcod: {
    title:
      'Papyruscodex saec. vi-vii… Cheltenham, ed. Crum, 1915, acc to pp. of printed book',
    hyperlink:
      'https://archive.org/details/derpapyruscodexs00crum/page/n7/mode/2up',
  },
  PcodF: {
    // TODO: (#545) Name doesn't make sense when it appears on its own!
    title: 'fayyûmic text of same, ed. W. Erichsen (Danish Acad., 1932)',
    hyperlink:
      'https://archive.org/details/faijumischefragm0000agat/page/n1/mode/2up',
  },
  'Pcod Mor': {
    // NOTE: Listed as 'PcodMor'!
    title:
      'Mr. Pierpont Morgan’s papyrus volume of Psalms &c. (H. Thompson’s copy)',
  },
  PCol: {
    title: 'Papyri at Columbia University, New York (A. Schiller’s copies)',
  },
  Pey: {
    title: 'A. Peyron, Lexicon Linguae Copticae, 1835',
    hyperlink:
      'https://archive.org/details/lexiconlinguaeco00peyr/page/n9/mode/2up',
  },
  PG: {
    title: 'Migne’s Patrologia, Series Graeca',
    hyperlink: [
      'https://patristica.net/graeca/',
      'https://www.roger-pearse.com/weblog/patrologia-graeca-pg-pdfs/',
    ],
  },
  PGen: {
    title: 'magical papyrus in University Library, Geneva (photograph)',
  },
  PGM: {
    title: 'Papyri Graecae Magicae, ed. K. Preisendanz I, II, 1928, 1931',
    hyperlink: {
      'Band I': 'https://digi.ub.uni-heidelberg.de/diglit/heidhs3763IIA-51bd1',
      'Band II': 'https://digi.ub.uni-heidelberg.de/diglit/heidhs3763IIA-51bd2',
    },
  },
  PGol: {
    title:
      'Papyri formerly in W. Golenischeff’s collection, from photographs sent by O. von Lemm',
  },
  PJkôw: {
    title: 'Papyri (6th c.) thence, Cairo Mus. (Lacau’s copies)',
  },
  PLich: {
    title: 'Papyri belonging to N. P. Lichatschev (P. Jernstedt’s copies)',
  },
  PLond: {
    title: 'Greek Papyri in British Museum, ed. Kenyon & Bell, acc. to pp',
    hyperlink: {
      'Vol I': 'https://archive.org/details/greekpapyriinbri01brit',
      'Vol IV, Coptic Papyri Appendix':
        'https://archive.org/details/greekpapyriinbri04brit',
    },
  },
  PMéd: {
    title:
      'Un Papyrus Medical Copte, ed. E. Chassinat (= MIF. 32), 1921, acc. to pp',
    hyperlink: 'https://archive.org/details/MIFAO32/mode/2up',
  },
  PMich: {
    title:
      'Papyri at Michigan University, with year of acquisition where no. not ascertained',
  },
  PMon: {
    title:
      'Byzantinische Papyri… zu München, ed. Heisenberg & Wenger, 1914, acc. to pp',
    hyperlink:
      'https://archive.org/details/mdp.39015010705187/page/n11/mode/2up',
  },
  PNolot: {
    title: 'rest of papyrus ed. V. Loret, Rec 16 103 (Kuentz’s copy)',
    hyperlink:
      'https://archive.org/details/recueildetravaux16masp/page/102/mode/2up',
  },
  PO: {
    title: 'Patrologia Orientalis',
    hyperlink: [
      'https://www.roger-pearse.com/weblog/patrologia-orientalis-po-pdfs/',
      'https://www.tertullian.org/fathers/patrologia_orientalis_toc.htm',
    ],
  },
  POxy: {
    title: 'Oxyrhynchus Papyri, ed. Grenfell & Hunt',
    hyperlink:
      'https://onlinebooks.library.upenn.edu/webbin/serial?id=ocyrhynchus',
  },
  PRain: {
    title:
      'Papyri in the Rainer Collection (Staatsbibl.), Vienna (Till’s copies), more often as Vi',
  },
  Preisigke: {
    title: 'F. Preisigke, Namenbuch, 1922',
    hyperlink: 'https://archive.org/details/namenbuch00prei/page/n4/mode/2up',
  },
  PS: {
    title: 'Pistis Sophia, ed. C. Schmidt (= Coptica II), 1925',
    hyperlink:
      'https://archive.org/details/CarlSchmidtPistisSophia1925Teil1/Carl%20Schmidt%2C%20Pistis%20Sophia%201925%2C%20Teil1/page/n1/mode/2up',
  },
  PSBA: {
    title: 'Proceedings of Soc. of Biblical Archaeology',
    hyperlink:
      'http://archives.getty.edu:30008/getty_images/digitalresources/serials/103990.html',
  },
  PStras: {
    title: 'Papyri in University Library, Strassburg (Crum’s copies, 1912)',
  },
  PVi: {
    title: 'Papyri in Staatsbibliothek, Vienna (Till’s copies)',
  },
  R: {
    title:
      'I Papiri Copti… di Torino, ed. F. Rossi, acc. to volume, fascicule & page',
    hyperlink: [
      'https://alinsuciu.com/2012/01/27/rossis-edition-of-the-coptic-papyrus-codices-in-the-egyptian-museum-in-turin-1/',
      'https://www.google.co.uk/books/edition/I_papiri_copti_del_Museo_egizio_di_Torin/lxEZAAAAYAAJ',
    ],
  },
  RAC: {
    title: 'E. Revillout, Actes et Contrats… de Boulaq et du Louvre, 1876',
    hyperlink:
      'https://archive.org/details/umn.319510016716448/page/n7/mode/2up',
  },
  RAl: {
    title:
      'F. Rossi, Alcuni MSS. Copti… di Torino (= Memorie… Torino, ser. ii, tom. xliii), acc. to pp. of separate publication',
    hyperlink:
      'https://babel.hathitrust.org/cgi/pt?id=mdp.39015024258538&seq=7',
  },
  RChamp: {
    title: 'Recueil d’Études… J. F. Champollion, 1922',
    hyperlink:
      'https://archive.org/details/in.ernet.dli.2015.291952/page/n11/mode/2up',
  },
  RE: {
    title: 'Revue Égyptologique',
    hyperlink: 'https://digi.ub.uni-heidelberg.de/diglit/revue_egyptologique',
  },
  Rec: {
    title: 'Recueil de Travaux &c',
    hyperlink: 'https://digi.ub.uni-heidelberg.de/diglit/rectrav',
  },
  Ricci: {
    title: 'MSS. & copies belonging to Seymour de Ricci (Crum’s copies)',
  },
  RNC: {
    title:
      'F. Rossi, Un Nuovo Cod. Copto (Memorie Accad. Lincei, 1893), acc. to pp. of separate publication',
    hyperlink:
      'https://www.google.co.uk/books/edition/Un_nuovo_codice_copto_del_Museo_Egizio_d/64GEtkCSqXkC',
  },
  ROC: {
    title: 'Revue de l’Orient Chrétien, acc. to vol',
    hyperlink:
      'https://ancientworldonline.blogspot.com/2012/10/opean-access-journal-revue-de-lorient.html',
  },
  Rösch: {
    title:
      'F. Rösch, Vorbemerkungen zu e. Gramm. d. achmîmischen Mundart, 1909, acc. to pp',
    hyperlink: 'https://catalog.hathitrust.org/Record/001854607',
  },
  Ryl: {
    title:
      'Catal. of Coptic MSS. in John Rylands Library, 1909, acc. to numbers',
    hyperlink: 'https://archive.org/details/cu31924099175329/page/n11/mode/2up',
  },
  RylSuppl: {
    // TODO: (#545) Name doesn't make sense when it appears on its own!
    title: 'MSS. acquired since publication of catalogue (cf Ryl Bull. 5)',
    hyperlink:
      'https://luna.manchester.ac.uk/luna/servlet/detail/Manchester~25~25~702~196480:New-Coptic-manuscripts-in-the-John-',
  },
  Salîb: {
    title: 'Kitâb aṣ-Ṣalîb, Cairo, 1921',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3198124',
  },
  Saq: {
    title:
      'Coptic texts ed. by H. Thompson in Quibell’s Excavations at Saqqara, 1909, 1912',
    hyperlink: {
      '1909': 'https://archive.org/details/cu31924028671265/page/n7/mode/2up',
      '1912': 'https://archive.org/details/cu31924028671273/page/n5/mode/2up',
    },
  },
  Sdff: {
    title:
      'G. Steindorff, Koptische Grammatik², acc. to §§, or information from him',
    hyperlink:
      'https://archive.org/details/koptischegrammat00stei/page/n9/mode/2up',
  },
  Sh: {
    title:
      'works of Shenoute (& of his disciple Besa). Prefixed to all quotations from their writings (doubtfully to Mor 54)',
    // NOTE: Besa occurs as a standalone abbreviation in Crum, but we treat it
    // as a variant to simplify the pipeline.
    variant: 'Besa',
  },
  SHel: {
    title: 'G. P. G. Sobhy, Le Martyre de St. Hélias, Cairo, 1919',
    hyperlink:
      'https://archive.org/details/lemartyredesaint00sobhuoft/page/n10/mode/2up',
  },
  Sitz: { title: 'Sitzungsberichte' },
  Sobhy: {
    title: 'information supplied by Dr. G. P. G. Sobhy, Cairo',
  },
  Spg: {
    title: 'W. Spiegelberg, Koptisches Handwörterbuch, 1921',
    hyperlink:
      'https://archive.org/details/koptischeshandworterbuch/page/n5/mode/2up',
  },
  Sph: {
    title: 'Sphinx (periodical)',
    hyperlink: 'https://www.persee.fr/collection/sphin',
  },
  ST: {
    title: 'Crum, Short Texts from Coptic Ostraca & Papyri, 1921',
    variant: 'St',
    hyperlink:
      'https://archive.org/details/shorttextsfromco00crum/page/n5/mode/2up',
  },
  Stat: {
    title: 'G. Horner, Statutes of the Apostles; also HSt',
    hyperlink:
      'https://archive.org/details/statutesapostle00unkngoog/page/n6/mode/2up',
  },
  Stegemann: {
    title:
      'Kopt. Zaubertexte, ed. V. Stegemann (Sitz. d. Heidelb. Akad., 1934)',
    hyperlink:
      'https://oi-idb-static.uchicago.edu/multimedia/2387/stegemann_koptischen_zaubertexte.pdf',
  },
  Stern: {
    title: 'L. Stern, Koptische Grammatik, acc. to §§',
    hyperlink:
      'https://archive.org/details/koptischegrammat00ster/page/n7/mode/2up',
  },
  Synax: {
    title: 'Synaxarium Alexandrinum, ed. J. Forget (CSCO.), 1905, 1912',
    hyperlink: {
      I: 'https://archive.org/details/synaxariumalexan0047copt',
      II: 'https://archive.org/details/synaxariumalexan0000copt/page/n363/mode/2up',
    },
  },
  Tatt: {
    title: 'H. Tattam, Lexicon Aegyptiaco-Latinum, 1835',
    hyperlink:
      'https://archive.org/details/lexicongyptiaco01tattgoog/page/n10/mode/2up',
  },
  TDi: {
    title: 'Tuki, Diurnum Alexandrinum, 1750',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/244155',
  },
  TEuch: {
    // NOTE: In Crum's list, this appears as ‘do., Pontificale et Euchologium,
    // 1761’.
    title: 'Tuki, Pontificale et Euchologium, 1761',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/121458',
  },
  Till: {
    title: 'W. Till, Achmîmisch-Kopt. Grammatik, 1928, acc. to §§',
    hyperlink:
      'https://archive.org/details/achmmischkoptisc0000till/page/n5/mode/2up',
  },
  'Till Bau': {
    // NOTE: Listed as '— Bau'!
    title: 'Eine Kopt. Bauernpraktik (Mitt. d. deut. Inst. Kairo, vi, 1936)',
    hyperlink:
      'https://archive.org/details/egyptology-archive-vol.-6-1935/page/108/mode/2up',
  },
  'Till Oster': {
    // NOTE: Listed as '— Oster'!
    title:
      'Osterbrief u. Predigt in achm. Dialekt, Vienna, 1931 (at first as Vi 10157)',
    hyperlink: 'https://hdl.handle.net/2027/nyp.33433096174176',
  },
  Tor: {
    title:
      'Coptic Ostraca, ed. H. Thompson in Theban Ostraca… Toronto (University of Toronto Studies), 1913, acc. to numbers',
    hyperlink:
      'https://archive.org/details/thebanostracaedi00royauoft/page/n5/mode/2up',
  },
  Tri: {
    title: 'Lemm, Das Triadon, 1903, acc. to stanzas',
    hyperlink: 'https://digi.ub.uni-heidelberg.de/diglit/lemm1903bd1',
  },
  TRit: {
    title: 'Tuki, Rituale, 1763',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/232309',
  },
  TSBA: {
    title: 'Transactions of the Soc. of Bibl. Archaeology',
    hyperlink:
      'https://www.digitale-sammlungen.de/en/search?filter=volumes%3A%22bsb11183747%2FBV002563052%22',
  },
  TstAb: {
    title: 'I. Guidi, Testo copto del Testam. di Abramo &c. (= ALR, 1900)',
    hyperlink:
      'http://periodici.librari.beniculturali.it/visualizzatore.aspx?anno=1900&ID_testata=30&ID_periodico=9057',
  },
  TT: {
    title: 'Crum, Theolog. Texts from Coptic Papyri, 1913',
    hyperlink: 'https://archive.org/details/cu31924029634262/page/n5/mode/2up',
  },
  TThe: {
    title: 'Tuki, Theotokia, 1764',
    hyperlink:
      'https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/230285',
  },
  TU: {
    title:
      'Gebhardt, Harnack & C. Schmidt, Texte u. Untersuchungen (Bd. 43 Gespräche Jesu)',
    hyperlink:
      'https://archive.org/details/texteunduntersuc43akad/page/n5/mode/2up',
  },
  Tuki: {
    title: 'Tuki, Rudimenta Linguae Coptae, 1778',
    hyperlink:
      'https://archive.org/details/bub_gb_5tc2rD_Ba-sC/page/n4/mode/2up',
  },
  TurM: {
    title:
      'B. Turaief, Materiali &c. (v AZ 40 150, Orient. Bibliographie xv, no. 111 a), acc. to numbers',
    hyperlink: 'https://babel.hathitrust.org/cgi/pt?id=chi.102555010&seq=389',
  },
  TurO: {
    // TODO: (#545) Name doesn't make sense when it appears on its own!
    title:
      'do., Koptskia Ostraka… Golenishtshef (= Bull. Acad. Imp. x, no. 5, 1899), acc. to numbers',
    hyperlink:
      'https://www.biodiversitylibrary.org/item/94351#page/503/mode/1up',
  },
  'Turin ostr': {
    title: 'ostraca in Museo Archeol., Turin (Crum’s copies)',
  },
  Va: {
    title:
      'MSS. in Vatican Library, acc. to photographs or to copies by H. De Vis',
  },
  Vi: {
    title: 'Vienna, MSS. & ostraca in the Staats(olim Hof)bibliothek',
    hyperlink: 'https://www.onb.ac.at/',
  },
  Wess: {
    title: 'C. Wessely, Studien z. Paläographie &c., acc. to vol. & page',
    hyperlink:
      'https://de.wikisource.org/wiki/Studien_zur_Palaeographie_und_Papyruskunde',
  },
  WHatch: {
    title: 'a B MS penes the Rev. W. Hatch, Cambridge, Mass',
  },
  Win: {
    title: 'ostraca from Winlock’s excavations 1927-8, in Cairo Museum',
  },
  Wor: {
    title:
      'W. H. Worrell, Coptic MSS. in Freer Collection (University of Michigan Studies), 1923',
    hyperlink:
      'https://archive.org/details/copticmanuscript00coel/page/n11/mode/2up',
  },
  WS: {
    title:
      'Crum & Bell, Coptic Texts from Wadi Sarga (= Coptica III), 1922, acc. to pp',
    hyperlink:
      'https://archive.org/details/wadisargacopticg00crumuoft/page/n7/mode/2up',
  },
  WTh: {
    title:
      'E. O. Winstedt, Coptic Texts on St. Theodore (Text & Transl. Soc.), 1910',
    hyperlink:
      'https://archive.org/details/coptictextsonsai00wins/page/n5/mode/2up',
  },
  WZKM: {
    title: 'Wiener Zeitsch. f. d. Kunde d. Morgenlandes',
    hyperlink: [
      'https://onlinebooks.library.upenn.edu/webbin/serial?id=wienermorgenlandes',
      'https://catalog.hathitrust.org/Record/000077758',
    ],
  },
  Z: {
    title: 'G. Zoega, Catalogus Codd. Copticorum &c. 1810, acc. to pp',
    hyperlink:
      'https://archive.org/details/bub_gb_8EAcFCioIQEC/page/n1/mode/2up',
  },
  ZNTW: {
    title: 'Zeitsch. f. d. Neutestamentl. Wissenschaft',
    hyperlink: [
      'https://de.wikisource.org/wiki/Zeitschriften_(Theologie)#Z',
      'https://catalog.hathitrust.org/Record/000494825',
    ],
  },
};

// Add all the variants to the map.
Object.values(MAPPING).forEach((value: Source): void => {
  if (!value.variant) {
    return;
  }
  MAPPING[value.variant] = value;
});

// Add keys with spaces removed.
Object.entries(MAPPING).forEach(([key, value]: [string, Source]): void => {
  if (/^[a-zA-Z]+ [0-9]+$/.test(key)) {
    // Abbreviations that have a number as the second part never occur without
    // that space in the middle.
    return;
  }
  MAPPING[key.replaceAll(' ', '')] = value;
});

/* eslint-enable max-lines */
