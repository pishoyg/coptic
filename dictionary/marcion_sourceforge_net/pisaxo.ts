#!/usr/bin/env npx ts-node

/**
 * Generate ⲡⲓⲥⲁϧⲟ's Bibliography in JavaScript from YAML.
 *
 * The YAML is the source of truth for the list of bibliographic sources cited
 * in Crum's text. This script renders it as a JavaScript module consumed by the
 * front-end. YAML is more human-friendly.
 *
 * YAML convention:
 * - `!lookup` marks a postfix whose meaning is resolved by looking up another
 *   source. It is rendered as the bare `LOOKUP` constant in JavaScript.
 *
 * TODO: (#712) Add schema validation.
 * TODO: (#712) Simplify and prettify the YAML format, e.g.:
 * - Get rid of quotation marks wherever possible.
 * - Add some spacing. Order the fields in each entry if possible.
 * TODO: (#712) Use Markdown at the source instead of HTML. This script should
 * convert back from Markdown to HTML.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const DIRNAME: string = dirname(fileURLToPath(import.meta.url));
const YAML_PATH: string = path.join(DIRNAME, 'data', 'bib.yaml');
const JS_PATH: string = path.join('docs', 'crum', 'pisaxo.js');

// Sentinel guaranteed not to appear naturally in the bibliographic data
const MAGIC_LOOKUP = '__MAGIC_LOOKUP_SENTINEL__';

/**
 *
 */
function main(): void {
  const schema: yaml.Schema = yaml.DEFAULT_SCHEMA.extend([
    new yaml.Type('!lookup', {
      kind: 'scalar',
      construct: () => MAGIC_LOOKUP,
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = yaml.load(fs.readFileSync(YAML_PATH, 'utf8'), { schema });
  const json: string = JSON.stringify(data, null, 2).replaceAll(
    `"${MAGIC_LOOKUP}"`,
    'LOOKUP'
  );

  fs.writeFileSync(
    JS_PATH,
    "export const LOOKUP = Symbol('LOOKUP');\n" +
      `export const DATA = ${json};`,
    'utf8'
  );
}

main();
