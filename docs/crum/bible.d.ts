/*
 * NOTE: For the Bible index, we opted for generating a JavaScript file that
 * defines the mapping. We used to populate the mapping in a JSON, but this
 * presented the following challenges:
 * 1. It has to be retrieved with an async fetch. We prefer to `await`
 *   (rather than `void`) promises as much as possible, and this would've
 *   complicated things:
 *   - Many dependent functions would've had to be made async in order to
 *     support an `await` operator.
 *   - Our Anki bundler didn't support a top-level await for the IIFE[1] target,
 *     and this would've added a further complication.
 * 2. I am unsure how easy it is to retrieve a JSON on Anki.
 *
 * Use of a JavaScript file makes things simpler, and it's not particularly
 * painful to maintain.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Glossary/IIFE
 */
export interface Book {
  name: string;
  path: string;
  chapters: string[];
  crum: string[];
}
export const BOOKS: Book[];
