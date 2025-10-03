/**
 * Exercise wiki handlers.
 */
import * as play from '@playwright/test';
import * as cls from '../docs/crum/cls.js';
import * as drop from '../docs/dropdown.js';

// TODO: (#563) Add a test case for 1144.html.
// TODO: (#419) Add more test cases. This doesn't suffice.
const TEST_CASES: {
  path: string;
  want: {
    references: number;
    suffixes: number;
    bible: number;
    dialectDropdowns: number;
    annotations: number;
  };
}[] = [
  {
    path: '88.html',
    want: {
      references: 139,
      suffixes: 133,
      bible: 119,
      dialectDropdowns: 383,
      annotations: 79,
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
      `Inserts the correct number of objects on ${testCase.path}`,
      async ({ page }: { page: play.Page }): Promise<void> => {
        await page.goto(`/crum/${testCase.path}`, {
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
