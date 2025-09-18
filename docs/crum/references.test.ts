import * as ref from './references.js';
import * as logger from '../logger.js';
import * as orth from '../orth.js';

// Ensure that all keys are normalized.
const unnormalized: string[] = Object.keys(ref.MAPPING).filter(
  (key: string): boolean => orth.normalize(key) !== key
);
if (unnormalized.length) {
  logger.fatal(unnormalized, 'are not normalized!');
}

// Prevent duplicate hyperlinks in lists.
Object.values(ref.MAPPING).forEach((source: ref.Source): void => {
  if (!Array.isArray(source.hyperlink)) {
    return;
  }
  logger.ensure(
    new Set<string>(source.hyperlink).size === source.hyperlink.length,
    source.title,
    'has duplicate hyperlinks'
  );
});
