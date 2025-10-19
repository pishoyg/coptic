/* eslint-disable max-lines */
import * as logger from '../logger.js';

export const MAPPING: Record<string, Reference> = {};

/**
 * Source represents a source.
 */
export interface Source {
  /** title is the full title of the source.
   */
  readonly title: string;
  /**
   * innerHTML contains the full HTML description of the source, including
   * bibliographical details and hyperlinks.
   */
  readonly innerHTML?: string[];
}

/**
 * Reference represents a particular way of citing a source in the text.
 */
export class Reference {
  /**
   *
   * @param variant - Abbreviation used to cite this source.
   * @param source - Cited source.
   * @param postfix - Postfix appended to the abbreviation, if any.
   */
  public constructor(
    public readonly variant: string,
    // TODO: (#522) The `source` field should become required once all sources
    // are populated.
    public readonly source?: Source,
    public readonly postfix?: string | Source
  ) {}

  /**
   *
   * @returns
   * TODO: (#523) Postfixes should show in the tooltip.
   */
  public tooltip(): (Node | string)[] | undefined {
    if (!this.source) {
      return undefined;
    }
    const fragment: (Node | string)[] = [this.source.title];
    if (!this.source.innerHTML?.length) {
      return fragment;
    }
    const ul: HTMLUListElement = document.createElement('ul');
    ul.innerHTML = this.source.innerHTML
      .map((innerHTML: string): string => `<li>${innerHTML}</li>`)
      .join('');
    fragment.push(ul);
    return fragment;
  }
}

/**
 * Resource represents a source, along with the different variants and postfixes
 * used to cite it.
 */
interface Resource {
  // TODO: (#522) The `source` field should become required once all sources are
  // populated.
  source?: Source;
  /** variants is a list of abbreviation forms used to cite this source in
   * Crum's text. Sources were often cited inconsistently, which is why we
   * provide you with a list, so you can specify all alternatives.
   * TODO: (#565) Record variants.
   */
  readonly variants: string[];
  /** postfixes is a list of all postfixes that this abbreviation can bear.
   *
   * Notice that postfixes are distinct from suffixes. Postfixes are part of
   * the abbreviation, and they're usually (although not always) written in a
   * single word along with the original abbreviation. They make the original
   * abbreviation more specific, by referring to a place or department.
   * On the other hand, suffixes are numbers or number-like affixes, and
   * they're never written with the abbreviation as one word.
   * See examples of postfixes below.
   *
   * TODO: (#523) Differentiate between the different types of postfixes:
   * - Other sources (e.g. the source could be a manuscript, and the postfix
   *   could refer to a museum or university where the manuscript is hosted).
   * - Number or number-like addenda:
   *   - Manuscript numbers
   *   - Sections within a book
   *   - ...
   * Record the different cases, and handle them properly.
   * Of course, the most important case is the first one (where a postfix refers
   * to another source). This is important to handle, because it will allows us
   * to insert hyperlinks to the other source in the tooltip. The other cases
   * are only relevant to #527.
   * Can we rely on the mere presence of a postfix in `MAPPING` to infer whether
   * this postfix represents a source? – I am afraid not, because some number or
   * number-like postfixes are identical to some source abbreviations.
   * TODO: (#523) Populate postfixes.
   */
  readonly postfixes?: string[];
  /**
   * noSpaceVariants, if set to true, prevents generating space variants for
   * this resource.
   *
   * As of the time of writing, our script imposes a requirement on all
   * variants: They must match the reference logic. This is important, because
   * it guards against undetectable abbreviations.
   * You can use this field to prevent generating space variants if they never
   * occur in the text, especially if they can't be matched by the regex and
   * thus would break validation.
   */
  readonly noSpaceVariants?: boolean;
}

/**
 * DATA lists the resources cited in Crum's text.
 *
 * NOTE: To make manual verification convenient, keep this in the same order
 * used by Crum.
 *
 * NOTE: This list, while largely dependent on Crum's List of Abbreviations,
 * intentionally excludes the following:
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
 * automatically search for both the stored form, and a number of generated
 * forms that have fewer spaces.
 * There is no need to store the variants, as this will be handled
 * automatically.
 * The form that Crum used in his list (usually a space-free form) should,
 * nevertheless, be mentioned in a comment, to aid manual verification.
 * Variants that differ in non-space characters should, however, be explicitly
 * mentioned.
 * TODO: (#565) Revisit multi-part abbreviations, and insert spaces where
 * appropriate. We have attempted to insert spaces for all abbreviations that
 * ever occurred with inconsistent spacing, but some may have evaded our
 * detection.
 */
const DATA: Resource[] = [
  {
    source: {
      title: 'E. Amélineau, Œuvres de Schenoudi, 1907 ff',
      innerHTML: [
        'Amélineau, E. (1907). <em><a href="https://archive.org/details/oeuvresdeschenou01shen/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Œuvres de Schenoudi: texte copte et traduction française</a></em>. Tome 1. Paris: E. Leroux.',
        'Amélineau, E. (1914). <em><a href="https://archive.org/details/oeuvresdeschenou02shen/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Œuvres de Schenoudi: texte copte et traduction française</a></em>. Tome 2. Paris: E. Leroux.',
      ],
    },
    variants: ['ShA', 'ShAm'],
  },
  {
    source: {
      title:
        'Kitâb al-Abṣâlmudîyah al-Muḳaddasah al-Sanawîyah (Theotokia), Alexandria, 1908',
      // NOTE: CaiThe occurs as a standalone abbreviation in Crum, but we treat
      // it as a variant to simplify the pipeline.
      innerHTML: [
        'Labīb, I. (1908). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3276169" rel="noreferrer noopener" target="_blank">Kitāb al-Ibṣalmūdiyyah al-sanawiyyah al-muqaddasah</a></em> [كتاب الإبصلمودية السنوية المقدسة — ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ϯⲯⲁⲗⲙⲟⲇⲓⲁ̀ ⲉ︦ⲑ︦ⲩ︦ ⲛ̀ⲧⲉⲣⲟⲙⲡⲓ]. Cairo: Heliopolis Press.',
      ],
    },
    variants: ['Absal', 'CaiThe'],
  },
  {
    source: {
      title: 'Kitâb al-Abṣâliyât wal-Ṭaruḥât, Old Cairo, 1913',
      innerHTML: [
        'Bishop Ṣamūʾīl, Father Fīlūṯāʾūs al-Maqārī, Cantor Mīḫāʾīl Girgis al-Batanūnī. (1913). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3336324" rel="noreferrer noopener" target="_blank">al-Ibṣāliyyāt wa-al-Ṭurūḥāt al-Wāṭis wa-al-Ādām</a></em> [الإبصاليات والطروحات الواطس والآدام]. Old Cairo.',
      ],
    },
    variants: ['Abst'],
  },
  {
    source: {
      title: 'Lagarde, Aegyptiaca, 1883',
      innerHTML: [
        'Lagarde, P. de. (1883). <em><a href="https://archive.org/details/aegyptiaca01lagagoog/page/n4/mode/2up" rel="noreferrer noopener" target="_blank">Aegyptiaca Pauli de Lagarde studio et sumptibus edita</a></em>. Gottingae: In aedibus Dieterichianis Arnoldi Hoyer.',
      ],
    },
    variants: ['Aeg'],
  },
  {
    source: {
      title: '(periodical), Milan, acc. to vols',
      innerHTML: [
        '<em>Aegyptus</em> journal is available digitised from 1920 to recent years on <a href="https://www.jstor.org/journal/aegy" rel="noreferrer noopener" target="_blank">JSTOR</a>. ',
      ],
    },
    variants: ['Aegyptus'],
  },
  {
    source: {
      title: 'Ahmed Issa, Dict. des Noms des Plantes, Cairo, 1930',
      innerHTML: [
        'Issa, A. B. (1930). <em><a href="https://digitalcollections.aucegypt.edu/digital/collection/p15795coll33/id/321/rec/5" rel="noreferrer noopener" target="_blank">Dictionnaire des noms des plantes, en latin, français, anglais et arabe</a></em>. Le Caire: Imprimerie nationale.',
      ],
    },
    variants: ['AIssa'],
  },
  {
    source: {
      title: 'American Journ. of Semit. Languages',
      innerHTML: [
        'The <em>American Journal of Semitic Languages and Literatures</em> is available digitised from 1895-1941 (vols. 12-58) on <a href="https://www.jstor.org/journal/amerjsemilanglit" rel="noreferrer noopener" target="_blank">JSTOR</a>. [From 1884-1895 (vols. 1-11) the journal was called <em>Hebraica</em> and from 1942 it became the <em>Journal of Near Eastern Studies</em> (vol. 59 onward).] ',
      ],
    },
    variants: ['AJSL'],
  },
  {
    source: {
      title: 'MSS. &c. in Graeco-Roman Museum, Alexandria',
    },
    variants: ['Alex'],
  },
  {
    source: {
      title:
        'H. Almkvist, Kleine Beitr. z. Lexikographie d. vulg. Arabischen, 8th Or. Congr., 1891',
      innerHTML: [
        'Almkvist, H. (1891). <em><a href="https://www.google.co.uk/books/edition/Kleine_Beitr%C3%A4ge_zur_Lexikographie_des_V/KiYUAAAAYAAJ?hl=en&amp;gbpv=1" rel="noreferrer noopener" target="_blank">Kleine Beiträge zur Lexikographie des Vulgärarabischen</a></em>. I. Tiré des Actes du 8e Congrès International des Orientalistes, tenu en 1889 à Stockholm et à Christiania. Leide: E. J. Brill.',
      ],
    },
    variants: ['Almk 1'],
    noSpaceVariants: true,
  },
  {
    source: {
      // TODO: (#545) Name doesn't make sense when it appears on its own!
      title:
        'continuation of the above, ed. K. V. Zetterstéen, in Le Monde Oriental, 1925',
      innerHTML: [
        '<em><a href="https://www.google.co.uk/books/edition/Le_Monde_oriental/r9IbAAAAMAAJ?hl=en&amp;gbpv=1&amp;pg=PA293&amp;printsec=frontcover" rel="noreferrer noopener" target="_blank">Le Monde Oriental</a></em>. (1925). Vol. XIX. Uppsala.',
      ],
    },
    variants: ['Almk 2'],
    noSpaceVariants: true,
  },
  {
    source: {
      title: 'Accademia dei Lincei, Rendiconti',
      // NOTE: Rendiconti occurs as a standalone abbreviation in Crum, but we
      // treat it as a variant to simplify the pipeline.
      innerHTML: [
        '<em>Atti della Reale Accademia dei Lincei, Rendiconti</em> began in 1884 and continued until 1929. All volumes are digitised and available on <a href="http://periodici.librari.beniculturali.it/PeriodicoScheda.aspx?id_testata=30&amp;Start=0" rel="noreferrer noopener" target="_blank">BiASA Periodici Italiani Digitalizzati</a>. ',
      ],
    },
    variants: ['ALR', 'Rendiconti'],
  },
  {
    source: {
      title: 'H. Hyvernat, Actes des Martyrs, 1886',
      innerHTML: [
        'Hyvernat, H. (1886). <em><a href="https://archive.org/details/lesactesdesmarty01hyve/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Actes des Martyrs de l’Égypte</a></em>. Paris: Ernest Leroux.',
      ],
    },
    variants: ['AM'],
  },
  {
    source: {
      title: 'Annales du Service Antiquités, Cairo',
      innerHTML: [
        'The <em>Annales du service des antiquités de l’Égypte</em> (ASAE) began in 1900. From 1988-97 it was called <em>Annales du service des antiquités Égyptiennes</em>. There are a selection of digitised volumes, including all up to 1939, on <a href="https://ancientworldonline.blogspot.com/2021/12/annales-du-service-des-antiquites-de.html" rel="noreferrer noopener" target="_blank">The Ancient World Online</a>. Further volumes available on <a href="https://catalog.hathitrust.org/Record/007151043?type%5B%5D=title&amp;lookfor%5B%5D=Annales%20du%20service%20des%20antiquit%C3%A9s%20de%20l%27%C3%89gypte&amp;ft=ft#viewability" rel="noreferrer noopener" target="_blank">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['Ann'],
  },
  {
    source: {
      title: 'Acta Pauli, ed. C. Schmidt, 1904, acc. to asterisked pp. of book',
      innerHTML: [
        'Schmidt, C. (1904). <em><a href="https://archive.org/details/actapauliausder00papygoog/page/n6/mode/2up" rel="noreferrer noopener" target="_blank">Acta Pauli: aus der Heidelberger koptischen Papyrushandschrift Nr. 1</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['AP'],
  },
  {
    source: {
      title:
        'H. Asmus, Über Fragmente im mitteläg. Dialekt (Dissert.), 1904, acc. to pp',
      innerHTML: [
        'Asmus, H. (1904). <em><a href="https://www.google.co.uk/books/edition/%C3%9Cber_Fragmente_in_mittel%C3%A4gyptischem_Di/D10UAQAAIAAJ?hl=en" rel="noreferrer noopener" target="_blank">Über Fragmente in mittelägyptischen Dialekte</a></em>. Phil. Diss., Leipzig; Göttingen. [via US access only]',
      ],
    },
    variants: ['Asmus'],
  },
  {
    source: {
      title: 'Zeitschr. f. Aegyptische Sprache, acc. to vols',
      innerHTML: [
        '<em>Zeitschrift für Ägyptische Sprache und Altertumskunde</em> (ZÄS; previously ZÄ) began in 1863. The following (volumes 1-59, 72) are available on Internet Archive: <a href="https://archive.org/details/zeitschriftfr01brug/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">1 (1863)</a>; <a href="https://archive.org/details/zeitschriftfr02brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">2 (1864)</a>; <a href="https://archive.org/details/zeitschriftfr03brug/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">3 (1865)</a>; <a href="https://archive.org/details/zeitschriftfr04brug/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">4 (1866)</a>; <a href="https://archive.org/details/zeitschriftfr05brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">5 (1867)</a>; <a href="https://archive.org/details/zeitschriftfr06brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">6 (1868)</a>; <a href="https://archive.org/details/zeitschriftfr07brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">7 (1869)</a>; <a href="https://archive.org/details/zeitschriftfr08brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">8 (1870)</a>; <a href="https://archive.org/details/zeitschriftfr09brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">9 (1871)</a>; <a href="https://archive.org/details/zeitschriftfr10brug/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">10 (1872)</a>; <a href="https://archive.org/details/zeitschriftfr11brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">11 (1873)</a>; <a href="https://archive.org/details/zeitschriftfr12brug/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">12 (1874)</a>; <a href="https://archive.org/details/zeitschriftfr13brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">13 (1875)</a>; <a href="https://archive.org/details/zeitschriftfr14brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">14 (1876)</a>; <a href="https://archive.org/details/zeitschriftfr15brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">15 (1877)</a>; <a href="https://archive.org/details/zeitschriftfr16brug" rel="noreferrer noopener" target="_blank">16 (1878)</a>; <a href="https://archive.org/details/zeitschriftfr17brug" rel="noreferrer noopener" target="_blank">17 (1879)</a>; <a href="https://archive.org/details/zeitschriftfr18brug" rel="noreferrer noopener" target="_blank">18 (1880)</a>; <a href="https://archive.org/details/zeitschriftfr19brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">19 (1881)</a>; <a href="https://archive.org/details/zeitschriftfr20brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">20 (1882)</a>; <a href="https://archive.org/details/zeitschriftfr21brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">21 (1883)</a>; <a href="https://archive.org/details/zeitschriftfr22brug" rel="noreferrer noopener" target="_blank">22 (1884)</a>; <a href="https://archive.org/details/zeitschriftfr23brug" rel="noreferrer noopener" target="_blank">23 (1885)</a>; <a href="https://archive.org/details/zeitschriftfr2427deutuoft/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">24 (1886)</a>; <a href="https://archive.org/details/zeitschriftfr2427deutuoft/page/n145/mode/2up" rel="noreferrer noopener" target="_blank">25 (1887)</a>; <a href="https://archive.org/details/zeitschriftfr2427deutuoft/page/140/mode/2up" rel="noreferrer noopener" target="_blank">26 (1888)</a>; <a href="https://archive.org/details/zeitschriftfr27brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">27 (1889)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">28 (1890)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n135/mode/2up" rel="noreferrer noopener" target="_blank">29 (1891)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n267/mode/2up" rel="noreferrer noopener" target="_blank">30 (1892)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n407/mode/2up" rel="noreferrer noopener" target="_blank">31 (1893)</a>; <a href="https://archive.org/details/zeitschriftfr32brug" rel="noreferrer noopener" target="_blank">32 (1894)</a>; <a href="https://archive.org/details/zeitschriftfr33brug" rel="noreferrer noopener" target="_blank">33 (1895)</a>; <a href="https://archive.org/details/zeitschriftfr34brug" rel="noreferrer noopener" target="_blank">34 (1896)</a>; <a href="https://archive.org/details/zeitschriftfr35brug" rel="noreferrer noopener" target="_blank">35 (1897)</a>; <a href="https://archive.org/details/zeitschriftfr36brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">36 (1898)</a>; <a href="https://archive.org/details/zeitschriftfr3639deutuoft/page/n199/mode/2up" rel="noreferrer noopener" target="_blank">37 (1899)</a>; <a href="https://archive.org/details/zeitschriftfr38brug" rel="noreferrer noopener" target="_blank">38 (1900)</a>; <a href="https://archive.org/details/zeitschriftfr39brug" rel="noreferrer noopener" target="_blank">39 (1901)</a>; <a href="https://archive.org/details/zeitschriftfr40brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">40 (1902-03)</a>; <a href="https://archive.org/details/zeitschriftfr41brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">41 (1904)</a>; <a href="https://archive.org/details/zeitschriftfr42brug" rel="noreferrer noopener" target="_blank">42 (1905)</a>; <a href="https://archive.org/details/zeitschriftfr43brug" rel="noreferrer noopener" target="_blank">43 (1906)</a>; <a href="https://archive.org/details/zeitschriftfr44brug" rel="noreferrer noopener" target="_blank">44 (1907-08)</a>; <a href="https://archive.org/details/zeitschriftfr45brug" rel="noreferrer noopener" target="_blank">45 (1908-09)</a>; <a href="https://archive.org/details/zeitschriftfr46brug" rel="noreferrer noopener" target="_blank">46 (1909-10)</a>; <a href="https://archive.org/details/zeitschriftfr47brug" rel="noreferrer noopener" target="_blank">47 (1910)</a>; <a href="https://archive.org/details/zeitschriftfr48brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">48 (1911)</a>; <a href="https://archive.org/details/zeitschriftfr49brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">49 (1911)</a>; <a href="https://archive.org/details/zeitschriftfr50brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">50 (1912)</a>; <a href="https://archive.org/details/zeitschriftfr51brug/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">51 (1914)</a>; <a href="https://archive.org/details/zeitschriftfr52brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">52 (1915)</a>; <a href="https://archive.org/details/zeitschriftfr53brug/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">53 (1917)</a>; <a href="https://archive.org/details/zeitschriftfr54brug" rel="noreferrer noopener" target="_blank">54 (1918)</a>; <a href="https://archive.org/details/zeitschriftfr55brug" rel="noreferrer noopener" target="_blank">55 (1918)</a>; <a href="https://archive.org/details/zeitschriftfr56brug" rel="noreferrer noopener" target="_blank">56 (1920)</a>; <a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n135/mode/2up" rel="noreferrer noopener" target="_blank">57 (1922)</a>; <a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n367/mode/2up"> 58 (192</a><a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n367/mode/2up" rel="noreferrer noopener" target="_blank">3</a><a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n367/mode/2up">)</a>; <a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n555/mode/2up" rel="noreferrer noopener" target="_blank">59 (1924)</a>; <a href="https://archive.org/details/zeitschriftfr72brug/mode/2up" rel="noreferrer noopener" target="_blank">72 (1936)</a>. All volumes are available digitised on the <a href="https://www.degruyterbrill.com/journal/key/zaes/html?lang=de&amp;srsltid=AfmBOoqiSSk9kY_a9NjC6ibeiaR2VogjEP1ERFmu2oCf4X7gyI9u82om#issues" rel="noreferrer noopener" target="_blank">De Gruyter Brill website</a> (with login credentials). ',
      ],
    },
    variants: ['AZ'],
  },
  {
    source: {
      title:
        'papyri from Balaizah, in Bodleian, in so far as not numbered in series “Bodl. Copt. (P)”',
    },
    variants: ['Bal'],
  },
  {
    source: {
      title: 'Sacr. Bibl. Fragm. III, ed. I. Balestri, 1904',
      innerHTML: [
        'Balestri, I. (Ed.). (1904). <em><a href="https://archive.org/details/sacrorumbiblioru03unse/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Sacrorum Bibliorum Fragmenta Copto-Sahidica Musei Borgiani</a></em>, Vol. III: <em>Novum Testamentum</em>. Rome: Typis S. C. de Propaganda Fide.',
      ],
    },
    variants: ['Balestri'],
  },
  {
    source: {
      title: 'Le Monastère de B., ed. J. Clédat, I & II (= MIF. xii), 1904 ff',
      innerHTML: [
        'Clédat, J. (1904). <em><a href="https://archive.org/details/MIFAO12et13/mode/2up" rel="noreferrer noopener" target="_blank">Le monastère et la nécropole de Baouît</a></em>. (Mémoires publiés par les membres de l’Institut français d’archéologie orientale du Caire, Vol. 12). Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['Baouit'],
  },
  {
    source: {
      title: 'Budge, Coptic Apocrypha, 1913',
      innerHTML: [
        'Budge, E. A. W. (1913). <em><a href="https://archive.org/details/copticapocryphai00budguoft/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Apocrypha in the Dialect of Upper Egypt: Edited with English Translations</a></em>. London: British Museum.',
      ],
    },
    variants: ['BAp'],
  },
  {
    source: {
      // NOTE: Listed as 'Berl.Or', but seemingly never cited as such!
      title: 'MSS. in the Staats(olim Kgl.)bibliothek, Berlin (Crum’s copies)',
    },
    variants: ['Berl Or'],
  },
  {
    source: {
      title: 'Erman & Grapow, Wörterbuch d. Aeg. Sprache, 1926-31',
      innerHTML: [
        'Erman, A., &amp; Grapow, H. (1926-1931). <em><a href="https://www.ancientegyptfoundation.org/worterbuch_der_aegyptischen_sprache.shtml" rel="noreferrer noopener" target="_blank">Wörterbuch der ägyptischen Sprache im Auftrage der deutschen Akademien</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung. [The project started by Erman and Grapow continues in digitised form in <em><a href="https://tla.digital/home" rel="noreferrer noopener" target="_blank">Thesaurus Linguae Aegyptiae</a></em>.]',
      ],
    },
    variants: [
      'Berl Worterb',
      'Berl Wörterb',
      'Berl. Wörterb',
      'Berlin Wörterb',
    ],
    noSpaceVariants: true,
  },
  {
    source: {
      title: 'Bessarione (periodical), acc. to vols',
      innerHTML: [
        '<em>Bessarione</em> began in 1896 and continued until 1923. All volumes digitised and available on the Biblioteca Nazionale Centrale di Roma’s <a href="http://digitale.bnc.roma.sbn.it/tecadigitale/emeroteca/classic/TO00178193" rel="noreferrer noopener" target="_blank">Biblioteca Digitale</a>. ',
      ],
    },
    variants: ['Bess'],
  },
  {
    source: {
      title:
        'Berlin Gnostic Papyrus 8502 (cf. Preuss. Akad., Sitz. xxxvi, 839), from photographs',
    },
    variants: ['BG'],
  },
  {
    source: {
      title: 'Budge, Coptic Homilies, 1910',
      innerHTML: [
        'Budge, E. A. W. (1910). <em><a href="https://archive.org/details/coptichomiliesin00budgrich/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Homilies in the Dialect of Upper Egypt edited from the Papyrus Codex Oriental 5001 in the British Museum</a></em>. London: British Museum.',
      ],
    },
    variants: ['B Hom'],
  },
  {
    source: {
      title: 'Bulletin de l’lnstit. français… au Caire',
      innerHTML: [
        'All volumes of <em>Le Bulletin de l’Institut français d’ archéologie orientale</em> (BIFAO) published from 1901 to date are listed, digitised, and freely available via the <a href="https://www.ifao.egnet.net/bifao/" rel="noreferrer noopener" target="_blank">Institut français d’ archéologie orientale</a>. ',
      ],
    },
    variants: ['BIF'],
  },
  {
    // NOTE: BKU and Kam are listed as several entries.
    source: {
      title:
        'Berliner Kopt. Urkunden, acc. to vol., no. and, in long texts, lines',
      innerHTML: [
        'Erman, A. (1904). <em><a href="https://archive.org/details/mdp.39015020865393/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">Aegyptische Urkunden aus den Königlichen Museen zu Berlin: Koptische Urkunden (BKU)</a></em>. Vol. 1. Berlin: Weidmannsche Buchhandlung. [Several of the BKU I texts (along with other collections) have been digitised at the <a href="https://berlpap.smb.museum/bku-i/" rel="noreferrer noopener" target="_blank">Berliner Papyrusdatenbank</a>.]<p><strong>Kam</strong>: Kambysesroman in BKU I, no. 31, acc. to pp. in lower margins & line</p>',
      ],
    },
    variants: ['BKU', 'Kam'],
  },
  {
    source: {
      title:
        'Epiphanius, De XII Gemmis, ed. R. P. Blake, Coptic fragts. by H. De Vis, 1934 (in Lake’s Studies & Documents)',
      innerHTML: [
        'Blake, R. P., &amp; de Vis, H. (Eds.). (1934). <em><a href="https://archive.org/details/MN41447ucmf_1/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Epiphanius de gemmis: The Old Georgian Version and the Fragments of the Armenian Version</a></em> by R. P. Blake, and <em>The Coptic-Sahidic Fragments</em> by H. de Vis. (Studies and Documents, Vol. 2). London: Christophers.',
      ],
    },
    variants: ['Blake'],
  },
  {
    source: {
      title: 'British Museum, Catalogue of Coptic MSS., 1905, acc. to numbers',
      innerHTML: [
        'Crum, W. E. (1905). <em><a href="https://archive.org/details/catalogueofcopti00brituoft/page/ii/mode/2up" rel="noreferrer noopener" target="_blank">Catalogue of the Coptic Manuscripts in the British Museum</a></em>. London: British Museum.',
      ],
    },
    variants: ['BM'],
    postfixes: ['Or', 'or'],
  },
  {
    source: {
      title: 'Budge, Coptic Martyrdoms, 1914',
      innerHTML: [
        'Budge, E. A. W. (1914). <em><a href="https://archive.org/details/CopticMartyrdomshighResByEWallisBudgeVol01/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Martyrdoms, etc., in the Dialect of Upper Egypt</a></em>. London: British Museum.',
      ],
    },
    variants: ['BMar'],
  },
  {
    source: {
      title:
        'British Museum, Dept. of Egyptian & Assyr. Antiquities (papyri, ostraca, inscriptions)',
    },
    variants: ['BMEA'],
  },
  {
    source: {
      title: 'Budge, Miscellaneous Coptic Texts, 1915',
      innerHTML: [
        'Budge, E. A. W. (1915). <em><a href="https://archive.org/details/miscellaneouscop00budguoft/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">Miscellaneous Coptic Texts in the Dialect of Upper Egypt edited with English translations</a></em>. London: British Museum.',
      ],
    },
    variants: ['BMis'],
  },
  {
    source: {
      title: 'Coptic MSS. in Bodleian, as (P) a i e, where italic = folio',
    },
    variants: ['Bodl'],
    postfixes: ['Copt', 'copt'],
  },
  {
    source: {
      title: 'Codex Borgianus (where not printed by Zoega)',
    },
    variants: ['Bor'],
  },
  {
    source: {
      title: 'Papyri & ostraca in Staatsmuseum, Berlin',
    },
    variants: ['BP'],
  },
  {
    source: {
      title:
        'Gnostische Schr. in Kopt. Sprache (Pap. Bruce), ed. C. Schmidt, 1892',
      innerHTML: [
        'Schmidt, C. (1892). <em><a href="https://www.google.co.uk/books/edition/Gnostische_Schriften_in_koptischer_Sprac/esVQJzTZIpgC?hl=en&amp;gbpv=1" rel="noreferrer noopener" target="_blank">Gnostische Schriften in koptischer Sprache aus dem Codex Brucianus</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, Vol. 8). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['Br'],
  },
  {
    source: {
      title: 'Budge, Martyrdom & Miracles of St. George, 1888',
      innerHTML: [
        'Budge, E. A. W. (1888). <em><a href="https://archive.org/details/martyrdommiracle00budguoft/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">The Martyrdom and Miracles of Saint George of Cappadocia: The Coptic Texts edited with an English translation</a></em>. London: D. Nutt.',
      ],
    },
    variants: ['BSG'],
  },
  {
    source: {
      title: 'Budge, St. Michael the Archangel, 1894',
      innerHTML: [
        'Budge, E. A. W. (1894). <em><a href="https://archive.org/details/StMichael3Encomiums/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Saint Michael the Archangel: Three Encomiums by Theodosius, Archbishop of Alexandria, Severus, Patriarch of Antioch, and Eustathius, Bishop of Trake</a></em>; the Coptic texts with extracts from Arabic and Ethiopic versions, edited with a translation. London: Kegan Paul, Trench, Trübner &amp; Co.',
      ],
    },
    variants: ['BSM'],
  },
  {
    source: {
      title:
        'Corpus Scriptorum Christian. Oriental., acc. to the “numéros d’ ordre”',
      innerHTML: [
        '<strong>T. 41</strong> <em>Sinuthii Vita</em>, ed. J. Leipoldt, 1906. <ul><li>Leipoldt, J. (1906). <em><a href="https://archive.org/details/sinuthiiarchiman0000shen_i0u5/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Sinuthii archimandritae Vita et Opera omnia</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 41; Scriptores Coptici, Tom. 1). Paris: Imprimérie nationale. (Reprinted 1951, Louvain: L. Durbecq).</li></ul>',
        '<strong>42, 73</strong> <em>Sinuthii Opera</em>, do., 1908, 1913. <ul><li>Leipoldt, J. (1908). <em><a href="https://archive.org/details/sinuthiiarchiman0000shen_z1m2/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Sinuthii archimandritae Vita et Opera omnia, III</a></em>, with the assistance of W. E. Crum. (Corpus Scriptorum Christianorum Orientalium, Vol. 42; Scriptores Coptici, Tom. 2). Paris: Imprimérie nationale. (Reprinted 1955, Louvain: L. Durbecq).</li><li>Leipoldt, J. (1913). <em><a href="https://archive.org/details/sinuthiiarchiman0000shen/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Sinuthii archimandritae Vita et Opera omnia, IV</a></em>, with the assistance of W. E. Crum. (Corpus Scriptorum Christianorum Orientalium, Vol. 73; Scriptores Coptici, Tom. 5). Paris: Imprimérie nationale. (Reprinted 1954, Louvain: L. Durbecq). <br></li></ul>',
        '<strong>43, 86</strong> <em>Acta Martyrum</em>, edd. I. Balestri &amp; H. Hyvernat, 1907, 1924. <ul><li>Balestri, J. &amp; Hyvernat, H. (1907). <em><a href="https://archive.org/details/actamartyrum0043bale/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Acta martyrum, I</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 43; Scriptores Coptici, Tom. 3). Paris: Imprimérie nationale. (Reprinted 1955, Louvain: L. Durbecq).</li><li>Balestri, J. &amp; Hyvernat, H. (1924). <em><a href="https://archive.org/details/actamartyrum0086bale/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Acta martyrum, II</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 86; Scriptores Coptici, Tom. 6). Paris: Imprimérie nationale. (Reprinted 1953, Louvain: L. Durbecq).</li></ul>',
        '<strong>89, 99, 100</strong> S. <em>Pachomii Vitae</em>, ed. L. Th. Lefort, 1925, 1933. <ul><li>Lefort, L. Th. (1925). <em><a href="https://archive.org/details/spachomiivitaboh0000unse/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">S. Pachomii vita bohairice scripta</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 89; Scriptores Coptici, Tom. 7). Paris: Imprimérie nationale. (Reprinted 1953, Louvain: L. Durbecq).</li><li>Lefort, L. Th. (1933-1934). <em><a href="https://archive.org/details/spachomiivitaesa9910unse/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">S. Pachomii Vitae sahidice scriptae, fasc. 1-2</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 99-100; Scriptores Coptici, Tom. 9-10). Paris: Imprimérie nationale. (Reprinted 1952, Louvain: L. Durbecq).</li></ul>',
      ],
    },
    variants: ['C'],
  },
  {
    source: {
      title: 'MSS. &c. in the Egyptian Museum, Cairo',
    },
    variants: ['Cai'],
  },
  {
    source: {
      // NOTE: Listed as '(Cai)CoptMus'!
      title: 'MSS. &c. in Coptic Museum, Cairo',
    },
    variants: ['Cai Copt Mus', 'Copt Mus'],
  },
  {
    source: {
      title:
        'Canons of Athanasius ed. Riedel & Crum (Text & Transl. Soc.), 1904',
      innerHTML: [
        'Riedel, W., &amp; Crum, W. E. (1904). <em><a href="https://archive.org/details/thecanonsofathan00rieduoft/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">The Canons of Athanasius of Alexandria: The Arabic and Coptic versions edited and translated with introductions, notes and appendices</a></em>. London: Williams and Norgate.',
      ],
    },
    variants: ['CA'],
  },
  {
    source: {
      title: 'Kitâb al-Khulâgy al-Muḳaddas (Euchologion), Cairo, 1902',
      innerHTML: [
        'ʿAbd al-Masīḥ Ṣalīb. (1902). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/1703331" rel="noreferrer noopener" target="_blank">Kitāb al-Ḫulāǧī al-Muqaddas</a></em> [كتاب الخولاجي المقدس اي كتاب الثلاثة القداسات التي للقديس باسيليوس والقديس غريغوريوس والقديس كيرلس مع صلوات أخرى مقدسة — ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ⲡⲓⲉⲩⲭⲟⲗⲟⲅⲓⲟⲛ ⲉ̀ⲑⲟⲩⲁⲃ ⲉ̀ⲧⲉ ⲫⲁⲓ ⲡⲉ ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ϯϣⲟⲙϯ ⲛ̀ⲁ̀ⲛⲁⲫⲟⲣⲁ ⲛ̀ⲧⲉ ⲡⲓⲁ̀ⲅⲓⲟⲥ ⲃⲁⲥⲓⲗⲓⲟⲥ ⲛⲉⲙ ⲡⲓⲁ̀ⲅⲓⲟⲥ ⲅ̀ⲣⲏⲅⲟⲣⲓⲟⲥ ⲛⲉⲙ ⲡⲓⲁ̀ⲅⲓⲟⲥ ⲕⲩⲣⲓⲗⲗⲟⲥ ⲛⲉⲙ ϩⲁⲛⲕⲉⲉⲩⲭⲏ ⲉⲩⲟⲩⲁⲃ]. Heliopolis.',
      ],
    },
    variants: ['CaiEuch'],
  },
  {
    source: {
      title: 'Catenae in Evangelia, ed. Lagarde, 1886',
      innerHTML: [
        'Lagarde, P. de. (1886). <em><a href="https://archive.org/details/catenaeinevangel00lagauoft/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Catenae in evangelia Aegyptiacae quae supersunt</a></em>. Göttingen: Dietrich, Arnoldi Hoyer.',
      ],
    },
    variants: ['Cat'],
  },
  {
    source: {
      title:
        'Codices Coptici Vaticani &c., T.I, edd. Hebbelynck & Lantschoot, Rome, 1937',
      innerHTML: [
        'Hebbelynck, A., &amp; Van Lantschoot, A. (1937). <em><a href="https://archive.org/details/BiblotacheaTomIcomplete/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Codices Coptici Vaticani, Barberiniani, Borgiani, Rossiani. Tomus I</a></em>. Vaticani: Bibliotheca Vaticana.',
      ],
    },
    variants: ['CCVaI'],
  },
  {
    source: {
      title:
        'L. Clugnet, Vie de l’Abbé Daniel, wherein Guidi’s Coptic text, acc. to pp. of this work',
      innerHTML: [
        'Clugnet, L., Nau, F., &amp; Guidi, I. (Eds.). (1901). <em><a href="https://archive.org/details/VieDanielLeScetiote/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Vie (et récits) de l’Abbé Daniel le Scétiote (VIe siècle): Texte grec publ. par Léon Clugnet, texte syriaque publ. par F. Nau, texte copte publ. par Ignazio Guidi</a></em>. (Extrait de la Revue de l’ Orient Chrétien, Année 1901). Paris: A. Picard et fils.',
      ],
    },
    variants: ['CDan'],
  },
  {
    source: {
      title: 'M. Chaîne, Eléments de gram. dialectale copte, 1933',
      innerHTML: [
        'Chaîne, M. (1933). <em><a href="https://catalog.hathitrust.org/Record/001231946?type%5B%5D=all&amp;lookfor%5B%5D=%C3%89l%C3%A9ments%20de%20grammaire%20dialectale%20copte&amp;ft=" rel="noreferrer noopener" target="_blank">Éléments de grammaire dialectale copte: Bohairique, Sahidique, Achmimique, Fayoumique</a></em>. Paris: P. Geuthner. [via US access only]',
      ],
    },
    variants: ['Chaîne'],
  },
  {
    source: {
      title:
        'F. Rösch, Bruchstücke des I. Clem. 1910, acc. to chh. of Greek text',
      innerHTML: [
        'Schmidt, C. (1908). <em><a href="https://archive.org/details/derersteclemensb00clemuoft/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Der erste Clemensbrief in altkoptischer Übersetzung: Untersucht und herausgegeben von Carl Schmidt mit Lichtdruck-Faksimile der Handschrift</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, Vol. 32, No. 1). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
        'Rösch, F. (1910). <em><a href="https://archive.org/details/bruchstckedese00clemuoft/bruchstckedese00clemuoft/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Bruchstücke des ersten Clemensbriefes nach dem achmimischen Papyrus der Strassburger Universitäts- und Landesbibliothek mit biblischen Texten derselben Handschrift</a></em>. Strassburg: Schlesier &amp; Schweikhardt.',
      ],
    },
    variants: ['Cl'],
  },
  {
    source: {
      title:
        'Woide’s MSS. belonging to the Clarendon Press (Crum’s copies & photographs)',
    },
    variants: ['ClPr'],
  },
  {
    source: {
      title: 'Crum, Coptic MSS. from Fayyûm, 1893, acc. to pp',
      innerHTML: [
        'Crum, W. E. (1893). <em><a href="https://archive.org/details/copticmanuscript00crumuoft/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Manuscripts brought from the Fayyum by W. M. Flinders Petrie, Esq., D.C.L. together with a papyrus in the Bodleian Library edited with commentaries and indices</a></em>. London: David Nutt.',
      ],
    },
    variants: ['CMSS'],
  },
  {
    source: {
      title: 'Crum, Coptic Ostraca, 1902',
      innerHTML: [
        'Crum, W. E. (1902). <em><a href="https://archive.org/details/copticostracafr00fundgoog/page/n4/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Ostraca from the collections of the Egypt Exploration Fund, the Cairo Museum, and others</a></em>. London: Egypt Exploration Fund.',
      ],
    },
    variants: ['CO'],
    postfixes: [
      // Ad occurs as an abbreviation in the book intro. It stands for
      // ‘Addenda to lithographed texts’.
      'Ad',
    ],
  },
  {
    source: {
      title: 'Comptes Rendus de l’Acad. des lnscr., Paris, acc. to year & page',
      innerHTML: [
        '<em>Comptes rendus des séances de l’Académie des Inscriptions et Belles-Lettres</em> began in 1857. The volumes are listed and digitised on <a href="https://www.persee.fr/collection/crai" rel="noreferrer noopener" target="_blank">Persee.fr</a>. ',
      ],
    },
    variants: ['CR'],
  },
  {
    source: {
      title:
        'H. De Vis, Homélies Coptes (= Coptica I, V), 1922, 1929 (DeV alone = vol. I)',
      innerHTML: [
        'De Vis, H. (1922). <em><a href="https://archive.org/details/homliescoptesd01devi/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Homélies coptes de la Vaticane</a></em>. (Coptica, vol. I). Hauniae [Copenhagen]: Gyldendal.',
        'De Vis, H. (1929). <em><a href="https://archive.org/details/homliescoptesdel0000devi_r2q2/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Homélies coptes de la Vaticane</a></em>. (Coptica, vol. V). Hauniae [Copenhagen]: Gyldendal.',
      ],
    },
    variants: ['DeV'],
  },
  {
    source: {
      title: 'The Difnar, ed. O’Leary, I, II, III, 1926-30',
      innerHTML: [
        'O’Leary, De L. (1926). <em><a href="https://iiif.lib.harvard.edu/manifests/view/drs:497805580$5i" rel="noreferrer noopener" target="_blank">The Difnar (Antiphonarium) of the Coptic Church (first four months) from the Manuscript in the John Rylands Library, Manchester, with fragments of a Difnar recently recovered at the Der Abu Makar in the Wadi n-Natrun</a></em>. London: Luzac &amp; Co.',
        'O’Leary, De L. (1928). <em><a href="https://iiif.lib.harvard.edu/manifests/view/drs:497805580$137i" rel="noreferrer noopener" target="_blank">The Difnar (Antiphonarium) of the Coptic Church</a><a href="https://www.copticplace.org/files/Difnar2.pdf" rel="noreferrer noopener" target="_blank">: Part II (second four months, Tubeh, Amshir, Barmahat and Barmuda) from the Vatican Codex Copt. Borgia 59</a></em>. London: Luzac &amp; Co.',
        'O’Leary, De L. (1930). <em><a href="https://iiif.lib.harvard.edu/manifests/view/drs:497805854$1i" rel="noreferrer noopener" target="_blank">The Difnar (Antiphonarium) of the Coptic Church: Part III (Months Bashons, Baounah, Abib, Mesre and the intercalary days of Nasi) from the Vatican Codex Copt. Borgia 53 (2). With an Appendix containing Hymn fragments preserved in Bristol Museum and Art Gallery</a></em>. London: Luzac &amp; Co.',
      ],
    },
    variants: ['Dif'],
  },
  {
    source: {
      title: 'Demotic Magical Papyrus, ed. Griffith & Thompson, 1904 ff',
      innerHTML: [
        'Griffith, F. Ll., &amp; Thompson, H. (1904). <em><a href="https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-1/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">The Demotic Magical Papyrus of London and Leiden</a></em>. London: H. Grevel &amp; Co.',
        'Griffith, F. Ll., &amp; Thompson, H. (1905). <em><a href="https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-2/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">The Demotic Magical Papyrus of London and Leiden</a></em>, Vol. II: hand copy of the text. London: H. Grevel &amp; Co.',
        'Griffith, F. Ll., &amp; Thompson, H. (1909). <em><a href="https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-3/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">The Demotic Magical Papyrus of London and Leiden</a></em>, Vol. III: Indices. London: H. Grevel &amp; Co.',
      ],
    },
    variants: ['DM'],
  },
  {
    source: {
      title: 'R. Dozy, Supplém. aux diet. arabes, 1881',
      innerHTML: [
        'Dozy, R. (1881). <em><a href="https://gallica.bnf.fr/ark:/12148/bpt6k6254645z.texteImage" rel="noreferrer noopener" target="_blank">Supplément aux dictionnaires arabes</a></em>. Tome I. Leyde: E. J. Brill.',
        'Dozy, R. (1881). <em><a href="https://gallica.bnf.fr/ark:/12148/bpt6k6226013q.texteImage" rel="noreferrer noopener" target="_blank">Supplément aux dictionnaires arabes</a></em>. Tome II. Leyde: E. J. Brill.',
      ],
    },
    variants: ['Dozy'],
  },
  {
    source: {
      title:
        'Egypt Exploration Soc. (olim Fund), MSS. &c. in their possession (Crum’s copies)',
    },
    variants: ['EES'],
  },
  {
    source: {
      title: 'Die Apokalypse d. Elias, ed. G. Steindorff, 1899',
      innerHTML: [
        'Steindorff, G. (1899). <em><a href="https://archive.org/details/bub_gb_Tpbji86R09kC/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Die Apokalypse des Elias, eine unbekannte Apokalypse und Bruchstücke der Sophonias-Apokalypse koptische texte, übersetzung, glossar</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, Neue Folge, Band 2, Heft 3a). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['El'],
  },
  {
    source: {
      title:
        'phot. of vellum leaves lent by Enoch P. (Univ. of Michigan). Originals not now traceable',
    },
    variants: ['EnPeterson'],
  },
  {
    source: {
      title:
        'Monastery of Epiphanius, ed. Winlock, Crum & Evelyn White, 1926, acc. to numbers',
      innerHTML: [
        'Winlock, H. E, &amp; Crum, W. E. (1926). <em><a href="https://archive.org/details/monasteryofepiph01winl/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">The Monastery of Epiphanius at Thebes. Part I: The archaeological material by H. E. Winlock, and the literary material by W. E. Crum</a></em>. New York: The Metropolitan Museum of Art.',
        'Crum, W. E., &amp; Evelyn White, H. G. (1926). <em><a href="https://archive.org/details/monasteryofepiph02winl/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">The Monastery of Epiphanius at Thebes. Part II: Coptic ostraca and papyri edited with translations and commentaries by W. E. Crum, and Greek ostraca and papyri edited with translations and commentaries by H. G. Evelyn White</a></em>. New York: The Metropolitan Museum of Art.',
      ],
    },
    variants: ['Ep'],
  },
  {
    source: {
      title: 'Études… dédiées à C. Leemans, 1885',
      innerHTML: [
        '<em><a href="https://www.google.co.uk/books/edition/%C3%89tudes_arch%C3%A9ologiques/ByowAAAAYAAJ?hl=en&amp;gbpv=1" rel="noreferrer noopener" target="_blank">Études archéologiques, linguistiques et historiques dédiées à Mr. le Dr. C. Leemans, à l’occasion du cinquantième anniversaire de sa nomination aux fonctions de Directeur du Musée archéologique des Pays-Bas</a></em>. (1885). Leide: E. J. Brill.',
      ],
    },
    variants: ['EtLeem'],
  },
  {
    source: {
      // NOTE: This was two separate entries (with an identical abbreviations)
      // in Crum's list.
      title:
        'New Texts from the Monastery of St. Macarius, ed. H. G. Evelyn White, 1926; his copies of MSS from Nitria (in Coptic Museum, Cairo)',
      innerHTML: [
        'Evelyn White, H. G. (1926). <em><a href="https://archive.org/details/monasteriesofwdi01evel/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">The Monasteries of the Wadi ‘n Natrûn, Part I: New Texts from the Monastery of Saint Macarius. Edited with an introduction on the Library at the Monastery of Saint Macarius by Hugh G. Evelyn White with an appendix on a Copto-Arabic Ms. by G. P. G. Sobhy</a></em>. (Publications of the Metropolitan Museum of Art Egyptian Expedition, Vol. 2). New York: The Metropolitan Museum of Art.',
      ],
    },
    variants: ['EW'],
  },
  {
    source: {
      title:
        'Griffith, Oxford Excavations in Nubia, in Liverpool Annals of Archaeol. & Anthropol. (1) xiii 17, (2) ib. 49, (3) xiv 57',
      innerHTML: [
        'Griffith, F. Ll. (1926). <a href="https://archive.org/details/annals-of-archaeology-and-anthropology_1926_13_1-2/page/n37/mode/2up" rel="noreferrer noopener" target="_blank">Oxford Excavations in Nubia</a>. <em>Annals of Archaeology and Anthropology</em>, XIII(1-2), 17-37, plus plates. ',
        'Griffith, F. Ll. (1926). <a href="https://archive.org/details/annals-of-archaeology-and-anthropology_1926_13_3-4/page/48/mode/2up" rel="noreferrer noopener" target="_blank">Oxford Excavations in Nubia</a>. <em>Annals of Archaeology and Anthropology</em>, XIII(3-4), 49-93, plus plates. ',
        'Griffith, F. Ll. (1927). <a href="https://archive.org/details/annals-of-archaeology-and-anthropology_1927_14_3-4/page/56/mode/2up" rel="noreferrer noopener" target="_blank">Oxford Excavations in Nubia</a>. <em>Annals of Archaeology and Anthropology</em>, XIV(3-4), 57-116, plus plates. ',
      ],
    },
    variants: ['Faras'],
  },
  {
    source: {
      title:
        'Forbes Robinson, Coptic Apocr. Gospels (= Texts & Studies iv), 1896',
      innerHTML: [
        'Robinson, F. (1896). <em><a href="https://archive.org/details/copticapocryphal0000unse/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Apocryphal Gospels</a></em>. (Texts and Studies: Contributions to Biblical and Patristic Literature, Vol. IV, No. 2). Cambridge: University Press.',
      ],
    },
    variants: ['FR'],
  },
  {
    source: {
      title: 'Georgi, Fragm. Evang. S. Iohannis, 1789',
      innerHTML: [
        'Georgi, A. A. (1789). <em><a href="https://www.google.co.uk/books/edition/Fragmentum_Evangelii_S_Iohannis_Graeco_C/tomXmGIDwOgC?hl=en&amp;gbpv=1" rel="noreferrer noopener" target="_blank">Fragmentum Evangelii S. Iohannis graeco-copto-thebaicum saeculi IV. Additamentum ex vetustissimis membranis lectionum Evangelicarum divinae missae cod. diaconici reliquiae et liturgica alia fragmenta veteris thebaidensium ecclesiae ante Dioscorum, ex Veliterno museo borgiano, nunc prodeunt in latinum versa et notis illustrata</a></em>. Romae: apud A. Fulgonium.',
      ],
    },
    variants: ['GFr'],
  },
  {
    source: {
      title:
        'Greek-Coptic Glossary, ed. Bell & Crum, in Aegyptus vi 179, acc. to lines',
      innerHTML: [
        'Bell, H. I., &amp; Crum, W. E. (1925). <a href="https://www.jstor.org/stable/41201189?read-now=1&amp;seq=1#page_scan_tab_contents" rel="noreferrer noopener" target="_blank">A Greek-Coptic Glossary</a>. <em>Aegyptus</em>, 6, 177-226. ',
      ],
    },
    variants: ['Glos', 'Gloss'],
  },
  {
    source: {
      title: 'Georgi, Miracula S. Coluthi, 1793',
      innerHTML: [
        'Georgi, A. A. (1793). <em><a href="https://archive.org/details/bub_gb_FLw7D7xionYC/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">De miraculis Sancti Coluthi et reliquiis actorum Sancti Panesniv maryrum thebaica fragmenta duo alterum auctius alterum nunc primum editum</a></em>. Romae: Apud A. Fulgonium.',
      ],
    },
    variants: ['GMir'],
  },
  {
    source: {
      title: 'Göttinger Abhandlungen',
      innerHTML: [
        '<em>Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1839. Links to volumes from 1839-1890 are available digitised on <a href="https://www.biodiversitylibrary.org/bibliography/51047" rel="noreferrer noopener" target="_blank">Biodiversity Heritage Library</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/008602924" rel="noreferrer noopener" target="_blank">HathiTrust</a> in the US. ',
        '<em>Nachrichten von der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1894. Links to volumes from 1892-1923 available digitised on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=nachkongesgotph" rel="noreferrer noopener" target="_blank">The Online Books Page</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/000517694" rel="noreferrer noopener" target="_blank">HathiTrust</a> in the US. ',
      ],
    },
    variants: ['GöttA'],
  },
  {
    source: {
      // NOTE: In Crum's list, this appears as ‘do. Nachrichten’.
      title: 'Göttinger Nachrichten',
      innerHTML: [
        '<em>Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1839. Links to volumes from 1839-1890 are available digitised on <a href="https://www.biodiversitylibrary.org/bibliography/51047" rel="noreferrer noopener" target="_blank">Biodiversity Heritage Library</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/008602924" rel="noreferrer noopener" target="_blank">HathiTrust</a> in the US. ',
        '<em>Nachrichten von der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1894. Links to volumes from 1892-1923 available digitised on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=nachkongesgotph" rel="noreferrer noopener" target="_blank">The Online Books Page</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/000517694" rel="noreferrer noopener" target="_blank">HathiTrust</a> in the US. ',
      ],
    },
    variants: ['GöttN'],
  },
  {
    source: {
      title: 'S. Gaselee, Parerga Coptica, 1912, 1914',
      innerHTML: [
        'S. Gaselee. (1912, 1914). <em><a href="https://catalog.hathitrust.org/Record/001327863" rel="noreferrer noopener" target="_blank">Parerga Coptica: I. De XXIV Senioribus Apocalypticis et Nominibus Eorum. II. De Abraha et Melchisedec. III. Hymnus de Sinuthio</a></em>. Cantabrigiae: Typis Academicis. [via US access only]',
      ],
    },
    variants: ['GPar'],
  },
  {
    source: {
      title: 'Studies Presented to F. Ll. Griffith, 1932',
      innerHTML: [
        '<em><a href="https://archive.org/details/studiespresented0000egyp/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Studies Presented to F. Ll. Griffith</a></em>. (1932). London: Egypt Exploration Society.',
      ],
    },
    variants: ['GriffStu'],
  },
  {
    source: {
      title:
        'I. Guidi, Frammenti Copti I-VII (from ALR 1887 ff.), acc. to continuous pagination',
      innerHTML: [
        'Guidi, I. (1887-88). <a href="https://archive.org/details/frammenticopti00guid/page/46/mode/2up" rel="noreferrer noopener" target="_blank">Frammenti Copti (Nota I-VII)</a>. Reprinted from <em>Rendiconti della Reale Accademia dei Lincei. Classe di Scienze morali, storiche e filologiche</em>, Vols. 3(1-2)-4(1). ',
      ],
    },
    variants: ['Gu'],
  },
  {
    source: {
      title:
        'I. Guidi, Teste… sopra i Sette Dormienti (Mem. Acad. Linc., 1884)',
      innerHTML: [
        'Guidi, I. (1885). <em><a href="https://archive.org/details/testiorientalii01guidgoog/page/n4/mode/2up" rel="noreferrer noopener" target="_blank">Testi orientali inediti sopra i Sette Dormienti di Efeso</a></em>. (Reale Accademia dei Lincei, Memorie della Classe di scienze morali, storiche e filogiche, ser. 3, 12, 1884, 343-445). Roma: Tipografia della R. Accademia dei Lincei.',
      ],
    },
    variants: ['GuDorm'],
  },
  {
    source: {
      title: 'G. Horner’s text of N.T., 1898-1924',
      innerHTML: [
        'Horner, G. (1898-1905). <em> The Coptic Version of the New Testament in the Northern Dialect, Otherwise Called Memphitic and Bohairic, with Introduction, Critical Apparatus, and Literal English Translation</em> (4 vols.). Oxford: Clarendon Press. <ul><li><a href="https://archive.org/details/copticversionofn01horn/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Volume I</a>: The Gospels of S. Matthew and S. Mark, edited from Ms. Huntingdon 17 in the Bodleian Library </li><li><a href="https://archive.org/details/copticversionofn02horn/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Volume II</a>: The Gospels of S. Luke and S. John, edited from Ms. Huntingdon 17 in the Bodleian Library </li><li><a href="https://archive.org/details/copticversionofn03horn/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Volume III</a>: The Epistles of S. Paul, edited from Ms. Oriental 424 in the British Museum </li><li><a href="https://archive.org/details/copticversionofn04horn/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Volume IV</a>: The Catholic Epistles and the Acts of the Apostles, edited from Ms. Oriental 424 in the British Museum; and The Apocalypse, edited from Ms. Curzon 128 in the care of the British Museum </li></ul>',
        'Horner, G. (1911-1924). <em>The Coptic Version of the New Testament in the Southern Dialect, Otherwise Called Sahidic and Thebaic, with Critical Apparatus, Literal English Translation, Register of Fragments and Estimate of the Version</em> (7 vols.). Oxford: Clarendon Press. <ul><li><a href="https://archive.org/details/copticversionofn01unse/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Volume I</a>: The Gospels of S. Matthew and S. Mark </li><li><a href="https://archive.org/details/copticversionofn02unse/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Volume II</a>: The Gospel of S. Luke </li><li><a href="https://archive.org/details/copticversionofn03unse/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Volume III</a>: The Gospel of S. John, register of fragments, etc., facsimiles </li><li><a href="https://archive.org/details/copticversionofn04hornuoft/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Volume IV</a>: The Epistles of S. Paul </li><li><a href="https://archive.org/details/copticversionofn05unse/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Volume V</a>: The Episles of S. Paul (continued), register of fragments, etc. </li><li><a href="https://archive.org/details/copticversionofn06hornuoft/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Volume VI</a>: The Acts of the Apostles </li><li><a href="https://archive.org/details/copticversionofn07hornuoft/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Volume VII</a>: The Catholic Epistles and the Apocalypse </li></ul>',
      ],
    },
    variants: ['H'],
  },
  {
    source: {
      title: 'H. R. Hall, Coptic & Greek Texts… Brit. Museum, 1905, acc. to pp',
      innerHTML: [
        'Hall, H. R. (1905). <em><a href="https://archive.org/details/mdp.39015020865567/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">Coptic and Greek Texts of the Christian Period from Ostraka, Stelae, etc. in the British Museum</a></em>. London: British Museum.',
      ],
    },
    variants: ['Hall'],
  },
  {
    source: {
      title: 'G. Horner, Consecration of Church & Altar, 1902',
      innerHTML: [
        'Horner, G. (1902). <em><a href="https://archive.org/details/serviceforconsec00hornuoft/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">The Service for the Consecration of a Church and Altar According to the Coptic Rite, Edited with Translations from a Coptic and Arabic Manuscript of A.D. 1307 for the Bishop of Salisbury</a></em>. London: Harrison and Sons.',
      ],
    },
    variants: ['HCons'],
  },
  {
    source: {
      title:
        'W. Hengstenberg in Beiträge z. Forschung… Heft III, J. Rosenthal, München, 1914',
      innerHTML: [
        'Hengstenberg, W. (1914). <a href="https://archive.org/details/hvd.32044095331146/page/n131/mode/2up" rel="noreferrer noopener" target="_blank">Koptische Papyri</a>. In <em>Beiträge zur Forschung: Studien und Mitteilungen aus dem Antiquariat Jacques Rosenthal München, Heft III</em> (pp. 92-100, plus plates). München: Verlag von Jacques Rosenthal. ',
      ],
    },
    variants: ['HengB'],
  },
  {
    source: {
      title:
        'E. Amélineau, De Historia Lausiaca, 1887; but Hist Laus = E. C. Butler’s edition of Greek text (= Texts & Studies vi)',
      innerHTML: [
        'Amélineau, E. (1887). <em><a href="https://archive.org/details/dehistorialausia00am/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">De Historia Lausiaca: Quænam sit hujus ad monachorum Aegyptiorum historiam scribendam utilitas</a></em>. Paris: E. Leroux.',
        'Butler, D. C. (1898). <em><a href="https://archive.org/details/lausiachistoryof01pall/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">The Lausiac History of Palladius. Vol. I: A Critical Discussion Together with Notes on Early Egyptian Monachism</a></em>. (Texts and Studies: Contributions to Biblical and Patristic Literature, Vol. 6, No. 1). Cambridge: University Press.',
        'Butler, D. C. (1904). <em><a href="https://archive.org/details/lausiachistoryof02pall/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">The Lausiac History of Palladius. Vol. II: The Greek Text edited with Introduction and Notes</a></em>. (Texts and Studies: Contributions to Biblical and Patristic Literature, Vol. 6, No. 2). Cambridge: University Press.',
      ],
    },
    variants: ['HL'],
  },
  {
    source: {
      title:
        'Griffith, The Old Coptic Horoscope, in AZ 38 76 ff., acc. to pp. of publication',
      innerHTML: [
        'Griffith, F. Ll. (1900). <a href="https://archive.org/details/zeitschriftfr38brug/page/70/mode/2up" rel="noreferrer noopener" target="_blank">The Old Coptic Horoscope of the Stobart Collection</a>. <em>Zeitschrift für ägyptische Sprache und Altertumskunde</em>, 38, 71-93. ',
      ],
    },
    variants: ['Hor'],
  },
  {
    source: {
      title:
        'Sir Herbert Thompson’s Sa’îdic MSS. (now in Cambridge Univ. Library), acc. to letters (B-Z) which distinguish them; or other references to him',
    },
    variants: ['HT'],
  },
  {
    // NOTE: This is listed twice as both 'Stat' and 'HSt'.
    source: {
      title: 'G. Horner, Statutes of the Apostles, 1904',
      innerHTML: [
        'Horner, G. (1904). <em><a href="https://archive.org/details/statutesapostle00unkngoog/page/n6/mode/2up" rel="noreferrer noopener" target="_blank">The Statutes of the Apostles or Canones Ecclesiastici. Edited with Translation and Collation from Ethiopic and Arabic MSS.; Also a Translation of the Saʿidic and Collation of the Bohairic Versions; and Saʿidic Fragments</a></em>. London: Williams &amp; Norgate.',
      ],
    },
    variants: ['HSt', 'Stat'],
  },
  {
    source: {
      title:
        'Institut français, Cairo, MS. of Shenoute’s Epistles (H. Munier’s copy)',
    },
    variants: ['IF'],
  },
  {
    source: {
      title: 'Ignazio Rossi, Etymologiae Aegyptiacae, 1808',
      innerHTML: [
        'Rossi, I. (1808). <em><a href="https://archive.org/details/bub_gb_IWhHswE1yv0C/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Etymologiae Aegyptiacae</a></em>. Rome.',
      ],
    },
    variants: ['IgR'],
  },
  {
    source: {
      // NOTE: Listed as 'ImpRussArS'!
      title: 'Imperial Russian Archaeolog. Soc. xviii, 1907 (Turaief)',
      innerHTML: [
        'Turayev, B. A. (1907). <a href="https://archive.org/details/Notes-Imperial-Russian-Archaeological-Society/ZVORAO_18_1908/page/n55/mode/2up" rel="noreferrer noopener" target="_blank">Ахмимскій папирусъ изъ коллекціи Н. П. Лихачева [An Akhmim Papyrus from the Collection of N. P. Likhachov]</a>. <em>Записки Восточного Отдѣления Императорского Русского Археологическаго Общества</em> [Transactions of the Eastern Branch of the Imperial Russian Archaeological Society], 18, 28-30. ',
      ],
    },
    variants: ['Imp Russ Ar S'],
  },
  {
    source: {
      title:
        'Crum & Steindorff, Kopt. Rechtsurkunden… aus Djême, acc. to no. & line',
      innerHTML: [
        'Crum, W. E., &amp; Steindorff, G. (1912). <em><a href="https://archive.org/details/koptischerechtsu00crum/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Koptische Rechtsurkunden des achten Jahrhunderts aus Djême (Theben). I. Band: Text und Incides</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['J'],
  },
  {
    source: {
      // TODO: (#545) Name doesn't make sense when it appears on its own!
      title:
        'two such papyri in Leipzig University, Aegyptologisches Institut (cf below)',
      innerHTML: [
        'Crum, W. E., &amp; Steindorff, G. (1912). <em><a href="https://archive.org/details/koptischerechtsu00crum/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Koptische Rechtsurkunden des achten Jahrhunderts aus Djême (Theben). I. Band: Text und Incides</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['JLeip'],
  },
  {
    source: {
      title: 'Journal Asiatique, acc. to year, vol. & page',
      innerHTML: [
        '<em>Journal asiatique</em> began in 1822. Volumes are digitised and available on <a href="https://gallica.bnf.fr/ark:/12148/cb34348774p/date" rel="noreferrer noopener" target="_blank">Gallica</a> up to 1940. There are also volumes available on <a href="https://catalog.hathitrust.org/Record/006147183" rel="noreferrer noopener" target="_blank">HathiTrust</a> and listed on <a href="https://www.egyptologyforum.org/EEFDigijournals.html" rel="noreferrer noopener" target="_blank">EgyptologyForum.org</a>. ',
      ],
    },
    variants: ['JA'],
  },
  {
    source: {
      // NOTE: Listed as 'J&C'!
      title: 'H. I. Bell, Jews & Christians, 1924, acc. to pp',
      innerHTML: [
        'Bell, H. I. (1924). <em><a href="https://archive.org/details/jewschristiansin0000bell/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Jews and Christians in Egypt: The Jewish Troubles in Alexandria and the Athanasian Controversy</a></em>. London: British Museum.',
      ],
    },
    variants: ['J & C'],
  },
  {
    source: {
      title: 'Journ. of American Orient. Soc',
      innerHTML: [
        'The <em>Journal of the American Oriental Society</em> began in 1843-49. All volumes to date are available via <a href="https://www.jstor.org/journal/jameroriesoci" rel="noreferrer noopener" target="_blank">JSTOR</a>. ',
      ],
    },
    variants: ['JAOS', 'JAmOrSoc'],
  },
  {
    source: {
      title:
        'P. Jernstedt, Kopt. Papyri d. Asiat. Mus. (Soc. Egyptol. Univ. Leningrad, no. 6, 1930), acc. to numbers',
      innerHTML: [
        'Jernstedt, P. (1930). Koptische Papyri des Asiatischen Museums. <em>Сборник египтологического кружка при Ленинградском Государственном Университете</em>, VI, 21–44. [If you know of a digital copy, please <a href="https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/"> contact me</a>] ',
      ],
    },
    variants: ['Jern'],
  },
  {
    source: {
      title:
        'H. Junker, Koptische Poesie, 1908, 1911 (from Oriens Christianus.)',
      innerHTML: [
        'Junker, H. (1908-1911). <em><a href="https://archive.org/details/koptischepoesied0000junk/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Koptische Poesie des 10. Jahrhunderts</a></em> (2 Bände). Berlin: Karl Curtius. [Reprinted 1977, Hildesheim &amp; New York: Georg Olms Verlag].',
      ],
    },
    variants: ['JKP'],
  },
  {
    source: {
      title:
        'A. A. Schiller, Ten Coptic Legal Texts, New York, 1932 (includes JLeip, v above), acc. to numbers & lines',
      innerHTML: [
        'Schiller, A. A. (1932). <em><a href="https://archive.org/details/in.ernet.dli.2015.44575/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Ten Coptic Legal Texts Edited with Translation, Commentary, and Indexes Together with an Introduction</a></em>. New York: Metropolitan Museum of Art.',
      ],
    },
    variants: ['JSch'],
  },
  {
    source: {
      title: 'Journal of Theological Studies',
      innerHTML: [
        '<em>The Journal of Theological Studies</em> began in 1899. Its volumes are available through <a href="https://www.jstor.org/journal/jtheostud" rel="noreferrer noopener" target="_blank">JSTOR</a> with institutional access. Volumes from 1899 to 1929 are hosted on Archive.org and linked on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=jtheostudies" rel="noreferrer noopener" target="_blank">The Online Books Page</a>. Others are available through <a href="https://catalog.hathitrust.org/Record/000681411" rel="noreferrer noopener" target="_blank">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['JTS'],
  },
  {
    source: {
      title:
        'A. Kircher, the Scalæ in Lingua Aegyptiaca Restituta, variants from Loret in Ann. I and other MSS',
      innerHTML: [
        'Kircher, A. (1644). <em><a href="https://www.google.co.uk/books/edition/Athanasii_Kircheri_Lingua_Aegyptiaca_res/qEtB1x0frAIC?hl=en&amp;gbpv=1" rel="noreferrer noopener" target="_blank">Lingua Aegyptiaca Restituta. Opus Tripartium</a></em>. Rome: Hermann Scheus.',
        'Loret, V. (1900). <a href="https://archive.org/details/AnnalesDuServiceDesAntiquitsDeLegyptevolume1/page/n63/mode/2up" rel="noreferrer noopener" target="_blank">Les livres III et IV (animaux et végétaux) de la Scala Magna de Schams-Ar-Riâsah</a>. <em>Annales du Service des antiquités de l’Egypte</em>, 1, 48-63 (edition), 215-229 (indices). ',
      ],
    },
    variants: ['K'],
  },
  {
    source: {
      title:
        'ⲡϫⲱⲙ ⲛⲧⲉ ⲡⲓⲑⲱϩⲥ ⲉⲑ︦ⲩ︦ (Kitâb al-Masḥah, ay al-Ḳandîl), ed. C. Labîb, Cairo, AM. 1625, v TRit 144 ff',
      innerHTML: [
        'Labib, C. Y. (1909). <em><a href="https://mc.dlib.nyu.edu/files/books/columbia_aco003890/columbia_aco003890_hi.pdf" rel="noreferrer noopener" target="_blank">Kitāb al-Masḥah, (ʾay al-Qandīl) maʿa Ṣalāt al-Qiddīs ʾAbū Tarbū</a> [كتاب المسحة، (أي القنديل) مع صلاة القديس ابو تربو — ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ⲡⲓⲑⲱϩⲥ ⲉ︦ⲑ︦ⲩ︦ ⲛⲉⲙ ⲡⲓϣ̀ⲗⲏⲗ ⲛ̀ⲧⲉ ⲁⲃⲃⲁ ⲥ̀ⲑⲉⲣⲡⲟⲩ]</em>. Cairo: Heliopolis Press.',
      ],
    },
    variants: ['Kandil'],
  },
  {
    source: {
      title: 'O. von Lemm, Kleine Kopt. Studien, acc. to continuous pagination',
      innerHTML: [
        'Parts 1-58 published in the <em>Bulletin de l’Académie Impériale des Sciences de St.-Pétersbourg</em>, 1899-1909. Parts I-IX, X-XX, XXI-XXV, XXVI-XLV, XXVI-XLV (Schluss) are available on <a href="https://www.mathnet.ru/php/archive.phtml?wshow=paper&amp;jrnid=im&amp;paperid=4650&amp;option_lang=eng" rel="noreferrer noopener" target="_blank">Mathnet.ru</a>. Part XLVI-L are available on <a href="https://www.orientalstudies.ru/rus/index.php?option=com_publications&amp;Itemid=75&amp;pub=8369" rel="noreferrer noopener" target="_blank">OrientalStudies.ru</a>. Parts LI-LV and LVI-LVIII are outstanding. ',
      ],
    },
    variants: ['KKS'],
  },
  {
    source: {
      title: 'J. Krall, Kopt. Texte (Rainer Corpus II), acc. to numbers',
      innerHTML: [
        'Krall, J. (1895). <em><a href="https://www.google.co.uk/books/edition/Koptische_Texte_Bd_Rechtsurkunden/VlcPAQAAMAAJ?hl=en&amp;gbpv=1&amp;pg=PR3&amp;printsec=frontcover" rel="noreferrer noopener" target="_blank">Corpus papyrorum Raineri archiducis Austriae. Band II: Koptische Texte</a></em>. Wien: Verlag der Kaiserlich-Königlichen Hof- und Staatsdruckerei.',
      ],
    },
    variants: ['Kr'],
  },
  {
    source: {
      title:
        'A. Kropp, Ausgewählte Kopt. Zaubertexte, 1930-31, numbered by letters A, B &c',
      innerHTML: [
        'Kropp, A. M. (1931). <em><a href="https://archive.org/details/ausgewhltekoptis0012krop/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">Ausgewählte koptische Zaubertexte. Band I: Textpublikation</a></em>. Bruxelles: Fondation Égyptologique Reine Élisabeth.',
        'Kropp, A. M. (1931). <em><a href="https://archive.org/details/ausgewhltekoptis0003krop/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Ausgewählte koptische Zaubertexte. Band II: Übersetzungen und Anmerkungen</a></em>. Bruxelles: Fondation Égyptologique Reine Élisabeth.',
        'Kropp, A. M. (1930). <em><a href="https://archive.org/details/ausgewhltekoptis0003krop/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Ausgewählte koptische Zaubertexte. Band III: Einleitung in koptische Zaubertexte</a></em>. Bruxelles: Fondation Égyptologique Reine Élisabeth.',
      ],
    },
    variants: ['Kropp'],
    postfixes: ['A', 'B', 'C', 'F', 'H', 'J', 'K', 'M'],
  },
  {
    source: {
      title:
        'C. Labîb, Coptic-Arabic Dictionary (ⲡⲓⲗⲉⲝⲓⲕⲟⲛ ⲛϯⲁⲥⲡⲓ ⲛⲧⲉ ⲛⲓⲣⲉⲙⲛⲭⲏⲙⲓ Ḳâmûs al-Luġah al-Ḳibṭîyah al Maṣrîyah), Cairo, AM. 1611 ff',
      innerHTML: [
        'Labib, C. Y. (1895-1915, 1940). <em><a href="https://archive.org/details/LAB1895COPAR/1.%D9%82%D8%A7%D9%85%D9%88%D8%B3%20%D8%A7%D9%84%D9%84%D8%BA%D8%A9%20%D8%A7%D9%84%D9%82%D8%A8%D8%B7%D9%8A%D8%A9%20%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%8A%D8%A9/" rel="noreferrer noopener" target="_blank">Qāmūs al-Luġah al-Qibṭiyyah al-Miṣriyyah</a> [قاموس اللغة القبطية المصرية — ⲡⲓⲗⲉⲝⲓⲕⲟⲛ ⲛ̀ϯⲁⲥⲡⲓ ⲛ̀ⲧⲉ ⲛⲓⲣⲉⲙⲛ̀ⲭⲏⲙⲓ]</em>. (5 parts with part 6 published posthumously). Al-Waṭanniya Press.',
      ],
    },
    variants: ['Lab'],
  },
  {
    source: {
      title:
        'fragments of Jo & Ap F, copied by P. Lacau (v Bull. Corr. Hellén. xxv 400)',
    },
    variants: ['Lacau'],
  },
  {
    source: {
      title: 'M. V. La Croze, Lexicon Aegyptiaco-Latinum, 1775',
      innerHTML: [
        'La Croze, M. V. (1775). <em><a href="https://www.digitale-sammlungen.de/en/view/bsb10522488?page=6,7" rel="noreferrer noopener" target="_blank">Lexicon Aegyptiaco-Latinum</a></em>. Edited by C. Scholtz and C. G. Woide. Oxford: Clarendon Press.',
      ],
    },
    variants: ['Lacr'],
  },
  {
    source: {
      title: 'P. de Lagarde, his editions of Coptic texts',
    },
    variants: ['Lag'],
  },
  {
    source: {
      title: 'Kitâb al-Lakân, Cairo, 1921',
      innerHTML: [
        'Father Bāḫūm al-Baramūsī, &amp; Deacon ʿUryān Faraj. (1921). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3209362" rel="noreferrer noopener" target="_blank">Kitāb al-Laqān wa-l-Saǧdah</a>. [كتاب اللقان والسجدة — ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ϯⲗⲁⲕⲁⲛⲏ ⲛⲉⲙ ⲡⲓϫⲓⲛⲟⲩⲱϣⲧ ⲫⲏⲉⲧⲉⲣⲁ̀ⲙⲁϩⲓ ⲉ̀ϫⲉⲛ ϯⲗⲁⲕⲁⲛⲏ ⲛ̀ⲧⲉ ⲡ̀ϣⲁⲓ ⲙ̀ⲡ̀ϫⲓⲛⲱⲙⲥ : ⲛⲉⲙ ⲡⲓⲉ︦ ⲛ̀ⲛⲓϣϯ : ⲛⲉⲙ ⲛⲉⲛⲓⲟϯ ⲛ̀ⲁ̀ⲡⲟⲥⲧⲟⲗⲟⲥ : ⲛⲉⲙ ϯⲡⲁⲛⲧⲏⲕⲟⲥⲧⲏ]</em>. Cairo: Heliopolis Press.',
      ],
    },
    variants: ['Lakan'],
  },
  {
    source: {
      title: 'Lemm, Der Alexanderroman',
      innerHTML: [
        'Lemm, O. von. (1903). <em><a href="https://phaidrabg.bg.ac.rs/open/o:556" rel="noreferrer noopener" target="_blank">Der Alexanderroman bei den Kopten: Ein Beitrag zur Geschichte der Alexandersage im Orient</a></em>. St. Petersburg: L’Académie Impériale des Sciences.',
      ],
    },
    variants: ['LAI'],
  },
  {
    source: {
      title: 'Die sogen. Gnomen d. Concils v. Nicaea (Dissert.), Beirut, 1912',
      innerHTML: [
        'Lammeyer, J. (1912). <em>Die sogenannten Gnomen des Konzils von Nicaea. Ein homiletischer Traktat des 4. Jahrhunderts unter Zugrundelegung erstmaliger Edition des koptisch-sahidischen Handschriftenfragments der Bibliothèque Nationale zu Paris Copte-sahidique 129, 14 (75-82) ins Deutsche übersetzt und untersucht</em>. Beirut. [If you know of a digital copy, please <a href="https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/"> contact me</a>] ',
      ],
    },
    variants: ['Lammayer'],
  },
  {
    source: {
      // NOTE: Listed as 'Lant.' (with a period)!
      title:
        'A. van Lantschoot, Recueil de Colophons… sahidiques, 1929, acc. to numbers; also copies by',
      innerHTML: [
        'Van Lantschoot, A. (1929). <em><a href="https://archive.org/details/recueildescoloph0000lans/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Colophons des manuscrits chrétiens d’Égypte. Tome I: Les colophons coptes des manuscrits sahidiques</a></em>. Louvain: J.-B. Istas.',
      ],
    },
    variants: ['Lant'],
  },
  {
    source: {
      title: 'Lemm, Apokryphe Apostelacten',
      innerHTML: [
        'Lemm, O. von. (1890). <em><a href="https://www.google.co.uk/books/edition/Koptische_Apokryphe_Apostelacten/7hJik4M60hoC?hl=en&amp;gbpv=1" rel="noreferrer noopener" target="_blank">Koptische Apokryphe Apostelacten</a></em>. St. Petersburg: Académie Impériale des Sciences.',
      ],
    },
    variants: ['LAp'],
  },
  {
    source: {
      title: 'Lemm, Sahidische Bibelfragmente I, II, III',
      innerHTML: [
        'Lemm, O. von. (1890). <a href="https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_10_1890_02_lemm.pdf" rel="noreferrer noopener" target="_blank">Sahidische Bibelfragmente. I</a>. <em>Bulletin de l’Académie impériale des sciences de St.-Pétersbourg</em>, X, 5-16. ',
        'Lemm, O. von. (1890). <a href="https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_10_1890_04_lemm.pdf" rel="noreferrer noopener" target="_blank">Sahidische Bibelfragmente. II</a>. <em>Bulletin de l’Académie impériale des sciences de St.-Pétersbourg</em>, X, 79-97. ',
        'Lemm, O. von. (1906). <a href="https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_12_1902-1906_08_lemm.pdf" rel="noreferrer noopener" target="_blank">Sahidische Bibelfragmente. III</a>. <em>Bulletin de l’Académie impériale des sciences de St.-Pétersbourg</em>, XII, 79-97. ',
      ],
    },
    variants: ['LBib'],
  },
  {
    source: {
      // NOTE: This occurs as LCypr in the list, but has been found to be cited
      // as LCyp in the text.
      title: 'Lemm, Cyprian v. Antiochien',
      innerHTML: [
        'Lemm, O. von. (1899). <em><a href="https://www.biodiversitylibrary.org/item/212311#page/559/mode/1up" rel="noreferrer noopener" target="_blank">Sahidische Bruchstücke der Legende von Cyprian von Antiochien</a></em>. (Mémoires de l’Académie impériale des sciences de St.-Pétersbourg, VIIIe série, Tome IV, No. 6). St. Petersburg.',
      ],
    },
    variants: ['LCypr', 'LCyp'],
  },
  {
    source: {
      title: 'Lemm, Eine dem Dionysios Areopag. zugeschr. Schrift',
      innerHTML: [
        'Lemm, O. von. (1900). <em><a href="https://www.biodiversitylibrary.org/item/94350#page/325/mode/1up" rel="noreferrer noopener" target="_blank">Eine dem Dionysius Areopagita zugeschriebene Schrift in koptischer Sprache</a></em>. (Bulletin de l’Académie impériale des sciences de St.-Pétersbourg, V. série, Tome XII, No. 3). St. Petersburg.',
      ],
    },
    variants: ['LDi'],
  },
  {
    source: {
      title: 'Leipzig University, Tischendorf’s Bohairic MSS. (Crum’s copies)',
    },
    variants: ['Leip'],
  },
  {
    source: {
      title:
        'Berichte d. phil.-histor. Klasse d. kgl. säch. Gesellsch. d. Wissensch',
      innerHTML: [
        '<em>Berichte über die Verhandlungen der Königlich Sächsischen Gesellschaft der Wissenschaften zu Leipzig, Philologisch-Historische Klasse</em> began in 1849. Volumes from 1849-1899 (1-51) available digitised on <a href="https://catalog.hathitrust.org/Record/008559830" rel="noreferrer noopener" target="_blank">HathiTrust</a> with later volumes via US access. ',
      ],
    },
    variants: ['LeipBer'],
  },
  {
    source: {
      title: 'Manuscrits coptes du Musée… à Leide, 1897, acc. to pages',
      innerHTML: [
        'Pleyte, W., &amp; Boeser, P. A. A. (1897). <em><a href="https://archive.org/details/manuscrits-coptes-du-musee-d-antiquite/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Manuscrits coptes du musée d’antiquités des Pays-Bas à Leide</a></em>. Leide: E. J. Brill.',
      ],
    },
    variants: ['Leyd'],
  },
  {
    source: {
      title: 'Antiquités Coptes (Catal. du Musée), 1900, acc. to pp',
      // NOTE: Listed as 'LeydAC'!
      innerHTML: [
        'Pleyte, W., &amp; Boeser, P. A. A. (1900). <em><a href="https://catalog.hathitrust.org/Record/008693139" rel="noreferrer noopener" target="_blank">Catalogue du musée d’ antiquités à Leide, sousdivision F. Égypte, antiquités coptes</a></em>. Leide: E. J. Brill. [Accessible in the US via HathiTrust.]',
      ],
    },
    variants: ['Leyd AC'],
  },
  {
    source: {
      title: 'Lemm, Iberica',
      innerHTML: [
        'Lemm, O. von. (1906). <em><a href="https://www.biodiversitylibrary.org/item/212314#page/653/mode/1up" rel="noreferrer noopener" target="_blank">Iberica</a></em>. (Mémoires de l’Académie impériale des sciences de St.-Pétersbourg, VIIIe série, Tome VII, No. 6). St. Petersburg.',
      ],
    },
    variants: ['LIb'],
  },
  {
    source: {
      title: 'Lemm, Bruchstücke Kopt. Märtyrerakten',
      innerHTML: [
        'Lemm, O. von. (1913). <em><a href="https://www.biodiversitylibrary.org/item/212319#page/10/mode/1up" rel="noreferrer noopener" target="_blank">Bruchstücke koptischer Märtyrerakten. I-V.</a></em> (I. Theodoros des Orientalen und Panikyros des Persers und Leontios des Arabers; II. Theodoros des Orientalen; III. Leontios des Arabers; IV. Heraklides; V. Isidoros). (Mémoires de l’ Académie impériale des sciences de St.-Pétersbourg, VIIIe série, Tome XII, No. 1). St. Petersburg.',
      ],
    },
    variants: ['LMär'],
  },
  {
    source: {
      title: 'Lemm, Koptische Miscellen, acc. to continuous pagination',
      innerHTML: [
        'Lemm, O. von. (1907-1915). Koptische Miscellen I-CXLVIII published in volumes of the <em>Bulletin de l’Académie Impériale des Sciences de St.-Pétersbourg, VI série</em>. Listed and linked on <a href="https://ancientworldonline.blogspot.com/2012/05/digitized-coptic-publications-of-oscar.html" rel="noreferrer noopener" target="_blank">The Ancient World Online</a>. ',
      ],
    },
    variants: ['LMis'],
  },
  {
    source: {
      title: 'Im. Löw, Aramäische Pflanzennamen, 1881, acc. to pp',
      innerHTML: [
        'Löw, I. (1881). <em><a href="https://archive.org/details/AramaeischePflanzennamen/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Aramæische Pflanzennamen</a></em>. Leipzig: Wilhelm Engelmann.',
      ],
    },
    variants: ['Löw'],
  },
  {
    source: {
      title: 'Flora der Juden, 1926 ff',
      innerHTML: [
        'Löw, I. (1924-1934). <em><a href="https://sammlungen.ub.uni-frankfurt.de/freimann/content/titleinfo/781127" rel="noreferrer noopener" target="_blank">Die Flora der Juden</a></em> (4 Bde.). (Veröffentlichungen der Alexander Kohut Memorial Foundation, Band II-IV, VI). Wien und Leipzig: R. Löwit Verlag.',
      ],
    },
    variants: ['LöwF'],
  },
  {
    source: {
      title: 'A. Mallon, Grammaire copte², 1907',
      innerHTML: [
        'Mallon, Al. (1907). <em><a href="https://archive.org/details/grammairecopteav00mall/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Grammaire copte: Avec bibliographie, chrestomathie et vocabulaire</a></em>. Deuxième édition. Beyrouth: Imprimerie Catholique.',
      ],
    },
    variants: ['Mallon'],
  },
  {
    source: {
      title:
        'copies of Chester Beatty’s unpublished Manichaean papyri by H. J. Polotsky & H. Thompson',
    },
    variants: ['Mani 1'],
    noSpaceVariants: true,
  },
  {
    source: {
      // TODO: (#545) Name doesn't make sense when it appears on its own!
      title: 'copies of sim. papyri at Berlin by Polotsky',
    },
    variants: ['Mani 2'],
    noSpaceVariants: true,
  },
  {
    source: {
      // NOTE: Listed as 'ManiH'!
      title: 'Manichäische Homelien, ed. Polotsky, 1934',
      innerHTML: [
        'Polotsky, H. J. (1934). <em><a href="https://archive.org/details/manichaischehomi0000polo/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Manichäische Homilien</a></em>. (Manichäische Handschriften der Sammlung A. Chester Beatty, Band I). Stuttgart: W. Kohlhammer.',
      ],
    },
    variants: ['Mani H'],
  },
  {
    source: {
      // NOTE: Listed as 'ManiK'!
      title: 'Kephalaia, edd. Polotsky & A. Böhlig, 1934 ff',
      innerHTML: [
        'Polotsky, H. J. (1940). <em><a href="https://archive.org/details/kephalaia0000mani/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Kephalaia. 1. Hälfte (Lieferung 1-10)</a></em>. (Manichäische Handschriften der Staatslichen Museen Berlin, Band I). Stuttgart: W. Kohlhammer.',
        'Böhlig, A. (1966). <em><a href="https://archive.org/details/kephalaia0001staa/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Kephalaia. 2. Hälfte (Lieferung 11-12)</a></em>. (Manichäische Handschriften der Staatslichen Museen Berlin, Band I). Stuttgart: W. Kohlhammer.',
      ],
    },
    variants: ['Mani K'],
  },
  {
    source: {
      // NOTE: While cases of ‘Mani P’ (with a space) in Crum's text remain
      // unconfirmed, we insert a space to maintain consistency with ‘Mani H’
      // and ‘Mani K’, cases of which appearing with a space in Crum's text
      // have been confirmed.
      title: 'A Manichaean Psalm-book, Pt. ii, ed. C. R. C. Allberry, 1938',
      innerHTML: [
        'Allberry, C. R. C. (1938). <em><a href="https://archive.org/details/manichaeanpsalmb0000allb/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">A Manichean Psalm-Book, Part II</a></em>. (Manichean Manuscripts in the Chester Beatty Collection, Volume II). Stuttgart: W. Kohlhammer.',
      ],
    },
    variants: ['Mani P'],
  },
  {
    source: {
      // NOTE: Listed as 'MartIgn'!
      title: 'Lightfoot, Ignatius¹, ii 1 865 ff',
      innerHTML: [
        'Lightfoot, J. B. (1899). <em><a href="https://babel.hathitrust.org/cgi/pt?id=uc1.l0051084895&amp;seq=289" rel="noreferrer noopener" target="_blank">The Apostolic Fathers, Part II: S. Ignatius, S. Polycarp. Revised Texts with Introductions, Notes, Dissertations, and Translations</a></em>, 2nd ed., Vol. III, pp. 275–298. London: Macmillan and Co. [Crum’s page numbering seems to refer to the 1st edition.]',
      ],
    },
    variants: ['Mart Ign'],
  },
  {
    source: {
      title: 'Mélanges de la Faculté Orientale, Université de Beyrouth',
      innerHTML: [
        '<em>Mélanges de l’Université Saint-Joseph</em> began in 1922 (volume 8-), succeeding <em>Mélanges de la Faculté Orientale</em>, which began in 1906, and continued its issue numbering. All volumes are listed, digitised and available for viewing on <a href="https://www.persee.fr/collection/mefao" rel="noreferrer noopener" target="_blank">Persee.fr</a>. ',
      ],
    },
    variants: ['MélOr'],
  },
  {
    source: {
      title: 'Annales du Musée Guimet, Paris',
      innerHTML: [
        '<em>Annales du Musée Guimet</em> began in 1880. Many volumes are available through <a href="https://catalog.hathitrust.org/Record/000054404" rel="noreferrer noopener" target="_blank">HathiTrust</a>, though some only through US access. Others are also listed and linked on <a href="https://fr.wikisource.org/wiki/Annales_du_Mus%C3%A9e_Guimet" rel="noreferrer noopener" target="_blank">fr.WikiSource.org.</a> Crum seems only to cite two volumes: <ul><li>Amélineau, E. (1889). <em><a href="https://archive.org/details/monumentspourser00amel/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Monuments pour servir à l’histoire de l’Égypte chrétienne au IVe siècle: Histoire de Saint Pakhôme et de ses communautés: Documents coptes et arabes inédits, publiés et traduits</a></em>. (Annales du Musée Guimet, Tome 17). Paris: Ernest Leroux.</li><li>Amélineau, E. (1894). <em><a href="https://archive.org/details/monumentspourser00amel_0/page/n8/mode/2up" rel="noreferrer noopener" target="_blank">Histoire des monastères de la Basse-Égypte: Vies des saints Paul, Antoine, Macaire, Maxime et Domèce, Jean le Nain, etc.: Texte copte et traduction française</a></em>. (Annales du Musée Guimet, Tome 25). Paris: Ernest Leroux.</li></ul>',
      ],
    },
    variants: ['MG'],
  },
  {
    source: {
      title:
        'a series of vellum leaves at Michigan University, independently numbered thus (but cf note in Preface)',
    },
    variants: ['Mich 550'],
    noSpaceVariants: true,
  },
  {
    source: {
      title: 'Mémoires de l’Instit. Égyptien, Cairo',
      innerHTML: [
        '<em>Mémoires présentés à l’Institut Egyptien</em> began in 1862. Volumes as listed, digitised and accessible on the <a href="https://digi.ub.uni-heidelberg.de/diglit/meminstitutegyptien?ui_lang=eng" rel="noreferrer noopener" target="_blank">Heidelberg digital library</a>. ',
      ],
    },
    variants: ['MIE'],
  },
  {
    source: {
      title: 'Mémoires… de l’Instit. franç. d’Archéol. orient. au Caire',
      innerHTML: [
        '<em>Mémoires publiés par les membres de l’Institut français d’archéologie orientale du Caire</em> (MIFAO) began in 1902. Volumes are listed and linked on <a href="https://www.egyptologyforum.org/EEFSeries.html#9.2" rel="noreferrer noopener" target="_blank">EgyptologyForum.org</a>. ',
      ],
    },
    variants: ['MIF'],
  },
  {
    source: {
      title: 'J. A. Mingarelli, Aegyptiorum Codd. Reliquiae, 1785',
      innerHTML: [
        'Mingarelli, G. L. (1785). <em><a href="https://archive.org/details/aegyptiorumcodic00ming/page/n3/mode/2up?ref=ol" rel="noreferrer noopener" target="_blank">Aegyptiorum codicum reliquiæ Venetiis in bibliotheca Naniana asservatæ</a></em>. Bononiae: Typis Laelii a Vulpe.',
      ],
    },
    variants: ['Ming'],
  },
  {
    source: {
      title: 'Mémoires… de la Mission archéol. franç. au Caire',
      innerHTML: [
        '<em>Mémoires publiés par les membres de la Mission archéologique française au Caire</em> (MMAF) began in 1884. Volumes are listed and linked on <a href="https://www.egyptologyforum.org/EEFSeries.html#9.1" rel="noreferrer noopener" target="_blank">EgyptologyForum.org</a>. ',
      ],
    },
    variants: ['Miss'],
  },
  {
    source: {
      title: 'MSS. & ostraca in the Metropolitan Museum of Art, New York',
    },
    variants: ['MMA'],
  },
  {
    source: {
      title:
        'Bohairic Scala in library of Faculté de Médecine, Montpellier (H. Munier’s copy)',
    },
    variants: ['Montp'],
  },
  {
    source: {
      title:
        'MSS. belonging to Mr. J. Pierpont Morgan, New York, as reproduced & numbered in 56 vols. of photographs, acc. to nos. & pp. of these volumes',
      innerHTML: [
        'Hyvernat, H. (Ed.). (1922). <em><a href="https://archive.org/details/PhantoouLibrary/m566%20Combined%20%28Bookmarked%29/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Codices coptici photographice expressi: Bibliothecae Pierpont Morgan</a></em> (56 vols.). Rome.',
      ],
    },
    variants: ['Mor'],
  },
  {
    source: {
      title: 'Mittheilungen a. d. Papyrussamml. Erzh. Rainer',
      innerHTML: [
        '<em>Mittheilungen aus der Sammlung der Papyrus Erzherzog Rainer</em> published in 6 volumes (1887-1897). Volumes are linked on <a href="https://ancientworldonline.blogspot.com/2013/02/open-access-journal-mitteilungen-aus.html" rel="noreferrer noopener" target="_blank">The Ancient World Online</a>. ',
      ],
    },
    variants: ['MR'],
  },
  {
    source: {
      title:
        'Manuscrits coptes, par H. Munier (Catal. Gén. Musée du Caire, 1916), acc. to pages',
      innerHTML: [
        'Munier, H. (1916). <em><a href="https://archive.org/details/manuscritscoptes00muni/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Manuscrits coptes</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 9201-9301). Le Caire: Impr. de l’ Institut français d’archéologie orientale.',
      ],
    },
    variants: ['Mun'],
  },
  {
    source: {
      title: 'Le Muséon (periodical), acc. to vols',
      innerHTML: [
        '<em>Le Muséon</em> began in 1882. Many early volumes are available digitised through <a href="https://catalog.hathitrust.org/Record/000640676?type%5B%5D=all&amp;lookfor%5B%5D=%20Le%20Muse%CC%81on&amp;ft=#viewability" rel="noreferrer noopener" target="_blank">HathiTrust</a> with some additional volumes via US access. ',
      ],
    },
    variants: ['Mus'],
  },
  {
    source: {
      title:
        'Le Mystère des Lettres grecques, ed. A. Hebbelynck (from Muséon, 1900, 1901)',
      innerHTML: [
        'Hebbelynck, A. (1900). <a href="https://archive.org/details/lemuson19soci/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Les mystères des lettres grecques d’après un manuscrit copte-arabe de la bibliothèque Bodléienne d’Oxford: Texte copte, traduction, notes</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. I, pp. 5-36. ',
        'Hebbelynck, A. (1900). <a href="https://archive.org/details/lemuson19soci/page/104/mode/2up?q=hebbelynck" rel="noreferrer noopener" target="_blank">Les mystères des lettres grecques (Suite.)</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. I, pp. 105-136. ',
        'Hebbelynck, A. (1901). <a href="https://archive.org/details/lemuson20soci/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Les mystères des lettres grecques d’après un manuscrit copte-arabe de la bibliothèque Bodléienne d’Oxford (Suite.)</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. II, pp. 5-33. ',
        'Hebbelynck, A. (1901). <a href="https://archive.org/details/lemuson20soci/page/n375/mode/2up" rel="noreferrer noopener" target="_blank">Les mystères des lettres grecques d’après un manuscrit copte-arabe de la bibliothèque Bodléienne d’Oxford (Fin.)</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. II, pp. 369-415 plus 3 plates. ',
      ],
    },
    variants: ['My'],
  },
  {
    source: {
      // NOTE: Listed as 'N&E'!
      title: 'Notices et Extraits des MSS. de la Bibliothèque Nationale, Paris',
      innerHTML: [
        '<em>Notices et extraits des manuscrits de la Bibliothèque nationale et autres bibliothèques</em> began in 1787. Many digitised volumes, particularly early volumes, are listed on <a href="https://catalog.hathitrust.org/Record/003105485" rel="noreferrer noopener" target="_blank">HathiTrust</a> and <a href="https://gallica.bnf.fr/ark:/12148/cb345335088/date" rel="noreferrer noopener" target="_blank">Gallica</a>. ',
      ],
    },
    variants: ['N & E'],
  },
  {
    source: {
      // NOTE: Listed as ‘O'LearyH’!
      title: 'De Lacy O’Leary: Fragmentary Coptic Hymns, 1924',
      innerHTML: [
        'O’Leary, De Lacy. (1924). <em><a href="https://archive.org/details/fragmentarycopti0000olea/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">Fragmentary Coptic Hymns from the Wadi n-Natrun edited with translations and notes</a></em>. London: Luzac &amp; Co.',
      ],
    },
    variants: ["O'Leary H"],
  },
  {
    source: {
      title: 'De Lacy O’Leary: The Coptic Theotokia, 1923',
      // NOTE: Listed as '—The'!
      innerHTML: [
        'O’Leary, De Lacy. (1923). <em><a href="https://archive.org/details/coptictheotokia0000copt/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">The Coptic Theotokia: Text from Vatican Cod. Copt. xxxviii, Bib. Nat. Copte 22, 23, 35, 69 and Other MSS. Including Fragments Recently Found at the Dêr Abû Makâr in the Wadi Natrun</a></em>. London: Luzac &amp; Co.',
      ],
    },
    variants: ["O'Leary Th", "O'Leary The"],
  },
  {
    source: {
      title: 'Orientalistische Litteraturzeitung',
      innerHTML: [
        '<em>Orientalistische Litteraturzeitung</em> began in 1898. Links to digitised volumes, especially early volumes, available on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=orientliteraturzeitung" rel="noreferrer noopener" target="_blank">The Online Books Page</a>. ',
      ],
    },
    variants: ['OLZ'],
  },
  {
    source: {
      title: 'Orientalia (periodical), Rome',
      innerHTML: [
        '<em>Orientalia</em> began in 1920. All volumes up to recent volumes are available through <a href="https://www.jstor.org/journal/orientalia" rel="noreferrer noopener" target="_blank">JSTOR</a>. ',
      ],
    },
    variants: ['Ora'],
  },
  {
    source: {
      // NOTE: Listed as 'OratCyp'!
      title:
        'Oratio Cypriani in Veröffentl. a. d. badischen Papyrussamml., Heft 5, 1934, p. 305 ff',
      // NOTE: PBad occurs as a standalone abbreviation in Crum, but we treat it
      // as a variant to simplify the pipeline.
      innerHTML: [
        'Bilabel, F., &amp; Grohmann, A. (1934). <em>Griechische, koptische und arabische Texte zur Religion und religiösen Literatur in Ägyptens Spätzeit</em>. (Veröffentlichungen aus den badischen Papyrus-Sammlungen, Heft 5). Heidelberg: Verlag der Universitätsbibliothek. [If you know of a digital copy, please <a href="https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/"> contact me</a>] ',
      ],
    },
    variants: ['Orat Cyp', 'PBad'],
  },
  {
    source: {
      title: 'Oriens Christianus (periodical)',
      innerHTML: [
        '<em>Oriens Christianus</em> began in 1901. All volumes up to 2014 are available digitised on the <a href="https://archive.org/details/oriens-christianus" rel="noreferrer noopener" target="_blank">Internet Archive</a>. ',
      ],
    },
    variants: ['OrChr'],
  },
  {
    source: {
      title: 'M.A. Murray, The Osireion, 1904',
      innerHTML: [
        'Murray, M. A. (1904). <em><a href="https://archive.org/details/osireionatabydos00murr/page/n3/mode/2up" rel="noreferrer noopener" target="_blank">The Osireion at Abydos</a></em>. London: Bernard Quaritch.',
      ],
    },
    variants: ['Osir'],
    postfixes: ['no'],
  },
  {
    source: {
      // NOTE: Listed as 'Ostr.Chicago', but seemingly never cited as such!
      title: 'Till’s copies of ostraca from Chicago Expedition, 1931',
    },
    variants: ['Ostr Chicago'],
  },
  {
    source: {
      title: 'MSS. in the Bibliothèque Nationale, Paris (Crum’s copies)',
    },
    variants: ['P'],
    postfixes: ['ar', 'Ar'],
  },
  {
    source: {
      title:
        'Papyri in Museum at Alexandria, ed. de Ricci & Winstedt in Sphinx x, also Crum’s copies',
      innerHTML: [
        'Ricci, S. de, &amp; Winstedt, E. O. (1906). <a href="https://www.persee.fr/doc/sphin_2003-170x_1906_num_10_1_1192" rel="noreferrer noopener" target="_blank">Papyrus coptes du Musée d’Alexandrie</a>. <em>Sphinx: revue critique embrassant le domaine entier de l’égyptologie</em>, 10, 1-4. ',
      ],
    },
    variants: ['PAl'],
  },
  {
    source: {
      title: 'The Amherst Papyri, ed. Grenfell & Hunt, 1901',
      innerHTML: [
        'Grenfell, B. P., &amp; Hunt, A. S. (1901). <em><a href="https://archive.org/details/amherstpapyribei02grenuoft/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">The Amherst Papyri: Being an Account of the Greek Papyri in the Collection of the Right Hon. Lord Amherst of Hackney, F.S.A. at Didlington Hall, Norfolk. Part II: Classical Fragments and Documents of the Ptolemaic, Roman, and Byzantine Periods</a></em>. London: Henry Frowde.',
      ],
    },
    variants: ['PAmh'],
  },
  {
    source: {
      title:
        'Paschal Hymns: Kitâb Ṭaruḥât al-Baskhah al-Muḳaddasah, Old Cairo, 1914',
      innerHTML: [
        'Father Fīlūt̲āʾus al-Maqqārī, &amp; Cantor Mīḫāʾīl Ǧirǧis. (1914). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/4258076" rel="noreferrer noopener" target="_blank">Kitāb Ṭuruḥāt al-Basḫah al-Muqaddasah al-Mustaʿmal Tilāwatuhā fī Sāʾir Kanāʾis al-Karāzah al-Marqusiyyah</a></em> [كتاب طرحات البسخة المقدسة المستعمل تلاوتها في ساير كنائس الكرازة المرقسية]. Old Cairo: St. Macarius Press.',
      ],
    },
    variants: ['PasH'],
  },
  {
    source: {
      title: 'ⲡⲓϫⲱⲙ ⲛⲧⲉ ⲡⲓⲡⲁⲥⲭⲁ ⲉⲑ︦ⲃ︦, Cairo, 1921 (cf PO xxiv)',
      innerHTML: [
        '(n.d.) <em><a href="https://coptic-treasures.com/book/%D9%83%D8%AA%D8%A7%D8%A8-%D8%A7%D9%84%D8%A8%D8%B5%D8%AE%D8%A9-%D8%A3%D9%85%D8%B1-%D8%A8%D8%B7%D8%A8%D8%B9%D8%A9-%D8%A7%D9%84%D8%A8%D8%A7%D8%A8%D8%A7-%D8%B4%D9%86%D9%88%D8%AF%D8%A9/" rel="noreferrer noopener" target="_blank">ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ⲡⲓⲡⲁⲥⲭⲁ ⲉ̀ⲑⲟⲩⲁⲃ ⲫⲏⲉⲧϣⲉⲙϣⲓ ⲓⲥϫⲉⲛ ⲡⲓⲉ̀ϩⲟⲟⲩ ⲛ̀ϯⲕⲩⲣⲓⲁ̀ⲕⲏ ⲛ̀ⲧⲉ ⲡⲓⲉⲩⲗⲟⲅⲓⲙⲉⲛⲟⲥ ϣⲁⲡ̀ϫⲱⲛⲉ̀ⲃⲟⲗ ⲙ̀ⲡⲓϣⲁⲓ ⲛ̀ϯⲁ̀ⲛⲁⲥⲧⲁⲥⲓⲥ ⲉⲧⲥ̀ⲙⲁⲣⲱⲟⲩⲧ ⲕⲁⲧⲁ ⲧⲁⲝⲓⲥ ⲛ̀ϯⲉⲕⲕ̀ⲗⲏⲥⲓⲁ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ ⲛ̀ⲟⲣⲑⲟⲇⲟⲝⲟⲥ –كتاب البصخة المقدسة: الذي يخدم من يوم احد الشعانين الى نهاية عيد القيامة المجيد حسب ترتيب الكنيسة القبطية الارثوذكسية</a></em>, printed by order of Pope Shenouda III. Anba Waris Press. [This appears to be a reprint of the edition cited by Crum, possibly originally edited by Claudius Y. Labib]',
      ],
    },
    variants: ['PasLect'],
  },
  {
    source: {
      // NOTE: Listed as 'P. Beatty', but seemingly never cited as such!
      title:
        'Papyri in collection of Mr. Chester Beatty, London (Crum’s copies)',
    },
    variants: ['P Beatty'],
  },
  {
    source: {
      title:
        'Coptic legal papyrus olim penes Sir E. A. W. Budge (Crum’s copy), now at Columbia University',
    },
    variants: ['PBu'],
  },
  {
    source: {
      title:
        'Papyrus grecs d’ époque byzantine, ed. J. Maspero (Catal. Gén. Musée du Caire, 1911 ff.)',
      innerHTML: [
        'Maspero, J. (1911). <em><a href="https://archive.org/details/papyrusgrecsdp01masp/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Papyrus grecs d’ époque byzantine, Tome I</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 67001-67124). Le Caire: Impr. de l’Institut français d’archéologie orientale.',
        'Maspero, J. (1913). <em><a href="https://archive.org/details/papyrusgrecsdp02masp/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Papyrus grecs d’ époque byzantine, Tome II</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 67125-67278). Le Caire: Impr. de l’Institut français d’archéologie orientale.',
        'Maspero, J. (1916). <em><a href="https://archive.org/details/papyrusgrecsdp03masp/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Papyrus grecs d’ époque byzantine, Tome III</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 67279-67359). Le Caire: Impr. de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['PCai'],
  },
  {
    source: {
      title: 'Two medical papyri penes E. Chassinat',
    },
    variants: ['PChass'],
  },
  {
    source: {
      title:
        'Papyruscodex saec. vi-vii… Cheltenham, ed. Crum, 1915, acc to pp. of printed book',
      innerHTML: [
        'Crum, W. E. (1915). <em><a href="https://archive.org/details/derpapyruscodexs00crum/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Der Papyruscodex saec. VI-VII der Phillippsbibliothek in Cheltenham: Koptische theologische Schriften</a></em>. Strassburg: Karl J. Trübner.',
      ],
    },
    variants: ['Pcod'],
  },
  {
    source: {
      // TODO: (#545) Name doesn't make sense when it appears on its own!
      title: 'fayyûmic text of same, ed. W. Erichsen (Danish Acad., 1932)',
      innerHTML: [
        'Erichsen, W. (1932). <em><a href="https://archive.org/details/faijumischefragm0000agat/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Faijumische Fragmente der Reden des Agathonicus Bischofs von Tarsus</a></em>. (Det Kgl. Danske Videnskabernes Selskab, Historisk-filologiske Meddelelser, XIX, 1). København: Andr. Fred. Høst &amp; søn.',
      ],
    },
    variants: ['PcodF'],
  },
  {
    source: {
      // NOTE: Listed as 'PcodMor'!
      title:
        'Mr. Pierpont Morgan’s papyrus volume of Psalms &c. (H. Thompson’s copy)',
    },
    variants: ['Pcod Mor'],
  },
  {
    source: {
      title: 'Papyri at Columbia University, New York (A. Schiller’s copies)',
    },
    variants: ['PCol'],
  },
  {
    source: {
      title: 'A. Peyron, Lexicon Linguae Copticae, 1835',
      innerHTML: [
        'Peyron, A. (1835). <em><a href="https://archive.org/details/lexiconlinguaeco00peyr/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">Lexicon linguæ Copticæ</a></em>. Taurini: Ex Regio Typographeo.',
      ],
    },
    variants: ['Pey'],
  },
  {
    source: {
      title: 'Migne’s Patrologia, Series Graeca',
      innerHTML: [
        'Migne, J.-P. (Ed.). (1857-1886). <em>Patrologiae cursus completus, Series Graeca</em> (161 vols.). Paris. All volumes are linked on <a href="https://patristica.net/graeca/" rel="noreferrer noopener" target="_blank">Patristica.net</a> and <a href="https://www.roger-pearse.com/weblog/patrologia-graeca-pg-pdfs/" rel="noreferrer noopener" target="_blank">Roger Pearse’s blog</a>. ',
      ],
    },
    variants: ['PG'],
  },
  {
    source: {
      title: 'magical papyrus in University Library, Geneva (photograph)',
    },
    variants: ['PGen'],
  },
  {
    source: {
      title: 'Papyri Graecae Magicae, ed. K. Preisendanz I, II, 1928, 1931',
      innerHTML: [
        'Preisendanz, K. (1928). <em><a href="https://digi.ub.uni-heidelberg.de/diglit/heidhs3763IIA-51bd1" rel="noreferrer noopener" target="_blank">Papyri Graecae Magicae: Die griechischen Zauberpapyri</a></em>, Band I. Leipzig: B. G. Teubner.',
        'Preisendanz, K. (1931). <em><a href="https://digi.ub.uni-heidelberg.de/diglit/heidhs3763IIA-51bd2" rel="noreferrer noopener" target="_blank">Papyri Graecae Magicae: Die griechischen Zauberpapyri</a></em>, Band II. Leipzig: B. G. Teubner.',
      ],
    },
    variants: ['PGM'],
  },
  {
    source: {
      title:
        'Papyri formerly in W. Golenischeff’s collection, from photographs sent by O. von Lemm',
    },
    variants: ['PGol'],
  },
  {
    source: {
      title: 'Papyri (6th c.) thence, Cairo Mus. (Lacau’s copies)',
    },
    variants: ['PJkôw'],
  },
  {
    source: {
      title: 'Papyri belonging to N. P. Lichatschev (P. Jernstedt’s copies)',
    },
    variants: ['PLich'],
  },
  {
    source: {
      title: 'Greek Papyri in British Museum, ed. Kenyon & Bell, acc. to pp',
      innerHTML: [
        'Kenyon, F. G. (1893). <em><a href="https://archive.org/details/greekpapyriinbri01brit/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Greek Papyri in the British Museum: Catalogue with Texts</a></em>, Vol. I. London: British Museum.',
        'Kenyon, F. G. (1898). <em><a href="https://archive.org/details/greekpapyriinbri02brit/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Greek Papyri in the British Museum: Catalogue with Texts</a></em>. Vol. II. London: British Museum.',
        'Kenyon, F. G., &amp; Bell, H. I. (1907). <em><a href="https://archive.org/details/greekpapyriinbri03brit/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Greek Papyri in the British Museum: Catalogue with Texts</a></em>. Vol. III. London: British Museum.',
        'Bell, H. I., (1910). <em><a href="https://archive.org/details/greekpapyriinbri04brit/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Greek Papyri in the British Museum: Catalogue with Texts</a></em>, Vol. IV: <em>The Aphrodito Papyri</em> (with an appendix of Coptic Papyri edited by W. E. Crum). London: British Museum.',
        'Bell, H. I. (1917). <em><a href="https://archive.org/details/greekpapyriinbri05brit/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Greek Papyri in the British Museum: Catalogue with Texts</a></em>. Vol. V. London: British Museum.',
      ],
    },
    variants: ['PLond'],
  },
  {
    source: {
      title:
        'Un Papyrus Medical Copte, ed. E. Chassinat (= MIF. 32), 1921, acc. to pp',
      innerHTML: [
        'Chassinat, É. (1921). <em><a href="https://archive.org/details/MIFAO32/mode/2up" rel="noreferrer noopener" target="_blank">Un papyrus médical copte</a></em>. (Mémoires publiés par les membres de l’ Institut français d’archéologie orientale du Caire, Tome 32). Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['PMéd'],
  },
  {
    source: {
      title:
        'Papyri at Michigan University, with year of acquisition where no. not ascertained',
    },
    variants: ['PMich'],
  },
  {
    source: {
      title:
        'Byzantinische Papyri… zu München, ed. Heisenberg & Wenger, 1914, acc. to pp',
      innerHTML: [
        'Heisenberg, A., &amp; Wenger, L. (1914). <em><a href="https://archive.org/details/mdp.39015010705187/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Byzantinische Papyri in der Königlichen Hof- und Staatsbibliothek zu München</a></em>. (Veröffentlichungen aus der Papyrus-Sammlung der Königlichen Hof- und Staatsbibliothek zu München, Band I: Byzantinische Papyri). Leipzig: B. G. Teubner.',
      ],
    },
    variants: ['PMon'],
  },
  {
    source: {
      title: 'rest of papyrus ed. V. Loret, Rec 16 103 (Kuentz’s copy)',
    },
    variants: ['PNolot'],
  },
  {
    source: {
      title: 'Patrologia Orientalis',
      innerHTML: [
        '<em>Patrologia Orientalis</em> was first published in 1907. Many volumes, especially early volumes, linked on <a href="https://www.roger-pearse.com/weblog/patrologia-orientalis-po-pdfs/" rel="noreferrer noopener" target="_blank">Roger Pearse’s blog</a> and <a href="https://www.tertullian.org/fathers/patrologia_orientalis_toc.htm" rel="noreferrer noopener" target="_blank">Tertullian.org</a>. ',
      ],
    },
    variants: ['PO'],
  },
  {
    source: {
      title: 'Oxyrhynchus Papyri, ed. Grenfell & Hunt',
      innerHTML: [
        '<em>The Oxyrhynchus papyri</em> is an ongoing series first published in 1898 and edited by Bernard P. Grenfell and Arthur S. Hunt. The earliest volumes are available on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=ocyrhynchus" rel="noreferrer noopener" target="_blank">The Online Books Page</a> with further volumes on <a href="https://catalog.hathitrust.org/Record/000051960" rel="noreferrer noopener" target="_blank">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['P Oxy'],
  },
  {
    source: {
      title:
        'Papyri in the Rainer Collection (Staatsbibl.), Vienna (Till’s copies), more often as Vi',
    },
    variants: ['PRain'],
  },
  {
    source: {
      title: 'F. Preisigke, Namenbuch, 1922',
      innerHTML: [
        'Preisigke, F. (1922). <em><a href="https://archive.org/details/namenbuch00prei/page/n4/mode/2up" rel="noreferrer noopener" target="_blank">Namenbuch. Enthaltend alle griechischen, lateinischen, ägyptischen, hebräischen, arabischen und sonstigen semitischen und nichtsemitischen Menschennamen, soweit sie in griechischen Urkunden (Papyri, Ostraka, Inschriften, Mumienschildern u.s.w.) Ägyptens sich vorfinden</a></em>. Heidelberg: Selbstverlag des Herausgebers.',
      ],
    },
    variants: ['Preisigke'],
  },
  {
    source: {
      title: 'Pistis Sophia, ed. C. Schmidt (= Coptica II), 1925',
      innerHTML: [
        'Schmidt, C. (1925). <em><a href="https://archive.org/details/CarlSchmidtPistisSophia1925Teil1/Carl%20Schmidt%2C%20Pistis%20Sophia%201925%2C%20Teil1/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Pistis Sophia</a></em>. (Coptica consilio et impensis Instituti Rask-Oerstediani edita, II). Hauniae: Gyldendalske Boghandel-Nordisk Forlag.',
      ],
    },
    variants: ['PS'],
  },
  {
    source: {
      title: 'Proceedings of Soc. of Biblical Archaeology',
      innerHTML: [
        '<em>Proceedings of the Society of Biblical Archæology</em> began in 1879. The first 30 volumes are linked on <a href="http://archives.getty.edu:30008/getty_images/digitalresources/serials/103990.html" rel="noreferrer noopener" target="_blank">The Getty Research Institute Research Library Catalogue</a>. More volumes available on <a href="https://catalog.hathitrust.org/Record/007887358" rel="noreferrer noopener" target="_blank">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['PSBA'],
  },
  {
    source: {
      title: 'Papyri in University Library, Strassburg (Crum’s copies, 1912)',
    },
    variants: ['PStras'],
  },
  {
    source: {
      title: 'Papyri in Staatsbibliothek, Vienna (Till’s copies)',
    },
    variants: ['PVi'],
  },
  {
    source: {
      title:
        'I Papiri Copti… di Torino, ed. F. Rossi, acc. to volume, fascicule & page',
      innerHTML: [
        'Rossi, F. (1887). <em>I Papiri Copti del Museo Egizio di Torino</em>, Vol. I (five fascicles). Torino: Ermanno Loescher. The five fascicles of this volume available on <a href="https://alinsuciu.com/2012/01/27/rossis-edition-of-the-coptic-papyrus-codices-in-the-egyptian-museum-in-turin-1/" rel="noreferrer noopener" target="_blank">Alin Suciu’s blog</a>. ',
        'Rossi, F. (1892). <em><a href="https://www.google.co.uk/books/edition/I_papiri_copti_del_Museo_egizio_di_Torin/lxEZAAAAYAAJ?hl=en&amp;gbpv=1&amp;pg=PP9&amp;printsec=frontcover" rel="noreferrer noopener" target="_blank">I Papiri Copti del Museo Egizio di Torino</a></em>. Vol. II (four fascicles). Torino: Ermanno Loescher.',
      ],
    },
    variants: ['R'],
  },
  {
    source: {
      title: 'E. Revillout, Actes et Contrats… de Boulaq et du Louvre, 1876',
      innerHTML: [
        'Revillout, E. (1876). <em><a href="https://archive.org/details/umn.319510016716448/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Papyrus coptes. Actes et contrats des Musées égyptiens de Boulaq et du Louvre: Textes et fac-similés.</a></em> (Études Égyptologiques, 50). Paris: F. Vieweg.',
      ],
    },
    variants: ['RAC'],
  },
  {
    source: {
      title:
        'F. Rossi, Alcuni MSS. Copti… di Torino (= Memorie… Torino, ser. ii, tom. xliii), acc. to pp. of separate publication',
      innerHTML: [
        'Rossi, F. (1893). <em><a href="https://babel.hathitrust.org/cgi/pt?id=mdp.39015024258538&amp;seq=7" rel="noreferrer noopener" target="_blank">Di alcuni manoscritti copti che si conservano nella Biblioteca Nazionale di Torino</a></em>. (Estratto dalle <em>Memorie della Reale Accademia delle Scienze di Torino</em>, Ser. II, Vol. 44). Torino: Carlo Clausen.',
      ],
    },
    variants: ['RAl'],
  },
  {
    source: {
      title: 'Recueil d’Études… J. F. Champollion, 1922',
      innerHTML: [
        '(1922). <em><a href="https://archive.org/details/in.ernet.dli.2015.291952/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Recueil d’études égyptologiques dédiées à la mémoire de Jean-François Champollion à l’occasion du centenaire de la Lettre à M. Dacier relative à l’alphabet des hiéroglyphes phonétiques lue à l’Académie des Inscriptions et Belles-Lettres le 27 septembre 1922</a></em>. Paris: Librairie Ancienne Honoré Champion, Édouard Champion.',
      ],
    },
    variants: ['RChamp'],
  },
  {
    source: {
      title: 'Revue Égyptologique',
      innerHTML: [
        '<em>Revue égyptologique</em> began in 1880 and was published until 1914 (14 volumes). A new series began in 1919/20 and continued until 1924 (2 volumes). From 1925 it was replaced by <em>Revue de l’Égypte ancienne</em>. All volumes are available on the <a href="https://digi.ub.uni-heidelberg.de/diglit/revue_egyptologique" rel="noreferrer noopener" target="_blank">Heidelberg digital library</a>. ',
      ],
    },
    variants: ['RE'],
  },
  {
    source: {
      title: 'Recueil de Travaux &c',
      innerHTML: [
        '<em>Recueil de travaux relatifs à la philologie et à l’ archéologie égyptiennes et assyriennes: pour servir de bullletin à la Mission Française du Caire</em> began in 1870 and continued until 1923 (40 volumes). All volumes are available on the <a href="https://digi.ub.uni-heidelberg.de/diglit/rectrav" rel="noreferrer noopener" target="_blank">Heidelbery digital library</a>. ',
      ],
    },
    variants: ['Rec'],
  },
  {
    source: {
      title: 'MSS. & copies belonging to Seymour de Ricci (Crum’s copies)',
    },
    variants: ['Ricci'],
  },
  {
    source: {
      title:
        'F. Rossi, Un Nuovo Cod. Copto (Memorie Accad. Lincei, 1893), acc. to pp. of separate publication',
      innerHTML: [
        'Rossi, F. (1893). <em><a href="https://www.google.co.uk/books/edition/Un_nuovo_codice_copto_del_Museo_Egizio_d/64GEtkCSqXkC?hl=en&amp;gbpv=1&amp;pg=PA1&amp;printsec=frontcover" rel="noreferrer noopener" target="_blank">Un nuovo codice copto del Museo Egizio di Torino contenente la vita di S. Epifanio ed i martiri di S. Pantaleone, di Ascla, di Apollonio, di Filemone, di Ariano e di Dios con versetti di vari capitoli del “Libro di Giobbe”</a> (Reale Accademia dei Lincei)</em>. Roma: Accademia dei Lincei.',
      ],
    },
    variants: ['RNC'],
  },
  {
    source: {
      title: 'Revue de l’Orient Chrétien, acc. to vol',
      innerHTML: [
        '<em>Revue de l’Orient Chrétien</em> began in 1896 and continued until 1935-36 (30 volumes). All the volumes are available via <a href="https://ancientworldonline.blogspot.com/2012/10/opean-access-journal-revue-de-lorient.html" rel="noreferrer noopener" target="_blank">The Ancient World Online</a>. ',
      ],
    },
    variants: ['ROC'],
  },
  {
    source: {
      title:
        'F. Rösch, Vorbemerkungen zu e. Gramm. d. achmîmischen Mundart, 1909, acc. to pp',
      innerHTML: [
        'Rösch, F. (1909). <em><a href="https://catalog.hathitrust.org/Record/001854607" rel="noreferrer noopener" target="_blank">Vorbemerkungen zu einer Grammatik der achmimischen Mundart</a></em>. Inaugural-Dissertation. Strassburg: Schlesier &amp; Schweikhardt. [Available on HathiTrust via US access.]',
      ],
    },
    variants: ['Rösch'],
  },
  {
    source: {
      title:
        'Catal. of Coptic MSS. in John Rylands Library, 1909, acc. to numbers',
      innerHTML: [
        'Crum, W. E. (1909). <em><a href="https://archive.org/details/cu31924099175329/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Catalogue of the Coptic Manuscripts in the Collection of the John Rylands Library, Manchester</a></em>. Manchester: University Press.',
        'Crum, W. E. (1918–1920). <a href="https://luna.manchester.ac.uk/luna/servlet/detail/Manchester~25~25~702~196480:New-Coptic-manuscripts-in-the-John-?sort=image_number%2Cimage_sequence_number&amp;qvq=q:escholar005294.pdf;sort:image_number%2Cimage_sequence_number;lc:Manchester~25~25&amp;mi=0&amp;trs=1" rel="noreferrer noopener" target="_blank">New Coptic Manuscripts in the John Rylands Library</a>. <em>Bulletin of the John Rylands Library</em>, 5, pp. 497–503. ',
      ],
    },
    variants: ['Ryl'],
    postfixes: ['Dem'],
  },
  {
    source: {
      // TODO: (#545) Name doesn't make sense when it appears on its own!
      title: 'MSS. acquired since publication of catalogue (cf Ryl Bull. 5)',
      innerHTML: [
        'Crum, W. E. (1909). <em><a href="https://archive.org/details/cu31924099175329/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">Catalogue of the Coptic Manuscripts in the Collection of the John Rylands Library, Manchester</a></em>. Manchester: University Press.',
        'Crum, W. E. (1918–1920). <a href="https://luna.manchester.ac.uk/luna/servlet/detail/Manchester~25~25~702~196480:New-Coptic-manuscripts-in-the-John-?sort=image_number%2Cimage_sequence_number&amp;qvq=q:escholar005294.pdf;sort:image_number%2Cimage_sequence_number;lc:Manchester~25~25&amp;mi=0&amp;trs=1" rel="noreferrer noopener" target="_blank">New Coptic Manuscripts in the John Rylands Library</a>. <em>Bulletin of the John Rylands Library</em>, 5, pp. 497–503. ',
      ],
    },
    variants: ['RylSuppl'],
  },
  {
    source: {
      title: 'Kitâb aṣ-Ṣalîb, Cairo, 1921',
      innerHTML: [
        'Father Fīlūṯāʾus al-Maqqārī, Father Barnābā al-Baramūsī, &amp; Father Iqlādiyūs Jirjis. (1921). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3198124" rel="noreferrer noopener" target="_blank">Kitāb Dawrat ʿĪday al-Ṣalīb wa-l-Šaʿānīn wa-Ṭarūḥāt al-Ṣawm al-Kabīr wa-l-Ḫamsīn: ḥasaba Tartīb al-Kanīsa al-Qibṭiyyah al-Urṯūḏuksiyyah al-Marqusiyyah</a></em> [كتاب دورة عيدي الصليب والشعانين وطروحات الصوم الكبير والخمسين: حسب ترتيب الكنيسة القبطية الارثوذكسية المرقسية]. Old Cairo: St. Macarius Press.',
      ],
    },
    variants: ['Salîb'],
  },
  {
    source: {
      title:
        'Coptic texts ed. by H. Thompson in Quibell’s Excavations at Saqqara, 1909, 1912',
      innerHTML: [
        'Quibell, J. E. (1909). <em><a href="https://archive.org/details/cu31924028671265/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Excavations of Saqqara (1907-1908) with Sections by Sir Herbert Thompson and Prof. W. Spiegelberg</a></em>. Le Caire: Imprimerie de l’ Institut français d’archéologie orientale.',
        'Quibell, J. E. (1912). <em><a href="https://archive.org/details/cu31924028671273/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Excavations of Saqqara (1908-9, 1909-10): The Monastery of Apa Jeremias (The Coptic Inscriptions edited by Sir Herbert Thompson)</a></em>. Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['Saq'],
  },
  {
    source: {
      title:
        'G. Steindorff, Koptische Grammatik², acc. to §§, or information from him',
      innerHTML: [
        'Steindorff, G. (1904). <em><a href="https://archive.org/details/koptischegrammat00stei/page/n9/mode/2up" rel="noreferrer noopener" target="_blank">Koptische Grammatik mit Chrestomathie, Wörterverzeichnis und Literatur. Zweite gänzlich umgearbeitete Auflage</a></em>. Berlin: Reuther &amp; Reichard.',
      ],
    },
    variants: ['Sdff'],
  },
  {
    source: {
      title:
        'works of Shenoute (& of his disciple Besa). Prefixed to all quotations from their writings (doubtfully to Mor 54)',
      // NOTE: Besa occurs as a standalone abbreviation in Crum, but we treat it
      // as a variant to simplify the pipeline.
    },
    variants: ['Sh', 'Besa'],
    postfixes: [
      'BM',
      'BMOr',
      'Berl Or',
      'Bor',
      'C',
      'Cai',
      'ClPr',
      'Ep',
      'HT',
      'IF',
      'LMis',
      'Leyd',
      'MIF',
      'Mich',
      'Miss',
      'P',
      'R',
      'RE',
      'Rec',
      'Ryl',
      'ViK',
      'Wess',
      'Z',
    ],
  },
  {
    source: {
      title: 'G. P. G. Sobhy, Le Martyre de St. Hélias, Cairo, 1919',
      innerHTML: [
        'Sobhy, G. P. G. (1919). <em><a href="https://archive.org/details/lemartyredesaint00sobhuoft/page/n10/mode/2up" rel="noreferrer noopener" target="_blank">Le martyre de Saint Hélias et l’encomium de l’évêque Stéphanos de Hnès sur Saint Hélias</a></em>. (Bibliothèque d’Études coptes, Tome I). Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['SHel'],
  },
  {
    source: {
      title: 'information supplied by Dr. G. P. G. Sobhy, Cairo',
    },
    variants: ['Sobhy'],
  },
  {
    source: {
      title: 'W. Spiegelberg, Koptisches Handwörterbuch, 1921',
      innerHTML: [
        'Spiegelberg, W. (1921). <em><a href="https://archive.org/details/koptischeshandworterbuch/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Koptisches Handwörterbuch</a></em>. Heidelberg: Carl Winters Universitätsbuchhandlung.',
      ],
    },
    variants: ['Spg'],
  },
  {
    source: {
      title: 'Sphinx (periodical)',
      innerHTML: [
        '<em>Sphinx: revue critique embrassant le domaine entier de l’égyptologie</em> began in 1897 and continued until 1925 (22 volumes). All volumes are listed and available digitised on <a href="https://www.persee.fr/collection/sphin" rel="noreferrer noopener" target="_blank">Persee.fr</a>. ',
      ],
    },
    variants: ['Sph'],
  },
  {
    source: {
      title: 'Crum, Short Texts from Coptic Ostraca & Papyri, 1921',
      innerHTML: [
        'Crum, W. E. (1921). <em><a href="https://archive.org/details/shorttextsfromco00crum/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Short Texts from Coptic Ostraca and Papyri</a></em>. Oxford University Press.',
      ],
    },
    variants: ['ST', 'St'],
  },
  {
    source: {
      title:
        'Kopt. Zaubertexte, ed. V. Stegemann (Sitz. d. Heidelb. Akad., 1934)',
      innerHTML: [
        'Stegemann, V. (1934). <em><a href="https://oi-idb-static.uchicago.edu/multimedia/2387/stegemann_koptischen_zaubertexte.pdf" rel="noreferrer noopener" target="_blank">Die koptischen Zaubertexte der Sammlung Papyrus Erzherzog Rainer in Wien</a></em>. (Sitzungsberichte der Heidelberger Akademie der Wissenschaften. Philosophisch-historische Klasse, Jahrgang 1933/34, 1. Abhandlung). Heidelberg: Carl Winters Universitätsbuchhandlung.',
      ],
    },
    variants: ['Stegemann'],
  },
  {
    source: {
      title: 'L. Stern, Koptische Grammatik, acc. to §§',
      innerHTML: [
        'Stern, L. (1880). <em><a href="https://archive.org/details/koptischegrammat00ster/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Koptische Grammatik</a></em>. Leipzig: T. O. Weigel.',
      ],
    },
    variants: ['Stern'],
  },
  {
    source: {
      title: 'Synaxarium Alexandrinum, ed. J. Forget (CSCO.), 1905, 1912',
      innerHTML: [
        'Forget, I. (1905). <em><a href="https://archive.org/details/synaxariumalexan0047copt" rel="noreferrer noopener" target="_blank">Synaxarium Alexandrinum, I, 1</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 47. Scriptores Arabici, Tomus 3). Beryti: E Typographeo Catholico. Republished: 1954, Louvain: Imprimerie Orientaliste L. Durbecq.',
        'Forget, I. (1912). <em><a href="https://archive.org/details/synaxariumalexan0000copt/page/n363/mode/2up" rel="noreferrer noopener" target="_blank">Synaxarium Alexandrinum, II</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 67. Scriptores Arabici, Tomus 11). Beryti: E Typographeo Catholico. Republished: 1954, Louvain: Imprimerie Orientaliste L. Durbecq.',
      ],
    },
    variants: ['Synax'],
  },
  {
    source: {
      title: 'H. Tattam, Lexicon Aegyptiaco-Latinum, 1835',
      innerHTML: [
        'Tattam, H. (1835). <em><a href="https://archive.org/details/lexicongyptiaco01tattgoog/page/n10/mode/2up" rel="noreferrer noopener" target="_blank">Lexicon Ægyptiaco-Latinum ex Veteribus Linguæ Ægyptiacæ Monumentis, et ex Operibus La Crozii, Woidii, et aliorum Summo Studio Congestum cum Indice Vocum Latinarum</a></em>. Oxonii: E Typographeo Academico.',
      ],
    },
    variants: ['Tatt'],
  },
  {
    source: {
      title: 'Tuki, Diurnum Alexandrinum, 1750',
      innerHTML: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1750). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/244155" rel="noreferrer noopener" target="_blank">ⲟⲩϫⲱⲙ ⲛ̀ⲧⲉ ⲛⲓⲉⲩⲭⲏ ⲙ̀ⲡⲓⲉ̀ϩⲟⲟⲩ ⲛⲉⲙ ⲡⲓⲉ̀ϫⲱⲣϩ ⲛ̀ⲍ︦ — كتاب الصلوات النهارية والليلية السبعة</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['TDi'],
  },
  {
    source: {
      // NOTE: In Crum's list, this appears as ‘do., Pontificale et Euchologium,
      // 1761’.
      title: 'Tuki, Pontificale et Euchologium, 1761',
      innerHTML: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1761). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/121458" rel="noreferrer noopener" target="_blank">ⲡⲓϫⲱⲙ ⲉϥⲉⲣⲁⲡⲁⲛⲧⲟⲕⲧⲓⲛ ⲉ̀ϫⲉⲛ ⲛⲓⲉⲩⲭⲏ ⲉⲑⲟⲩⲁⲃ ⲡⲓⲙⲉⲣⲟⲥ ⲛ̀ϩⲟⲩⲓⲧ ⲉⲑⲃⲉ ⲛⲓϫⲓⲛⲫⲱϣ ⲛ̀ⲛⲏ ⲉⲧⲁⲩⲥⲱⲧⲡ ⲛ̀ⲛⲓⲧⲱⲧⲉⲣ ⲛ̀ⲕⲗⲏⲣⲓⲕⲟⲥ ⲛⲉⲙ ⲛⲓⲟⲩⲏⲃ ⲛⲉⲙ ⲡⲓⲥⲙⲟⲩ ⲛ̀ⲧⲉ ⲛⲓϩⲃⲱⲥ ⲙ̀ⲙⲟⲛⲁⲭⲟⲥ ⲛⲉⲙ ⲡⲓⲉⲛⲓⲑⲣⲟⲛⲓⲥⲙⲟⲥ ⲛ̀ⲧⲉ ⲡⲓⲉⲡⲓⲥⲕⲟⲡⲟⲥ ⲛⲉⲙ ⲡⲓⲁⲅⲓⲁⲥⲙⲟⲥ ⲙ̀ⲙⲩⲣⲟⲛ ⲛⲉⲙ ϯⲉⲕⲕⲗⲏⲥⲓⲁ –كتاب يشتمل على الصلوات المقدسة الجزء الاول لاجل رسامات المختارين لدرجات اهل الاكليروس والكهنة وتبريك ثياب الرهبان وتقديس الميرون والكنيسة</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['TEuch'],
  },
  {
    source: {
      title: 'W. Till, Achmîmisch-Kopt. Grammatik, 1928, acc. to §§',
      innerHTML: [
        'Till, W. (1928). <em><a href="https://archive.org/details/achmmischkoptisc0000till/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Achmîmisch-Koptische Grammatik</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['Till'],
  },
  {
    source: {
      // NOTE: Listed as '— Bau'!
      title: 'Eine Kopt. Bauernpraktik (Mitt. d. deut. Inst. Kairo, vi, 1936)',
      innerHTML: [
        'Till, W. (1936). <a href="https://archive.org/details/egyptology-archive-vol.-6-1935/page/108/mode/2up" rel="noreferrer noopener" target="_blank">Eine koptische Bauernpraktik</a>. <em>Mitteilungen des Deutschen Archäologischen Instituts Kairo</em>, 6, pp. 108–114. ',
      ],
    },
    variants: ['Till Bau'],
  },
  {
    source: {
      // NOTE: Listed as '— Oster'!
      title:
        'Osterbrief u. Predigt in achm. Dialekt, Vienna, 1931 (at first as Vi 10157)',
      innerHTML: [
        'Till, W. (1931). <em><a href="https://hdl.handle.net/2027/nyp.33433096174176?urlappend=%3Bseq=465%3Bownerid=120012808-493" rel="noreferrer noopener" target="_blank">Osterbrief und Predigt im achmimischen Dialekt</a></em>. (Studien zur Epigraphik und Papyruskunde, Band II, Schrift 1.) Leipzig: J. C. Hinrichs’sche Buchhandlung. [via US access only]',
      ],
    },
    variants: ['Till Oster'],
  },
  {
    source: {
      title:
        'Coptic Ostraca, ed. H. Thompson in Theban Ostraca… Toronto (University of Toronto Studies), 1913, acc. to numbers',
      innerHTML: [
        'Gardiner, A. H., Thompson, H., &amp; Milne, J. G. (Eds.). (1913). <em><a href="https://archive.org/details/thebanostracaedi00royauoft/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Theban Ostraca Edited from the Originals, Now Mainly in the Royal Ontario Museum of Archaeology, Toronto, and the Bodleian Library, Oxford</a></em>. (University of Toronto Studies). London: Humphrey Milford.',
      ],
    },
    variants: ['Tor'],
  },
  {
    source: {
      title: 'Lemm, Das Triadon, 1903, acc. to stanzas',
      innerHTML: [
        'Lemm, O. von. (1903). <em><a href="https://digi.ub.uni-heidelberg.de/diglit/lemm1903bd1" rel="noreferrer noopener" target="_blank">Das Triadon: Ein sahidisches Gedicht mit arabischer Übersetzung. Band 1, Text</a></em>. St.-Pétersbourg: Académie Impériale des Sciences.',
      ],
    },
    variants: ['Tri'],
  },
  {
    source: {
      title: 'Tuki, Rituale, 1763',
      innerHTML: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1763). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/232309" rel="noreferrer noopener" target="_blank">ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ϯⲙⲉⲧⲣⲉϥϣⲉⲙϣⲓ ⲛ̀ⲛⲓⲙⲩⲥⲧⲏⲣⲓⲟⲛ ⲉⲑ︤ⲩ︥ ⲛⲉⲙ ϩⲁⲛϫⲓⲛϩⲏⲃⲓ ⲛ̀ⲧⲉ ⲛⲓⲣⲉϥⲙⲱⲟⲩⲧ ⲛⲉⲙ ϩⲁⲛϫⲓⲛϩⲱⲥ ⲛⲉⲙ ⲡⲓⲕⲁⲧⲁⲙⲉⲣⲟⲥ ⲛ̀ⲁⲃⲟⲧ — كتاب خدمة الاسرار المقدسة وتجاذيز الموتي والهوسات والقطمارس الشهري</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['TRit'],
  },
  {
    source: {
      title: 'Transactions of the Soc. of Bibl. Archaeology',
      innerHTML: [
        '<em>Transactions of the Society of Biblical Archæology</em> began in 1872 and continued until 1893 (9 volumes). All volumes available on the <a href="https://www.digitale-sammlungen.de/en/search?filter=volumes%3A%22bsb11183747%2FBV002563052%22" rel="noreferrer noopener" target="_blank">Münchener DigitalisierungsZentrum Digitale Bibliothek</a>. ',
      ],
    },
    variants: ['TSBA'],
  },
  {
    source: {
      title: 'I. Guidi, Testo copto del Testam. di Abramo &c. (= ALR, 1900)',
      innerHTML: [
        'Guidi, I. (1900). <a href="http://periodici.librari.beniculturali.it/visualizzatore.aspx?anno=1900&amp;ID_testata=30&amp;ID_periodico=9057" rel="noreferrer noopener" target="_blank">Il testo copto del testamento di Abramo</a>. <em>Rendiconti della Reale Accademia dei Lincei. Classe di Scienze Morali, Storiche e Filologiche</em>, Ser. 5, 9(3–4), pp. 157–180. ',
        'Guidi, I. (1900). <a href="http://periodici.librari.beniculturali.it/visualizzatore.aspx?anno=1900&amp;ID_testata=30&amp;ID_periodico=9057" rel="noreferrer noopener" target="_blank">Il testamento di Isacco e il testamento di Giacobbe</a>. <em>Rendiconti della Reale Accademia dei Lincei. Classe di Scienze Morali, Storiche e Filologiche</em>, Ser. 5, 9(3–4), pp. 223-264. ',
      ],
    },
    variants: ['TstAb'],
  },
  {
    source: {
      title: 'Crum, Theolog. Texts from Coptic Papyri, 1913',
      innerHTML: [
        'Crum, W. E. (1913). <em><a href="https://archive.org/details/cu31924029634262/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Theological Texts from Coptic Papyri Edited with an Appendix upon the Arabic and Coptic Versions of the Life of Pachomius</a></em>. (Anecdota Oxoniensia: Texts, Documents, and Extracts Chiefly from Manuscripts in the Bodleian and Other Oxford Libraries. Semitic Series, Part XII). Oxford: Clarendon Press.',
      ],
    },
    variants: ['TT'],
  },
  {
    source: {
      title: 'Tuki, Theotokia, 1764',
      innerHTML: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1763). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/230285" rel="noreferrer noopener" target="_blank">ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ⲛⲓⲑⲉⲟⲧⲟⲕⲓⲁ ⲛⲉⲙ ⲕⲁⲧⲁⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲁⲃⲟⲧ ⲭⲟⲓⲁⲕ — كتاب الثاودوكيات وكترتيب شهر كيهك</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['TThe'],
  },
  {
    source: {
      title:
        'Gebhardt, Harnack & C. Schmidt, Texte u. Untersuchungen (Bd. 43 Gespräche Jesu)',
      innerHTML: [
        'Schmidt, C. (1919). <em><a href="https://archive.org/details/texteunduntersuc43akad/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Gespräche Jesu mit seinen Jüngern nach der Auferstehung: Ein katholisch-apostolisches Sendschreiben des 2. Jahrhunderts. Nach einem koptischen Papyrus des Institut de la Mission Archéologique Française au Caire unter Mitarbeit von Herrn Pierre Lacau derzeitigem Generaldirektor der Ägypt. Museen. Herausgegeben, übersetzt und untersucht nebst drei Exkursen. Übersetzung des äthiopischen Textes von Isaak Wajnberg</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, 3. Reihe, Band 13 = Der ganzen Reihe Band 43). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['TU'],
  },
  {
    source: {
      title: 'Tuki, Rudimenta Linguae Coptae, 1778',
      innerHTML: [
        'Tuki, R. (1778). <em><a href="https://archive.org/details/bub_gb_5tc2rD_Ba-sC/page/n4/mode/2up" rel="noreferrer noopener" target="_blank">Rudimenta linguae coptae sive aegyptiacae ad usum Collegii Urbani de Propaganda Fide. –غراماطيق في اللسان القبطي (أى المصري) لبيان نسق الكلام البحيري والصعيدي في اللسان المذكور بنمودجات من الكتب المقدسة المسطرة بالنسق الواحد والاخر.</a></em> Romae: Typis eiusdem Sacrae Congregationis de Propaganda Fide.',
      ],
    },
    variants: ['Tuki'],
  },
  {
    source: {
      title:
        'B. Turaief, Materiali &c. (v AZ 40 150, Orient. Bibliographie xv, no. 111 a), acc. to numbers',
      innerHTML: [
        'Turayev, B. A. (1902). <a href="https://babel.hathitrust.org/cgi/pt?id=chi.102555010&amp;seq=389" rel="noreferrer noopener" target="_blank">Коптскіе тексты, пріобрѣтенные экспедиціей пок. В. Г. Бока въ Египтѣ</a> [Coptic texts, acquired by the expedition of the late V. G. Bok in Egypt]. In <em>Труды одиннадцатаго Археологическаго Съѣзда въ Кіевѣ</em> (1899), т. II, pp. 225–246. Москва. ',
      ],
    },
    variants: ['TurM', 'TurMat'],
  },
  {
    source: {
      // TODO: (#545) Name doesn't make sense when it appears on its own!
      title:
        'do., Koptskia Ostraka… Golenishtshef (= Bull. Acad. Imp. x, no. 5, 1899), acc. to numbers',
      innerHTML: [
        'Turayev, B. A. (1899). <a href="https://www.biodiversitylibrary.org/item/94351#page/503/mode/1up" rel="noreferrer noopener" target="_blank">Коптскія ostraca коллекціи В. С. Голенищева</a> [Coptic ostraca from the collection of V. S. Golenishchev]. <em>Bulletin de l’ Académie Impériale des Sciences de St.-Pétersbourg</em>, 5e série, T. X, no. 5, pp. 435–449. ',
      ],
    },
    variants: ['TurO'],
  },
  {
    source: {
      title: 'ostraca in Museo Archeol., Turin (Crum’s copies)',
    },
    variants: ['Turin ostr'],
  },
  {
    source: {
      title:
        'MSS. in Vatican Library, acc. to photographs or to copies by H. De Vis',
    },
    variants: ['Va'],
    postfixes: ['ar', 'Ar'],
  },
  {
    source: {
      title: 'Vienna, MSS. & ostraca in the Staats(olim Hof)bibliothek',
    },
    variants: ['Vi'],
    postfixes: ['K', 'Sitz'],
  },
  {
    source: {
      title: 'C. Wessely, Studien z. Paläographie &c., acc. to vol. & page',
      innerHTML: [
        'Wessely, C. (1901–1924). <em>Studien zur Palaeographie und Papyruskunde</em>, 23 vols. Leipzig: Verlag von E. Avenarius. [Digitised volumes listed and linked on <a href="https://de.wikisource.org/wiki/Studien_zur_Palaeographie_und_Papyruskunde" rel="noreferrer noopener" target="_blank">de.WikiSource.org</a>.] ',
      ],
    },
    variants: ['Wess'],
  },
  {
    source: {
      title: 'a B MS penes the Rev. W. Hatch, Cambridge, Mass',
    },
    variants: ['WHatch'],
  },
  {
    source: {
      title: 'ostraca from Winlock’s excavations 1927-8, in Cairo Museum',
    },
    variants: ['Win'],
  },
  {
    source: {
      title:
        'W. H. Worrell, Coptic MSS. in Freer Collection (University of Michigan Studies), 1923',
      innerHTML: [
        'Worrell, W. (1923). <em><a href="https://archive.org/details/copticmanuscript00coel/page/n11/mode/2up" rel="noreferrer noopener" target="_blank">The Coptic Manuscripts in the Freer Collection</a></em>. New York: The Macmillan Company.',
      ],
    },
    variants: ['Wor', 'Worr'],
  },
  {
    source: {
      title:
        'Crum & Bell, Coptic Texts from Wadi Sarga (= Coptica III), 1922, acc. to pp',
      innerHTML: [
        'Crum, W. E., &amp; Bell, H. I. (1922). <em><a href="https://archive.org/details/wadisargacopticg00crumuoft/page/n7/mode/2up" rel="noreferrer noopener" target="_blank">Wadi Sarga: Coptic and Greek Texts from the Excavations Undertaken by the Byzantine Research Account</a></em>. (Coptica Consilio et Impensis Instituti Rask-Oerstediani III). Copenhagen: Gyldendalske Boghandel-Nordisk Forlag.',
      ],
    },
    variants: ['WS'],
  },
  {
    source: {
      title:
        'E. O. Winstedt, Coptic Texts on St. Theodore (Text & Transl. Soc.), 1910',
      innerHTML: [
        'Winstedt, E. O. (1910). <em><a href="https://archive.org/details/coptictextsonsai00wins/page/n5/mode/2up" rel="noreferrer noopener" target="_blank">Coptic Texts on Saint Theodore the General, St. Theodore the Eastern, Chamoul, and Justus</a></em>. (Text and Translation Society). London: Williams and Norgate.',
      ],
    },
    variants: ['WTh'],
  },
  {
    source: {
      title: 'Wiener Zeitsch. f. d. Kunde d. Morgenlandes',
      innerHTML: [
        '<em>Wiener Zeitschrift für die Kunde des Morgenlandes</em> began in 1887. Early digitised volumes listed on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=wienermorgenlandes" rel="noreferrer noopener" target="_blank">The Online Books Page</a> and others on <a href="https://catalog.hathitrust.org/Record/000077758" rel="noreferrer noopener" target="_blank">HathiTrust</a> (via US access only). ',
      ],
    },
    variants: ['WZKM'],
  },
  {
    source: {
      title: 'G. Zoega, Catalogus Codd. Copticorum &c. 1810, acc. to pp',
      innerHTML: [
        'Zoega, G. (1810). <em><a href="https://archive.org/details/bub_gb_8EAcFCioIQEC/page/n1/mode/2up" rel="noreferrer noopener" target="_blank">Catalogus codicum Copticorum manu scriptorum qui in Museo Borgiano Velitris adservantur</a></em>. Romae: Typis Sacrae Congregationis de Propaganda Fide.',
      ],
    },
    variants: ['Z'],
  },
  {
    source: {
      title: 'Zeitsch. f. d. Neutestamentl. Wissenschaft',
      innerHTML: [
        '<em>Zeitschrift für die neutestamentliche Wissenschaft und die Kunde der älteren Kirche</em> began in 1900. Early digitised volumes are linked on <a href="https://de.wikisource.org/wiki/Zeitschriften_(Theologie)#Z" rel="noreferrer noopener" target="_blank">de.WikiSource.org</a>. Further volumes available <a href="https://catalog.hathitrust.org/Record/000494825?type%5B%5D=all&amp;lookfor%5B%5D=Zeitschrift%20f%C3%BCr%20die%20neutestamentliche%20Wissenschaft%20und%20die%20Kunde%20der%20%C3%A4lteren%20Kirche&amp;ft=#viewability" rel="noreferrer noopener" target="_blank">HathiTrust</a> (via US access only). ',
      ],
    },
    variants: ['ZNTW'],
  },

  // SECTION 2: REFERENCES NOT MENTIONED BY CRUM IN THE LIST OF ABBREVIATIONS,
  // BUT ENCOUNTERED THROUGHOUT THE TEXT:
  // TODO: (#522) Add the missing entries to this section.
  {
    variants: ['Abû Ṣâliḥ', 'Abû Ṣâlih'],
  },
  {
    variants: ['Amélineau', 'Amélineau Géog'],
  },
  {
    variants: ['Antony Hist Laus'],
  },
  {
    variants: ['Baynes'],
  },
  {
    variants: ['Bell'],
  },
  {
    variants: ['Berl Sitz'],
  },
  {
    variants: ['Bevan'],
  },
  {
    variants: ['Brussels Musée Cinqu'],
  },
  {
    variants: ['Budge'],
  },
  {
    variants: ['Chassinat'],
  },
  {
    source: {
      title: 'Presumably Edward Charles Everard Owen (1860-1949)',
    },
    variants: ['E C Owen'],
  },
  {
    variants: ['Dévaud', 'Dévaud Ét', 'Dévaud Études'],
  },
  {
    variants: ['Encycl. Bibl.'],
    noSpaceVariants: true,
  },
  {
    variants: ['Epiphan. De Gemm.', 'Epiphan De Gem'],
    noSpaceVariants: true,
  },
  {
    variants: ['Erman-Lange Pap. Lansing'],
    noSpaceVariants: true,
  },
  {
    variants: ['FestschrEbers'],
  },
  {
    variants: ['FPetrie frag Athribis'],
  },
  {
    variants: ['GMaspero Musée Eg.', 'GMaspero Musée Ég.'],
    noSpaceVariants: true,
  },
  {
    variants: ['Gött'],
    postfixes: ['Ar', 'ar', 'Copt'],
  },
  {
    variants: ['Grohmann'],
  },
  {
    variants: ['Guide'],
  },
  {
    variants: ['Inst franç Epiph De Gemm amethyst'],
    noSpaceVariants: true,
  },
  {
    variants: ['Kabis'],
  },
  {
    variants: ['Klio'],
  },
  {
    variants: ['LAA'],
  },
  {
    variants: ['Lane'],
  },
  {
    variants: ['Langkavel'],
  },
  {
    variants: ['Lat & Syr'],
  },
  {
    variants: ['Lect Instit Cath Paris'],
  },
  {
    variants: ['Ludolf'],
  },
  {
    variants: ['Mani Berl Sitz'],
  },
  {
    variants: ['Mart Viktor ed Lemm'],
  },
  {
    variants: ['Masp.'],
  },
  {
    variants: ['MélCh Moeller'],
  },
  {
    variants: ['Mich'],
    postfixes: ['Ostr', 'P', 'wooden tablet'],
  },
  {
    variants: ['Mich Pasc Lect'],
  },
  {
    variants: ['OL'],
  },
  {
    variants: ['OstrUnivCollLondon'],
  },
  {
    variants: ['Pliny'],
  },
  {
    variants: ['RegPach'],
  },
  {
    variants: ['Reil Beiträge'],
  },
  {
    variants: ["Samannûdi's Scala"],
    noSpaceVariants: true,
  },
  {
    source: {
      title:
        'Arabische Pflanzennamen aus Aegypten, Algerien und Jemen Dietrich Reimer (Ernst Vohsen), Berlin 1912',
      innerHTML: [
        '<i>Arabische Pflanzennamen aus Aegypten, Algerien und Jemen</i> Dietrich Reimer (Ernst Vohsen), Berlin 1912, <a target="_blank" href="http://www.biodiversitylibrary.org/item/41971">online bei Biodiversity Heritage Library</a>',
      ],
    },
    variants: [
      'Schweinf Ar Pfl',
      'Schweinf Ar Pflanz',
      'Schweinfurth Ar Pfl',
      'Schweinfurth Ar Pflanz',
      'Schweinfurth Arab Pflanz',
    ],
  },
  {
    source: {
      title:
        'Acta Sanctorum Martyrum Orientalium et Occidentalium, by Stefano Evodio Assemani',
    },
    variants: ['SE Assemani AcMartOr'],
  },
  {
    variants: ['Sethe Verbum'],
  },
  {
    source: {
      title:
        'Demotische Urkunden zum ägyptischen Bürgschaftsrechte vorzüglich der Ptolemäerzeit',
    },
    variants: ['Sethe DemUrk'],
  },
  {
    source: {
      title:
        'Aegyptische und griechische Eigennamen aus Mumienetiketten der römischen Kaiserzeit, auf Grund von grossenteils unveröffentlichtem Material, gesammelt und erläutert von Wilhelm Spiegelberg',
    },
    variants: ['Spg Aeg u Gr Eigennamen'],
    noSpaceVariants: true,
  },
  {
    source: {
      title:
        'Socrates Spiro, An Arabic-English vocabulary of the colloquial Arabic of Egypt',
    },
    variants: ['Spiro'],
  },
  {
    source: {
      title: "Mina, Togo - Le Martyre d'Apa Epima",
    },
    variants: ['TMina Epima', 'Mina'],
  },
  {
    variants: [
      'Univ Coll Lond',
      'Univ Coll London',
      'Univ College Lond',
      'Univ College London',
    ],
  },
  {
    variants: ['Usener Theodos'],
  },
  {
    variants: ['Vita Pachom'],
  },
  {
    variants: ['Vita Sinuth', 'Vita Sin'],
  },
  {
    variants: ['Wilkins'],
  },
  {
    variants: ['Zoega'],
  },
];

/**
 * Add the given source to the mapping.
 * @param key
 * @param reference
 * @param noSpaceVariants
 */
function add(
  key: string,
  reference: Reference,
  noSpaceVariants?: boolean
): void {
  logger.ensure(MAPPING[key] === undefined, 'duplicate key:', key);
  MAPPING[key] = reference;
  if (noSpaceVariants) {
    return;
  }
  const parts: string[] = key.split(' ');
  while (parts.length > 1) {
    const last: string = parts.pop()!;
    parts[parts.length - 1]! += last;
    add(parts.join(' '), reference, true);
  }
}

// Add all the variants to the map.
DATA.forEach((res: Resource): void => {
  logger.ensure(
    !!res.variants.length,
    'resource has no abbreviations listed:',
    res
  );

  res.variants.forEach((variant: string): void => {
    // Add the abbreviation without any postfixes.
    add(variant, new Reference(variant, res.source), res.noSpaceVariants);
    res.postfixes?.forEach((postfix: string): void => {
      add(
        `${variant} ${postfix}`,
        new Reference(variant, res.source, postfix),
        res.noSpaceVariants
      );
    });
  });
});

/* eslint-enable max-lines */
