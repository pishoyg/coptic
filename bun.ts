/**
 * Set `document` and `window` global variables, in order to allow test runner
 * to execute browser code.
 * If needed, the DOM can be overridden in the tests themselves.
 */
import * as jsdom from 'jsdom';

// Create a new virtual DOM instance with a complete basic HTML structure.
// This runs once before any of your test files are even loaded.
const dom = new jsdom.JSDOM('<html></html>');

// Assign the JSDOM-created window and document objects to the global scope.
// This makes them available to any module that needs them, right from the
// start.
global.window = dom.window;
global.document = dom.window.document;
