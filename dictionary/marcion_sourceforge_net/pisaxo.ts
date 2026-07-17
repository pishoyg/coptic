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
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type * as zod from 'zod';
import { z } from 'zod';
import * as log from '../../docs/logger.js';
import * as orth from '../../docs/orth.js';
import { marked } from 'marked';
import type * as sax from '../../docs/crum/pisaxo.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const DIRNAME: string = dirname(fileURLToPath(import.meta.url));
const YAML_PATH: string = path.join(DIRNAME, 'data', 'input', 'bib.yaml');
const JS_PATH: string = path.join('docs', 'crum', 'pisaxo.js');

// Sentinel guaranteed not to appear naturally in the bibliographic data.
// The YAML loader maps the `!lookup` tag to this string; the JS emitter
// rewrites it to the bare identifier `LOOKUP`, which the emitted module
// defines as `Symbol('LOOKUP')`.
// NOTE: Use a sentinel that doesn't confuse the Markdown-to-HTML converter. For
// example, do not surround it it with Python-style double underscores.
const MAGIC_LOOKUP = 'MAGIC_LOOKUP_SENTINEL';

const FIXES = z
  .record(z.string(), z.union([z.string(), z.null(), z.literal(MAGIC_LOOKUP)]))
  .optional();

// The schema below is the validation-time twin of the `Source` interface in
// `docs/crum/pisaxo.d.ts`. Keep the two definitions in sync — see the
// file-level docstring.
// NOTE: An absent field evaluates to `undefined`, while a field that has an
// empty placeholder evaluates to `null`.
// TODO: (#522) Some fields may not need to be optional when the data is more
// complete.
const SCHEMA: zod.ZodArray = z.array(
  z.strictObject({
    title: z.string().nullable(),
    description: z.array(z.string()).nullable(),
    variants: z.array(z.string()).nonempty(),
    typos: z.array(z.string()).nonempty().optional(),
    postfixes: FIXES,
    prefixes: FIXES,
  })
);

const TAG_REGEX = /<([a-z]+)/gi;
const VALID_TAGS: Set<string> = new Set<string>([
  'a',
  'strong',
  'em',
  'ul',
  'li',
]);

/**
 *
 * @param markdown
 * @returns
 * TODO: (#0) Verify that the Markdown is well-formatted.
 * As of the time of writing, our data has no asterisks. We should verify the
 * absence of asterisk characters (be it "*" or "&ast;") in the output.
 * We should also verify that brackets and parentheses are balanced, and links
 * are well-formed.
 */
function markdownToHTML(markdown: string): string {
  const parsed: string = marked.parse(markdown, { async: false }).trim();

  // Verify the input is inline: at most one paragraph. Multi-paragraph
  // input would have its paragraph boundaries dissolved by the `<p>`
  // strip and the newline-to-space collapse below, silently losing
  // semantic separation between paragraphs.
  const paragraphs: number = (parsed.match(/<p>/g) ?? []).length;
  log.ensure(
    paragraphs <= 1,
    'Expected inline markdown, got',
    paragraphs,
    'paragraphs:',
    markdown
  );

  const html: string = parsed
    // TODO: (#0) Consider retaining paragraphs. They should be harmless.
    .replace(/<\/?p>/g, '')
    // Normalize space in the generated HTML, in order to minimize the `diff`
    // resulting from users changing the spacing of the source data. Safe
    // because the inline check above rules out paragraph-separator newlines.
    .replaceAll('\n', ' ');

  // Ensure that all opening tags are known. Closing tags mirror opening
  // tags, so validating openers is sufficient.
  for (const match of html.matchAll(TAG_REGEX)) {
    const tag = match[1]!.toLowerCase();
    log.ensure(VALID_TAGS.has(tag), 'Invalid tag', tag, 'in', html);
  }

  return html;
}

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Ensure all reference keys are normalized. Variants, typos, and postfix
 * names become keys in the front-end's reference MAPPING, where lookups
 * assume normalized input.
 *
 * @param sources
 */
function ensureNormalized(sources: sax.Source[]): void {
  for (const entry of sources) {
    for (const key of [
      ...entry.variants,
      ...(entry.typos ?? []),
      ...Object.keys(entry.postfixes ?? {}),
      ...Object.keys(entry.prefixes ?? {}),
    ]) {
      log.ensure(orth.normalize(key) === key, 'Key is not normalized:', key);
    }
  }
}

/**
 *
 * @param record
 */
function convertFixes(record: Record<string, sax.Fix>): void {
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') {
      continue;
    }
    record[key] = markdownToHTML(value);
  }
}

/**
 *
 * @param data
 */
function convert(data: Mutable<sax.Source>[]): void {
  for (const entry of data) {
    if (entry.title) {
      entry.title = markdownToHTML(entry.title);
    }

    if (entry.description) {
      entry.description = entry.description.map(markdownToHTML);
    }

    if (entry.postfixes) {
      convertFixes(entry.postfixes);
    }

    if (entry.prefixes) {
      convertFixes(entry.prefixes);
    }
  }
}

/**
 *
 */
function main(): void {
  // Load the data.
  const raw: string = fs.readFileSync(YAML_PATH, 'utf8');
  log.ensure(
    !raw.includes(MAGIC_LOOKUP),
    'Sentinel found int input:',
    MAGIC_LOOKUP
  );
  const object: unknown = yaml.load(raw, {
    schema: yaml.DEFAULT_SCHEMA.extend([
      new yaml.Type('!lookup', {
        kind: 'scalar',
        construct: () => MAGIC_LOOKUP,
      }),
    ]),
  });

  // Validate the schema.
  const parsed: zod.ZodSafeParseResult<unknown> = SCHEMA.safeParse(object);
  if (!parsed.success) {
    log.fatal('Error parsing bibliography:', z.prettifyError(parsed.error));
  }

  ensureNormalized(parsed.data as sax.Source[]);

  // Convert Markdown to HTML.
  convert(parsed.data as Mutable<sax.Source>[]);

  // Restore the `LOOKUP` symbol.
  const json: string = JSON.stringify(parsed.data, null, 2).replaceAll(
    `"${MAGIC_LOOKUP}"`,
    'LOOKUP'
  );

  // Write the output.
  fs.writeFileSync(
    JS_PATH,
    "export const LOOKUP = Symbol('LOOKUP');\n" +
      `export const DATA = ${json};`,
    'utf8'
  );
}

main();
