// Documentation lives at https://github.com/clean-css/clean-css.
//  NOTE: This was implemented in JavaScript, not TypeScript, because the
//  TypeScript package[^1] is outdated. We required a `clean-css` version >= 5.0
//  for our use case; in particular, we want to assign numerical values for line
//  breaks, not just a boolean.
//
// [^1] https://www.npmjs.com/package/@types/clean-css

import CleanCSS from 'clean-css';
import { readFileSync, writeFileSync } from 'fs';

const minifier = new CleanCSS({
  level: 0,
  format: {
    // controls where to insert breaks.
    breaks: {
      // Controls if a line break comes after an at-rule; e.g. `@charset`.
      afterAtRule: 2,
      // Controls if a line break comes after a block begins; e.g. `@media`.
      afterBlockBegins: 1,
      // Controls if a line break comes after a block ends.
      afterBlockEnds: 2,
      // Controls if a line break comes after a comment.
      afterComment: 2,
      // Controls if a line break comes after a property.
      afterProperty: 1,
      // Controls if a line break comes after a rule begins.
      afterRuleBegins: 1,
      // Controls if a line break comes after a rule ends.
      afterRuleEnds: 2,
      // Controls if a line break comes before a block ends.
      beforeBlockEnds: 2,
      // Controls if a line break comes between selectors.
      betweenSelectors: 0
    },
    indentBy: 2,
    indentWith: 'space',
    // Controls where to insert spaces.
    spaces: {
      // Controls if spaces come around selector relations; e.g. `div > a`.
      aroundSelectorRelation: true,
      // Controls if a space comes before a block begins; e.g. `.block {`.
      beforeBlockBegins: true,
      // Controls if a space comes before a value; e.g. `width: 1rem`.
      beforeValue: true
    },
    // Controls maximum line length.
    wrapAt: false,
    // Controls removing trailing semicolons in rule.
    semicolonAfterLastProperty: true
  }
});

const success = process.argv.slice(2).map((fileName) => {
  try {
    // Read the content of the file.
    const input = readFileSync(fileName, 'utf-8');

    // Minify the CSS content.
    const output = minifier.minify(input);

    // Check if there were any errors during minification.
    if (output.errors.length > 0) {
      console.error(`Minification errors in file: ${fileName}`, output.errors);
      return false;
    }

    // Check if the minified output differs from the input.
    if (input !== output.styles) {
      // File content has been modified.
      writeFileSync(fileName, output.styles, 'utf-8');
      console.log(`Successfully minified and modified: ${fileName}`);
      return false;
    }

    console.log(`No modifications were needed for: ${fileName}`);
    return true;
  } catch (err) {
    console.error(`Error processing file: ${fileName}`, err);
    return false;
  }
}).some(x => x);

// Exit with a non-zero status if there was any error or file modification.
if (!success) {
  process.exit(1);
}
