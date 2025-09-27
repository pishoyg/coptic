import * as ref from './references.js';
import * as orth from '../orth.js';

test('Ensure all keys are normalized', () => {
  const unnormalized: string[] = Object.keys(ref.MAPPING).filter(
    (key: string): boolean => orth.normalize(key) !== key
  );
  expect(unnormalized).toEqual([]);
});
