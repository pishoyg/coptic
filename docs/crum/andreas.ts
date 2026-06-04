import * as html from '../html.js';
import * as paths from '../paths.js';
import * as cls from './cls.js';

const GREEK_WORD_RE = /[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/u;

/**
 *
 * @param root
 */
export function handle(root: HTMLElement): void {
  html.linkifyText(
    root,
    GREEK_WORD_RE,
    (match: RegExpExecArray): string => paths.greekLookup(match[0]),
    [cls.GREEK]
  );
}
