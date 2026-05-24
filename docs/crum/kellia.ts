import type * as high from './highlight.js';
import * as crum from './crum.js';

/**
 *
 * @param root
 * @param highlighter
 */
export function handle(root: HTMLElement, highlighter: high.Highlighter): void {
  crum.addGreekLookups(root);
  crum.handleDialect(root, highlighter);
}
