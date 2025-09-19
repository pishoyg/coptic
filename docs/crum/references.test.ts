import * as ref from './references.js';
import * as orth from '../orth.js';

test('Ensure all keys are normalized', () => {
  const unnormalized: string[] = Object.keys(ref.MAPPING).filter(
    (key: string): boolean => orth.normalize(key) !== key
  );
  expect(unnormalized).toEqual([]);
});

describe('Prevent duplicate hyperlinks', () => {
  Object.values(ref.MAPPING).forEach((source: ref.Source) => {
    if (!Array.isArray(source.hyperlink)) {
      return;
    }
    expect(new Set(source.hyperlink).size).toBe(source.hyperlink.length);
  });
});
