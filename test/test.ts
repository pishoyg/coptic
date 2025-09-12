/**
 * Ensure website pages load correctly.
 */

import * as play from '@playwright/test';
import * as logger from '../docs/logger.js';
import * as ccls from '../docs/crum/cls.js';
import * as dcls from '../docs/dropdown.js';

/**
 * PAGES_TO_TEST defines the list of site pages to test.
 *
 * TODO: (#0) Figure out a way to retrieve the paths from `paths.ts`, instead of
 * duplicating them below!
 */
const PAGES_TO_TEST: string[] = [
  '/', // Home
  '/keyboard.html', // Keyboard Instructions
  '/crum', // Lexicon
  '/crum?wiki=true', // Lexicon with Wiki
  '/crum?query=light&full=true&regex=true', // Lexicon with a query
  '/crum/1.html', // A Crum note (sample)
  '/bible', // Bible
  '/bible/genesis_1.html', // A Bible chapter (sample)
  '/dawoud', // Dawoud scan
  '/crum/crum', // Crum scan
];

PAGES_TO_TEST.forEach((path: string): void => {
  play.test(
    `loads ${path} without errors`,
    async ({ page }: { page: play.Page }): Promise<void> => {
      // Block requests to Google Tag Manager to isolate the test.
      // Our pages use Google Analytics, but they fail to communicate with it in
      // the test environment, so we override the response in order to prevent
      // them from failing the tests.
      await page.route(
        '**/*googletagmanager.com/**',
        (route: play.Route): Promise<void> => {
          // Fulfill the request with a 200 OK status and an empty body
          // to prevent the browser from logging a failed request.
          return route.fulfill({ status: 200, body: '' });
        }
      );

      // Add a listener to fail the test if we encounter any errors.
      page.on('pageerror', (error: Error): void => {
        throw new Error(error.message);
      });

      // Add a listener to fail the test if we log any error messages.
      page.on('console', (msg: play.ConsoleMessage): void => {
        if (msg.type() === 'error') {
          throw new Error(`Console Error: ${msg.text()}`);
        }
      });

      // Add a listener to fail the test if any of our requests fails. This is
      // necessary in order to catch failures to retrieve any resources (such as
      // CSS files, JavaScript files, images, ...).
      page.on('requestfailed', (request: play.Request): void => {
        throw new Error(`Request Failed: ${request.url()}`);
      });

      // Load the page.
      await page.goto(path, { waitUntil: 'networkidle' });
    }
  );
});

play.test(
  'Inserts hyperlinks for Wiki References',
  async ({ page }: { page: play.Page }): Promise<void> => {
    const path = '/crum/88.html';
    await page.goto(path, { waitUntil: 'networkidle' });
    // TODO: (#419) The numbers below are expected to grow as our parsers
    // develop to handle more edge cases.
    for (const testCase of [
      { query: `.${ccls.WIKI} .${ccls.REFERENCE}`, want: 134 },
      { query: `.${ccls.WIKI} .${ccls.BIBLE}`, want: 115 },
      {
        query: `.${ccls.WIKI} .${ccls.DIALECT} .${dcls.CLS.DROPPABLE}`,
        want: 383,
      },
      { query: `.${ccls.WIKI} .${ccls.ANNOTATION}`, want: 74 },
    ]) {
      const got: number = await page.locator(testCase.query).count();
      logger.ensure(
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
