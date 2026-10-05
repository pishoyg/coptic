/**
 * Package septuagint reconciles Crum's Bible numbering with SSACS's.
 *
 * NOTE: Crum didn't use a single numbering convention consistently throughout
 * his book. He would often cite a given verse using different numbering
 * systems. This mapping should be used to point the majority of citations
 * correctly, while the remaining minority would have to be manually labeled.
 */

/**
 * DAN defines special Book names used by Crum to refer to chapters in the Book
 * of Daniel.
 * - 'Su' refers to the chapter that St. Shenouda refers to as A.
 * - 'Bel' refers to the chapter that St. Shenouda refers to as C.
 * - 'Dan Vis 14' refers to the chapter that St. Shenouda refers to as D.
 */
export const DAN: Record<string, string> = {
  Su: 'A',
  Bel: 'C',
  'Dan Vis 14': 'D',
  'Dan vis 14': 'D',
  'Dan Vis xiv': 'D', // Only once.
  'Dan vis xiv': 'D', // Does not occur, added for completion!
};

/**
 * CHAPTER maps Crum's chapters to the chapters that SSACS numbers differently,
 * keyed by book path. VERSE takes precedence over it.
 */
const CHAPTER: Record<string, Record<string, string>> = {
  jeremiah: {
    // - SSACS's Jeremiah 51a is cited by Crum as 'Jer 51'.
    // - SSACS's Jeremiah 51b is handled below in VERSE.
    '51': '51a',
  },
  psalms: {
    // - Crum's citations of 'Ps 115' mostly correspond to SSACS's Psalms 115a,
    // hence the override below. Crum's 'Ps 115 10–19' continue the numbering
    // past 115a into 115b (see VERSE).
    // - Crum's citations of 'Ps 114' mostly correspond to SSACS's Psalms 114,
    // hence no override is needed for most cases. Crum occasionally uses 'Ps
    // 114' to refer to SSACS's Psalms 115a.
    '115': '115a',
    // - SSACS's Psalms 115b is cited by Crum as '116'. SSACS's Psalms 116
    // consists of only 2 verses, and doesn't appear to be cited by Crum at all.
    '116': '115b',
  },
};

/**
 * VERSE maps verses of Crum's chapters that continue into the next part of a
 * chapter that SSACS splits, to their chapter and verse in SSACS. It takes
 * precedence over CHAPTER, which maps the rest.
 */
const VERSE: Record<
  string,
  Record<string, Record<string, [string, string]>>
> = {
  jeremiah: {
    // SSACS's Jeremiah 51a has 30 verses (51 1—30), and 51b has the remaining
    // 5 (51 31—35, as its Greek column is numbered).
    '51': {
      '31': ['51b', '1'],
      '32': ['51b', '2'],
      '33': ['51b', '3'],
      '34': ['51b', '4'],
      '35': ['51b', '5'],
    },
  },
  psalms: {
    // SSACS's Psalms 115a has 9 verses. The mapping past them isn't a plain
    // offset, because SSACS's 115b merges verses 13-14 into its verse 4, and
    // verses 17-19 into its verse 7.
    '115': {
      '10': ['115b', '1'],
      '11': ['115b', '2'],
      '12': ['115b', '3'],
      '13': ['115b', '4'],
      '14': ['115b', '4'],
      '15': ['115b', '5'],
      '16': ['115b', '6'],
      '17': ['115b', '7'],
      '18': ['115b', '7'],
      '19': ['115b', '7'],
    },
  },
};

/**
 * Translate a citation from Crum's numbering to SSACS's.
 *
 * @param path - The book path.
 * @param chapter - The chapter, in Crum's numbering.
 * @param verse - The verse, in Crum's numbering.
 * @returns The chapter and verse in SSACS's numbering.
 */
export function remap(
  path: string,
  chapter: string | undefined,
  verse: string | undefined
): { chapter: string | undefined; verse: string | undefined } {
  const override: [string, string] | undefined =
    chapter && verse ? VERSE[path]?.[chapter]?.[verse] : undefined;
  if (override) {
    const [ch, vs] = override;
    return { chapter: ch, verse: vs };
  }
  return {
    chapter: chapter && (CHAPTER[path]?.[chapter] ?? chapter),
    verse,
  };
}
