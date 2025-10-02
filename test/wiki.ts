/**
 * Ensure website pages load correctly.
 */

import * as play from '@playwright/test';
import * as log from '../docs/logger.js';
import * as cls from '../docs/crum/cls.js';
import * as drop from '../docs/dropdown.js';

// TODO: (#419) Add more test cases. 88 doesn't cover everything!
// TODO: (#522) The numbers below should increase when references not
// explicitly mentioned in Crum's list of abbreviations are supported.
// TODO: (#523) The numbers below should increase when two-part
// abbreviations are supported.
play.test(
  'Inserts hyperlinks for Wiki References',
  async ({ page }: { page: play.Page }): Promise<void> => {
    const path = '/crum/88.html';
    await page.goto(path, { waitUntil: 'networkidle' });
    for (const testCase of [
      { query: `.${cls.WIKI} .${cls.REFERENCE}`, want: 139 },
      { query: `.${cls.WIKI} .${cls.SUFFIX}`, want: 133 },
      { query: `.${cls.WIKI} .${cls.BIBLE}`, want: 119 },
      {
        query: `.${cls.WIKI} .${cls.DIALECT} .${drop.CLS.DROPPABLE}`,
        want: 383,
      },
      { query: `.${cls.WIKI} .${cls.ANNOTATION}`, want: 79 },
    ]) {
      const got: number = await page.locator(testCase.query).count();
      log.ensure(
        got === testCase.want,
        'want',
        testCase.want,
        'for query',
        testCase.query,
        'got',
        got
      );
    }
  }
);
