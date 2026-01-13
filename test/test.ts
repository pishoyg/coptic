/**
 * Ensure website pages load correctly.
 */

import * as play from '@playwright/test';
import * as base from './base.js';

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
  base.test(
    `loads ${path} without errors`,
    async ({ page }: { page: play.Page }): Promise<void> => {
      // Block known trackers to prevent them from triggering listeners
      // and to speed up the 'networkidle' state.
      await page.route(
        '**/*{doubleclick,googleads,google-analytics,googletagmanager}**',
        (route: play.Route) => route.fulfill({ status: 200, body: '' })
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
