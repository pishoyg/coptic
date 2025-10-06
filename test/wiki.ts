/**
 * Exercise wiki handlers.
 */
import * as play from '@playwright/test';
import * as cls from '../docs/crum/cls.js';
import * as drop from '../docs/dropdown.js';
import * as paths from '../docs/paths.js';

// TODO: (#557) Add more test cases. This doesn't suffice.
// TODO: (#557) Exercise the content of the elements, not just their count.
const TEST_CASES: {
  key: string;
  want: {
    references: number;
    suffixes: number;
    bible: number;
    dialectDropdowns: number;
    annotations: number;
  };
}[] = [
  {
    // 88 contains a relatively large piece of text, so we include to cover a
    // lot of common cases.
    key: '88',
    want: {
      references: 139,
      suffixes: 133,
      bible: 119,
      dialectDropdowns: 383,
      annotations: 79,
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
      references: 4,
      suffixes: 3,
      bible: 6,
      dialectDropdowns: 8,
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
      dialectDropdowns: 1,
      annotations: 3,
    },
  },
];

// A map of test keys to their corresponding CSS selectors.
const QUERIES: Record<string, string> = {
  references: `.${cls.WIKI} .${cls.REFERENCE}`,
  suffixes: `.${cls.WIKI} .${cls.SUFFIX}`,
  bible: `.${cls.WIKI} .${cls.BIBLE}`,
  dialectDropdowns: `.${cls.WIKI} .${cls.DIALECT} .${drop.CLS.DROPPABLE}`,
  annotations: `.${cls.WIKI} .${cls.ANNOTATION}`,
};

play.test.describe('Wiki Reference Handlers', () => {
  for (const testCase of TEST_CASES) {
    play.test(
      `Inserts the correct number of objects on ${testCase.key}`,
      async ({ page }: { page: play.Page }): Promise<void> => {
        await page.goto(paths.crum(testCase.key), {
          waitUntil: 'networkidle',
        });

        await Promise.all(
          Object.entries(testCase.want).map(([key, want]: [string, number]) =>
            play.expect(page.locator(QUERIES[key])).toHaveCount(want)
          )
        );
      }
    );
  }
});
