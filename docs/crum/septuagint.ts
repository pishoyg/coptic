/**
 * Package septuagint reconciles Crum's Bible numbering with SSACS's.
 *
 * NOTE: Crum didn't use a single numbering convention consistently throughout
 * his book. He would often cite a given verse using different numbering
 * systems. This mapping should be used to point the majority of citations
 * correctly, while the remaining minority would have to be manually labeled.
 *
 * NOTE: Use this file as a central repo of numbering system inconsistencies.
 * Even the misalignments that can't be handled by entries in the records below
 * should be accommodated in the documentation.
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
 * @param first - The first of Crum's verses.
 * @param last - The last of Crum's verses.
 * @param chapter - The SSACS chapter that the verses fall in.
 * @param start - The SSACS verse that Crum's `first` corresponds to.
 * @returns A VERSE mapping of Crum's verses `first` through `last` to SSACS's
 * `start` onward.
 */
function span(
  first: number,
  last: number,
  chapter: string,
  start: number
): Record<string, [string, string]> {
  const out: Record<string, [string, string]> = {};
  for (let v: number = first; v <= last; ++v) {
    out[`${v}`] = [chapter, `${start + v - first}`];
  }
  return out;
}

/* eslint-disable no-magic-numbers */
/**
 * VERSE maps verses of Crum's chapters that SSACS numbers differently, such as
 * those that continue into the next part of a chapter that SSACS splits, to
 * their chapter and verse in SSACS. It takes precedence over CHAPTER, which
 * maps the rest.
 */
const VERSE: Record<
  string,
  Record<string, Record<string, [string, string]>>
> = {
  daniel: {
    // Crum follows the Septuagint, which numbers the Prayer of Azarias and the
    // Song of the Three Children as Daniel 3 24—90, and the rest of the chapter
    // as 3 91—100. SSACS hosts the former as foreign chapter B, and numbers the
    // latter as 3 24—33.
    // Crum numbers by Swete's Theodotion (Codex Vaticanus), whose order the
    // Coptic shares. Swete prints the Song in the order 53, 54 (the depths),
    // 55 (the throne), …, 57, 59, 58, 60, …, 66, 71, 72, 69, 70, 73, … (67—68
    // are missing from Vaticanus and supplied from Alexandrinus). SSACS's Greek
    // column follows Rahlfs, who restores the numerical order, so it is out of
    // step with its Coptic there, and is no guide.
    // SSACS's B also departs from a plain offset in two places:
    // - It splits verse 52 in two (B 29—30).
    // - The Coptic has a verse missing from the Greek after verse 64 (B 42),
    //   which SSACS numbers B 43, numbering verse 65 B 43a. Crum counts the
    //   added verse as part of 64, and the added verse is what he cites.
    '3': {
      ...span(24, 52, 'B', 1),
      ...span(53, 57, 'B', 31),
      '58': ['B', '37'],
      '59': ['B', '36'],
      ...span(60, 63, 'B', 38),
      '64': ['B', '43'],
      '65': ['B', '43a'],
      ...span(66, 68, 'B', 44),
      ...span(69, 70, 'B', 49),
      ...span(71, 72, 'B', 47),
      ...span(73, 90, 'B', 51),
      ...span(91, 100, '3', 24),
    },
  },
  esther: {
    // SSACS numbers the verses of Esther 3 that follow foreign chapter B as
    // though they continued its count (3 13, then B 1—7, then 3 21—22).
    // TODO: (#0) In this case, it might be better to modify the numbering in
    // the source, instead of defining an override here.
    '3': span(14, 15, '3', 21),
  },
  jeremiah: {
    // SSACS's Jeremiah 51a has 30 verses (51 1—30), and 51b has the remaining
    // 5 (51 31—35, as its Greek column is numbered).
    '51': span(31, 35, '51b', 1),
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
/* eslint-enable no-magic-numbers */

/**
 * Translate a citation from Crum's numbering to SSACS's.
 * NOTE: SSACS's numbering may name a foreign chapter, which has no page of its
 * own (see `Book.foreign`).
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
