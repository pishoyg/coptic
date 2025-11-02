import * as crum from './crum.js';
/**
 *
 * @param root
 * @param highlighter
 */
export function handle(root, highlighter) {
  crum.addGreekLookups(root);
  crum.handleDialect(root, highlighter);
}
