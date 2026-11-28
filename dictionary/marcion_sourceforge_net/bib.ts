#!/usr/bin/env npx ts-node
/* eslint-disable max-lines */

// NOTE: This file was generated without any human review.
// TODO: (#522) Delete this file and its artifacts when no longer relevant.

/**
 * Render ⲡⲓⲥⲁϧⲟ's Bibliography as a standalone HTML page.
 *
 * The page is a readable twin of `bib.yaml`, meant for scholars who would
 * rather not read YAML. Formatting is rendered rather than marked up, and
 * every variant, postfix, and prefix links to a search of Crum's dictionary
 * for the citations that use it.
 *
 * The page renders the compiled bibliography (`docs/crum/pisaxo.js`), whose
 * Markdown is already converted to HTML, so run `pisaxo.ts` first.
 *
 * The YAML comments carry valuable information, but a YAML parser discards
 * them. We recover them from the source text instead: the parser's event
 * stream gives the source offset of every key and list item, and each
 * comment is attached to the item that follows it, which is the item it
 * describes by the convention of the file. A comment that starts at column
 * zero stands between entries, and is rendered as such.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import * as log from '../../docs/logger.js';
import * as cls from '../../docs/crum/cls.js';
import * as id from '../../docs/crum/id.js';
import * as crumParams from '../../docs/crum/params.js';
import * as params from '../../docs/params.js';
import * as paths from '../../docs/paths.js';
import * as ann from '../../docs/crum/annotations.js';
import * as sax from '../../docs/crum/pisaxo.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const DIRNAME: string = dirname(fileURLToPath(import.meta.url));
const YAML_PATH: string = path.join(DIRNAME, 'bib.yaml');
const HTML_PATH: string = path.join('docs', 'crum', 'bib.html');

// Search Crum's Wiki alone, for a case-sensitive regex bounded by words.
const SEARCH: Record<string, string> = {
  [id.KELLIA]: String(false),
  [id.ANDREAS]: String(false),
  [crumParams.WIKI]: String(true),
  [params.REGEX]: String(true),
  [params.CASE]: String(true),
  [params.FULL]: String(true),
};
const ISSUE_URL = 'https://github.com/pishoyg/coptic/issues/';

type Fixes = 'postfixes' | 'prefixes';

/**
 * A location within an entry: `[]` is the entry itself, `['variants']` is a
 * field, `['variants', 2]` is the third variant, and `['postfixes', 'BM']` is
 * a postfix.
 */
type Location = (string | number)[];

/**
 * An item in the YAML source that a comment can describe.
 */
interface Anchor {
  offset: number;
  entry: number;
  location: Location;
}

/**
 * A run of consecutive comment lines.
 */
interface Comment {
  /** The offset of the first character after the comment. */
  end: number;
  /** Whether the comment starts at column zero. */
  topLevel: boolean;
  /** The lines of the comment, stripped of their `#` markers. */
  lines: string[];
}

/**
 * A YAML collection that the walker is inside of.
 */
type Frame =
  | { kind: 'sequence'; index: number }
  | { kind: 'mapping'; key: string | undefined; expectKey: boolean };

/**
 * Structure walks the YAML event stream, and records the offsets of entries,
 * their fields, their list items, and their fix keys.
 */
class Structure {
  public readonly anchors: Anchor[] = [];
  /** The offset at which each entry starts. */
  public readonly starts: number[] = [];
  /** The source ranges of all scalars, which comments can't start within. */
  public readonly scalars: [number, number][] = [];

  // The stack holds the document frame, then the list of entries, then an
  // entry, then the value of one of its fields.
  private readonly stack: Frame[] = [];

  /**
   * @param raw - The YAML source.
   */
  public constructor(raw: string) {
    for (const event of yaml.parseEvents(raw, { filename: YAML_PATH })) {
      switch (event.type) {
        case yaml.EVENT_ID.DOCUMENT:
          this.stack.push({ kind: 'sequence', index: 0 });
          break;
        case yaml.EVENT_ID.SEQUENCE:
          this.enter(event.start);
          this.stack.push({ kind: 'sequence', index: 0 });
          break;
        case yaml.EVENT_ID.MAPPING:
          this.enter(event.start);
          this.stack.push({ kind: 'mapping', key: undefined, expectKey: true });
          break;
        case yaml.EVENT_ID.SCALAR:
          this.enter(event.valueStart, yaml.getScalarValue(raw, event));
          this.scalars.push([event.valueStart, event.valueEnd]);
          break;
        case yaml.EVENT_ID.ALIAS:
          log.fatal('Aliases are not supported in', YAML_PATH);
          break;
        case yaml.EVENT_ID.POP:
          this.stack.pop();
          break;
        // no default
      }
    }
  }

  /**
   * Record that a node starts within the innermost frame.
   *
   * @param offset - The offset of the node.
   * @param scalar - The value of the node, if it's a scalar.
   */
  private enter(offset: number, scalar?: string): void {
    const step: string | number | undefined = this.step(scalar);
    if (step === undefined || this.stack.length < 2) {
      return;
    }
    if (this.stack.length === 2) {
      // An entry starts.
      this.starts.push(offset);
      this.anchors.push({
        offset,
        entry: this.starts.length - 1,
        location: [],
      });
      return;
    }
    // The location consists of the key of the entry frame, followed by the
    // step within the field frame, if any.
    const entry: number = this.starts.length - 1;
    const location: Location = [
      ...this.stack
        .slice(2, -1)
        .map((f: Frame): string | number =>
          f.kind === 'sequence' ? f.index - 1 : f.key!
        ),
      step,
    ];
    this.anchors.push({ offset, entry, location });
  }

  /**
   * Advance the innermost frame past a node.
   *
   * @param scalar - The value of the node, if it's a scalar.
   * @returns The index or key of the node within the frame, or undefined if
   * the node is a mapping value, whose key is its anchor.
   */
  private step(scalar?: string): string | number | undefined {
    const frame: Frame | undefined = this.stack.at(-1);
    if (!frame) {
      return undefined;
    }
    if (frame.kind === 'sequence') {
      return frame.index++;
    }
    frame.expectKey = !frame.expectKey;
    if (frame.expectKey) {
      return undefined;
    }
    frame.key = scalar!;
    return frame.key;
  }
}

/**
 * Extract the comments from the YAML source.
 *
 * @param raw - The YAML source.
 * @param scalars - The source ranges of all scalars.
 * @returns The comments, in order.
 */
function comments(raw: string, scalars: [number, number][]): Comment[] {
  const result: Comment[] = [];
  let offset = 0;
  let last: Comment | undefined;
  for (const line of raw.split('\n')) {
    const start: number = offset;
    offset += line.length + 1;
    const match: RegExpExecArray | null = /^( *)# ?(.*)$/.exec(line);
    if (
      !match ||
      scalars.some(
        ([s, e]: [number, number]): boolean => s <= start && start < e
      )
    ) {
      last = undefined;
      continue;
    }
    const topLevel = !match[1];
    if (last?.topLevel !== topLevel) {
      last = { end: offset, topLevel, lines: [] };
      result.push(last);
    }
    last.lines.push(match[2]!);
    last.end = offset;
  }
  return result;
}

/**
 * @param text
 * @returns The text, escaped for HTML.
 */
function escape(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * @param text
 * @returns The text, escaped for use in a regular expression.
 * NOTE: We don't use `RegExp.escape`, because it escapes leading letters and
 * digits as well, which makes the queries in the search box unreadable.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * @param abbreviation
 * @returns A pattern that matches the abbreviation with or without any of its
 * spaces, just as the website does.
 */
function pattern(abbreviation: string): string {
  return abbreviation.split(' ').map(escapeRegex).join(' ?');
}

/**
 * @param abbreviations
 * @returns A pattern that matches any of the abbreviations.
 */
function anyOf(abbreviations: string[]): string {
  const patterns: string[] = abbreviations.map(pattern);
  return patterns.length === 1 ? patterns[0]! : `(${patterns.join('|')})`;
}

/**
 * The parts of a citation that a search requires. Any variant may match in
 * place of an unpinned one, and unpinned fixes are optional.
 * NOTE: The keys of fixes are named after their fields, but each holds a
 * single name.
 */
type Pin = Partial<Record<'variant' | Fixes, string>>;

/**
 * @param fixes - The postfixes or prefixes of a source.
 * @param pinned - The fix to require, if any.
 * @param separate - Attaches the optional space between a fix and a variant.
 * @returns A pattern that matches the pinned fix, or else any of the fixes or
 * none.
 */
function fixPattern(
  fixes: Record<string, sax.Fix> | null | undefined,
  pinned: string | undefined,
  separate: (p: string) => string
): string {
  if (pinned !== undefined) {
    return separate(pattern(pinned));
  }
  const names: string[] = Object.keys(fixes ?? {});
  return names.length ? `(${separate(anyOf(names))})?` : '';
}

/**
 * @param source
 * @param pin - The parts of the citation to require.
 * @returns A pattern that matches the citations of the source that bear the
 * pinned parts: any of its variants, unless one is pinned, bearing any of its
 * prefixes and postfixes, or none, unless one is pinned.
 * NOTE: The fixes that aren't pinned must remain optional, rather than be
 * left out. Searches match whole words, and a fix may be glued to its
 * variant, as in `ShC`, where `Sh` alone ends mid-word and doesn't match.
 */
function citations(source: sax.Source, pin: Pin = {}): string {
  return [
    fixPattern(source.prefixes, pin.prefixes, (p: string): string => `${p} ?`),
    pin.variant === undefined ? anyOf(source.variants) : pattern(pin.variant),
    fixPattern(
      source.postfixes,
      pin.postfixes,
      (p: string): string => ` ?${p}`
    ),
  ].join('');
}

/**
 * @param query - A regular expression.
 * @param html - The content of the link.
 * @returns A link that searches Crum's dictionary for the query.
 */
function search(query: string, html: string): string {
  // `lexicon` leaves the query unencoded, but ours has to be encoded, because
  // a regex is rife with URL metacharacters.
  const href: string = paths.lexicon(
    encodeURIComponent(query),
    undefined,
    SEARCH
  );
  return `<a class="search" href="${escape(href)}">${html}</a>`;
}

/**
 * Index assigns each entry an ID derived from its first variant, and resolves
 * abbreviations to entries.
 * NOTE: IDs are expected to be unique. `tidy` reports duplicates.
 */
class Index {
  public readonly data: readonly sax.Source[];
  private readonly ids: string[];
  private readonly entries = new Map<string, number>();

  /**
   * @param data
   */
  public constructor(data: readonly sax.Source[]) {
    this.data = data;
    this.ids = data.map((source: sax.Source): string =>
      source.variants[0]!.replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(
        /^-|-$/g,
        ''
      )
    );

    data.forEach((source: sax.Source, i: number): void => {
      const prefixes: string[] = ['', ...Object.keys(source.prefixes ?? {})];
      const postfixes: string[] = ['', ...Object.keys(source.postfixes ?? {})];
      for (const variant of source.variants) {
        for (const prefix of prefixes) {
          for (const postfix of postfixes) {
            this.entries.set(Index.squash(prefix + variant + postfix), i);
          }
        }
      }
    });
  }

  /**
   * @param entry
   * @returns The ID of the entry.
   */
  public id(entry: number): string {
    return this.ids[entry]!;
  }

  /**
   * @param key - An abbreviation, possibly bearing a prefix or a postfix.
   * @returns The index of the entry that the abbreviation cites.
   */
  public lookup(key: string): number | undefined {
    return this.entries.get(Index.squash(key));
  }

  /**
   * @param key
   * @returns The key, without spaces, which don't distinguish keys.
   */
  private static squash(key: string): string {
    return key.replaceAll(' ', '');
  }
}

const LIST_ITEM = /^( *)(?:[-*]|\d+\.) /;

/**
 * Undo the hard wrapping of a comment, so its paragraphs flow in the page.
 *
 * Comments are wrapped at a fixed width, and their line breaks mean nothing,
 * except where they don't: list items, and the YAML examples in the header,
 * must keep their own lines. So a line is joined to the one above it only if
 * it continues it as prose, which this function guesses as follows:
 * - Neither line is blank.
 * - The line is not a list item, and is indented as a continuation of the
 *   one above: flush with it, or under the text of its list marker.
 * - The line above doesn't end in a colon, which introduces what follows,
 *   and the line isn't a bare YAML key, such as `variants:`.
 * - Neither line is aligned with runs of spaces, as tabulated examples are.
 *
 * @param lines - The lines of a comment.
 * @returns The lines, with their paragraphs joined.
 */
function reflow(lines: string[]): string[] {
  const result: string[] = [];
  let indent = 0; // The indentation of a continuation of the last line.
  for (const line of lines) {
    const above: string | undefined = result.at(-1);
    if (above !== undefined && continues(above, line, indent)) {
      result[result.length - 1] = `${above} ${line.trim()}`;
      continue;
    }
    result.push(line);
    indent = LIST_ITEM.exec(line)?.[0].length ?? indentation(line);
  }
  return result;
}

/**
 * @param line
 * @returns The number of spaces that the line is indented by.
 */
function indentation(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * @param above - The line above.
 * @param line
 * @param indent - The indentation of a continuation of the line above.
 * @returns Whether the line continues the line above as prose. See `reflow`.
 */
function continues(above: string, line: string, indent: number): boolean {
  const ALIGNED = /\S {2,}\S/;
  const KEY = /^ *(?:- )?[\w ]+:$/;
  return (
    !!above.trim() &&
    !!line.trim() &&
    !LIST_ITEM.test(line) &&
    indentation(line) === indent &&
    !above.endsWith(':') &&
    !KEY.test(line) &&
    !ALIGNED.test(above) &&
    !ALIGNED.test(line)
  );
}

/**
 * Render a comment as HTML, linking its URLs, its issue numbers, and any
 * code-quoted abbreviations that it mentions.
 *
 * @param lines
 * @param index
 * @returns
 */
function prose(lines: string[], index: Index): string {
  const text: string = reflow(lines).join('\n');
  const TOKEN =
    /(https?:\/\/[\w-]+(?:\.[\w-]+)+(?:\/[^\s<>"]*[^\s<>".,;:)\]'*])?\/?)|`([^`\n]+)`|(?<![\w&])#(\d+)/gu;
  let html = '';
  let cursor = 0;
  for (const match of text.matchAll(TOKEN)) {
    html += escape(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const [, url, code, issue] = match;
    if (url) {
      html += `<a href="${escape(url)}">${escape(url)}</a>`;
    } else if (issue) {
      html += `<a href="${ISSUE_URL}${issue}">#${issue}</a>`;
    } else {
      const target: number | undefined = index.lookup(code!);
      const inner = `<code>${escape(code!)}</code>`;
      html +=
        target === undefined
          ? inner
          : `<a href="#${index.id(target)}">${inner}</a>`;
    }
  }
  // Spell out the line breaks and the indentation, rather than rely on
  // `white-space: pre-wrap`, which a word processor may not honor when
  // importing the page.
  return (
    (html + escape(text.slice(cursor)))
      .replace(/^ +/gm, (spaces: string): string =>
        '&nbsp;'.repeat(spaces.length)
      )
      .replaceAll('\n', '<br>\n')
      // Highlight the TODO's. Breaking up the `TODO:` pattern also keeps the
      // `check-todo` hook from mistaking them for the page's own. (An entity
      // such as `&#58;` won't do, because `tidy` decodes it.)
      .replaceAll('TODO:', '<span class="todo">TODO</span>:')
  );
}

/**
 * The notes of an entry, keyed by the location that they describe.
 */
class Notes {
  private readonly notes = new Map<string, string[]>();
  private readonly rendered = new Set<string>();

  /**
   * @param location
   * @param html
   */
  public add(location: Location, html: string): void {
    const key: string = JSON.stringify(location);
    this.notes.set(key, [...(this.notes.get(key) ?? []), html]);
  }

  /**
   * @param location
   * @returns The notes describing the given location, rendered as HTML.
   */
  public render(...location: Location): string {
    return this.about('', ...location);
  }

  /**
   * @param lead - HTML naming what the notes are about, for notes that are
   * rendered away from it.
   * @param location
   * @returns The notes describing the given location, rendered as HTML.
   */
  public about(lead: string, ...location: Location): string {
    const key: string = JSON.stringify(location);
    this.rendered.add(key);
    return (this.notes.get(key) ?? [])
      .map((html: string): string => `<div class="note">${lead}${html}</div>`)
      .join('');
  }

  /**
   * Ensure that every note was rendered, so that no comment is lost, such as
   * one describing a field that the page doesn't render.
   */
  public verify(): void {
    for (const key of this.notes.keys()) {
      log.ensure(this.rendered.has(key), 'Note was never rendered:', key);
    }
  }
}

/**
 * Entry renders an entry of the bibliography.
 */
class Entry {
  private readonly i: number;
  private readonly notes: Notes;
  private readonly index: Index;

  /**
   * @param i - The index of the entry.
   * @param notes - The notes of the entry.
   * @param index
   */
  public constructor(i: number, notes: Notes, index: Index) {
    this.i = i;
    this.notes = notes;
    this.index = index;
  }

  /**
   * @returns The entry, rendered as HTML.
   */
  public render(): string {
    const source: sax.Source = this.index.data[this.i]!;
    const title: string =
      source.title ?? '<span class="missing">No title yet</span>';
    return [
      `<section class="${cls.ENTRY}" id="${this.index.id(this.i)}">`,
      `<h3>${title}</h3>`,
      this.notes.render(),
      this.notes.render('title'),
      this.variants(source),
      this.notes.render('description'),
      this.description(source),
      this.fixes(source, 'postfixes'),
      this.fixes(source, 'prefixes'),
      '</section>',
    ].join('\n');
  }

  /**
   * @param source
   * @returns The variants, rendered as HTML.
   */
  private variants(source: sax.Source): string {
    const sigla: string = source.variants
      .map((variant: string): string =>
        search(citations(source, { variant }), escape(variant))
      )
      .join(' · ');
    const all: string = search(citations(source), 'Citations');
    // Notes about a single variant can't sit within the line, so they follow
    // it, led by the variant that they describe.
    const notes: string = source.variants
      .map((variant: string, j: number): string =>
        this.notes.about(`<code>${escape(variant)}</code>: `, 'variants', j)
      )
      .join('');
    return `<div class="variants"><span class="label">${all}</span>(${sigla})</div>${notes}${this.notes.render('variants')}`;
  }

  /**
   * @param source
   * @returns The description, rendered as HTML.
   */
  private description(source: sax.Source): string {
    if (!source.description?.length) {
      return '<p class="missing">No description yet.</p>';
    }
    const items: string = source.description
      .map(
        (item: string, j: number): string =>
          `<li>${item}${this.notes.render('description', j)}</li>`
      )
      .join('');
    return `<ul class="description">${items}</ul>`;
  }

  /**
   * @param source
   * @param field
   * @returns The table of the postfixes or prefixes, rendered as HTML.
   */
  private fixes(source: sax.Source, field: Fixes): string {
    const record: Record<string, sax.Fix> = source[field] ?? {};
    const notes: string = this.notes.render(field);
    if (!Object.keys(record).length) {
      return notes;
    }
    const rows: string = Object.entries(record)
      .map(([name, interpretation]: [string, sax.Fix]): string => {
        const query: string = citations(source, { [field]: name });
        return `<tr><td class="abbreviation">${search(query, escape(name))}</td><td>${this.meaning(name, interpretation)}${this.notes.render(field, name)}</td></tr>`;
      })
      .join('');
    const caption: string = field === 'postfixes' ? 'Postfixes' : 'Prefixes';
    return `<table class="fixes"><caption>${caption}</caption>${rows}</table>${notes}`;
  }

  /**
   * @param name
   * @param interpretation
   * @returns The meaning of a fix, rendered as HTML.
   */
  private meaning(name: string, interpretation: sax.Fix): string {
    if (interpretation === sax.REFERENCE) {
      const target: number = this.index.lookup(name)!;
      const title: string | null | undefined = this.index.data[target]!.title;
      const link = `<a href="#${this.index.id(target)}">${escape(name)}</a>`;
      return `<span class="kind">reference</span> see ${link}${title ? `: ${title}` : ''}`;
    }
    if (interpretation === sax.ANNOTATION) {
      const annotation: ann.Annotation = ann.MAPPING[name]!;
      const full: string = annotation.fixFullForm ?? annotation.fullForm;
      return `<span class="kind">annotation</span> ${escape(full)}`;
    }
    return interpretation ?? '<span class="missing">—</span>';
  }
}

/**
 * @param lines - The lines of a top-level comment.
 * @returns The heading, if the comment is a section banner.
 */
function banner(lines: string[]): string | undefined {
  // The `#` markers were stripped from the lines, so a banner consists of
  // lines of `#`, and lines introduced by `#### `.
  if (!lines.every((line: string): boolean => /^#+( |$)/.test(line))) {
    return undefined;
  }
  return lines
    .filter((line: string): boolean => !/^#+$/.test(line))
    .map((line: string): string => line.replace(/^#+ /, ''))
    .join(' ');
}

/**
 * @param location - The location of the item that follows a comment.
 * @returns The location that the comment describes. A comment that precedes
 * the first item of a list introduces the list, rather than the item, as in
 * "Verify that the following refer to the same item". A comment that precedes
 * a postfix or a prefix describes that one.
 */
function subject(location: Location): Location {
  return location.length === 2 && location[1] === 0 ? [location[0]!] : location;
}

/**
 * Attach the comments to the entries and the items that they describe.
 *
 * @param raw - The YAML source.
 * @param structure
 * @param index
 * @returns The notes of each entry, and the top-level comments rendered
 * before each entry, where `data.length` stands for the end of the file.
 */
function attach(
  raw: string,
  structure: Structure,
  index: Index
): { notes: Notes[]; between: string[][] } {
  const notes: Notes[] = index.data.map((): Notes => new Notes());
  const between: string[][] = [...notes, undefined].map((): string[] => []);
  let next = 0; // The index of the first anchor after the current comment.
  for (const comment of comments(raw, structure.scalars)) {
    while (
      structure.anchors[next] &&
      structure.anchors[next]!.offset < comment.end
    ) {
      ++next;
    }
    const anchor: Anchor | undefined = structure.anchors[next];
    if (comment.topLevel) {
      const heading: string | undefined = banner(comment.lines);
      between[anchor?.entry ?? index.data.length]!.push(
        heading === undefined
          ? `<div class="note top">${prose(comment.lines, index)}</div>`
          : `<h2>${escape(heading)}</h2>`
      );
      continue;
    }
    // An indented comment describes the item that follows it, if that item
    // belongs to the same entry. Otherwise, it trails the entry it's in.
    const current: number = structure.starts.findLastIndex(
      (start: number): boolean => start < comment.end
    );
    log.ensure(current >= 0, 'Indented comment outside any entry:', comment);
    notes[current]!.add(
      anchor?.entry === current ? subject(anchor.location) : [],
      prose(comment.lines, index)
    );
  }
  return { notes, between };
}

// The page is self-contained: its styles and its script are inlined, rather
// than shared with the rest of the site, so that it can be shared as a single
// file, and discarded without leaving anything behind. That's also why this
// file is exempt from the length limit.

const ENTRY_LINK = 'entry-link';

const STYLE = `
html { scroll-behavior: smooth; }
body { background: #fdfcf9; color: #222; line-height: 1.5; }
body { margin: 0 auto; max-width: 52rem; padding: 1rem; }
body { font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia,
  "Noto Sans Coptic", Antinoou, serif; }
h1 { margin-bottom: 0.25rem; }
h2 { border-bottom: 2px solid #8b3a2b; color: #8b3a2b; margin-top: 3rem; }
h3 { font-size: 1.15rem; margin: 0 0 0.5rem; position: relative; }
a { color: #1f5f8b; }
code { background: #f0ede6; border-radius: 3px; padding: 0 0.2em; }
.${ENTRY_LINK} { position: absolute; right: 100%; padding-right: 0.3em; }
.${ENTRY_LINK} { font-size: 0.8rem; opacity: 0; text-decoration: none; }
h3:hover .${ENTRY_LINK} { opacity: 1; }
.${cls.ENTRY} { border-top: 1px solid #ddd6c8; padding: 1rem 0; }
.variants { margin: 0.25rem 0; }
.variants .label a { font-weight: bold; }
.label, .fixes caption { color: #777; font-size: 0.8rem; text-align: left; }
.label, .fixes caption { letter-spacing: 0.05em; text-transform: uppercase; }
.label { margin-right: 0.5rem; }
.search { font-weight: bold; }
.description { margin: 0.5rem 0; padding-left: 1.25rem; }
.fixes { border-collapse: collapse; margin: 0.75rem 0; width: 100%; }
.fixes td { border-top: 1px solid #eee8dc; padding: 0.2rem 0.5rem; }
.fixes td { vertical-align: top; }
.fixes td.abbreviation { white-space: nowrap; width: 1%; }
.kind { border: 1px solid #c9bfa8; border-radius: 3px; color: #6b5d3f; }
.kind { font-size: 0.7rem; margin-right: 0.25rem; padding: 0 0.3em; }
.kind { text-transform: uppercase; }
.todo { color: #8b3a2b; font-weight: bold; }
.missing { color: #999; font-style: italic; }
.note { background: #f6f1e4; border-left: 3px solid #c9a85c; }
.note { color: #4a4030; font-size: 0.9rem; }
.note { margin: 0.4rem 0; padding: 0.3rem 0.6rem; }
.note.top { font-size: 0.95rem; }
.${cls.TITLE} { font-style: italic; }
.${cls.CLUE} { font-weight: bold; }
.${cls.DIALECT} { font-weight: bold; font-variant: small-caps; }
`;

// Prepend a 🔗 to the title of each entry, which navigates to the entry, and
// copies a link to it.
const SCRIPT = `
document.addEventListener('DOMContentLoaded', () => {
  for (const entry of document.querySelectorAll('.${cls.ENTRY}[id]')) {
    const a = document.createElement('a');
    a.className = '${ENTRY_LINK}';
    a.href = '#' + entry.id;
    a.title = 'Copy a link to this entry';
    a.textContent = '🔗';
    a.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.hash = entry.id;
      navigator.clipboard?.writeText(url.toString());
    });
    entry.querySelector(':scope > h3')?.prepend(a);
  }
});
`;

const INTRO = `<p>This page is generated from <code>bib.yaml</code>, the
bibliography behind the citation tooltips in Crum's dictionary on
<a href="https://remnqymi.com/crum/">remnqymi.com</a>. Click a variant, a
postfix, or a prefix to search Crum's dictionary for the citations that use
it. The shaded boxes are the comments of the file.</p>`;

/**
 * Make all links that leave the page open in a new tab, be they ours or the
 * bibliography's own. As with `html.anchor`, which we can't use here for want
 * of a DOM, an `href` that doesn't start with `#` is external.
 *
 * @param html
 * @returns
 */
function external(html: string): string {
  return html.replace(
    /<a (?=[^>]*\bhref="(?!#))/g,
    '<a target="_blank" rel="noopener noreferrer" '
  );
}

/**
 *
 */
function main(): void {
  const raw: string = fs.readFileSync(YAML_PATH, 'utf8');
  const structure = new Structure(raw);

  const index = new Index(sax.DATA);
  const { notes, between } = attach(raw, structure, index);
  const body: string[] = between.flatMap((html: string[], i: number) =>
    i < notes.length ? [...html, new Entry(i, notes[i]!, index).render()] : html
  );
  notes.forEach((n: Notes): void => {
    n.verify();
  });

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bibliography of Crum's Dictionary</title>
<style>${STYLE}</style>
<script>${SCRIPT}</script>
</head>
<body>
<h1>Bibliography of Crum's Dictionary</h1>
${INTRO}
${body.join('\n')}
</body>
</html>
`;
  fs.mkdirSync(path.dirname(HTML_PATH), { recursive: true });
  fs.writeFileSync(HTML_PATH, external(html), 'utf8');
}

main();
