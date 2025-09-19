import * as wiki from './wiki.js';
import * as bible from './bible.js';
import * as ann from './annotations.js';
import * as ref from './references.js';

/**
 * Ensure that all the given keys are matched by at least one of the regexes.
 * @param keys
 * @param regexes
 */
function ensureKeysCovered(keys: string[], regexes: RegExp[]): void {
  const undetectable: string[] = keys.filter(
    (key: string): boolean =>
      !regexes.some(
        // We need to ensure, not just that there is a match, but that the match
        // covers the entire key.
        (regex: RegExp): boolean => key.match(regex)?.[0].length === key.length
      )
  );
  expect(undetectable).toEqual([]);
}

describe('Ensures keys are covered by the regexes intended to catch them', () => {
  test(
    'Ensures annotation keys are covered',
    ensureKeysCovered.bind(null, Object.keys(ann.MAPPING), wiki.ANNOTATION_RES)
  );
  test(
    'Ensures reference keys are covered',
    ensureKeysCovered.bind(null, Object.keys(ref.MAPPING), wiki.REFERENCE_RES)
  );
  test(
    'Ensures Bible keys are covered',
    ensureKeysCovered.bind(null, Object.keys(bible.MAPPING), [wiki.BIBLE_RE])
  );
});
