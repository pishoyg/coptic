/**
 * Exercise wiki handlers.
 */
import * as play from '@playwright/test';
import * as cls from '../docs/crum/cls.js';
import * as drop from '../docs/dropdown.js';
import * as paths from '../docs/paths.js';
import * as base from './base.js';

/**
 * WikiElementKey represents a name covering a set of Wiki element.
 */
type WikiElementKey =
  | 'references'
  | 'suffixes'
  | 'bible'
  | 'dialectTooltips'
  | 'annotations';

// TODO: (#557) Add more test cases. This doesn't suffice.
// TODO: (#557) Exercise the content of the elements, not just their count.
const TEST_CASES: {
  key: string;
  want: Record<WikiElementKey, number>;
}[] = [
  {
    // 88 contains a relatively large piece of text, so we include to cover a
    // lot of common cases.
    key: '88',
    want: {
      references: 144,
      suffixes: 135,
      bible: 119,
      dialectTooltips: 383,
      annotations: 80,
    },
  },
  {
    // 1144 covers cases with diacritics and boundaries. Particularly, in
    // ‘Amélineau Géog’:
    // - ‘Am’ shouldn't match ‘Amos’ (which would happen if the text were
    //   NFC-normalized and the non-Unicode-aware `\b` was used to match word
    //   boundaries).
    // - ‘Ge’ shouldn't match ‘Genesis’ (which would happen if the text was
    //   NFD-normalized, and the diacritic was misinterpreted as a word
    //   boundary).
    key: '1144',
    want: {
      references: 5,
      suffixes: 4,
      bible: 6,
      dialectTooltips: 8,
      annotations: 12,
    },
  },
  {
    // 3271 covers spacing variants. Particularly, ‘Schweinf Ar Pfl’ is cited as
    // ‘Schweinf ArPfl’ in this page, and we want to make sure we're covering
    // it.
    key: '3271',
    want: {
      references: 3,
      suffixes: 3,
      bible: 0,
      dialectTooltips: 1,
      annotations: 3,
    },
  },
  {
    // 1082 covers a case where ‘P’ was mistakenly parsed as a suffix, thus
    // breaking our reference detection. We make sure it's actually parsed as a
    // source.
    key: '1082',
    want: {
      references: 2,
      suffixes: 2,
      bible: 2,
      dialectTooltips: 11,
      annotations: 6,
    },
  },
];

/**
 * QUERIES is a map of test keys to their corresponding CSS selectors.
 */
const QUERIES: Record<WikiElementKey, string> = {
  references: `.${cls.WIKI} .${cls.REFERENCE}`,
  suffixes: `.${cls.WIKI} .${cls.SUFFIX}`,
  bible: `.${cls.WIKI} .${cls.BIBLE}`,
  dialectTooltips: `.${cls.WIKI} .${cls.DIALECT} .${drop.CLS.DROPPABLE}`,
  annotations: `.${cls.WIKI} .${cls.ANNOTATION}`,
};

base.test.describe('Wiki Reference Handlers', () => {
  for (const testCase of TEST_CASES) {
    base.test(
      `Inserts the correct number of objects on ${testCase.key}`,
      async ({ page }: { page: play.Page }): Promise<void> => {
        await page.goto(paths.crum(testCase.key), {
          waitUntil: 'networkidle',
        });
        await Promise.all(
          (Object.keys(testCase.want) as WikiElementKey[]).map(
            (key: WikiElementKey): Promise<void> =>
              play
                .expect(page.locator(QUERIES[key]))
                .toHaveCount(testCase.want[key])
          )
        );
      }
    );
  }
});
