/* eslint-disable max-lines */
import * as log from '../logger.js';
import * as drop from '../dropdown.js';
import * as cls from './cls.js';
import * as dev from '../dev.js';
import * as html from '../html.js';
import * as ann from './annotations.js';

export const MAPPING: Record<string, Reference> = {};

/**
 * Source represents a source.
 */
export interface Source {
  /** title is the full title of the source. This could be HTML or plain text.
   */
  readonly title?: string;
  /**
   * description contains the full HTML description of the source, including
   * bibliographical details and hyperlinks.
   */
  readonly description?: string[];
}

/**
 *
 * @param content
 * @param flag
 * @returns
 */
export function maybeI(content: Node | string, flag?: boolean): Node | string {
  if (!flag) {
    return content;
  }
  const i: HTMLElement = document.createElement('i');
  i.append(content);
  return i;
}

/**
 * @returns
 */
export function ibidem(): HTMLElement {
  const i: HTMLElement = document.createElement('i');
  i.textContent = 'ibidem';
  i.classList.add(cls.IBIDEM);
  return i;
}

/**
 * Reference represents a particular way of citing a source in the text.
 */
export class Reference {
  private static readonly DATA_REF = 'ref';

  /**
   *
   * @param source - Cited source.
   * @param variant - Abbreviation used to cite this source.
   * @param postfix - Postfix appended to the abbreviation, if any.
   */
  public constructor(
    // TODO: (#522) The `source` field should become required once all sources
    // are populated.
    public readonly source: Source | undefined,
    public readonly variant: string,
    public readonly postfix?: Postfix
  ) {}

  /**
   *
   * @returns
   */
  public tooltip(): DocumentFragment | undefined {
    if (!this.source) {
      return undefined;
    }

    const fragment: DocumentFragment = new DocumentFragment();

    fragment.append(...abbreviation(this.variant));

    if (this.source.title) {
      fragment.append(...html.parse(this.source.title));
    }

    if (this.source.description?.length) {
      const description: HTMLUListElement = document.createElement('ul');
      this.source.description.forEach((innerHTML: string) => {
        const li = document.createElement('li');
        li.innerHTML = innerHTML;
        description.append(li);
      });
      fragment.append(description);
    }

    const tooltip = this.postfix?.tooltip();
    if (tooltip?.length) {
      fragment.append(document.createElement('hr'), ...tooltip);
    }

    fragment.querySelectorAll('a').forEach((a: HTMLAnchorElement): void => {
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
    });

    return fragment;
  }

  /**
   *
   * @param raw
   * @returns
   */
  public span(...raw: (Node | string)[]): HTMLSpanElement {
    const span: HTMLSpanElement = document.createElement('span');
    span.classList.add(cls.REFERENCE);
    span.dataset[Reference.DATA_REF] = this.raw();
    span.append(...raw);
    const tooltip: (Node | string)[] = [
      ...(/^ib\b/i.test(span.textContent) ? [ibidem()] : []),
      ...(this.tooltip()?.childNodes ?? []),
    ];
    // TODO: (#522) This check will soon be unnecessary, because all references
    // will be guaranteed to have tooltips.
    if (tooltip.length) {
      drop.addDroppable(span, tooltip);
    }

    return span;
  }

  /**
   * @returns
   */
  public raw(): string {
    if (!this.postfix) {
      return this.variant;
    }
    return `${this.variant} ${this.postfix.name}`;
  }

  /**
   *
   * @param span
   * @returns
   */
  public static fromSpan(span: HTMLElement): Reference {
    return MAPPING[span.dataset[Reference.DATA_REF]!]!;
  }

  /**
   * Remove all tooltips, as well as `reference` tags.
   *
   * NOTE: We do NOT account for the case that the root itself is an artifact
   * that needs to be gotten rid of.
   *
   * @param elem
   */
  public static dereference(elem: ChildNode): void {
    if (!(elem instanceof Element)) {
      // This is probably a text node. Definitely no reference here! Do nothing!
      return;
    }

    elem
      .querySelectorAll(`.${drop.CLS.DROPPABLE}`)
      .forEach((el: Element): void => {
        el.remove();
      });

    // Remove the .reference span, retaining the children.
    elem.querySelectorAll(`.${cls.REFERENCE}`).forEach((el: Element): void => {
      el.replaceWith(...el.childNodes);
    });
  }

  /**
   *
   * @param span
   * @param {...any} suffix
   *
   * Isn't it better to endow the `Reference` class with a `suffix` field and
   * grow this field, constructing a complete <span> tag at the end, instead of
   * starting with a partial <span> tag and gradually growing it with suffixes?
   *
   * That would be a cleaner design, but it's not compatible with our current
   * pipeline, which does several passes over the DOM.
   * - In the first pass, references are detected, and marked with <span> tags
   *   in the HTML.
   * - In the second pass, reference suffixes (called "followups" in that
   *   context) are picked up and added to the spans.
   *
   * We can't do the above in a single pass, as that would make it challenging
   * to handle such cases as the following (where K is the variant of another
   * source rather than a followup suffix of P):
   *   P 44 66, K 179[1]
   * See followup logic for more details.
   *
   * [1] https://remnqymi.com/crum/510.html#:~:text=P%2044%2066,%20K%20179
   */
  public static suffix(
    span: HTMLSpanElement,
    ...suffix: (string | Node)[]
  ): void {
    // Append the suffix.
    span.append(...suffix);
    // Expand the tooltip with any annotations from the suffix.
    // TODO: (#0) It's better to use your own custom class, instead of relying
    // on `drop.CLS.DROPPABLE`.
    span.querySelector(`.${drop.CLS.DROPPABLE}`)?.append(
      ...suffix.flatMap((node: string | Node): (Node | string)[] => {
        const text = typeof node === 'string' ? node : (node.textContent ?? '');
        const italic = node instanceof Element && node.nodeName === 'I';
        ann.RE.lastIndex = 0;
        return Array.from(text.matchAll(ann.RE))
          .map((match: RegExpExecArray): string => match[0])
          .flatMap((abb: string): (Node | string)[] => {
            const annot = ann.MAPPING[abb];
            return !annot?.suffix
              ? []
              : [
                  document.createElement('hr'),
                  ...abbreviation(abb, italic),
                  maybeI(annot.fullForm, italic),
                ];
          });
      })
    );
  }
}

export const LOOKUP = Symbol('LOOKUP');
type PostfixType = string | undefined | typeof LOOKUP;

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
   * TODO: (#522) Record variants.
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
   * The fact that postfixes are parsable if written with the variant as a
   * single word, while suffixes must be separate, sometimes forces us to record
   * some otherwise-would-be suffixes as postfixes in order to be able to parse
   * them.
   * For example, 'BM' and 'BMOr' refer to the same source. 'Or' (for
   * 'oriental') is more appropriately treated as a suffix rather than a
   * postfix, but we treat it as a postfix because it's written as 'BMOr' not
   * 'BM Or'.
   */
  readonly postfixes?: Record<string, PostfixType>;
}

/**
 * DATA_1 lists the resources from Crum's list of abbreviations.
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
 * Variants that differ in non-space characters should, however, be explicitly
 * mentioned.
 * P.S. We have encountered numerous space variants, so we opted for
 * preemptively inserting spaces wherever they may be expected to show, even if
 * we haven't encountered such space variants in the text.
 */
const DATA_1: Resource[] = [
  {
    source: {
      title: 'E. Amélineau, Œuvres de Schenoudi, 1907 ff',
      description: [
        'Amélineau, E. (1907). <em><a href="https://archive.org/details/oeuvresdeschenou01shen/page/n5/mode/2up">Œuvres de Schenoudi: texte copte et traduction française</a></em>. Tome 1. Paris: E. Leroux.',
        'Amélineau, E. (1914). <em><a href="https://archive.org/details/oeuvresdeschenou02shen/page/n7/mode/2up">Œuvres de Schenoudi: texte copte et traduction française</a></em>. Tome 2. Paris: E. Leroux.',
      ],
    },
    variants: ['Am', 'A'],
  },
  {
    source: {
      title:
        'Kitâb al-Abṣâlmudîyah al-Muḳaddasah al-Sanawîyah (Theotokia), Alexandria, 1908',
      // NOTE: CaiThe occurs as a standalone abbreviation in Crum, but we treat
      // it as a variant to simplify the pipeline.
      description: [
        'Labīb, I. (1908). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3276169">Kitāb al-Ibṣalmūdiyyah al-sanawiyyah al-muqaddasah</a></em> [كتاب الإبصلمودية السنوية المقدسة — ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ϯⲯⲁⲗⲙⲟⲇⲓⲁ̀ ⲉ︦ⲑ︦ⲩ︦ ⲛ̀ⲧⲉⲣⲟⲙⲡⲓ]. Cairo: Heliopolis Press.',
      ],
    },
    variants: ['Absal', 'Cai The'],
  },
  {
    source: {
      title: 'Kitâb al-Abṣâliyât wal-Ṭaruḥât, Old Cairo, 1913',
      description: [
        'Bishop Ṣamūʾīl, Father Fīlūṯāʾūs al-Maqārī, Cantor Mīḫāʾīl Girgis al-Batanūnī. (1913). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3336324">al-Ibṣāliyyāt wa-al-Ṭurūḥāt al-Wāṭis wa-al-Ādām</a></em> [الإبصاليات والطروحات الواطس والآدام]. Old Cairo.',
      ],
    },
    variants: ['Abst'],
  },
  {
    source: {
      title: 'Lagarde, Aegyptiaca, 1883',
      description: [
        'Lagarde, P. de. (1883). <em><a href="https://archive.org/details/aegyptiaca01lagagoog/page/n4/mode/2up">Aegyptiaca Pauli de Lagarde studio et sumptibus edita</a></em>. Gottingae: In aedibus Dieterichianis Arnoldi Hoyer.',
      ],
    },
    variants: ['Aeg'],
  },
  {
    source: {
      title: '(periodical), Milan, acc. to vols',
      description: [
        '<em>Aegyptus</em> journal is available digitised from 1920 to recent years on <a href="https://www.jstor.org/journal/aegy">JSTOR</a>. ',
      ],
    },
    variants: ['Aegyptus'],
  },
  {
    source: {
      title: 'Ahmed Issa, Dict. des Noms des Plantes, Cairo, 1930',
      description: [
        'Issa, A. B. (1930). <em><a href="https://digitalcollections.aucegypt.edu/digital/collection/p15795coll33/id/321/rec/5">Dictionnaire des noms des plantes, en latin, français, anglais et arabe</a></em>. Le Caire: Imprimerie nationale.',
      ],
    },
    variants: ['A Issa'],
  },
  {
    source: {
      title: 'American Journ. of Semit. Languages',
      description: [
        'The <em>American Journal of Semitic Languages and Literatures</em> is available digitised from 1895-1941 (vols. 12-58) on <a href="https://www.jstor.org/journal/amerjsemilanglit">JSTOR</a>. [From 1884-1895 (vols. 1-11) the journal was called <em>Hebraica</em> and from 1942 it became the <em>Journal of Near Eastern Studies</em> (vol. 59 onward).] ',
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
  // TODO: (#0) Consider merging Almk 1 and Almk 2 using postfixes.
  {
    source: {
      title:
        'H. Almkvist, Kleine Beitr. z. Lexikographie d. vulg. Arabischen, 8th Or. Congr., 1891',
      description: [
        'Almkvist, H. (1891). <em><a href="https://www.google.co.uk/books/edition/Kleine_Beitr%C3%A4ge_zur_Lexikographie_des_V/KiYUAAAAYAAJ?hl=en&amp;gbpv=1">Kleine Beiträge zur Lexikographie des Vulgärarabischen</a></em>. I. Tiré des Actes du 8e Congrès International des Orientalistes, tenu en 1889 à Stockholm et à Christiania. Leide: E. J. Brill.',
      ],
    },
    variants: ['Almk 1'],
  },
  {
    source: {
      title:
        '<em>continuation of</em> <i>H. Almkvist, Kleine Beitr. z. Lexikographie d. vulg. Arabischen, 8th Or. Congr., 1891</i>; ed. K. V. Zetterstéen, in Le Monde Oriental, 1925',
      description: [
        '<em><a href="https://www.google.co.uk/books/edition/Le_Monde_oriental/r9IbAAAAMAAJ?hl=en&amp;gbpv=1&amp;pg=PA293&amp;printsec=frontcover">Le Monde Oriental</a></em>. (1925). Vol. XIX. Uppsala.',
      ],
    },
    variants: ['Almk 2'],
  },
  {
    source: {
      title: 'Accademia dei Lincei, Rendiconti',
      // NOTE: Rendiconti occurs as a standalone abbreviation in Crum, but we
      // treat it as a variant to simplify the pipeline.
      description: [
        '<em>Atti della Reale Accademia dei Lincei, Rendiconti</em> began in 1884 and continued until 1929. All volumes are digitised and available on <a href="http://periodici.librari.beniculturali.it/PeriodicoScheda.aspx?id_testata=30&amp;Start=0">BiASA Periodici Italiani Digitalizzati</a>. ',
      ],
    },
    variants: ['ALR', 'Rendiconti'],
  },
  {
    source: {
      title: 'H. Hyvernat, Actes des Martyrs, 1886',
      description: [
        'Hyvernat, H. (1886). <em><a href="https://archive.org/details/lesactesdesmarty01hyve/page/n5/mode/2up">Actes des Martyrs de l’Égypte</a></em>. Paris: Ernest Leroux.',
      ],
    },
    variants: ['AM'],
  },
  {
    source: {
      title: 'Annales du Service Antiquités, Cairo',
      description: [
        'The <em>Annales du service des antiquités de l’Égypte</em> (ASAE) began in 1900. From 1988-97 it was called <em>Annales du service des antiquités Égyptiennes</em>. There are a selection of digitised volumes, including all up to 1939, on <a href="https://ancientworldonline.blogspot.com/2021/12/annales-du-service-des-antiquites-de.html">The Ancient World Online</a>. Further volumes available on <a href="https://catalog.hathitrust.org/Record/007151043?type%5B%5D=title&amp;lookfor%5B%5D=Annales%20du%20service%20des%20antiquit%C3%A9s%20de%20l%27%C3%89gypte&amp;ft=ft#viewability">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['Ann'],
  },
  {
    source: {
      title: 'Acta Pauli, ed. C. Schmidt, 1904, acc. to asterisked pp. of book',
      description: [
        'Schmidt, C. (1904). <em><a href="https://archive.org/details/actapauliausder00papygoog/page/n6/mode/2up">Acta Pauli: aus der Heidelberger koptischen Papyrushandschrift Nr. 1</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['AP'],
  },
  {
    source: {
      title:
        'H. Asmus, Über Fragmente im mitteläg. Dialekt (Dissert.), 1904, acc. to pp',
      description: [
        'Asmus, H. (1904). <em><a href="https://www.google.co.uk/books/edition/%C3%9Cber_Fragmente_in_mittel%C3%A4gyptischem_Di/D10UAQAAIAAJ?hl=en">Über Fragmente in mittelägyptischen Dialekte</a></em>. Phil. Diss., Leipzig; Göttingen. [via US access only]',
      ],
    },
    variants: ['Asmus'],
  },
  {
    source: {
      title: 'Zeitschr. f. Aegyptische Sprache, acc. to vols',
      description: [
        '<em>Zeitschrift für Ägyptische Sprache und Altertumskunde</em> (ZÄS; previously ZÄ) began in 1863. The following (volumes 1-59, 72) are available on Internet Archive: <a href="https://archive.org/details/zeitschriftfr01brug/page/n7/mode/2up">1 (1863)</a>; <a href="https://archive.org/details/zeitschriftfr02brug/page/n1/mode/2up">2 (1864)</a>; <a href="https://archive.org/details/zeitschriftfr03brug/page/n7/mode/2up">3 (1865)</a>; <a href="https://archive.org/details/zeitschriftfr04brug/page/n7/mode/2up">4 (1866)</a>; <a href="https://archive.org/details/zeitschriftfr05brug/page/n1/mode/2up">5 (1867)</a>; <a href="https://archive.org/details/zeitschriftfr06brug/page/n1/mode/2up">6 (1868)</a>; <a href="https://archive.org/details/zeitschriftfr07brug/page/n1/mode/2up">7 (1869)</a>; <a href="https://archive.org/details/zeitschriftfr08brug/page/n1/mode/2up">8 (1870)</a>; <a href="https://archive.org/details/zeitschriftfr09brug/page/n1/mode/2up">9 (1871)</a>; <a href="https://archive.org/details/zeitschriftfr10brug/page/n7/mode/2up">10 (1872)</a>; <a href="https://archive.org/details/zeitschriftfr11brug/page/n5/mode/2up">11 (1873)</a>; <a href="https://archive.org/details/zeitschriftfr12brug/page/n7/mode/2up">12 (1874)</a>; <a href="https://archive.org/details/zeitschriftfr13brug/page/n1/mode/2up">13 (1875)</a>; <a href="https://archive.org/details/zeitschriftfr14brug/page/n1/mode/2up">14 (1876)</a>; <a href="https://archive.org/details/zeitschriftfr15brug/page/n5/mode/2up">15 (1877)</a>; <a href="https://archive.org/details/zeitschriftfr16brug">16 (1878)</a>; <a href="https://archive.org/details/zeitschriftfr17brug">17 (1879)</a>; <a href="https://archive.org/details/zeitschriftfr18brug">18 (1880)</a>; <a href="https://archive.org/details/zeitschriftfr19brug/page/n5/mode/2up">19 (1881)</a>; <a href="https://archive.org/details/zeitschriftfr20brug/page/n5/mode/2up">20 (1882)</a>; <a href="https://archive.org/details/zeitschriftfr21brug/page/n5/mode/2up">21 (1883)</a>; <a href="https://archive.org/details/zeitschriftfr22brug">22 (1884)</a>; <a href="https://archive.org/details/zeitschriftfr23brug">23 (1885)</a>; <a href="https://archive.org/details/zeitschriftfr2427deutuoft/page/n5/mode/2up">24 (1886)</a>; <a href="https://archive.org/details/zeitschriftfr2427deutuoft/page/n145/mode/2up">25 (1887)</a>; <a href="https://archive.org/details/zeitschriftfr2427deutuoft/page/140/mode/2up">26 (1888)</a>; <a href="https://archive.org/details/zeitschriftfr27brug/page/n1/mode/2up">27 (1889)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n3/mode/2up">28 (1890)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n135/mode/2up">29 (1891)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n267/mode/2up">30 (1892)</a>; <a href="https://archive.org/details/zeitschriftfr2831deutuoft/page/n407/mode/2up">31 (1893)</a>; <a href="https://archive.org/details/zeitschriftfr32brug">32 (1894)</a>; <a href="https://archive.org/details/zeitschriftfr33brug">33 (1895)</a>; <a href="https://archive.org/details/zeitschriftfr34brug">34 (1896)</a>; <a href="https://archive.org/details/zeitschriftfr35brug">35 (1897)</a>; <a href="https://archive.org/details/zeitschriftfr36brug/page/n5/mode/2up">36 (1898)</a>; <a href="https://archive.org/details/zeitschriftfr3639deutuoft/page/n199/mode/2up">37 (1899)</a>; <a href="https://archive.org/details/zeitschriftfr38brug">38 (1900)</a>; <a href="https://archive.org/details/zeitschriftfr39brug">39 (1901)</a>; <a href="https://archive.org/details/zeitschriftfr40brug/page/n1/mode/2up">40 (1902-03)</a>; <a href="https://archive.org/details/zeitschriftfr41brug/page/n1/mode/2up">41 (1904)</a>; <a href="https://archive.org/details/zeitschriftfr42brug">42 (1905)</a>; <a href="https://archive.org/details/zeitschriftfr43brug">43 (1906)</a>; <a href="https://archive.org/details/zeitschriftfr44brug">44 (1907-08)</a>; <a href="https://archive.org/details/zeitschriftfr45brug">45 (1908-09)</a>; <a href="https://archive.org/details/zeitschriftfr46brug">46 (1909-10)</a>; <a href="https://archive.org/details/zeitschriftfr47brug">47 (1910)</a>; <a href="https://archive.org/details/zeitschriftfr48brug/page/n5/mode/2up">48 (1911)</a>; <a href="https://archive.org/details/zeitschriftfr49brug/page/n1/mode/2up">49 (1911)</a>; <a href="https://archive.org/details/zeitschriftfr50brug/page/n1/mode/2up">50 (1912)</a>; <a href="https://archive.org/details/zeitschriftfr51brug/page/n5/mode/2up">51 (1914)</a>; <a href="https://archive.org/details/zeitschriftfr52brug/page/n1/mode/2up">52 (1915)</a>; <a href="https://archive.org/details/zeitschriftfr53brug/page/n1/mode/2up">53 (1917)</a>; <a href="https://archive.org/details/zeitschriftfr54brug">54 (1918)</a>; <a href="https://archive.org/details/zeitschriftfr55brug">55 (1918)</a>; <a href="https://archive.org/details/zeitschriftfr56brug">56 (1920)</a>; <a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n135/mode/2up">57 (1922)</a>; <a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n367/mode/2up"> 58 (192</a><a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n367/mode/2up">3</a><a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n367/mode/2up">)</a>; <a href="https://archive.org/details/zeitschriftfr5659deutuoft/page/n555/mode/2up">59 (1924)</a>; <a href="https://archive.org/details/zeitschriftfr72brug/mode/2up">72 (1936)</a>. All volumes are available digitised on the <a href="https://www.degruyterbrill.com/journal/key/zaes/html?lang=de&amp;srsltid=AfmBOoqiSSk9kY_a9NjC6ibeiaR2VogjEP1ERFmu2oCf4X7gyI9u82om#issues">De Gruyter Brill website</a> (with login credentials). ',
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
      description: [
        'Balestri, I. (Ed.). (1904). <em><a href="https://archive.org/details/sacrorumbiblioru03unse/page/n5/mode/2up">Sacrorum Bibliorum Fragmenta Copto-Sahidica Musei Borgiani</a></em>, Vol. III: <em>Novum Testamentum</em>. Rome: Typis S. C. de Propaganda Fide.',
      ],
    },
    variants: ['Balestri'],
  },
  {
    source: {
      title: 'Le Monastère de B., ed. J. Clédat, I & II (= MIF. xii), 1904 ff',
      description: [
        'Clédat, J. (1904). <em><a href="https://archive.org/details/MIFAO12et13/mode/2up">Le monastère et la nécropole de Baouît</a></em>. (Mémoires publiés par les membres de l’Institut français d’archéologie orientale du Caire, Vol. 12). Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['Baouit'],
  },
  {
    source: {
      title: 'Budge, Coptic Apocrypha, 1913',
      description: [
        'Budge, E. A. W. (1913). <em><a href="https://archive.org/details/copticapocryphai00budguoft/page/n5/mode/2up">Coptic Apocrypha in the Dialect of Upper Egypt: Edited with English Translations</a></em>. London: British Museum.',
      ],
    },
    variants: ['B Ap'],
  },
  {
    source: {
      title: 'MSS. in the Staats(olim Kgl.)bibliothek, Berlin (Crum’s copies)',
    },
    // TODO: (#522) Should you add 'Berl'?
    // See https://remnqymi.com/crum/1388.html#:~:text=Berl.
    variants: ['Berl Or', 'Berl.Or'],
  },
  {
    source: {
      title: 'Erman & Grapow, Wörterbuch d. Aeg. Sprache, 1926-31',
      description: [
        'Erman, A., &amp; Grapow, H. (1926-1931). <em><a href="https://www.ancientegyptfoundation.org/worterbuch_der_aegyptischen_sprache.shtml">Wörterbuch der ägyptischen Sprache im Auftrage der deutschen Akademien</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung. [The project started by Erman and Grapow continues in digitised form in <em><a href="https://tla.digital/home">Thesaurus Linguae Aegyptiae</a></em>.]',
      ],
    },
    variants: [
      'Berl Worterb',
      'Berl Wörterb',
      'Berl. Wörterb',
      'Berlin Wörterb',
    ],
  },
  {
    source: {
      title: 'Bessarione (periodical), acc. to vols',
      description: [
        '<em>Bessarione</em> began in 1896 and continued until 1923. All volumes digitised and available on the Biblioteca Nazionale Centrale di Roma’s <a href="http://digitale.bnc.roma.sbn.it/tecadigitale/emeroteca/classic/TO00178193">Biblioteca Digitale</a>. ',
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
      description: [
        'Budge, E. A. W. (1910). <em><a href="https://archive.org/details/coptichomiliesin00budgrich/page/n11/mode/2up">Coptic Homilies in the Dialect of Upper Egypt edited from the Papyrus Codex Oriental 5001 in the British Museum</a></em>. London: British Museum.',
      ],
    },
    variants: ['B Hom'],
  },
  {
    source: {
      title: 'Bulletin de l’lnstit. français… au Caire',
      description: [
        'All volumes of <em>Le Bulletin de l’Institut français d’ archéologie orientale</em> (BIFAO) published from 1901 to date are listed, digitised, and freely available via the <a href="https://www.ifao.egnet.net/bifao/">Institut français d’ archéologie orientale</a>. ',
      ],
    },
    variants: ['BIF'],
  },
  {
    // NOTE: BKU and Kam are listed as several entries.
    source: {
      title:
        'Berliner Kopt. Urkunden, acc. to vol., no. and, in long texts, lines',
      description: [
        'Erman, A. (1904). <em><a href="https://archive.org/details/mdp.39015020865393/page/n9/mode/2up">Aegyptische Urkunden aus den Königlichen Museen zu Berlin: Koptische Urkunden (BKU)</a></em>. Vol. 1. Berlin: Weidmannsche Buchhandlung. [Several of the BKU I texts (along with other collections) have been digitised at the <a href="https://berlpap.smb.museum/bku-i/">Berliner Papyrusdatenbank</a>.]<p><strong>Kam</strong>: Kambysesroman in BKU I, no. 31, acc. to pp. in lower margins & line</p>',
      ],
    },
    variants: ['BKU', 'Kam'],
  },
  {
    source: {
      title:
        'Epiphanius, De XII Gemmis, ed. R. P. Blake, Coptic fragts. by H. De Vis, 1934 (in Lake’s Studies & Documents)',
      description: [
        'Blake, R. P., &amp; de Vis, H. (Eds.). (1934). <em><a href="https://archive.org/details/MN41447ucmf_1/page/n7/mode/2up">Epiphanius de gemmis: The Old Georgian Version and the Fragments of the Armenian Version</a></em> by R. P. Blake, and <em>The Coptic-Sahidic Fragments</em> by H. de Vis. (Studies and Documents, Vol. 2). London: Christophers.',
      ],
    },
    variants: ['Blake'],
  },
  {
    source: {
      title: 'British Museum, Catalogue of Coptic MSS., 1905, acc. to numbers',
      description: [
        'Crum, W. E. (1905). <em><a href="https://archive.org/details/catalogueofcopti00brituoft/page/ii/mode/2up">Catalogue of the Coptic Manuscripts in the British Museum</a></em>. London: British Museum.',
        'Bentley Layton (1987). <em><a href="https://archive.org/details/catalogueofcopti0000brit/">Catalogue of Coptic Literary Manuscripts in the British Library Acquired Since the Year 1906</a></em>. London: The British Library.',
        'Note: The manuscripts have since been moved to the <a href="https://bl.libguides.com/reference-services/asian-and-african-studies/introduction/oriental-manuscripts">British Library</a>.',
      ],
    },
    variants: ['BM'],
    postfixes: { Or: 'Oriental', or: 'oriental', Add: 'Addenda' },
  },
  {
    source: {
      title: 'Budge, Coptic Martyrdoms, 1914',
      description: [
        'Budge, E. A. W. (1914). <em><a href="https://archive.org/details/CopticMartyrdomshighResByEWallisBudgeVol01/mode/2up">Coptic Martyrdoms, etc., in the Dialect of Upper Egypt</a></em>. London: British Museum.',
      ],
    },
    variants: ['B Mar'],
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
      description: [
        'Budge, E. A. W. (1915). <em><a href="https://archive.org/details/miscellaneouscop00budguoft/page/n9/mode/2up">Miscellaneous Coptic Texts in the Dialect of Upper Egypt edited with English translations</a></em>. London: British Museum.',
      ],
    },
    variants: ['B Mis'],
  },
  {
    source: {
      title: 'Coptic MSS. in Bodleian, as (P) a i e, where italic = folio',
    },
    variants: ['Bodl', 'Bod'],
    postfixes: {
      Copt: 'Coptic',
      copt: 'Coptic',
      '(P)': undefined,
      P: undefined,
      Marsh: 'Marshall Collection',
    },
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
      description: [
        'Schmidt, C. (1892). <em><a href="https://www.google.co.uk/books/edition/Gnostische_Schriften_in_koptischer_Sprac/esVQJzTZIpgC?hl=en&amp;gbpv=1">Gnostische Schriften in koptischer Sprache aus dem Codex Brucianus</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, Vol. 8). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    // NOTE: The 'B' variant is not in Crum's list of abbreviations, and it was
    // encountered only once under ⲉⲛⲉϩ[1] on 'p 57 a'.
    //
    // [1] https://remnqymi.com/crum/25.html
    variants: ['Br', 'B'],
  },
  {
    source: {
      title: 'Budge, Martyrdom & Miracles of St. George, 1888',
      description: [
        'Budge, E. A. W. (1888). <em><a href="https://archive.org/details/martyrdommiracle00budguoft/page/n9/mode/2up">The Martyrdom and Miracles of Saint George of Cappadocia: The Coptic Texts edited with an English translation</a></em>. London: D. Nutt.',
      ],
    },
    variants: ['BSG'],
  },
  {
    source: {
      title: 'Budge, St. Michael the Archangel, 1894',
      description: [
        'Budge, E. A. W. (1894). <em><a href="https://archive.org/details/StMichael3Encomiums/page/n7/mode/2up">Saint Michael the Archangel: Three Encomiums by Theodosius, Archbishop of Alexandria, Severus, Patriarch of Antioch, and Eustathius, Bishop of Trake</a></em>; the Coptic texts with extracts from Arabic and Ethiopic versions, edited with a translation. London: Kegan Paul, Trench, Trübner &amp; Co.',
      ],
    },
    variants: ['BSM'],
  },
  {
    source: {
      title:
        'Corpus Scriptorum Christian. Oriental., acc. to the “numéros d’ ordre”',
      description: [
        '<strong>T. 41</strong> <em>Sinuthii Vita</em>, ed. J. Leipoldt, 1906. <ul><li>Leipoldt, J. (1906). <em><a href="https://archive.org/details/sinuthiiarchiman0000shen_i0u5/page/n7/mode/2up">Sinuthii archimandritae Vita et Opera omnia</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 41; Scriptores Coptici, Tom. 1). Paris: Imprimérie nationale. (Reprinted 1951, Louvain: L. Durbecq).</li></ul>',
        '<strong>42, 73</strong> <em>Sinuthii Opera</em>, do., 1908, 1913. <ul><li>Leipoldt, J. (1908). <em><a href="https://archive.org/details/sinuthiiarchiman0000shen_z1m2/page/n7/mode/2up">Sinuthii archimandritae Vita et Opera omnia, III</a></em>, with the assistance of W. E. Crum. (Corpus Scriptorum Christianorum Orientalium, Vol. 42; Scriptores Coptici, Tom. 2). Paris: Imprimérie nationale. (Reprinted 1955, Louvain: L. Durbecq).</li><li>Leipoldt, J. (1913). <em><a href="https://archive.org/details/sinuthiiarchiman0000shen/page/n7/mode/2up">Sinuthii archimandritae Vita et Opera omnia, IV</a></em>, with the assistance of W. E. Crum. (Corpus Scriptorum Christianorum Orientalium, Vol. 73; Scriptores Coptici, Tom. 5). Paris: Imprimérie nationale. (Reprinted 1954, Louvain: L. Durbecq). <br></li></ul>',
        '<strong>43, 86</strong> <em>Acta Martyrum</em>, edd. I. Balestri &amp; H. Hyvernat, 1907, 1924. <ul><li>Balestri, J. &amp; Hyvernat, H. (1907). <em><a href="https://archive.org/details/actamartyrum0043bale/page/n7/mode/2up">Acta martyrum, I</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 43; Scriptores Coptici, Tom. 3). Paris: Imprimérie nationale. (Reprinted 1955, Louvain: L. Durbecq).</li><li>Balestri, J. &amp; Hyvernat, H. (1924). <em><a href="https://archive.org/details/actamartyrum0086bale/page/n7/mode/2up">Acta martyrum, II</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 86; Scriptores Coptici, Tom. 6). Paris: Imprimérie nationale. (Reprinted 1953, Louvain: L. Durbecq).</li></ul>',
        '<strong>89, 99, 100</strong> S. <em>Pachomii Vitae</em>, ed. L. Th. Lefort, 1925, 1933. <ul><li>Lefort, L. Th. (1925). <em><a href="https://archive.org/details/spachomiivitaboh0000unse/page/n7/mode/2up">S. Pachomii vita bohairice scripta</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 89; Scriptores Coptici, Tom. 7). Paris: Imprimérie nationale. (Reprinted 1953, Louvain: L. Durbecq).</li><li>Lefort, L. Th. (1933-1934). <em><a href="https://archive.org/details/spachomiivitaesa9910unse/page/n7/mode/2up">S. Pachomii Vitae sahidice scriptae, fasc. 1-2</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 99-100; Scriptores Coptici, Tom. 9-10). Paris: Imprimérie nationale. (Reprinted 1952, Louvain: L. Durbecq).</li></ul>',
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
      title: 'MSS. &c. in Coptic Museum, Cairo',
    },
    variants: [
      '(Cai)CoptMus',
      'Cai Copt Mus',
      'Copt Mus Cai',
      'Copt Mus',
      // NOTE: P for papyrus, but we don't mention that!
      // TODO: (#522) Does this variant belong to PCai?
      'P Cai Copt Mus',
    ],
  },
  {
    source: {
      title:
        'Canons of Athanasius ed. Riedel & Crum (Text & Transl. Soc.), 1904',
      description: [
        'Riedel, W., &amp; Crum, W. E. (1904). <em><a href="https://archive.org/details/thecanonsofathan00rieduoft/page/n7/mode/2up">The Canons of Athanasius of Alexandria: The Arabic and Coptic versions edited and translated with introductions, notes and appendices</a></em>. London: Williams and Norgate.',
      ],
    },
    variants: ['CA'],
  },
  {
    source: {
      title: 'Kitâb al-Khulâgy al-Muḳaddas (Euchologion), Cairo, 1902',
      description: [
        'ʿAbd al-Masīḥ Ṣalīb. (1902). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/1703331">Kitāb al-Ḫulāǧī al-Muqaddas</a></em> [كتاب الخولاجي المقدس اي كتاب الثلاثة القداسات التي للقديس باسيليوس والقديس غريغوريوس والقديس كيرلس مع صلوات أخرى مقدسة — ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ⲡⲓⲉⲩⲭⲟⲗⲟⲅⲓⲟⲛ ⲉ̀ⲑⲟⲩⲁⲃ ⲉ̀ⲧⲉ ⲫⲁⲓ ⲡⲉ ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ϯϣⲟⲙϯ ⲛ̀ⲁ̀ⲛⲁⲫⲟⲣⲁ ⲛ̀ⲧⲉ ⲡⲓⲁ̀ⲅⲓⲟⲥ ⲃⲁⲥⲓⲗⲓⲟⲥ ⲛⲉⲙ ⲡⲓⲁ̀ⲅⲓⲟⲥ ⲅ̀ⲣⲏⲅⲟⲣⲓⲟⲥ ⲛⲉⲙ ⲡⲓⲁ̀ⲅⲓⲟⲥ ⲕⲩⲣⲓⲗⲗⲟⲥ ⲛⲉⲙ ϩⲁⲛⲕⲉⲉⲩⲭⲏ ⲉⲩⲟⲩⲁⲃ]. Heliopolis.',
      ],
    },
    variants: ['Cai Euch'],
  },
  {
    source: {
      title: 'Catenae in Evangelia, ed. Lagarde, 1886',
      description: [
        'Lagarde, P. de. (1886). <em><a href="https://archive.org/details/catenaeinevangel00lagauoft/page/n3/mode/2up">Catenae in evangelia Aegyptiacae quae supersunt</a></em>. Göttingen: Dietrich, Arnoldi Hoyer.',
      ],
    },
    variants: ['Cat'],
  },
  {
    source: {
      title:
        'Codices Coptici Vaticani &c., T.I, edd. Hebbelynck & Lantschoot, Rome, 1937',
      description: [
        'Hebbelynck, A., &amp; Van Lantschoot, A. (1937). <em><a href="https://archive.org/details/BiblotacheaTomIcomplete/page/n7/mode/2up">Codices Coptici Vaticani, Barberiniani, Borgiani, Rossiani. Tomus I</a></em>. Vaticani: Bibliotheca Vaticana.',
      ],
    },
    // NOTE: No spaces added!
    variants: ['CCVaI'],
  },
  {
    source: {
      title:
        'L. Clugnet, Vie de l’Abbé Daniel, wherein Guidi’s Coptic text, acc. to pp. of this work',
      description: [
        'Clugnet, L., Nau, F., &amp; Guidi, I. (Eds.). (1901). <em><a href="https://archive.org/details/VieDanielLeScetiote/page/n7/mode/2up">Vie (et récits) de l’Abbé Daniel le Scétiote (VIe siècle): Texte grec publ. par Léon Clugnet, texte syriaque publ. par F. Nau, texte copte publ. par Ignazio Guidi</a></em>. (Extrait de la Revue de l’ Orient Chrétien, Année 1901). Paris: A. Picard et fils.',
      ],
    },
    variants: ['C Dan'],
  },
  {
    source: {
      title: 'M. Chaîne, Eléments de gram. dialectale copte, 1933',
      description: [
        'Chaîne, M. (1933). <em><a href="https://catalog.hathitrust.org/Record/001231946?type%5B%5D=all&amp;lookfor%5B%5D=%C3%89l%C3%A9ments%20de%20grammaire%20dialectale%20copte&amp;ft=">Éléments de grammaire dialectale copte: Bohairique, Sahidique, Achmimique, Fayoumique</a></em>. Paris: P. Geuthner. [via US access only]',
      ],
    },
    variants: ['Chaîne'],
  },
  {
    source: {
      title:
        'F. Rösch, Bruchstücke des I. Clem. 1910, acc. to chh. of Greek text',
      description: [
        'Schmidt, C. (1908). <em><a href="https://archive.org/details/derersteclemensb00clemuoft/page/n3/mode/2up">Der erste Clemensbrief in altkoptischer Übersetzung: Untersucht und herausgegeben von Carl Schmidt mit Lichtdruck-Faksimile der Handschrift</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, Vol. 32, No. 1). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
        'Rösch, F. (1910). <em><a href="https://archive.org/details/bruchstckedese00clemuoft/bruchstckedese00clemuoft/page/n5/mode/2up">Bruchstücke des ersten Clemensbriefes nach dem achmimischen Papyrus der Strassburger Universitäts- und Landesbibliothek mit biblischen Texten derselben Handschrift</a></em>. Strassburg: Schlesier &amp; Schweikhardt.',
      ],
    },
    variants: ['Cl'],
  },
  {
    source: {
      title:
        'Woide’s MSS. belonging to the Clarendon Press (Crum’s copies & photographs)',
    },
    variants: ['Cl Pr'],
  },
  {
    source: {
      title: 'Crum, Coptic MSS. from Fayyûm, 1893, acc. to pp',
      description: [
        'Crum, W. E. (1893). <em><a href="https://archive.org/details/copticmanuscript00crumuoft/page/n5/mode/2up">Coptic Manuscripts brought from the Fayyum by W. M. Flinders Petrie, Esq., D.C.L. together with a papyrus in the Bodleian Library edited with commentaries and indices</a></em>. London: David Nutt.',
      ],
    },
    variants: ['CMSS'],
  },
  {
    source: {
      title: 'Crum, Coptic Ostraca, 1902',
      description: [
        'Crum, W. E. (1902). <em><a href="https://archive.org/details/copticostracafr00fundgoog/page/n4/mode/2up">Coptic Ostraca from the collections of the Egypt Exploration Fund, the Cairo Museum, and others</a></em>. London: Egypt Exploration Fund.',
      ],
    },
    variants: ['CO'],
    postfixes: {
      Ad: 'Addenda to lithographed texts',
      Index: undefined,
    },
  },
  {
    source: {
      title: 'Comptes Rendus de l’Acad. des lnscr., Paris, acc. to year & page',
      description: [
        '<em>Comptes rendus des séances de l’Académie des Inscriptions et Belles-Lettres</em> began in 1857. The volumes are listed and digitised on <a href="https://www.persee.fr/collection/crai">Persee.fr</a>. ',
      ],
    },
    variants: ['CR'],
  },
  {
    source: {
      title:
        'H. De Vis, Homélies Coptes (= Coptica I, V), 1922, 1929 (DeV alone = vol. I)',
      description: [
        'De Vis, H. (1922). <em><a href="https://archive.org/details/homliescoptesd01devi/page/n1/mode/2up">Homélies coptes de la Vaticane</a></em>. (Coptica, vol. I). Hauniae [Copenhagen]: Gyldendal.',
        'De Vis, H. (1929). <em><a href="https://archive.org/details/homliescoptesdel0000devi_r2q2/page/n7/mode/2up">Homélies coptes de la Vaticane</a></em>. (Coptica, vol. V). Hauniae [Copenhagen]: Gyldendal.',
      ],
    },
    variants: ['De V'],
  },
  {
    source: {
      title: 'The Difnar, ed. O’Leary, I, II, III, 1926-30',
      description: [
        'O’Leary, De L. (1926). <em><a href="https://iiif.lib.harvard.edu/manifests/view/drs:497805580$5i">The Difnar (Antiphonarium) of the Coptic Church (first four months) from the Manuscript in the John Rylands Library, Manchester, with fragments of a Difnar recently recovered at the Der Abu Makar in the Wadi n-Natrun</a></em>. London: Luzac &amp; Co.',
        'O’Leary, De L. (1928). <em><a href="https://iiif.lib.harvard.edu/manifests/view/drs:497805580$137i">The Difnar (Antiphonarium) of the Coptic Church</a><a href="https://www.copticplace.org/files/Difnar2.pdf">: Part II (second four months, Tubeh, Amshir, Barmahat and Barmuda) from the Vatican Codex Copt. Borgia 59</a></em>. London: Luzac &amp; Co.',
        'O’Leary, De L. (1930). <em><a href="https://iiif.lib.harvard.edu/manifests/view/drs:497805854$1i">The Difnar (Antiphonarium) of the Coptic Church: Part III (Months Bashons, Baounah, Abib, Mesre and the intercalary days of Nasi) from the Vatican Codex Copt. Borgia 53 (2). With an Appendix containing Hymn fragments preserved in Bristol Museum and Art Gallery</a></em>. London: Luzac &amp; Co.',
      ],
    },
    variants: ['Dif'],
  },
  {
    source: {
      title: 'Demotic Magical Papyrus, ed. Griffith & Thompson, 1904 ff',
      description: [
        'Griffith, F. Ll., &amp; Thompson, H. (1904). <em><a href="https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-1/page/n3/mode/2up">The Demotic Magical Papyrus of London and Leiden</a></em>. London: H. Grevel &amp; Co.',
        'Griffith, F. Ll., &amp; Thompson, H. (1905). <em><a href="https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-2/page/n1/mode/2up">The Demotic Magical Papyrus of London and Leiden</a></em>, Vol. II: hand copy of the text. London: H. Grevel &amp; Co.',
        'Griffith, F. Ll., &amp; Thompson, H. (1909). <em><a href="https://archive.org/details/the-demotic-magical-papyrus-of-london-and-leiden-v.-3/page/n1/mode/2up">The Demotic Magical Papyrus of London and Leiden</a></em>, Vol. III: Indices. London: H. Grevel &amp; Co.',
      ],
    },
    variants: ['DM'],
    postfixes: { Index: undefined, Indices: undefined },
  },
  {
    source: {
      title: 'R. Dozy, Supplém. aux diet. arabes, 1881',
      description: [
        'Dozy, R. (1881). <em><a href="https://gallica.bnf.fr/ark:/12148/bpt6k6254645z.texteImage">Supplément aux dictionnaires arabes</a></em>. Tome I. Leyde: E. J. Brill.',
        'Dozy, R. (1881). <em><a href="https://gallica.bnf.fr/ark:/12148/bpt6k6226013q.texteImage">Supplément aux dictionnaires arabes</a></em>. Tome II. Leyde: E. J. Brill.',
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
    postfixes: { Report: undefined },
  },
  {
    source: {
      title: 'Die Apokalypse d. Elias, ed. G. Steindorff, 1899',
      description: [
        'Steindorff, G. (1899). <em><a href="https://archive.org/details/bub_gb_Tpbji86R09kC/page/n3/mode/2up">Die Apokalypse des Elias, eine unbekannte Apokalypse und Bruchstücke der Sophonias-Apokalypse koptische texte, übersetzung, glossar</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, Neue Folge, Band 2, Heft 3a). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['El', 'EL'],
  },
  {
    source: {
      title:
        'phot. of vellum leaves lent by Enoch P. (Univ. of Michigan). Originals not now traceable',
    },
    variants: ['En Peterson'],
  },
  {
    source: {
      title:
        'Monastery of Epiphanius, ed. Winlock, Crum & Evelyn White, 1926, acc. to numbers',
      description: [
        'Winlock, H. E, &amp; Crum, W. E. (1926). <em><a href="https://archive.org/details/monasteryofepiph01winl/page/n7/mode/2up">The Monastery of Epiphanius at Thebes. Part I: The archaeological material by H. E. Winlock, and the literary material by W. E. Crum</a></em>. New York: The Metropolitan Museum of Art.',
        'Crum, W. E., &amp; Evelyn White, H. G. (1926). <em><a href="https://archive.org/details/monasteryofepiph02winl/page/n7/mode/2up">The Monastery of Epiphanius at Thebes. Part II: Coptic ostraca and papyri edited with translations and commentaries by W. E. Crum, and Greek ostraca and papyri edited with translations and commentaries by H. G. Evelyn White</a></em>. New York: The Metropolitan Museum of Art.',
      ],
    },
    variants: ['Ep'],
    postfixes: { App: 'Appendix' },
  },
  {
    source: {
      title: 'Études… dédiées à C. Leemans, 1885',
      description: [
        '<em><a href="https://www.google.co.uk/books/edition/%C3%89tudes_arch%C3%A9ologiques/ByowAAAAYAAJ?hl=en&amp;gbpv=1">Études archéologiques, linguistiques et historiques dédiées à Mr. le Dr. C. Leemans, à l’occasion du cinquantième anniversaire de sa nomination aux fonctions de Directeur du Musée archéologique des Pays-Bas</a></em>. (1885). Leide: E. J. Brill.',
      ],
    },
    variants: ['Et Leem'],
  },
  {
    source: {
      // NOTE: This was two separate entries (with an identical abbreviations)
      // in Crum's list.
      title:
        'New Texts from the Monastery of St. Macarius, ed. H. G. Evelyn White, 1926; or his copies of MSS from Nitria (in Coptic Museum, Cairo)',
      description: [
        'Evelyn White, H. G. (1926). <em><a href="https://archive.org/details/monasteriesofwdi01evel/page/n9/mode/2up">The Monasteries of the Wadi ‘n Natrûn, Part I: New Texts from the Monastery of Saint Macarius. Edited with an introduction on the Library at the Monastery of Saint Macarius by Hugh G. Evelyn White with an appendix on a Copto-Arabic Ms. by G. P. G. Sobhy</a></em>. (Publications of the Metropolitan Museum of Art Egyptian Expedition, Vol. 2). New York: The Metropolitan Museum of Art.',
      ],
    },
    variants: ['EW'],
  },
  {
    source: {
      title:
        'Griffith, Oxford Excavations in Nubia, in Liverpool Annals of Archaeol. & Anthropol. (1) xiii 17, (2) ib. 49, (3) xiv 57',
      description: [
        'Griffith, F. Ll. (1926). <a href="https://archive.org/details/annals-of-archaeology-and-anthropology_1926_13_1-2/page/n37/mode/2up">Oxford Excavations in Nubia</a>. <em>Annals of Archaeology and Anthropology</em>, XIII(1-2), 17-37, plus plates. ',
        'Griffith, F. Ll. (1926). <a href="https://archive.org/details/annals-of-archaeology-and-anthropology_1926_13_3-4/page/48/mode/2up">Oxford Excavations in Nubia</a>. <em>Annals of Archaeology and Anthropology</em>, XIII(3-4), 49-93, plus plates. ',
        'Griffith, F. Ll. (1927). <a href="https://archive.org/details/annals-of-archaeology-and-anthropology_1927_14_3-4/page/56/mode/2up">Oxford Excavations in Nubia</a>. <em>Annals of Archaeology and Anthropology</em>, XIV(3-4), 57-116, plus plates. ',
      ],
    },
    variants: ['Faras'],
  },
  {
    source: {
      title:
        'Forbes Robinson, Coptic Apocr. Gospels (= Texts & Studies iv), 1896',
      description: [
        'Robinson, F. (1896). <em><a href="https://archive.org/details/copticapocryphal0000unse/page/n1/mode/2up">Coptic Apocryphal Gospels</a></em>. (Texts and Studies: Contributions to Biblical and Patristic Literature, Vol. IV, No. 2). Cambridge: University Press.',
      ],
    },
    variants: ['FR'],
  },
  {
    source: {
      title: 'Georgi, Fragm. Evang. S. Iohannis, 1789',
      description: [
        'Georgi, A. A. (1789). <em><a href="https://www.google.co.uk/books/edition/Fragmentum_Evangelii_S_Iohannis_Graeco_C/tomXmGIDwOgC?hl=en&amp;gbpv=1">Fragmentum Evangelii S. Iohannis graeco-copto-thebaicum saeculi IV. Additamentum ex vetustissimis membranis lectionum Evangelicarum divinae missae cod. diaconici reliquiae et liturgica alia fragmenta veteris thebaidensium ecclesiae ante Dioscorum, ex Veliterno museo borgiano, nunc prodeunt in latinum versa et notis illustrata</a></em>. Romae: apud A. Fulgonium.',
      ],
    },
    variants: ['G Fr'],
  },
  {
    source: {
      title:
        'Greek-Coptic Glossary, ed. Bell & Crum, in Aegyptus vi 179, acc. to lines',
      description: [
        'Bell, H. I., &amp; Crum, W. E. (1925). <a href="https://www.jstor.org/stable/41201189?read-now=1&amp;seq=1#page_scan_tab_contents">A Greek-Coptic Glossary</a>. <em>Aegyptus</em>, 6, 177-226. ',
      ],
    },
    variants: ['Glos', 'Gloss'],
  },
  {
    source: {
      title: 'Georgi, Miracula S. Coluthi, 1793',
      description: [
        'Georgi, A. A. (1793). <em><a href="https://archive.org/details/bub_gb_FLw7D7xionYC/page/n1/mode/2up">De miraculis Sancti Coluthi et reliquiis actorum Sancti Panesniv maryrum thebaica fragmenta duo alterum auctius alterum nunc primum editum</a></em>. Romae: Apud A. Fulgonium.',
      ],
    },
    variants: ['G Mir'],
  },
  {
    source: {
      title: 'Göttinger Abhandlungen',
      description: [
        '<em>Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1839. Links to volumes from 1839-1890 are available digitised on <a href="https://www.biodiversitylibrary.org/bibliography/51047">Biodiversity Heritage Library</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/008602924">HathiTrust</a> in the US. ',
        '<em>Nachrichten von der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1894. Links to volumes from 1892-1923 available digitised on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=nachkongesgotph">The Online Books Page</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/000517694">HathiTrust</a> in the US. ',
      ],
    },
    variants: ['Gött A', 'Gött Abh'],
  },
  {
    source: {
      // NOTE: In Crum's list, this appears as ‘do. Nachrichten’.
      title: 'Göttinger Nachrichten',
      description: [
        '<em>Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1839. Links to volumes from 1839-1890 are available digitised on <a href="https://www.biodiversitylibrary.org/bibliography/51047">Biodiversity Heritage Library</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/008602924">HathiTrust</a> in the US. ',
        '<em>Nachrichten von der Königlichen Gesellschaft der Wissenschaften zu Göttingen, Philologisch-Historische Klasse</em> began in 1894. Links to volumes from 1892-1923 available digitised on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=nachkongesgotph">The Online Books Page</a> and some later volumes via <a href="https://catalog.hathitrust.org/Record/000517694">HathiTrust</a> in the US. ',
      ],
    },
    variants: ['Gött N', 'Gött Nachr'],
  },
  {
    source: {
      title: 'S. Gaselee, Parerga Coptica, 1912, 1914',
      description: [
        'S. Gaselee. (1912, 1914). <em><a href="https://catalog.hathitrust.org/Record/001327863">Parerga Coptica: I. De XXIV Senioribus Apocalypticis et Nominibus Eorum. II. De Abraha et Melchisedec. III. Hymnus de Sinuthio</a></em>. Cantabrigiae: Typis Academicis. [via US access only]',
      ],
    },
    variants: ['G Par'],
  },
  {
    source: {
      title: 'Studies Presented to F. Ll. Griffith, 1932',
      description: [
        '<em><a href="https://archive.org/details/studiespresented0000egyp/page/n7/mode/2up">Studies Presented to F. Ll. Griffith</a></em>. (1932). London: Egypt Exploration Society.',
      ],
    },
    variants: ['Griff Stu'],
  },
  {
    source: {
      title:
        'I. Guidi, Frammenti Copti I-VII (from ALR 1887 ff.), acc. to continuous pagination',
      description: [
        'Guidi, I. (1887-88). <a href="https://archive.org/details/frammenticopti00guid/page/46/mode/2up">Frammenti Copti (Nota I-VII)</a>. Reprinted from <em>Rendiconti della Reale Accademia dei Lincei. Classe di Scienze morali, storiche e filologiche</em>, Vols. 3(1-2)-4(1). ',
      ],
    },
    variants: ['Gu'],
  },
  {
    source: {
      title:
        'I. Guidi, Teste… sopra i Sette Dormienti (Mem. Acad. Linc., 1884)',
      description: [
        'Guidi, I. (1885). <em><a href="https://archive.org/details/testiorientalii01guidgoog/page/n4/mode/2up">Testi orientali inediti sopra i Sette Dormienti di Efeso</a></em>. (Reale Accademia dei Lincei, Memorie della Classe di scienze morali, storiche e filogiche, ser. 3, 12, 1884, 343-445). Roma: Tipografia della R. Accademia dei Lincei.',
      ],
    },
    variants: ['Gu Dorm'],
  },
  {
    source: {
      title: 'G. Horner’s text of N.T., 1898-1924',
      description: [
        'Horner, G. (1898-1905). <em> The Coptic Version of the New Testament in the Northern Dialect, Otherwise Called Memphitic and Bohairic, with Introduction, Critical Apparatus, and Literal English Translation</em> (4 vols.). Oxford: Clarendon Press. <ul><li><a href="https://archive.org/details/copticversionofn01horn/page/n5/mode/2up">Volume I</a>: The Gospels of S. Matthew and S. Mark, edited from Ms. Huntingdon 17 in the Bodleian Library </li><li><a href="https://archive.org/details/copticversionofn02horn/page/n7/mode/2up">Volume II</a>: The Gospels of S. Luke and S. John, edited from Ms. Huntingdon 17 in the Bodleian Library </li><li><a href="https://archive.org/details/copticversionofn03horn/page/n5/mode/2up">Volume III</a>: The Epistles of S. Paul, edited from Ms. Oriental 424 in the British Museum </li><li><a href="https://archive.org/details/copticversionofn04horn/page/n7/mode/2up">Volume IV</a>: The Catholic Epistles and the Acts of the Apostles, edited from Ms. Oriental 424 in the British Museum; and The Apocalypse, edited from Ms. Curzon 128 in the care of the British Museum </li></ul>',
        'Horner, G. (1911-1924). <em>The Coptic Version of the New Testament in the Southern Dialect, Otherwise Called Sahidic and Thebaic, with Critical Apparatus, Literal English Translation, Register of Fragments and Estimate of the Version</em> (7 vols.). Oxford: Clarendon Press. <ul><li><a href="https://archive.org/details/copticversionofn01unse/page/n7/mode/2up">Volume I</a>: The Gospels of S. Matthew and S. Mark </li><li><a href="https://archive.org/details/copticversionofn02unse/page/n5/mode/2up">Volume II</a>: The Gospel of S. Luke </li><li><a href="https://archive.org/details/copticversionofn03unse/page/n5/mode/2up">Volume III</a>: The Gospel of S. John, register of fragments, etc., facsimiles </li><li><a href="https://archive.org/details/copticversionofn04hornuoft/page/n3/mode/2up">Volume IV</a>: The Epistles of S. Paul </li><li><a href="https://archive.org/details/copticversionofn05unse/page/n3/mode/2up">Volume V</a>: The Episles of S. Paul (continued), register of fragments, etc. </li><li><a href="https://archive.org/details/copticversionofn06hornuoft/page/n3/mode/2up">Volume VI</a>: The Acts of the Apostles </li><li><a href="https://archive.org/details/copticversionofn07hornuoft/page/n5/mode/2up">Volume VII</a>: The Catholic Epistles and the Apocalypse </li></ul>',
      ],
    },
    variants: ['H'],
  },
  {
    source: {
      title: 'H. R. Hall, Coptic & Greek Texts… Brit. Museum, 1905, acc. to pp',
      description: [
        'Hall, H. R. (1905). <em><a href="https://archive.org/details/mdp.39015020865567/page/n9/mode/2up">Coptic and Greek Texts of the Christian Period from Ostraka, Stelae, etc. in the British Museum</a></em>. London: British Museum.',
      ],
    },
    variants: ['Hall'],
  },
  {
    source: {
      title: 'G. Horner, Consecration of Church & Altar, 1902',
      description: [
        'Horner, G. (1902). <em><a href="https://archive.org/details/serviceforconsec00hornuoft/page/n3/mode/2up">The Service for the Consecration of a Church and Altar According to the Coptic Rite, Edited with Translations from a Coptic and Arabic Manuscript of A.D. 1307 for the Bishop of Salisbury</a></em>. London: Harrison and Sons.',
      ],
    },
    variants: ['H Cons'],
  },
  {
    source: {
      title:
        'W. Hengstenberg in Beiträge z. Forschung… Heft III, J. Rosenthal, München, 1914',
      description: [
        'Hengstenberg, W. (1914). <a href="https://archive.org/details/hvd.32044095331146/page/n131/mode/2up">Koptische Papyri</a>. In <em>Beiträge zur Forschung: Studien und Mitteilungen aus dem Antiquariat Jacques Rosenthal München, Heft III</em> (pp. 92-100, plus plates). München: Verlag von Jacques Rosenthal. ',
      ],
    },
    variants: ['Heng B'],
  },
  {
    source: {
      title:
        'E. Amélineau, De Historia Lausiaca, 1887; but Hist Laus = E. C. Butler’s edition of Greek text (= Texts & Studies vi)',
      description: [
        'Amélineau, E. (1887). <em><a href="https://archive.org/details/dehistorialausia00am/page/n1/mode/2up">De Historia Lausiaca: Quænam sit hujus ad monachorum Aegyptiorum historiam scribendam utilitas</a></em>. Paris: E. Leroux.',
        'Butler, D. C. (1898). <em><a href="https://archive.org/details/lausiachistoryof01pall/page/n7/mode/2up">The Lausiac History of Palladius. Vol. I: A Critical Discussion Together with Notes on Early Egyptian Monachism</a></em>. (Texts and Studies: Contributions to Biblical and Patristic Literature, Vol. 6, No. 1). Cambridge: University Press.',
        'Butler, D. C. (1904). <em><a href="https://archive.org/details/lausiachistoryof02pall/page/n7/mode/2up">The Lausiac History of Palladius. Vol. II: The Greek Text edited with Introduction and Notes</a></em>. (Texts and Studies: Contributions to Biblical and Patristic Literature, Vol. 6, No. 2). Cambridge: University Press.',
      ],
    },
    variants: ['HL'],
  },
  {
    source: {
      title:
        'Griffith, The Old Coptic Horoscope, in AZ 38 76 ff., acc. to pp. of publication',
      description: [
        'Griffith, F. Ll. (1900). <a href="https://archive.org/details/zeitschriftfr38brug/page/70/mode/2up">The Old Coptic Horoscope of the Stobart Collection</a>. <em>Zeitschrift für ägyptische Sprache und Altertumskunde</em>, 38, 71-93. ',
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
      description: [
        'Horner, G. (1904). <em><a href="https://archive.org/details/statutesapostle00unkngoog/page/n6/mode/2up">The Statutes of the Apostles or Canones Ecclesiastici. Edited with Translation and Collation from Ethiopic and Arabic MSS.; Also a Translation of the Saʿidic and Collation of the Bohairic Versions; and Saʿidic Fragments</a></em>. London: Williams &amp; Norgate.',
      ],
    },
    variants: ['H St', 'Stat'],
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
      description: [
        'Rossi, I. (1808). <em><a href="https://archive.org/details/bub_gb_IWhHswE1yv0C/page/n3/mode/2up">Etymologiae Aegyptiacae</a></em>. Rome.',
      ],
    },
    variants: ['Ig R'],
  },
  {
    source: {
      title: 'Imperial Russian Archaeolog. Soc. xviii, 1907 (Turaief)',
      description: [
        'Turayev, B. A. (1907). <a href="https://archive.org/details/Notes-Imperial-Russian-Archaeological-Society/ZVORAO_18_1908/page/n55/mode/2up">Ахмимскій папирусъ изъ коллекціи Н. П. Лихачева [An Akhmim Papyrus from the Collection of N. P. Likhachov]</a>. <em>Записки Восточного Отдѣления Императорского Русского Археологическаго Общества</em> [Transactions of the Eastern Branch of the Imperial Russian Archaeological Society], 18, 28-30. ',
      ],
    },
    variants: ['Imp Russ Ar S', 'Imp Russ Arch S'],
  },
  {
    source: {
      title:
        'Crum & Steindorff, Kopt. Rechtsurkunden… aus Djême, acc. to no. & line',
      description: [
        'Crum, W. E., &amp; Steindorff, G. (1912). <em><a href="https://archive.org/details/koptischerechtsu00crum/page/n3/mode/2up">Koptische Rechtsurkunden des achten Jahrhunderts aus Djême (Theben). I. Band: Text und Incides</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['J'],
    postfixes: {
      Leip: 'two such papyri in Leipzig University, Aegyptologisches Institut (cf below)',
    },
  },
  {
    source: {
      title: 'Journal Asiatique, acc. to year, vol. & page',
      description: [
        '<em>Journal asiatique</em> began in 1822. Volumes are digitised and available on <a href="https://gallica.bnf.fr/ark:/12148/cb34348774p/date">Gallica</a> up to 1940. There are also volumes available on <a href="https://catalog.hathitrust.org/Record/006147183">HathiTrust</a> and listed on <a href="https://www.egyptologyforum.org/EEFDigijournals.html">EgyptologyForum.org</a>. ',
      ],
    },
    variants: ['JA'],
  },
  {
    source: {
      title: 'H. I. Bell, Jews & Christians, 1924, acc. to pp',
      description: [
        'Bell, H. I. (1924). <em><a href="https://archive.org/details/jewschristiansin0000bell/page/n3/mode/2up">Jews and Christians in Egypt: The Jewish Troubles in Alexandria and the Athanasian Controversy</a></em>. London: British Museum.',
      ],
    },
    variants: ['J & C'],
  },
  {
    source: {
      title: 'Journ. of American Orient. Soc',
      description: [
        'The <em>Journal of the American Oriental Society</em> began in 1843-49. All volumes to date are available via <a href="https://www.jstor.org/journal/jameroriesoci">JSTOR</a>. ',
      ],
    },
    variants: ['JAOS', 'J Am Or Soc'],
  },
  {
    source: {
      title:
        'P. Jernstedt, Kopt. Papyri d. Asiat. Mus. (Soc. Egyptol. Univ. Leningrad, no. 6, 1930), acc. to numbers',
      description: [
        'Jernstedt, P. (1930). Koptische Papyri des Asiatischen Museums. <em>Сборник египтологического кружка при Ленинградском Государственном Университете</em>, VI, 21–44. [If you know of a digital copy, please <a href="https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/"> contact me</a>] ',
      ],
    },
    variants: ['Jern'],
  },
  {
    source: {
      title:
        'H. Junker, Koptische Poesie, 1908, 1911 (from Oriens Christianus.)',
      description: [
        'Junker, H. (1908-1911). <em><a href="https://archive.org/details/koptischepoesied0000junk/page/n5/mode/2up">Koptische Poesie des 10. Jahrhunderts</a></em> (2 Bände). Berlin: Karl Curtius. [Reprinted 1977, Hildesheim &amp; New York: Georg Olms Verlag].',
      ],
    },
    variants: ['JKP'],
  },
  {
    source: {
      title:
        'A. A. Schiller, Ten Coptic Legal Texts, New York, 1932 (includes JLeip, v above), acc. to numbers & lines',
      description: [
        'Schiller, A. A. (1932). <em><a href="https://archive.org/details/in.ernet.dli.2015.44575/page/n5/mode/2up">Ten Coptic Legal Texts Edited with Translation, Commentary, and Indexes Together with an Introduction</a></em>. New York: Metropolitan Museum of Art.',
      ],
    },
    variants: ['J Sch'],
  },
  {
    source: {
      title: 'Journal of Theological Studies',
      description: [
        '<em>The Journal of Theological Studies</em> began in 1899. Its volumes are available through <a href="https://www.jstor.org/journal/jtheostud">JSTOR</a> with institutional access. Volumes from 1899 to 1929 are hosted on Archive.org and linked on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=jtheostudies">The Online Books Page</a>. Others are available through <a href="https://catalog.hathitrust.org/Record/000681411">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['JTS'],
  },
  {
    source: {
      title:
        'A. Kircher, the Scalæ in Lingua Aegyptiaca Restituta, variants from Loret in Ann. I and other MSS',
      description: [
        'Kircher, A. (1644). <em><a href="https://www.google.co.uk/books/edition/Athanasii_Kircheri_Lingua_Aegyptiaca_res/qEtB1x0frAIC?hl=en&amp;gbpv=1">Lingua Aegyptiaca Restituta. Opus Tripartium</a></em>. Rome: Hermann Scheus.',
        'Loret, V. (1900). <a href="https://archive.org/details/AnnalesDuServiceDesAntiquitsDeLegyptevolume1/page/n63/mode/2up">Les livres III et IV (animaux et végétaux) de la Scala Magna de Schams-Ar-Riâsah</a>. <em>Annales du Service des antiquités de l’Egypte</em>, 1, 48-63 (edition), 215-229 (indices). ',
        // NOTE: While we generally opted for referencing sources that are
        // hosted externally, Macomber's PDF's are hosted on our Google Drive.
        'Macomber, F. (2020). <i>The Scala Magna of Shams al-Riʾāsah Abū al-Barakāt.</i><ul><li><a href="https://drive.google.com/file/d/1T3Nmg6asUsj7C156txX4jm2iLHZlKHyx/view">Volume I: Introduction, Text, Translation, and Notes.</a></li><li><a href="https://drive.google.com/file/d/1T8F7HFolW1FNyU6bqeza5qzyRrr9OAVr/view">Volume II: Apparatus of Variant Readings and Indexes.</a></li></ul>',
      ],
    },
    variants: ['K'],
  },
  {
    source: {
      title:
        'ⲡϫⲱⲙ ⲛⲧⲉ ⲡⲓⲑⲱϩⲥ ⲉⲑ︦ⲩ︦ (Kitâb al-Masḥah, ay al-Ḳandîl), ed. C. Labîb, Cairo, AM. 1625, v TRit 144 ff',
      description: [
        'Labib, C. Y. (1909). <em><a href="https://mc.dlib.nyu.edu/files/books/columbia_aco003890/columbia_aco003890_hi.pdf">Kitāb al-Masḥah, (ʾay al-Qandīl) maʿa Ṣalāt al-Qiddīs ʾAbū Tarbū</a> [كتاب المسحة، (أي القنديل) مع صلاة القديس ابو تربو — ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ⲡⲓⲑⲱϩⲥ ⲉ︦ⲑ︦ⲩ︦ ⲛⲉⲙ ⲡⲓϣ̀ⲗⲏⲗ ⲛ̀ⲧⲉ ⲁⲃⲃⲁ ⲥ̀ⲑⲉⲣⲡⲟⲩ]</em>. Cairo: Heliopolis Press.',
      ],
    },
    variants: ['Kandil'],
  },
  {
    source: {
      title: 'O. von Lemm, Kleine Kopt. Studien, acc. to continuous pagination',
      description: [
        'Parts 1-58 published in the <em>Bulletin de l’Académie Impériale des Sciences de St.-Pétersbourg</em>, 1899-1909. Parts I-IX, X-XX, XXI-XXV, XXVI-XLV, XXVI-XLV (Schluss) are available on <a href="https://www.mathnet.ru/php/archive.phtml?wshow=paper&amp;jrnid=im&amp;paperid=4650&amp;option_lang=eng">Mathnet.ru</a>. Part XLVI-L are available on <a href="https://www.orientalstudies.ru/rus/index.php?option=com_publications&amp;Itemid=75&amp;pub=8369">OrientalStudies.ru</a>. Parts LI-LV and LVI-LVIII are outstanding. ',
      ],
    },
    variants: ['KKS'],
  },
  {
    source: {
      title: 'J. Krall, Kopt. Texte (Rainer Corpus II), acc. to numbers',
      description: [
        'Krall, J. (1895). <em><a href="https://www.google.co.uk/books/edition/Koptische_Texte_Bd_Rechtsurkunden/VlcPAQAAMAAJ?hl=en&amp;gbpv=1&amp;pg=PR3&amp;printsec=frontcover">Corpus papyrorum Raineri archiducis Austriae. Band II: Koptische Texte</a></em>. Wien: Verlag der Kaiserlich-Königlichen Hof- und Staatsdruckerei.',
      ],
    },
    variants: ['Kr'],
  },
  {
    source: {
      title:
        'A. Kropp, Ausgewählte Kopt. Zaubertexte, 1930-31, numbered by letters A, B &c',
      description: [
        'Kropp, A. M. (1931). <em><a href="https://archive.org/details/ausgewhltekoptis0012krop/page/n9/mode/2up">Ausgewählte koptische Zaubertexte. Band I: Textpublikation</a></em>. Bruxelles: Fondation Égyptologique Reine Élisabeth.',
        'Kropp, A. M. (1931). <em><a href="https://archive.org/details/ausgewhltekoptis0003krop/page/n5/mode/2up">Ausgewählte koptische Zaubertexte. Band II: Übersetzungen und Anmerkungen</a></em>. Bruxelles: Fondation Égyptologique Reine Élisabeth.',
        'Kropp, A. M. (1930). <em><a href="https://archive.org/details/ausgewhltekoptis0003krop/page/n5/mode/2up">Ausgewählte koptische Zaubertexte. Band III: Einleitung in koptische Zaubertexte</a></em>. Bruxelles: Fondation Égyptologique Reine Élisabeth.',
      ],
    },
    variants: ['Kropp'],
    postfixes: {
      A: undefined,
      B: undefined,
      C: undefined,
      D: undefined,
      E: undefined,
      F: undefined,
      G: undefined,
      H: undefined,
      J: undefined,
      K: undefined,
      M: undefined,
      R: undefined,
    },
  },
  {
    source: {
      title:
        'C. Labîb, Coptic-Arabic Dictionary (ⲡⲓⲗⲉⲝⲓⲕⲟⲛ ⲛϯⲁⲥⲡⲓ ⲛⲧⲉ ⲛⲓⲣⲉⲙⲛⲭⲏⲙⲓ Ḳâmûs al-Luġah al-Ḳibṭîyah al Maṣrîyah), Cairo, AM. 1611 ff',
      description: [
        'Labib, C. Y. (1895-1915, 1940). <em><a href="https://archive.org/details/LAB1895COPAR/1.%D9%82%D8%A7%D9%85%D9%88%D8%B3%20%D8%A7%D9%84%D9%84%D8%BA%D8%A9%20%D8%A7%D9%84%D9%82%D8%A8%D8%B7%D9%8A%D8%A9%20%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%8A%D8%A9/">Qāmūs al-Luġah al-Qibṭiyyah al-Miṣriyyah</a> [قاموس اللغة القبطية المصرية — ⲡⲓⲗⲉⲝⲓⲕⲟⲛ ⲛ̀ϯⲁⲥⲡⲓ ⲛ̀ⲧⲉ ⲛⲓⲣⲉⲙⲛ̀ⲭⲏⲙⲓ]</em>. (5 parts with part 6 published posthumously). Al-Waṭanniya Press.',
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
      description: [
        'La Croze, M. V. (1775). <em><a href="https://www.digitale-sammlungen.de/en/view/bsb10522488?page=6,7">Lexicon Aegyptiaco-Latinum</a></em>. Edited by C. Scholtz and C. G. Woide. Oxford: Clarendon Press.',
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
      description: [
        'Father Bāḫūm al-Baramūsī, &amp; Deacon ʿUryān Faraj. (1921). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3209362">Kitāb al-Laqān wa-l-Saǧdah</a>. [كتاب اللقان والسجدة — ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ϯⲗⲁⲕⲁⲛⲏ ⲛⲉⲙ ⲡⲓϫⲓⲛⲟⲩⲱϣⲧ ⲫⲏⲉⲧⲉⲣⲁ̀ⲙⲁϩⲓ ⲉ̀ϫⲉⲛ ϯⲗⲁⲕⲁⲛⲏ ⲛ̀ⲧⲉ ⲡ̀ϣⲁⲓ ⲙ̀ⲡ̀ϫⲓⲛⲱⲙⲥ : ⲛⲉⲙ ⲡⲓⲉ︦ ⲛ̀ⲛⲓϣϯ : ⲛⲉⲙ ⲛⲉⲛⲓⲟϯ ⲛ̀ⲁ̀ⲡⲟⲥⲧⲟⲗⲟⲥ : ⲛⲉⲙ ϯⲡⲁⲛⲧⲏⲕⲟⲥⲧⲏ]</em>. Cairo: Heliopolis Press.',
      ],
    },
    variants: ['Lakan'],
  },
  {
    source: {
      title: 'Lemm, Der Alexanderroman',
      description: [
        'Lemm, O. von. (1903). <em><a href="https://phaidrabg.bg.ac.rs/open/o:556">Der Alexanderroman bei den Kopten: Ein Beitrag zur Geschichte der Alexandersage im Orient</a></em>. St. Petersburg: L’Académie Impériale des Sciences.',
      ],
    },
    variants: ['L Al'],
  },
  {
    source: {
      title: 'Die sogen. Gnomen d. Concils v. Nicaea (Dissert.), Beirut, 1912',
      description: [
        'Lammeyer, J. (1912). <em>Die sogenannten Gnomen des Konzils von Nicaea. Ein homiletischer Traktat des 4. Jahrhunderts unter Zugrundelegung erstmaliger Edition des koptisch-sahidischen Handschriftenfragments der Bibliothèque Nationale zu Paris Copte-sahidique 129, 14 (75-82) ins Deutsche übersetzt und untersucht</em>. Beirut. [If you know of a digital copy, please <a href="https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/"> contact me</a>] ',
      ],
    },
    variants: ['Lammayer'],
  },
  {
    source: {
      title:
        'A. van Lantschoot, Recueil de Colophons… sahidiques, 1929, acc. to numbers; also copies by',
      description: [
        'Van Lantschoot, A. (1929). <em><a href="https://archive.org/details/recueildescoloph0000lans/page/n5/mode/2up">Colophons des manuscrits chrétiens d’Égypte. Tome I: Les colophons coptes des manuscrits sahidiques</a></em>. Louvain: J.-B. Istas.',
      ],
    },
    variants: ['Lant.', 'Lant'],
  },
  {
    source: {
      title: 'Lemm, Apokryphe Apostelacten',
      description: [
        'Lemm, O. von. (1890). <em><a href="https://www.google.co.uk/books/edition/Koptische_Apokryphe_Apostelacten/7hJik4M60hoC?hl=en&amp;gbpv=1">Koptische Apokryphe Apostelacten</a></em>. St. Petersburg: Académie Impériale des Sciences.',
      ],
    },
    variants: ['L Ap'],
  },
  {
    source: {
      title: 'Lemm, Sahidische Bibelfragmente I, II, III',
      description: [
        'Lemm, O. von. (1890). <a href="https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_10_1890_02_lemm.pdf">Sahidische Bibelfragmente. I</a>. <em>Bulletin de l’Académie impériale des sciences de St.-Pétersbourg</em>, X, 5-16. ',
        'Lemm, O. von. (1890). <a href="https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_10_1890_04_lemm.pdf">Sahidische Bibelfragmente. II</a>. <em>Bulletin de l’Académie impériale des sciences de St.-Pétersbourg</em>, X, 79-97. ',
        'Lemm, O. von. (1906). <a href="https://www.orientalstudies.ru/rus/images/pdf/journals/Melanges_Asiatiques_12_1902-1906_08_lemm.pdf">Sahidische Bibelfragmente. III</a>. <em>Bulletin de l’Académie impériale des sciences de St.-Pétersbourg</em>, XII, 79-97. ',
      ],
    },
    variants: ['L Bib'],
  },
  {
    source: {
      // NOTE: This occurs as LCypr in the list, but has been found to be cited
      // as LCyp in the text.
      title: 'Lemm, Cyprian v. Antiochien',
      description: [
        'Lemm, O. von. (1899). <em><a href="https://www.biodiversitylibrary.org/item/212311#page/559/mode/1up">Sahidische Bruchstücke der Legende von Cyprian von Antiochien</a></em>. (Mémoires de l’Académie impériale des sciences de St.-Pétersbourg, VIIIe série, Tome IV, No. 6). St. Petersburg.',
      ],
    },
    variants: ['L Cypr', 'L Cyp'],
  },
  {
    source: {
      title: 'Lemm, Eine dem Dionysios Areopag. zugeschr. Schrift',
      description: [
        'Lemm, O. von. (1900). <em><a href="https://www.biodiversitylibrary.org/item/94350#page/325/mode/1up">Eine dem Dionysius Areopagita zugeschriebene Schrift in koptischer Sprache</a></em>. (Bulletin de l’Académie impériale des sciences de St.-Pétersbourg, V. série, Tome XII, No. 3). St. Petersburg.',
      ],
    },
    variants: ['L Di'],
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
      description: [
        '<em>Berichte über die Verhandlungen der Königlich Sächsischen Gesellschaft der Wissenschaften zu Leipzig, Philologisch-Historische Klasse</em> began in 1849. Volumes from 1849-1899 (1-51) available digitised on <a href="https://catalog.hathitrust.org/Record/008559830">HathiTrust</a> with later volumes via US access. ',
      ],
    },
    variants: ['Leip Ber'],
  },
  {
    source: {
      title: 'Manuscrits coptes du Musée… à Leide, 1897, acc. to pages',
      description: [
        'Pleyte, W., &amp; Boeser, P. A. A. (1897). <em><a href="https://archive.org/details/manuscrits-coptes-du-musee-d-antiquite/page/n1/mode/2up">Manuscrits coptes du musée d’antiquités des Pays-Bas à Leide</a></em>. Leide: E. J. Brill.',
      ],
    },
    variants: ['Leyd'],
  },
  {
    source: {
      title: 'Antiquités Coptes (Catal. du Musée), 1900, acc. to pp',
      description: [
        'Pleyte, W., &amp; Boeser, P. A. A. (1900). <em><a href="https://catalog.hathitrust.org/Record/008693139">Catalogue du musée d’ antiquités à Leide, sousdivision F. Égypte, antiquités coptes</a></em>. Leide: E. J. Brill. [Accessible in the US via HathiTrust.]',
      ],
    },
    variants: ['Leyd AC'],
  },
  {
    source: {
      title: 'Lemm, Iberica',
      description: [
        'Lemm, O. von. (1906). <em><a href="https://www.biodiversitylibrary.org/item/212314#page/653/mode/1up">Iberica</a></em>. (Mémoires de l’Académie impériale des sciences de St.-Pétersbourg, VIIIe série, Tome VII, No. 6). St. Petersburg.',
      ],
    },
    variants: ['L Ib'],
  },
  {
    source: {
      title: 'Lemm, Bruchstücke Kopt. Märtyrerakten',
      description: [
        'Lemm, O. von. (1913). <em><a href="https://www.biodiversitylibrary.org/item/212319#page/10/mode/1up">Bruchstücke koptischer Märtyrerakten. I-V.</a></em> (I. Theodoros des Orientalen und Panikyros des Persers und Leontios des Arabers; II. Theodoros des Orientalen; III. Leontios des Arabers; IV. Heraklides; V. Isidoros). (Mémoires de l’ Académie impériale des sciences de St.-Pétersbourg, VIIIe série, Tome XII, No. 1). St. Petersburg.',
      ],
    },
    variants: ['L Mär'],
  },
  {
    source: {
      title: 'Lemm, Koptische Miscellen, acc. to continuous pagination',
      description: [
        'Lemm, O. von. (1907-1915). Koptische Miscellen I-CXLVIII published in volumes of the <em>Bulletin de l’Académie Impériale des Sciences de St.-Pétersbourg, VI série</em>. Listed and linked on <a href="https://ancientworldonline.blogspot.com/2012/05/digitized-coptic-publications-of-oscar.html">The Ancient World Online</a>. ',
      ],
    },
    variants: ['L Mis'],
  },
  {
    source: {
      title: 'Im. Löw, Aramäische Pflanzennamen, 1881, acc. to pp',
      description: [
        'Löw, I. (1881). <em><a href="https://archive.org/details/AramaeischePflanzennamen/page/n7/mode/2up">Aramæische Pflanzennamen</a></em>. Leipzig: Wilhelm Engelmann.',
      ],
    },
    variants: ['Löw'],
  },
  {
    source: {
      title: 'Flora der Juden, 1926 ff',
      description: [
        'Löw, I. (1924-1934). <em><a href="https://sammlungen.ub.uni-frankfurt.de/freimann/content/titleinfo/781127">Die Flora der Juden</a></em> (4 Bde.). (Veröffentlichungen der Alexander Kohut Memorial Foundation, Band II-IV, VI). Wien und Leipzig: R. Löwit Verlag.',
      ],
    },
    variants: ['Löw F'],
  },
  {
    source: {
      title: 'A. Mallon, Grammaire copte², 1907',
      description: [
        'Mallon, Al. (1907). <em><a href="https://archive.org/details/grammairecopteav00mall/page/n7/mode/2up">Grammaire copte: Avec bibliographie, chrestomathie et vocabulaire</a></em>. Deuxième édition. Beyrouth: Imprimerie Catholique.',
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
  },
  {
    source: {
      title:
        'copies of Chester Beatty’s unpublished Manichaean papyri by H. J. Polotsky & H. Thompson; at Berlin',
    },
    variants: ['Mani 2'],
  },
  {
    source: {
      title: 'Manichäische Homelien, ed. Polotsky, 1934',
      description: [
        'Polotsky, H. J. (1934). <em><a href="https://archive.org/details/manichaischehomi0000polo/page/n5/mode/2up">Manichäische Homilien</a></em>. (Manichäische Handschriften der Sammlung A. Chester Beatty, Band I). Stuttgart: W. Kohlhammer.',
      ],
    },
    variants: ['Mani H'],
  },
  {
    source: {
      title: 'Kephalaia, edd. Polotsky & A. Böhlig, 1934 ff',
      description: [
        'Polotsky, H. J. (1940). <em><a href="https://archive.org/details/kephalaia0000mani/page/n1/mode/2up">Kephalaia. 1. Hälfte (Lieferung 1-10)</a></em>. (Manichäische Handschriften der Staatslichen Museen Berlin, Band I). Stuttgart: W. Kohlhammer.',
        'Böhlig, A. (1966). <em><a href="https://archive.org/details/kephalaia0001staa/page/n5/mode/2up">Kephalaia. 2. Hälfte (Lieferung 11-12)</a></em>. (Manichäische Handschriften der Staatslichen Museen Berlin, Band I). Stuttgart: W. Kohlhammer.',
      ],
    },
    variants: ['Mani K'],
  },
  {
    source: {
      title: 'A Manichaean Psalm-book, Pt. ii, ed. C. R. C. Allberry, 1938',
      description: [
        'Allberry, C. R. C. (1938). <em><a href="https://archive.org/details/manichaeanpsalmb0000allb/page/n5/mode/2up">A Manichean Psalm-Book, Part II</a></em>. (Manichean Manuscripts in the Chester Beatty Collection, Volume II). Stuttgart: W. Kohlhammer.',
      ],
    },
    variants: ['Mani P'],
  },
  {
    source: {
      title: 'Lightfoot, Ignatius¹, ii 1 865 ff',
      description: [
        'Lightfoot, J. B. (1899). <em><a href="https://babel.hathitrust.org/cgi/pt?id=uc1.l0051084895&amp;seq=289">The Apostolic Fathers, Part II: S. Ignatius, S. Polycarp. Revised Texts with Introductions, Notes, Dissertations, and Translations</a></em>, 2nd ed., Vol. III, pp. 275–298. London: Macmillan and Co. [Crum’s page numbering seems to refer to the 1st edition.]',
      ],
    },
    variants: ['Mart Ign'],
  },
  {
    source: {
      title: 'Mélanges de la Faculté Orientale, Université de Beyrouth',
      description: [
        '<em>Mélanges de l’Université Saint-Joseph</em> began in 1922 (volume 8-), succeeding <em>Mélanges de la Faculté Orientale</em>, which began in 1906, and continued its issue numbering. All volumes are listed, digitised and available for viewing on <a href="https://www.persee.fr/collection/mefao">Persee.fr</a>. ',
      ],
    },
    variants: ['Mél Or'],
  },
  {
    source: {
      title: 'Annales du Musée Guimet, Paris',
      description: [
        '<em>Annales du Musée Guimet</em> began in 1880. Many volumes are available through <a href="https://catalog.hathitrust.org/Record/000054404">HathiTrust</a>, though some only through US access. Others are also listed and linked on <a href="https://fr.wikisource.org/wiki/Annales_du_Mus%C3%A9e_Guimet">fr.WikiSource.org.</a> Crum seems only to cite two volumes: <ul><li>Amélineau, E. (1889). <em><a href="https://archive.org/details/monumentspourser00amel/page/n5/mode/2up">Monuments pour servir à l’histoire de l’Égypte chrétienne au IVe siècle: Histoire de Saint Pakhôme et de ses communautés: Documents coptes et arabes inédits, publiés et traduits</a></em>. (Annales du Musée Guimet, Tome 17). Paris: Ernest Leroux.</li><li>Amélineau, E. (1894). <em><a href="https://archive.org/details/monumentspourser00amel_0/page/n8/mode/2up">Histoire des monastères de la Basse-Égypte: Vies des saints Paul, Antoine, Macaire, Maxime et Domèce, Jean le Nain, etc.: Texte copte et traduction française</a></em>. (Annales du Musée Guimet, Tome 25). Paris: Ernest Leroux.</li></ul>',
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
  },
  {
    source: {
      title: 'Mémoires de l’Instit. Égyptien, Cairo',
      description: [
        '<em>Mémoires présentés à l’Institut Egyptien</em> began in 1862. Volumes as listed, digitised and accessible on the <a href="https://digi.ub.uni-heidelberg.de/diglit/meminstitutegyptien?ui_lang=eng">Heidelberg digital library</a>. ',
      ],
    },
    variants: ['MIE'],
  },
  {
    source: {
      title: 'Mémoires… de l’Instit. franç. d’Archéol. orient. au Caire',
      description: [
        '<em>Mémoires publiés par les membres de l’Institut français d’archéologie orientale du Caire</em> (MIFAO) began in 1902. Volumes are listed and linked on <a href="https://www.egyptologyforum.org/EEFSeries.html#9.2">EgyptologyForum.org</a>. ',
      ],
    },
    variants: ['MIF'],
  },
  {
    source: {
      title: 'J. A. Mingarelli, Aegyptiorum Codd. Reliquiae, 1785',
      description: [
        'Mingarelli, G. L. (1785). <em><a href="https://archive.org/details/aegyptiorumcodic00ming/page/n3/mode/2up?ref=ol">Aegyptiorum codicum reliquiæ Venetiis in bibliotheca Naniana asservatæ</a></em>. Bononiae: Typis Laelii a Vulpe.',
      ],
    },
    variants: ['Ming'],
  },
  {
    source: {
      title: 'Mémoires… de la Mission archéol. franç. au Caire',
      description: [
        '<em>Mémoires publiés par les membres de la Mission archéologique française au Caire</em> (MMAF) began in 1884. Volumes are listed and linked on <a href="https://www.egyptologyforum.org/EEFSeries.html#9.1">EgyptologyForum.org</a>. ',
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
      description: [
        'Hyvernat, H. (Ed.). (1922). <em><a href="https://archive.org/details/PhantoouLibrary/m566%20Combined%20%28Bookmarked%29/page/n1/mode/2up">Codices coptici photographice expressi: Bibliothecae Pierpont Morgan</a></em> (56 vols.). Rome.',
      ],
    },
    variants: ['Mor'],
  },
  {
    source: {
      title: 'Mittheilungen a. d. Papyrussamml. Erzh. Rainer',
      description: [
        '<em>Mittheilungen aus der Sammlung der Papyrus Erzherzog Rainer</em> published in 6 volumes (1887-1897). Volumes are linked on <a href="https://ancientworldonline.blogspot.com/2013/02/open-access-journal-mitteilungen-aus.html">The Ancient World Online</a>. ',
      ],
    },
    variants: ['MR'],
  },
  {
    source: {
      title:
        'Manuscrits coptes, par H. Munier (Catal. Gén. Musée du Caire, 1916), acc. to pages',
      description: [
        'Munier, H. (1916). <em><a href="https://archive.org/details/manuscritscoptes00muni/page/n5/mode/2up">Manuscrits coptes</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 9201-9301). Le Caire: Impr. de l’ Institut français d’archéologie orientale.',
      ],
    },
    variants: ['Mun'],
  },
  {
    source: {
      title: 'Le Muséon (periodical), acc. to vols',
      description: [
        '<em>Le Muséon</em> began in 1882. Many early volumes are available digitised through <a href="https://catalog.hathitrust.org/Record/000640676?type%5B%5D=all&amp;lookfor%5B%5D=%20Le%20Muse%CC%81on&amp;ft=#viewability">HathiTrust</a> with some additional volumes via US access. ',
      ],
    },
    variants: ['Mus'],
  },
  {
    source: {
      title:
        'Le Mystère des Lettres grecques, ed. A. Hebbelynck (from Muséon, 1900, 1901)',
      description: [
        'Hebbelynck, A. (1900). <a href="https://archive.org/details/lemuson19soci/page/n11/mode/2up">Les mystères des lettres grecques d’après un manuscrit copte-arabe de la bibliothèque Bodléienne d’Oxford: Texte copte, traduction, notes</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. I, pp. 5-36. ',
        'Hebbelynck, A. (1900). <a href="https://archive.org/details/lemuson19soci/page/104/mode/2up?q=hebbelynck">Les mystères des lettres grecques (Suite.)</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. I, pp. 105-136. ',
        'Hebbelynck, A. (1901). <a href="https://archive.org/details/lemuson20soci/page/n11/mode/2up">Les mystères des lettres grecques d’après un manuscrit copte-arabe de la bibliothèque Bodléienne d’Oxford (Suite.)</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. II, pp. 5-33. ',
        'Hebbelynck, A. (1901). <a href="https://archive.org/details/lemuson20soci/page/n375/mode/2up">Les mystères des lettres grecques d’après un manuscrit copte-arabe de la bibliothèque Bodléienne d’Oxford (Fin.)</a>. <em>Le Muséon, Nouvelle Série</em>, Vol. II, pp. 369-415 plus 3 plates. ',
      ],
    },
    variants: ['My'],
  },
  {
    source: {
      title: 'Notices et Extraits des MSS. de la Bibliothèque Nationale, Paris',
      description: [
        '<em>Notices et extraits des manuscrits de la Bibliothèque nationale et autres bibliothèques</em> began in 1787. Many digitised volumes, particularly early volumes, are listed on <a href="https://catalog.hathitrust.org/Record/003105485">HathiTrust</a> and <a href="https://gallica.bnf.fr/ark:/12148/cb345335088/date">Gallica</a>. ',
      ],
    },
    variants: ['N & E'],
  },
  {
    source: {
      title: 'De Lacy O’Leary: Fragmentary Coptic Hymns, 1924',
      description: [
        'O’Leary, De Lacy. (1924). <em><a href="https://archive.org/details/fragmentarycopti0000olea/page/n3/mode/2up">Fragmentary Coptic Hymns from the Wadi n-Natrun edited with translations and notes</a></em>. London: Luzac &amp; Co.',
      ],
    },
    variants: ["O'Leary H"],
  },
  {
    source: {
      title: 'De Lacy O’Leary: The Coptic Theotokia, 1923',
      description: [
        'O’Leary, De Lacy. (1923). <em><a href="https://archive.org/details/coptictheotokia0000copt/page/n3/mode/2up">The Coptic Theotokia: Text from Vatican Cod. Copt. xxxviii, Bib. Nat. Copte 22, 23, 35, 69 and Other MSS. Including Fragments Recently Found at the Dêr Abû Makâr in the Wadi Natrun</a></em>. London: Luzac &amp; Co.',
      ],
    },
    variants: ["O'Leary Th", "O'Leary The"],
  },
  {
    source: {
      title: 'Orientalistische Litteraturzeitung',
      description: [
        '<em>Orientalistische Litteraturzeitung</em> began in 1898. Links to digitised volumes, especially early volumes, available on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=orientliteraturzeitung">The Online Books Page</a>. ',
      ],
    },
    variants: ['OLZ'],
  },
  {
    source: {
      title: 'Orientalia (periodical), Rome',
      description: [
        '<em>Orientalia</em> began in 1920. All volumes up to recent volumes are available through <a href="https://www.jstor.org/journal/orientalia">JSTOR</a>. ',
      ],
    },
    variants: ['Ora'],
  },
  {
    source: {
      title:
        'Oratio Cypriani in Veröffentl. a. d. badischen Papyrussamml., Heft 5, 1934, p. 305 ff',
      // NOTE: PBad occurs as a standalone abbreviation in Crum, but we treat it
      // as a variant to simplify the pipeline.
      description: [
        'Bilabel, F., &amp; Grohmann, A. (1934). <em>Griechische, koptische und arabische Texte zur Religion und religiösen Literatur in Ägyptens Spätzeit</em>. (Veröffentlichungen aus den badischen Papyrus-Sammlungen, Heft 5). Heidelberg: Verlag der Universitätsbibliothek. [If you know of a digital copy, please <a href="https://www.coptist.com/contact-%e2%b2%a7%e2%b2%81%e2%b2%99%e2%b2%9f%e2%b2%93/"> contact me</a>] ',
      ],
    },
    variants: ['Orat Cyp', 'P Bad'],
  },
  {
    source: {
      title: 'Oriens Christianus (periodical)',
      description: [
        '<em>Oriens Christianus</em> began in 1901. All volumes up to 2014 are available digitised on the <a href="https://archive.org/details/oriens-christianus">Internet Archive</a>. ',
      ],
    },
    variants: ['Or Chr'],
    postfixes: {
      NS: 'Neue Serie',
    },
  },
  {
    source: {
      title: 'M.A. Murray, The Osireion, 1904',
      description: [
        'Murray, M. A. (1904). <em><a href="https://archive.org/details/osireionatabydos00murr/page/n3/mode/2up">The Osireion at Abydos</a></em>. London: Bernard Quaritch.',
      ],
    },
    variants: ['Osir'],
  },
  {
    source: {
      title: 'Till’s copies of ostraca from Chicago Expedition, 1931',
    },
    variants: ['Ostr.Chicago', 'Ostr Chicago'],
  },
  {
    source: {
      title: 'MSS. in the Bibliothèque Nationale, Paris (Crum’s copies)',
    },
    variants: ['P'],
  },
  {
    source: {
      title:
        'Papyri in Museum at Alexandria, ed. de Ricci & Winstedt in Sphinx x, also Crum’s copies',
      description: [
        'Ricci, S. de, &amp; Winstedt, E. O. (1906). <a href="https://www.persee.fr/doc/sphin_2003-170x_1906_num_10_1_1192">Papyrus coptes du Musée d’Alexandrie</a>. <em>Sphinx: revue critique embrassant le domaine entier de l’égyptologie</em>, 10, 1-4. ',
      ],
    },
    variants: ['P Al'],
  },
  {
    source: {
      title: 'The Amherst Papyri, ed. Grenfell & Hunt, 1901',
      description: [
        'Grenfell, B. P., &amp; Hunt, A. S. (1901). <em><a href="https://archive.org/details/amherstpapyribei02grenuoft/page/n9/mode/2up">The Amherst Papyri: Being an Account of the Greek Papyri in the Collection of the Right Hon. Lord Amherst of Hackney, F.S.A. at Didlington Hall, Norfolk. Part II: Classical Fragments and Documents of the Ptolemaic, Roman, and Byzantine Periods</a></em>. London: Henry Frowde.',
      ],
    },
    variants: ['P Amh'],
  },
  {
    source: {
      title:
        'Paschal Hymns: Kitâb Ṭaruḥât al-Baskhah al-Muḳaddasah, Old Cairo, 1914',
      description: [
        'Father Fīlūt̲āʾus al-Maqqārī, &amp; Cantor Mīḫāʾīl Ǧirǧis. (1914). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/4258076">Kitāb Ṭuruḥāt al-Basḫah al-Muqaddasah al-Mustaʿmal Tilāwatuhā fī Sāʾir Kanāʾis al-Karāzah al-Marqusiyyah</a></em> [كتاب طرحات البسخة المقدسة المستعمل تلاوتها في ساير كنائس الكرازة المرقسية]. Old Cairo: St. Macarius Press.',
      ],
    },
    variants: ['Pas H'],
  },
  {
    source: {
      title: 'ⲡⲓϫⲱⲙ ⲛⲧⲉ ⲡⲓⲡⲁⲥⲭⲁ ⲉⲑ︦ⲃ︦, Cairo, 1921 (cf PO xxiv)',
      description: [
        '(n.d.) <em><a href="https://coptic-treasures.com/book/%D9%83%D8%AA%D8%A7%D8%A8-%D8%A7%D9%84%D8%A8%D8%B5%D8%AE%D8%A9-%D8%A3%D9%85%D8%B1-%D8%A8%D8%B7%D8%A8%D8%B9%D8%A9-%D8%A7%D9%84%D8%A8%D8%A7%D8%A8%D8%A7-%D8%B4%D9%86%D9%88%D8%AF%D8%A9/">ⲡ̀ϫⲱⲙ ⲛ̀ⲧⲉ ⲡⲓⲡⲁⲥⲭⲁ ⲉ̀ⲑⲟⲩⲁⲃ ⲫⲏⲉⲧϣⲉⲙϣⲓ ⲓⲥϫⲉⲛ ⲡⲓⲉ̀ϩⲟⲟⲩ ⲛ̀ϯⲕⲩⲣⲓⲁ̀ⲕⲏ ⲛ̀ⲧⲉ ⲡⲓⲉⲩⲗⲟⲅⲓⲙⲉⲛⲟⲥ ϣⲁⲡ̀ϫⲱⲛⲉ̀ⲃⲟⲗ ⲙ̀ⲡⲓϣⲁⲓ ⲛ̀ϯⲁ̀ⲛⲁⲥⲧⲁⲥⲓⲥ ⲉⲧⲥ̀ⲙⲁⲣⲱⲟⲩⲧ ⲕⲁⲧⲁ ⲧⲁⲝⲓⲥ ⲛ̀ϯⲉⲕⲕ̀ⲗⲏⲥⲓⲁ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ ⲛ̀ⲟⲣⲑⲟⲇⲟⲝⲟⲥ –كتاب البصخة المقدسة: الذي يخدم من يوم احد الشعانين الى نهاية عيد القيامة المجيد حسب ترتيب الكنيسة القبطية الارثوذكسية</a></em>, printed by order of Pope Shenouda III. Anba Waris Press. [This appears to be a reprint of the edition cited by Crum, possibly originally edited by Claudius Y. Labib]',
      ],
    },
    variants: ['Pas Lect'],
  },
  {
    source: {
      title:
        'Papyri in collection of Mr. Chester Beatty, London (Crum’s copies)',
    },
    variants: ['P. Beatty', 'P Beatty'],
  },
  {
    source: {
      title:
        'Coptic legal papyrus olim penes Sir E. A. W. Budge (Crum’s copy), now at Columbia University',
    },
    variants: ['P Bu'],
  },
  {
    source: {
      title:
        'Papyrus grecs d’ époque byzantine, ed. J. Maspero (Catal. Gén. Musée du Caire, 1911 ff.)',
      description: [
        'Maspero, J. (1911). <em><a href="https://archive.org/details/papyrusgrecsdp01masp/page/n5/mode/2up">Papyrus grecs d’ époque byzantine, Tome I</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 67001-67124). Le Caire: Impr. de l’Institut français d’archéologie orientale.',
        'Maspero, J. (1913). <em><a href="https://archive.org/details/papyrusgrecsdp02masp/page/n5/mode/2up">Papyrus grecs d’ époque byzantine, Tome II</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 67125-67278). Le Caire: Impr. de l’Institut français d’archéologie orientale.',
        'Maspero, J. (1916). <em><a href="https://archive.org/details/papyrusgrecsdp03masp/page/n7/mode/2up">Papyrus grecs d’ époque byzantine, Tome III</a></em> (Catalogue général des antiquités égyptiennes du Musée du Caire, N. 67279-67359). Le Caire: Impr. de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['P Cai'],
  },
  {
    source: {
      title: 'Two medical papyri penes E. Chassinat',
    },
    variants: ['P Chass'],
  },
  {
    source: {
      title:
        'Papyruscodex saec. vi-vii… Cheltenham, ed. Crum, 1915, acc to pp. of printed book',
      description: [
        'Crum, W. E. (1915). <em><a href="https://archive.org/details/derpapyruscodexs00crum/page/n7/mode/2up">Der Papyruscodex saec. VI-VII der Phillippsbibliothek in Cheltenham: Koptische theologische Schriften</a></em>. Strassburg: Karl J. Trübner.',
      ],
    },
    variants: ['P cod', 'P Cod'],
    postfixes: {
      F: 'Fayyûmic text of same, ed. W. Erichsen (Danish Acad., 1932)<ul><li>Erichsen, W. (1932). <em><a href="https://archive.org/details/faijumischefragm0000agat/page/n1/mode/2up">Faijumische Fragmente der Reden des Agathonicus Bischofs von Tarsus</a></em>. (Det Kgl. Danske Videnskabernes Selskab, Historisk-filologiske Meddelelser, XIX, 1). København: Andr. Fred. Høst &amp; søn.</li></ul>',
    },
  },
  {
    source: {
      title:
        'Mr. Pierpont Morgan’s papyrus volume of Psalms &c. (H. Thompson’s copy)',
    },
    variants: ['Pcod Mor'],
  },
  {
    source: {
      title: 'Papyri at Columbia University, New York (A. Schiller’s copies)',
    },
    variants: ['P Col'],
  },
  {
    source: {
      title: 'A. Peyron, Lexicon Linguae Copticae, 1835',
      description: [
        'Peyron, A. (1835). <em><a href="https://archive.org/details/lexiconlinguaeco00peyr/page/n9/mode/2up">Lexicon linguæ Copticæ</a></em>. Taurini: Ex Regio Typographeo.',
      ],
    },
    variants: ['Pey'],
  },
  {
    source: {
      title: 'Migne’s Patrologia, Series Graeca',
      description: [
        'Migne, J.-P. (Ed.). (1857-1886). <em>Patrologiae cursus completus, Series Graeca</em> (161 vols.). Paris. All volumes are linked on <a href="https://patristica.net/graeca/">Patristica.net</a> and <a href="https://www.roger-pearse.com/weblog/patrologia-graeca-pg-pdfs/">Roger Pearse’s blog</a>. ',
      ],
    },
    variants: ['PG'],
  },
  {
    source: {
      title: 'magical papyrus in University Library, Geneva (photograph)',
    },
    variants: ['P Gen'],
  },
  {
    source: {
      title: 'Papyri Graecae Magicae, ed. K. Preisendanz I, II, 1928, 1931',
      description: [
        'Preisendanz, K. (1928). <em><a href="https://digi.ub.uni-heidelberg.de/diglit/heidhs3763IIA-51bd1">Papyri Graecae Magicae: Die griechischen Zauberpapyri</a></em>, Band I. Leipzig: B. G. Teubner.',
        'Preisendanz, K. (1931). <em><a href="https://digi.ub.uni-heidelberg.de/diglit/heidhs3763IIA-51bd2">Papyri Graecae Magicae: Die griechischen Zauberpapyri</a></em>, Band II. Leipzig: B. G. Teubner.',
      ],
    },
    variants: ['PGM'],
  },
  {
    source: {
      title:
        'Papyri formerly in W. Golenischeff’s collection, from photographs sent by O. von Lemm',
    },
    variants: ['P Gol'],
  },
  {
    source: {
      title: 'Papyri (6th c.) thence, Cairo Mus. (Lacau’s copies)',
    },
    variants: ['P Jkôw'],
  },
  {
    source: {
      title: 'Patrologia Latina',
    },
    variants: ['PL'],
  },
  {
    source: {
      title: 'Papyri belonging to N. P. Lichatschev (P. Jernstedt’s copies)',
    },
    variants: ['P Lich'],
  },
  {
    source: {
      title: 'Greek Papyri in British Museum, ed. Kenyon & Bell, acc. to pp',
      description: [
        'Kenyon, F. G. (1893). <em><a href="https://archive.org/details/greekpapyriinbri01brit/page/n5/mode/2up">Greek Papyri in the British Museum: Catalogue with Texts</a></em>, Vol. I. London: British Museum.',
        'Kenyon, F. G. (1898). <em><a href="https://archive.org/details/greekpapyriinbri02brit/page/n5/mode/2up">Greek Papyri in the British Museum: Catalogue with Texts</a></em>. Vol. II. London: British Museum.',
        'Kenyon, F. G., &amp; Bell, H. I. (1907). <em><a href="https://archive.org/details/greekpapyriinbri03brit/page/n5/mode/2up">Greek Papyri in the British Museum: Catalogue with Texts</a></em>. Vol. III. London: British Museum.',
        'Bell, H. I., (1910). <em><a href="https://archive.org/details/greekpapyriinbri04brit/page/n5/mode/2up">Greek Papyri in the British Museum: Catalogue with Texts</a></em>, Vol. IV: <em>The Aphrodito Papyri</em> (with an appendix of Coptic Papyri edited by W. E. Crum). London: British Museum.',
        'Bell, H. I. (1917). <em><a href="https://archive.org/details/greekpapyriinbri05brit/page/n5/mode/2up">Greek Papyri in the British Museum: Catalogue with Texts</a></em>. Vol. V. London: British Museum.',
      ],
    },
    variants: ['P Lond'],
    postfixes: { V: undefined },
  },
  {
    source: {
      title:
        'Un Papyrus Medical Copte, ed. E. Chassinat (= MIF. 32), 1921, acc. to pp',
      description: [
        'Chassinat, É. (1921). <em><a href="https://archive.org/details/MIFAO32/mode/2up">Un papyrus médical copte</a></em>. (Mémoires publiés par les membres de l’ Institut français d’archéologie orientale du Caire, Tome 32). Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['P Méd'],
  },
  {
    source: {
      title:
        'Papyri at Michigan University, with year of acquisition where no. not ascertained',
    },
    variants: ['P Mich'],
  },
  {
    source: {
      title:
        'Byzantinische Papyri… zu München, ed. Heisenberg & Wenger, 1914, acc. to pp',
      description: [
        'Heisenberg, A., &amp; Wenger, L. (1914). <em><a href="https://archive.org/details/mdp.39015010705187/page/n11/mode/2up">Byzantinische Papyri in der Königlichen Hof- und Staatsbibliothek zu München</a></em>. (Veröffentlichungen aus der Papyrus-Sammlung der Königlichen Hof- und Staatsbibliothek zu München, Band I: Byzantinische Papyri). Leipzig: B. G. Teubner.',
      ],
    },
    variants: ['P Mon'],
  },
  {
    source: {
      title: 'rest of papyrus ed. V. Loret, Rec 16 103 (Kuentz’s copy)',
    },
    variants: ['P Nolot'],
  },
  {
    source: {
      title: 'Patrologia Orientalis',
      description: [
        '<em>Patrologia Orientalis</em> was first published in 1907. Many volumes, especially early volumes, linked on <a href="https://www.roger-pearse.com/weblog/patrologia-orientalis-po-pdfs/">Roger Pearse’s blog</a> and <a href="https://www.tertullian.org/fathers/patrologia_orientalis_toc.htm">Tertullian.org</a>. ',
      ],
    },
    variants: ['PO'],
  },
  {
    source: {
      title: 'Oxyrhynchus Papyri, ed. Grenfell & Hunt',
      description: [
        '<em>The Oxyrhynchus papyri</em> is an ongoing series first published in 1898 and edited by Bernard P. Grenfell and Arthur S. Hunt. The earliest volumes are available on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=ocyrhynchus">The Online Books Page</a> with further volumes on <a href="https://catalog.hathitrust.org/Record/000051960">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['P Oxy'],
  },
  {
    source: {
      title:
        'Papyri in the Rainer Collection (Staatsbibl.), Vienna (Till’s copies), more often as Vi',
    },
    variants: ['P Rain'],
  },
  {
    source: {
      title: 'F. Preisigke, Namenbuch, 1922',
      description: [
        'Preisigke, F. (1922). <em><a href="https://archive.org/details/namenbuch00prei/page/n4/mode/2up">Namenbuch. Enthaltend alle griechischen, lateinischen, ägyptischen, hebräischen, arabischen und sonstigen semitischen und nichtsemitischen Menschennamen, soweit sie in griechischen Urkunden (Papyri, Ostraka, Inschriften, Mumienschildern u.s.w.) Ägyptens sich vorfinden</a></em>. Heidelberg: Selbstverlag des Herausgebers.',
      ],
    },
    variants: ['Preisigke', 'Preis.'],
  },
  {
    source: {
      title: 'Pistis Sophia, ed. C. Schmidt (= Coptica II), 1925',
      description: [
        'Schmidt, C. (1925). <em><a href="https://archive.org/details/CarlSchmidtPistisSophia1925Teil1/Carl%20Schmidt%2C%20Pistis%20Sophia%201925%2C%20Teil1/page/n1/mode/2up">Pistis Sophia</a></em>. (Coptica consilio et impensis Instituti Rask-Oerstediani edita, II). Hauniae: Gyldendalske Boghandel-Nordisk Forlag.',
      ],
    },
    variants: ['PS'],
  },
  {
    source: {
      title: 'Proceedings of Soc. of Biblical Archaeology',
      description: [
        '<em>Proceedings of the Society of Biblical Archæology</em> began in 1879. The first 30 volumes are linked on <a href="http://archives.getty.edu:30008/getty_images/digitalresources/serials/103990.html">The Getty Research Institute Research Library Catalogue</a>. More volumes available on <a href="https://catalog.hathitrust.org/Record/007887358">HathiTrust</a> via US access. ',
      ],
    },
    variants: ['PSBA'],
  },
  {
    source: {
      title: 'Papyri in University Library, Strassburg (Crum’s copies, 1912)',
    },
    variants: ['P Stras'],
  },
  {
    source: {
      title: 'Papyri in Staatsbibliothek, Vienna (Till’s copies)',
    },
    variants: ['P Vi'],
  },
  {
    source: {
      title:
        'I Papiri Copti… di Torino, ed. F. Rossi, acc. to volume, fascicule & page',
      description: [
        'Rossi, F. (1887). <em>I Papiri Copti del Museo Egizio di Torino</em>, Vol. I (five fascicles). Torino: Ermanno Loescher. The five fascicles of this volume available on <a href="https://alinsuciu.com/2012/01/27/rossis-edition-of-the-coptic-papyrus-codices-in-the-egyptian-museum-in-turin-1/">Alin Suciu’s blog</a>. ',
        'Rossi, F. (1892). <em><a href="https://www.google.co.uk/books/edition/I_papiri_copti_del_Museo_egizio_di_Torin/lxEZAAAAYAAJ?hl=en&amp;gbpv=1&amp;pg=PP9&amp;printsec=frontcover">I Papiri Copti del Museo Egizio di Torino</a></em>. Vol. II (four fascicles). Torino: Ermanno Loescher.',
      ],
    },
    variants: ['R'],
  },
  {
    source: {
      title: 'E. Revillout, Actes et Contrats… de Boulaq et du Louvre, 1876',
      description: [
        'Revillout, E. (1876). <em><a href="https://archive.org/details/umn.319510016716448/page/n7/mode/2up">Papyrus coptes. Actes et contrats des Musées égyptiens de Boulaq et du Louvre: Textes et fac-similés.</a></em> (Études Égyptologiques, 50). Paris: F. Vieweg.',
      ],
    },
    variants: ['RAC'],
  },
  {
    source: {
      title:
        'F. Rossi, Alcuni MSS. Copti… di Torino (= Memorie… Torino, ser. ii, tom. xliii), acc. to pp. of separate publication',
      description: [
        'Rossi, F. (1893). <em><a href="https://babel.hathitrust.org/cgi/pt?id=mdp.39015024258538&amp;seq=7">Di alcuni manoscritti copti che si conservano nella Biblioteca Nazionale di Torino</a></em>. (Estratto dalle <em>Memorie della Reale Accademia delle Scienze di Torino</em>, Ser. II, Vol. 44). Torino: Carlo Clausen.',
      ],
    },
    variants: ['R Al'],
  },
  {
    source: {
      title: 'Recueil d’Études… J. F. Champollion, 1922',
      description: [
        '(1922). <em><a href="https://archive.org/details/in.ernet.dli.2015.291952/page/n11/mode/2up">Recueil d’études égyptologiques dédiées à la mémoire de Jean-François Champollion à l’occasion du centenaire de la Lettre à M. Dacier relative à l’alphabet des hiéroglyphes phonétiques lue à l’Académie des Inscriptions et Belles-Lettres le 27 septembre 1922</a></em>. Paris: Librairie Ancienne Honoré Champion, Édouard Champion.',
      ],
    },
    variants: ['R Champ'],
  },
  {
    source: {
      title: 'Revue Égyptologique',
      description: [
        '<em>Revue égyptologique</em> began in 1880 and was published until 1914 (14 volumes). A new series began in 1919/20 and continued until 1924 (2 volumes). From 1925 it was replaced by <em>Revue de l’Égypte ancienne</em>. All volumes are available on the <a href="https://digi.ub.uni-heidelberg.de/diglit/revue_egyptologique">Heidelberg digital library</a>. ',
      ],
    },
    variants: ['RE'],
  },
  {
    source: {
      title: 'Recueil de Travaux &c',
      description: [
        '<em>Recueil de travaux relatifs à la philologie et à l’ archéologie égyptiennes et assyriennes: pour servir de bullletin à la Mission Française du Caire</em> began in 1870 and continued until 1923 (40 volumes). All volumes are available on the <a href="https://digi.ub.uni-heidelberg.de/diglit/rectrav">Heidelbery digital library</a>. ',
      ],
    },
    variants: ['Rec'],
  },
  {
    source: {
      title: 'MSS. & copies belonging to Seymour de Ricci (Crum’s copies)',
    },
    variants: ['Ricci'],
    postfixes: {
      L: undefined,
    },
  },
  {
    source: {
      title:
        'F. Rossi, Un Nuovo Cod. Copto (Memorie Accad. Lincei, 1893), acc. to pp. of separate publication',
      description: [
        'Rossi, F. (1893). <em><a href="https://www.google.co.uk/books/edition/Un_nuovo_codice_copto_del_Museo_Egizio_d/64GEtkCSqXkC?hl=en&amp;gbpv=1&amp;pg=PA1&amp;printsec=frontcover">Un nuovo codice copto del Museo Egizio di Torino contenente la vita di S. Epifanio ed i martiri di S. Pantaleone, di Ascla, di Apollonio, di Filemone, di Ariano e di Dios con versetti di vari capitoli del “Libro di Giobbe”</a> (Reale Accademia dei Lincei)</em>. Roma: Accademia dei Lincei.',
      ],
    },
    variants: ['RNC', 'NC'],
  },
  {
    source: {
      title: 'Revue de l’Orient Chrétien, acc. to vol',
      description: [
        '<em>Revue de l’Orient Chrétien</em> began in 1896 and continued until 1935-36 (30 volumes). All the volumes are available via <a href="https://ancientworldonline.blogspot.com/2012/10/opean-access-journal-revue-de-lorient.html">The Ancient World Online</a>. ',
      ],
    },
    variants: ['ROC'],
  },
  {
    source: {
      title:
        'F. Rösch, Vorbemerkungen zu e. Gramm. d. achmîmischen Mundart, 1909, acc. to pp',
      description: [
        'Rösch, F. (1909). <em><a href="https://catalog.hathitrust.org/Record/001854607">Vorbemerkungen zu einer Grammatik der achmimischen Mundart</a></em>. Inaugural-Dissertation. Strassburg: Schlesier &amp; Schweikhardt. [Available on HathiTrust via US access.]',
      ],
    },
    variants: ['Rösch'],
  },
  {
    source: {
      title:
        'Catal. of Coptic MSS. in John Rylands Library, 1909, acc. to numbers',
      description: [
        'Crum, W. E. (1909). <em><a href="https://archive.org/details/cu31924099175329/page/n11/mode/2up">Catalogue of the Coptic Manuscripts in the Collection of the John Rylands Library, Manchester</a></em>. Manchester: University Press.',
      ],
    },
    variants: ['Ryl'],
    postfixes: {
      Suppl:
        'MSS. acquired since publication of catalogue (cf Ryl Bull. 5)<ul><li>Crum, W. E. (1918–1920). <a href="https://luna.manchester.ac.uk/luna/servlet/detail/Manchester~25~25~702~196480:New-Coptic-manuscripts-in-the-John-?sort=image_number%2Cimage_sequence_number&amp;qvq=q:escholar005294.pdf;sort:image_number%2Cimage_sequence_number;lc:Manchester~25~25&amp;mi=0&amp;trs=1">New Coptic Manuscripts in the John Rylands Library</a>. <em>Bulletin of the John Rylands Library</em>, 5, pp. 497–503.</li></ul>',
    },
  },
  {
    source: {
      title: 'Kitâb aṣ-Ṣalîb, Cairo, 1921',
      description: [
        'Father Fīlūṯāʾus al-Maqqārī, Father Barnābā al-Baramūsī, &amp; Father Iqlādiyūs Jirjis. (1921). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/3198124">Kitāb Dawrat ʿĪday al-Ṣalīb wa-l-Šaʿānīn wa-Ṭarūḥāt al-Ṣawm al-Kabīr wa-l-Ḫamsīn: ḥasaba Tartīb al-Kanīsa al-Qibṭiyyah al-Urṯūḏuksiyyah al-Marqusiyyah</a></em> [كتاب دورة عيدي الصليب والشعانين وطروحات الصوم الكبير والخمسين: حسب ترتيب الكنيسة القبطية الارثوذكسية المرقسية]. Old Cairo: St. Macarius Press.',
      ],
    },
    variants: ['Salîb'],
  },
  {
    source: {
      title:
        'Coptic texts ed. by H. Thompson in Quibell’s Excavations at Saqqara, 1909, 1912',
      description: [
        'Quibell, J. E. (1909). <em><a href="https://archive.org/details/cu31924028671265/page/n7/mode/2up">Excavations of Saqqara (1907-1908) with Sections by Sir Herbert Thompson and Prof. W. Spiegelberg</a></em>. Le Caire: Imprimerie de l’ Institut français d’archéologie orientale.',
        'Quibell, J. E. (1912). <em><a href="https://archive.org/details/cu31924028671273/page/n5/mode/2up">Excavations of Saqqara (1908-9, 1909-10): The Monastery of Apa Jeremias (The Coptic Inscriptions edited by Sir Herbert Thompson)</a></em>. Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['Saq'],
  },
  {
    source: {
      title:
        'G. Steindorff, Koptische Grammatik², acc. to §§, or information from him',
      description: [
        'Steindorff, G. (1904). <em><a href="https://archive.org/details/koptischegrammat00stei/page/n9/mode/2up">Koptische Grammatik mit Chrestomathie, Wörterverzeichnis und Literatur. Zweite gänzlich umgearbeitete Auflage</a></em>. Berlin: Reuther &amp; Reichard.',
      ],
    },
    variants: ['Sdff'],
  },
  {
    source: {
      title:
        'works of Shenoute (& of his disciple Besa). Prefixed to all quotations from their writings (doubtfully to Mor 54)',
      // NOTE: Besa occurs as a standalone abbreviation in Crum, and it's used
      // to belong in the list of variants of 'Sh'. But it's never
      // cited as such. We do not include it because it's merely a source
      // of false positives.
    },
    variants: ['Sh', 'Sh(Besa)'],
    postfixes: {
      A: LOOKUP,
      Am: LOOKUP,
      AZ: LOOKUP,
      BM: LOOKUP,
      'BM Or': LOOKUP,
      'Berl Or': LOOKUP,
      BIF: LOOKUP,
      Bor: LOOKUP,
      C: LOOKUP,
      'Cai Copt Mus': LOOKUP,
      CO: LOOKUP,
      Cai: LOOKUP,
      'Cl Pr': LOOKUP,
      Ep: LOOKUP,
      HT: LOOKUP,
      IF: LOOKUP,
      Louvre: undefined,
      Leyd: LOOKUP,
      'L Mis': LOOKUP,
      MIF: LOOKUP,
      Mich: LOOKUP,
      Ming: LOOKUP,
      Miss: LOOKUP,
      Mun: LOOKUP,
      P: LOOKUP,
      R: LOOKUP,
      RE: LOOKUP,
      Rec: LOOKUP,
      Ryl: LOOKUP,
      ViK: LOOKUP,
      Wess: LOOKUP,
      Z: LOOKUP,
    },
  },
  {
    source: {
      title: 'G. P. G. Sobhy, Le Martyre de St. Hélias, Cairo, 1919',
      description: [
        'Sobhy, G. P. G. (1919). <em><a href="https://archive.org/details/lemartyredesaint00sobhuoft/page/n10/mode/2up">Le martyre de Saint Hélias et l’encomium de l’évêque Stéphanos de Hnès sur Saint Hélias</a></em>. (Bibliothèque d’Études coptes, Tome I). Le Caire: Imprimerie de l’Institut français d’archéologie orientale.',
      ],
    },
    variants: ['S Hel'],
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
      description: [
        'Spiegelberg, W. (1921). <em><a href="https://archive.org/details/koptischeshandworterbuch/page/n5/mode/2up">Koptisches Handwörterbuch</a></em>. Heidelberg: Carl Winters Universitätsbuchhandlung.',
      ],
    },
    variants: ['Spg'],
  },
  {
    source: {
      title: 'Sphinx (periodical)',
      description: [
        '<em>Sphinx: revue critique embrassant le domaine entier de l’égyptologie</em> began in 1897 and continued until 1925 (22 volumes). All volumes are listed and available digitised on <a href="https://www.persee.fr/collection/sphin">Persee.fr</a>. ',
      ],
    },
    variants: ['Sph'],
  },
  {
    source: {
      title: 'Crum, Short Texts from Coptic Ostraca & Papyri, 1921',
      description: [
        'Crum, W. E. (1921). <em><a href="https://archive.org/details/shorttextsfromco00crum/page/n5/mode/2up">Short Texts from Coptic Ostraca and Papyri</a></em>. Oxford University Press.',
      ],
    },
    variants: ['ST'],
  },
  {
    source: {
      title:
        'Kopt. Zaubertexte, ed. V. Stegemann (Sitz. d. Heidelb. Akad., 1934)',
      description: [
        'Stegemann, V. (1934). <em><a href="https://oi-idb-static.uchicago.edu/multimedia/2387/stegemann_koptischen_zaubertexte.pdf">Die koptischen Zaubertexte der Sammlung Papyrus Erzherzog Rainer in Wien</a></em>. (Sitzungsberichte der Heidelberger Akademie der Wissenschaften. Philosophisch-historische Klasse, Jahrgang 1933/34, 1. Abhandlung). Heidelberg: Carl Winters Universitätsbuchhandlung.',
      ],
    },
    variants: ['Stegemann'],
  },
  {
    source: {
      title: 'L. Stern, Koptische Grammatik, acc. to §§',
      description: [
        'Stern, L. (1880). <em><a href="https://archive.org/details/koptischegrammat00ster/page/n7/mode/2up">Koptische Grammatik</a></em>. Leipzig: T. O. Weigel.',
      ],
    },
    variants: ['Stern'],
  },
  {
    source: {
      title: 'Synaxarium Alexandrinum, ed. J. Forget (CSCO.), 1905, 1912',
      description: [
        'Forget, I. (1905). <em><a href="https://archive.org/details/synaxariumalexan0047copt">Synaxarium Alexandrinum, I, 1</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 47. Scriptores Arabici, Tomus 3). Beryti: E Typographeo Catholico. Republished: 1954, Louvain: Imprimerie Orientaliste L. Durbecq.',
        'Forget, I. (1912). <em><a href="https://archive.org/details/synaxariumalexan0000copt/page/n363/mode/2up">Synaxarium Alexandrinum, II</a></em>. (Corpus Scriptorum Christianorum Orientalium, Vol. 67. Scriptores Arabici, Tomus 11). Beryti: E Typographeo Catholico. Republished: 1954, Louvain: Imprimerie Orientaliste L. Durbecq.',
      ],
    },
    variants: ['Synax'],
  },
  {
    source: {
      title: 'H. Tattam, Lexicon Aegyptiaco-Latinum, 1835',
      description: [
        'Tattam, H. (1835). <em><a href="https://archive.org/details/lexicongyptiaco01tattgoog/page/n10/mode/2up">Lexicon Ægyptiaco-Latinum ex Veteribus Linguæ Ægyptiacæ Monumentis, et ex Operibus La Crozii, Woidii, et aliorum Summo Studio Congestum cum Indice Vocum Latinarum</a></em>. Oxonii: E Typographeo Academico.',
      ],
    },
    variants: ['Tatt'],
  },
  {
    source: {
      title: 'Tuki, Diurnum Alexandrinum, 1750',
      description: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1750). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/244155">ⲟⲩϫⲱⲙ ⲛ̀ⲧⲉ ⲛⲓⲉⲩⲭⲏ ⲙ̀ⲡⲓⲉ̀ϩⲟⲟⲩ ⲛⲉⲙ ⲡⲓⲉ̀ϫⲱⲣϩ ⲛ̀ⲍ︦ — كتاب الصلوات النهارية والليلية السبعة</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['T Di'],
  },
  {
    source: {
      // NOTE: In Crum's list, this appears as ‘do., Pontificale et Euchologium,
      // 1761’.
      title: 'Tuki, Pontificale et Euchologium, 1761',
      description: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1761). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/121458">ⲡⲓϫⲱⲙ ⲉϥⲉⲣⲁⲡⲁⲛⲧⲟⲕⲧⲓⲛ ⲉ̀ϫⲉⲛ ⲛⲓⲉⲩⲭⲏ ⲉⲑⲟⲩⲁⲃ ⲡⲓⲙⲉⲣⲟⲥ ⲛ̀ϩⲟⲩⲓⲧ ⲉⲑⲃⲉ ⲛⲓϫⲓⲛⲫⲱϣ ⲛ̀ⲛⲏ ⲉⲧⲁⲩⲥⲱⲧⲡ ⲛ̀ⲛⲓⲧⲱⲧⲉⲣ ⲛ̀ⲕⲗⲏⲣⲓⲕⲟⲥ ⲛⲉⲙ ⲛⲓⲟⲩⲏⲃ ⲛⲉⲙ ⲡⲓⲥⲙⲟⲩ ⲛ̀ⲧⲉ ⲛⲓϩⲃⲱⲥ ⲙ̀ⲙⲟⲛⲁⲭⲟⲥ ⲛⲉⲙ ⲡⲓⲉⲛⲓⲑⲣⲟⲛⲓⲥⲙⲟⲥ ⲛ̀ⲧⲉ ⲡⲓⲉⲡⲓⲥⲕⲟⲡⲟⲥ ⲛⲉⲙ ⲡⲓⲁⲅⲓⲁⲥⲙⲟⲥ ⲙ̀ⲙⲩⲣⲟⲛ ⲛⲉⲙ ϯⲉⲕⲕⲗⲏⲥⲓⲁ –كتاب يشتمل على الصلوات المقدسة الجزء الاول لاجل رسامات المختارين لدرجات اهل الاكليروس والكهنة وتبريك ثياب الرهبان وتقديس الميرون والكنيسة</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['T Euch'],
  },
  {
    source: {
      title: 'W. Till, Achmîmisch-Kopt. Grammatik, 1928, acc. to §§',
      description: [
        'Till, W. (1928). <em><a href="https://archive.org/details/achmmischkoptisc0000till/page/n5/mode/2up">Achmîmisch-Koptische Grammatik</a></em>. Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['Till'],
  },
  {
    source: {
      title: 'Eine Kopt. Bauernpraktik (Mitt. d. deut. Inst. Kairo, vi, 1936)',
      description: [
        'Till, W. (1936). <a href="https://archive.org/details/egyptology-archive-vol.-6-1935/page/108/mode/2up">Eine koptische Bauernpraktik</a>. <em>Mitteilungen des Deutschen Archäologischen Instituts Kairo</em>, 6, pp. 108–114. ',
      ],
    },
    variants: ['Till Bau'],
  },
  {
    source: {
      title:
        'Osterbrief u. Predigt in achm. Dialekt, Vienna, 1931 (at first as Vi 10157)',
      description: [
        'Till, W. (1931). <em><a href="https://hdl.handle.net/2027/nyp.33433096174176?urlappend=%3Bseq=465%3Bownerid=120012808-493">Osterbrief und Predigt im achmimischen Dialekt</a></em>. (Studien zur Epigraphik und Papyruskunde, Band II, Schrift 1.) Leipzig: J. C. Hinrichs’sche Buchhandlung. [via US access only]',
      ],
    },
    variants: ['Till Oster'],
  },
  {
    source: {
      title:
        'Coptic Ostraca, ed. H. Thompson in Theban Ostraca… Toronto (University of Toronto Studies), 1913, acc. to numbers',
      description: [
        'Gardiner, A. H., Thompson, H., &amp; Milne, J. G. (Eds.). (1913). <em><a href="https://archive.org/details/thebanostracaedi00royauoft/page/n5/mode/2up">Theban Ostraca Edited from the Originals, Now Mainly in the Royal Ontario Museum of Archaeology, Toronto, and the Bodleian Library, Oxford</a></em>. (University of Toronto Studies). London: Humphrey Milford.',
      ],
    },
    variants: ['Tor'],
  },
  {
    source: {
      title: 'Lemm, Das Triadon, 1903, acc. to stanzas',
      description: [
        'Lemm, O. von. (1903). <em><a href="https://digi.ub.uni-heidelberg.de/diglit/lemm1903bd1">Das Triadon: Ein sahidisches Gedicht mit arabischer Übersetzung. Band 1, Text</a></em>. St.-Pétersbourg: Académie Impériale des Sciences.',
      ],
    },
    variants: ['Tri'],
  },
  {
    source: {
      title: 'Tuki, Rituale, 1763',
      description: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1763). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/232309">ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ϯⲙⲉⲧⲣⲉϥϣⲉⲙϣⲓ ⲛ̀ⲛⲓⲙⲩⲥⲧⲏⲣⲓⲟⲛ ⲉⲑ︤ⲩ︥ ⲛⲉⲙ ϩⲁⲛϫⲓⲛϩⲏⲃⲓ ⲛ̀ⲧⲉ ⲛⲓⲣⲉϥⲙⲱⲟⲩⲧ ⲛⲉⲙ ϩⲁⲛϫⲓⲛϩⲱⲥ ⲛⲉⲙ ⲡⲓⲕⲁⲧⲁⲙⲉⲣⲟⲥ ⲛ̀ⲁⲃⲟⲧ — كتاب خدمة الاسرار المقدسة وتجاذيز الموتي والهوسات والقطمارس الشهري</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['T Rit'],
  },
  {
    source: {
      title: 'Transactions of the Soc. of Bibl. Archaeology',
      description: [
        '<em>Transactions of the Society of Biblical Archæology</em> began in 1872 and continued until 1893 (9 volumes). All volumes available on the <a href="https://www.digitale-sammlungen.de/en/search?filter=volumes%3A%22bsb11183747%2FBV002563052%22">Münchener DigitalisierungsZentrum Digitale Bibliothek</a>. ',
      ],
    },
    variants: ['TSBA'],
  },
  {
    source: {
      title: 'I. Guidi, Testo copto del Testam. di Abramo &c. (= ALR, 1900)',
      description: [
        'Guidi, I. (1900). <a href="http://periodici.librari.beniculturali.it/visualizzatore.aspx?anno=1900&amp;ID_testata=30&amp;ID_periodico=9057">Il testo copto del testamento di Abramo</a>. <em>Rendiconti della Reale Accademia dei Lincei. Classe di Scienze Morali, Storiche e Filologiche</em>, Ser. 5, 9(3–4), pp. 157–180. ',
        'Guidi, I. (1900). <a href="http://periodici.librari.beniculturali.it/visualizzatore.aspx?anno=1900&amp;ID_testata=30&amp;ID_periodico=9057">Il testamento di Isacco e il testamento di Giacobbe</a>. <em>Rendiconti della Reale Accademia dei Lincei. Classe di Scienze Morali, Storiche e Filologiche</em>, Ser. 5, 9(3–4), pp. 223-264. ',
      ],
    },
    variants: ['Tst Ab'],
  },
  {
    source: {
      title: 'Crum, Theolog. Texts from Coptic Papyri, 1913',
      description: [
        'Crum, W. E. (1913). <em><a href="https://archive.org/details/cu31924029634262/page/n5/mode/2up">Theological Texts from Coptic Papyri Edited with an Appendix upon the Arabic and Coptic Versions of the Life of Pachomius</a></em>. (Anecdota Oxoniensia: Texts, Documents, and Extracts Chiefly from Manuscripts in the Bodleian and Other Oxford Libraries. Semitic Series, Part XII). Oxford: Clarendon Press.',
      ],
    },
    variants: ['TT'],
  },
  {
    source: {
      title: 'Tuki, Theotokia, 1764',
      description: [
        'Bishop Rūfāʾīl al-Ṭūḫī. (1763). <em><a href="https://digitale-sammlungen.ulb.uni-bonn.de/content/titleinfo/230285">ⲡⲓϫⲱⲙ ⲛ̀ⲧⲉ ⲛⲓⲑⲉⲟⲧⲟⲕⲓⲁ ⲛⲉⲙ ⲕⲁⲧⲁⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲁⲃⲟⲧ ⲭⲟⲓⲁⲕ — كتاب الثاودوكيات وكترتيب شهر كيهك</a></em>. Romae: Typis Sacrae Congregatio de Propaganda Fide.',
      ],
    },
    variants: ['T The'],
  },
  {
    source: {
      title:
        'Gebhardt, Harnack & C. Schmidt, Texte u. Untersuchungen (Bd. 43 Gespräche Jesu)',
      description: [
        'Schmidt, C. (1919). <em><a href="https://archive.org/details/texteunduntersuc43akad/page/n5/mode/2up">Gespräche Jesu mit seinen Jüngern nach der Auferstehung: Ein katholisch-apostolisches Sendschreiben des 2. Jahrhunderts. Nach einem koptischen Papyrus des Institut de la Mission Archéologique Française au Caire unter Mitarbeit von Herrn Pierre Lacau derzeitigem Generaldirektor der Ägypt. Museen. Herausgegeben, übersetzt und untersucht nebst drei Exkursen. Übersetzung des äthiopischen Textes von Isaak Wajnberg</a></em>. (Texte und Untersuchungen zur Geschichte der altchristlichen Literatur, 3. Reihe, Band 13 = Der ganzen Reihe Band 43). Leipzig: J. C. Hinrichs’sche Buchhandlung.',
      ],
    },
    variants: ['TU'],
  },
  {
    source: {
      title: 'Tuki, Rudimenta Linguae Coptae, 1778',
      description: [
        'Tuki, R. (1778). <em><a href="https://archive.org/details/bub_gb_5tc2rD_Ba-sC/page/n4/mode/2up">Rudimenta linguae coptae sive aegyptiacae ad usum Collegii Urbani de Propaganda Fide. –غراماطيق في اللسان القبطي (أى المصري) لبيان نسق الكلام البحيري والصعيدي في اللسان المذكور بنمودجات من الكتب المقدسة المسطرة بالنسق الواحد والاخر.</a></em> Romae: Typis eiusdem Sacrae Congregationis de Propaganda Fide.',
      ],
    },
    variants: ['Tuki'],
  },
  // TODO: (#522) Merge the 'Tur*' entries below using postfixes. This would be
  // helpful in such cases as ⲧⲁ- (p 390 a)[1].
  //
  // [1] https://remnqymi.com/crum/1554.html
  {
    source: {
      title:
        'B. Turaief, Materiali &c. (v AZ 40 150, Orient. Bibliographie xv, no. 111 a), acc. to numbers',
      description: [
        'Turayev, B. A. (1902). <a href="https://babel.hathitrust.org/cgi/pt?id=chi.102555010&amp;seq=389">Коптскіе тексты, пріобрѣтенные экспедиціей пок. В. Г. Бока въ Египтѣ</a> [Coptic texts, acquired by the expedition of the late V. G. Bok in Egypt]. In <em>Труды одиннадцатаго Археологическаго Съѣзда въ Кіевѣ</em> (1899), т. II, pp. 225–246. Москва. ',
      ],
    },
    variants: ['Tur M', 'Tur Mat'],
  },
  {
    source: {
      title:
        'B. Turaief, Materiali &c. (v AZ 40 150, Orient. Bibliographie xv, no. 111 a), acc. to numbers; Koptskia Ostraka… Golenishtshef (= Bull. Acad. Imp. x, no. 5, 1899)',
      description: [
        'Turayev, B. A. (1899). <a href="https://www.biodiversitylibrary.org/item/94351#page/503/mode/1up">Коптскія ostraca коллекціи В. С. Голенищева</a> [Coptic ostraca from the collection of V. S. Golenishchev]. <em>Bulletin de l’ Académie Impériale des Sciences de St.-Pétersbourg</em>, 5e série, T. X, no. 5, pp. 435–449. ',
      ],
    },
    variants: ['Tur O'],
  },
  {
    // TODO: (#522) "Turin" occurs on its own. Maybe "ostr" should simply be
    // treated as a suffix?
    source: {
      title: 'ostraca in Museo Archeol., Turin (Crum’s copies)',
    },
    variants: ['Turin ostr'],
  },
  {
    source: {
      title:
        'MSS. in Vatican Library, acc. to photographs or to copies by H. De Vis',
      description: [
        '<a href="https://digi.vatlib.it/">Biblioteca Apostolica Vaticana</a>',
      ],
    },
    variants: ['Va'],
    postfixes: {
      'ar 172':
        '<em><a href="https://digi.vatlib.it/view/MSS_Vat.ar.172">Vat. Arabo 172</a></em>',
    },
  },
  {
    source: {
      title: 'Vienna, MSS. & ostraca in the Staats(olim Hof)bibliothek',
    },
    variants: ['Vi', 'Vienna'],
    postfixes: { K: undefined },
  },
  {
    source: {
      title: 'C. Wessely, Studien z. Paläographie &c., acc. to vol. & page',
      description: [
        'Wessely, C. (1901–1924). <em>Studien zur Palaeographie und Papyruskunde</em>, 23 vols. Leipzig: Verlag von E. Avenarius. [Digitised volumes listed and linked on <a href="https://de.wikisource.org/wiki/Studien_zur_Palaeographie_und_Papyruskunde">de.WikiSource.org</a>.] ',
      ],
    },
    variants: ['Wess'],
  },
  {
    source: {
      title: 'a B MS penes the Rev. W. Hatch, Cambridge, Mass',
    },
    variants: ['W Hatch'],
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
      description: [
        'Worrell, W. (1923). <em><a href="https://archive.org/details/copticmanuscript00coel/page/n11/mode/2up">The Coptic Manuscripts in the Freer Collection</a></em>. New York: The Macmillan Company.',
      ],
    },
    variants: ['Wor', 'Worr'],
  },
  {
    source: {
      title:
        'Crum & Bell, Coptic Texts from Wadi Sarga (= Coptica III), 1922, acc. to pp',
      description: [
        'Crum, W. E., &amp; Bell, H. I. (1922). <em><a href="https://archive.org/details/wadisargacopticg00crumuoft/page/n7/mode/2up">Wadi Sarga: Coptic and Greek Texts from the Excavations Undertaken by the Byzantine Research Account</a></em>. (Coptica Consilio et Impensis Instituti Rask-Oerstediani III). Copenhagen: Gyldendalske Boghandel-Nordisk Forlag.',
      ],
    },
    variants: ['WS'],
  },
  {
    source: {
      title:
        'E. O. Winstedt, Coptic Texts on St. Theodore (Text & Transl. Soc.), 1910',
      description: [
        'Winstedt, E. O. (1910). <em><a href="https://archive.org/details/coptictextsonsai00wins/page/n5/mode/2up">Coptic Texts on Saint Theodore the General, St. Theodore the Eastern, Chamoul, and Justus</a></em>. (Text and Translation Society). London: Williams and Norgate.',
      ],
    },
    variants: ['W Th'],
  },
  {
    source: {
      title: 'Wiener Zeitsch. f. d. Kunde d. Morgenlandes',
      description: [
        '<em>Wiener Zeitschrift für die Kunde des Morgenlandes</em> began in 1887. Early digitised volumes listed on <a href="https://onlinebooks.library.upenn.edu/webbin/serial?id=wienermorgenlandes">The Online Books Page</a> and others on <a href="https://catalog.hathitrust.org/Record/000077758">HathiTrust</a> (via US access only). ',
      ],
    },
    variants: ['WZKM'],
  },
  {
    source: {
      title: 'G. Zoega, Catalogus Codd. Copticorum &c. 1810, acc. to pp',
      description: [
        'Zoega, G. (1810). <em><a href="https://archive.org/details/bub_gb_8EAcFCioIQEC/page/n1/mode/2up">Catalogus codicum Copticorum manu scriptorum qui in Museo Borgiano Velitris adservantur</a></em>. Romae: Typis Sacrae Congregationis de Propaganda Fide.',
      ],
    },
    variants: ['Z'],
  },
  {
    source: {
      title: 'Zeitsch. f. d. Neutestamentl. Wissenschaft',
      description: [
        '<em>Zeitschrift für die neutestamentliche Wissenschaft und die Kunde der älteren Kirche</em> began in 1900. Early digitised volumes are linked on <a href="https://de.wikisource.org/wiki/Zeitschriften_(Theologie)#Z">de.WikiSource.org</a>. Further volumes available <a href="https://catalog.hathitrust.org/Record/000494825?type%5B%5D=all&amp;lookfor%5B%5D=Zeitschrift%20f%C3%BCr%20die%20neutestamentliche%20Wissenschaft%20und%20die%20Kunde%20der%20%C3%A4lteren%20Kirche&amp;ft=#viewability">HathiTrust</a> (via US access only). ',
      ],
    },
    variants: ['ZNTW'],
  },
];

/*
 * DATA_2 stores references not mentioned by crum in the list of abbreviations,
 * but encountered throughout the text.
 */
const DATA_2: Resource[] = [
  // TODO: (#522) Add the missing entries to this section.
  {
    variants: ['Abû Ṣâliḥ', 'Abû Ṣâlih'],
  },
  {
    variants: ['Amélineau', 'Amélineau Géog'],
  },
  {
    variants: ['Antony Hist Laus', 'Hist Laus'],
  },
  {
    variants: ['Baynes'],
  },
  {
    variants: ['Bell'],
  },
  {
    variants: ['Berl Sitz', 'Berl Sitzb'],
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
      title: 'Apostolic Constitutions',
    },
    variants: ['Const Ap'],
  },
  {
    source: {
      title: 'Presumably <i>Edward Charles Everard Owen</i> (1860-1949)',
    },
    variants: ['E C Owen'],
  },
  {
    variants: ['Dévaud', 'Dévaud Ét', 'Dévaud Études'],
  },
  {
    variants: ['Encycl. Bibl.'],
  },
  {
    variants: ['Epiphan. De Gemm.', 'Epiphan De Gem'],
  },
  {
    variants: ['Erman-Lange Pap. Lansing'],
  },
  {
    variants: ['Festschr Ebers'],
  },
  {
    variants: ['F Petrie frag Athribis'],
  },
  {
    variants: ['G Maspero Musée Eg.', 'G Maspero Musée Ég.'],
  },
  {
    variants: ['Gött'],
    // TODO: (#522) Verify the following postfixes.
    postfixes: { Ar: 'Arabic', ar: 'Arabic', Copt: 'Coptic' },
  },
  {
    variants: ['Grohmann'],
  },
  {
    variants: ['Guide'],
  },
  {
    variants: ['Inst franç Epiph De Gemm'],
  },
  {
    variants: ['J G Wilkinson'],
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
    // TODO: (#522) Verify the following postfixes.
    postfixes: { P: undefined, 'wooden tablet': undefined },
  },
  {
    variants: ['Mich Pasc Lect'],
  },
  {
    variants: ['OL'],
  },
  {
    variants: ['Pliny'],
  },
  {
    variants: ['Reg Pach', 'Reg. Pachom.', 'Reg Pachom'],
  },
  {
    variants: ['Reil Beiträge'],
  },
  {
    // NOTE: `Ryl` is also a standalone reference variant.
    source: {
      description: [
        'Catalogue of the Demotic Papyri in the John Rylands Library, Manchester: with Facsimiles and Complete Translations<ul><li><a href="https://archive.org/details/mdp.39015020864875">Volume III</a></li></ul>',
      ],
    },
    variants: ['Ryl Dem', 'Dem Ryl'],
  },
  {
    variants: ["Samannûdi's Scala"],
  },
  {
    source: {
      description: [
        '<i>Arabische Pflanzennamen aus Aegypten, Algerien und Jemen</i> Dietrich Reimer (Ernst Vohsen), Berlin 1912, <a href="http://www.biodiversitylibrary.org/item/41971">online bei Biodiversity Heritage Library</a>',
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
    variants: ['SE Assemani Ac Mart Or'],
  },
  {
    variants: ['Sethe Verbum'],
  },
  {
    source: {
      title:
        'Demotische Urkunden zum ägyptischen Bürgschaftsrechte vorzüglich der Ptolemäerzeit',
    },
    variants: ['Sethe Dem Urk'],
  },
  {
    source: {
      title:
        'Aegyptische und griechische Eigennamen aus Mumienetiketten der römischen Kaiserzeit, auf Grund von grossenteils unveröffentlichtem Material, gesammelt und erläutert von Wilhelm Spiegelberg',
    },
    variants: ['Spg Aeg u Gr Eigennamen'],
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
    variants: ['T Mina Epima', 'Mina'],
  },
  {
    variants: [
      'Univ Coll Lond',
      'Univ Coll London',
      'Univ College Lond',
      'Univ College London',
      // NOTE: Ostr stands for "ostracon", but we don't mention that!
      'Ostr Univ Coll London',
    ],
  },
  {
    variants: ['Usener Theodos'],
  },
  {
    // NOTE: `Vi` is also a standalone reference variant.
    source: {
      description: [
        '<em><a href="https://viewer.acdh.oeaw.ac.at/viewer/image/PH_172_1913/346/">Sitzungsberichte / Akademie der Wissenschaften in Wien, Philosophisch-Historische Klasse Sitzungsberichte der Philosophisch-Historischen Classe der Kaiserlichen Akademie der Wissenschaften, Wien, 172. Band, (Jahrgang 1913)</a></em>',
      ],
    },
    variants: ['Vi Sitz', 'V Sitz'],
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
 *
 * @param name
 * @param italic
 * @returns
 */
function abbreviation(name: string | Node, italic?: boolean): HTMLElement[] {
  const span: HTMLSpanElement = document.createElement('span');
  span.append(maybeI(name, italic), ': ');
  span.classList.add(cls.ABBREVIATION);
  return [span];
}

/**
 *
 */
class Postfix {
  /**
   *
   * @param name
   * @param interpretation
   */
  public constructor(
    public readonly name: string,
    public readonly interpretation?: string | typeof LOOKUP
  ) {}

  /**
   * @returns
   */
  public tooltip(): (Node | string)[] {
    if (typeof this.interpretation === 'string') {
      return [...abbreviation(this.name), ...html.parse(this.interpretation)];
    }
    if (this.interpretation === LOOKUP) {
      return Array.from(MAPPING[this.name]?.tooltip()?.childNodes ?? []);
    }

    dev.play(() => {
      // Sanity check!
      log.ensure(this.interpretation === undefined);
    });

    return [];
  }
}

/**
 * Add the given source to the mapping, including all space variants. A space
 * variant is obtained by deleting any number of spaces from a given string.
 * If the key has n spaces, this function adds 2^n entries to the MAPPING.
 *
 * @param key
 * @param reference
 */
function add(key: string, reference: Reference): void {
  /**
   *
   * @param index
   * @param current
   */
  function* spaceVariants(index: number, current: string): Generator<string> {
    const char: string | undefined = key[index];

    if (char === undefined) {
      // We've reached the end of the string.
      yield current;
      return;
    }

    if (char === ' ') {
      // Branch 1: Keep the space.
      yield* spaceVariants(index + 1, `${current} `);

      // Branch 2: Remove the space.
      yield* spaceVariants(index + 1, current);
      return;
    }

    // Not a space: Must keep the character and move on
    yield* spaceVariants(index + 1, current + char);
  }

  for (const variant of spaceVariants(0, '')) {
    log.ensure(MAPPING[variant] === undefined, 'duplicate key:', variant);
    MAPPING[variant] = reference;
  }
}

// Add all the variants to the map.
[...DATA_1, ...DATA_2].forEach((res: Resource): void => {
  log.ensure(
    !!res.variants.length,
    'resource has no abbreviations listed:',
    res.source?.title
  );

  res.variants.forEach((variant: string): void => {
    // Add the abbreviation without any postfixes.
    add(variant, new Reference(res.source, variant));
    Object.entries(res.postfixes ?? {}).forEach(
      ([name, type]: [string, PostfixType]): void => {
        add(
          `${variant} ${name}`,
          new Reference(res.source, variant, new Postfix(name, type))
        );
      }
    );
  });
});

dev.play(() => {
  // Verify that all LOOKUP postfixes are present.
  Object.values(MAPPING)
    .map((reference: Reference): string | undefined =>
      reference.postfix?.interpretation === LOOKUP
        ? reference.postfix.name
        : undefined
    )
    .filter((postfix) => postfix !== undefined)
    .forEach((postfix: string) => {
      log.ensure(
        postfix in MAPPING,
        'LOOKUP postfix',
        postfix,
        'is absent from the map'
      );
    });
});

/* eslint-enable max-lines */
