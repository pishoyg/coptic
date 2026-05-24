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
 * Schema:
 * The bibliographic shape is described twice and the two definitions must be
 * kept in sync by hand:
 * - `SCHEMA` (below): a Zod schema that validates the parsed YAML at build
 *   time.
 * - `Source` in `docs/crum/pisaxo.d.ts`: TypeScript declarations consumed by
 *   the front-end.
 * Adding, removing, or retyping a field requires editing both.
 *
 * TODO: (#712) Simplify and prettify the YAML format, e.g.:
 * - Get rid of quotation marks wherever possible.
 * - Add some spacing. Order the fields in each entry if possible.
 * TODO: (#712) Use Markdown at the source instead of HTML. This script should
 * convert back from Markdown to HTML.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type * as zod from 'zod';
import { z } from 'zod';
import * as log from '../../docs/logger.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const DIRNAME: string = dirname(fileURLToPath(import.meta.url));
const YAML_PATH: string = path.join(DIRNAME, 'data', 'bib.yaml');
const JS_PATH: string = path.join('docs', 'crum', 'pisaxo.js');

// Sentinel guaranteed not to appear naturally in the bibliographic data.
// The YAML loader maps the `!lookup` tag to this string; the JS emitter
// rewrites it to the bare identifier `LOOKUP`, which the emitted module
// defines as `Symbol('LOOKUP')`.
const MAGIC_LOOKUP = '__MAGIC_LOOKUP_SENTINEL__';

// The schema below is the validation-time twin of the `Source` interface in
// `docs/crum/pisaxo.d.ts`. Keep the two definitions in sync — see the
// file-level docstring.
const POSTFIX_SCHEMA: zod.ZodUnion = z.union([
  z.string(),
  z.null(),
  z.literal(MAGIC_LOOKUP),
]);

const SOURCE_SCHEMA: zod.ZodObject = z.strictObject({
  title: z.string().optional(),
  description: z.array(z.string()).optional(),
  variants: z.array(z.string()),
  typos: z.array(z.string()).optional(),
  postfixes: z.record(z.string(), POSTFIX_SCHEMA).optional(),
});

const SCHEMA: zod.ZodArray = z.array(SOURCE_SCHEMA);

/**
 *
 */
function main(): void {
  const raw: unknown = yaml.load(fs.readFileSync(YAML_PATH, 'utf8'), {
    schema: yaml.DEFAULT_SCHEMA.extend([
      new yaml.Type('!lookup', {
        kind: 'scalar',
        construct: () => MAGIC_LOOKUP,
      }),
    ]),
  });

  const result: zod.ZodSafeParseResult<unknown> = SCHEMA.safeParse(raw);
  if (!result.success) {
    log.fatal('Error parsing bibliography:', z.prettifyError(result.error));
  }

  const json: string = JSON.stringify(result.data, null, 2).replaceAll(
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
