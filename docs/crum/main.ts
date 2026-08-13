/** Main function for a Crum word page (a Crum note). */

import * as help from './help.js';
import * as dial from './dialect.js';
import * as iam from '../iam.js';
import * as log from '../logger.js';
import * as html from '../html.js';
import * as high from './highlight.js';
import * as crum from './crum.js';
import * as id from './id.js';
import * as head from '../header.js';
import * as dev from '../dev.js';
import * as browser from '../browser.js';

/**
 *
 */
function main(): void {
  const manager: dial.Manager = new dial.Manager();

  const highlighter = new high.Highlighter(manager, []);
  const devHighlighter: dev.Highlighter = new dev.Highlighter();

  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic (such as the `help` footer) were
  //   found to be duplicated on some Anki platforms!
  if (!iam.amI('card')) {
    help.makeHelpPanel(highlighter, devHighlighter);
  }

  crum.handle(document.body, highlighter);

  crum.handleDeveloper(devHighlighter);
  addReportsLink();
}

/**
 * Enable the Reports button.
 * TODO: (#203) This belongs in the header module.
 */
function addReportsLink(): void {
  const reports: HTMLElement | null = document.getElementById(id.REPORTS);
  if (!reports) {
    log.error('Unable to find a', `#${id.REPORTS}`, 'element');
    return;
  }
  if (browser.smallScreen()) {
    // TODO: (#203) We never handle small-screen styling in TypeScript! We've
    // only ever done it in CSS. Let's not break this rule.
    // This is a band-aid until we find a long-term solution! The word "Reports"
    // is too long for the cell, and wraps on Anki!
    reports.textContent = '⚑';
  }
  html.linkify(reports, head.reports());
}

main();
