#!/usr/bin/env node

/**
 * Materialize the Crum Wiki enrichment as text, one file per lexicon page.
 *
 * Enrichment is a browser-side algorithm (`docs/crum/wiki.ts`): it runs when a
 * reader loads a page, and it leaves nothing behind. That makes the effect of
 * a change to it — a new `variants:` entry in `bib.yaml`, a tweak to
 * `ENRICHMENT_RE`, a fresh heuristic in `replaceMatch` — impossible to review.
 * This script runs the same algorithm under a headless DOM and writes down
 * every decision it made, so that the effect shows up as a Git diff, and so
 * that `/ambrose` can read a file instead of driving a live browser.
 *
 * The notation is specified in the table below, and summarized in
 * `.claude/commands/ambrose.md`. If it were to change, Ambrose needs to be
 * informed.
 */

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as jsdom from 'jsdom';
import * as cls from '../../docs/crum/cls.js';
import * as dial from '../../docs/crum/dialect.js';
import * as log from '../../docs/logger.js';
import * as tool from '../../docs/tooltip.js';
import * as params from '../../docs/params.js';
import * as css from '../../docs/css.js';
// Types only: the engine itself has to be loaded at run time, after a DOM
// exists. See the NOTE in `generate`.
import type * as engine from '../../docs/crum/wiki.js';
import type * as references from '../../docs/crum/references.js';

const PATH: string = fileURLToPath(import.meta.url);
const DIRNAME: string = path.dirname(PATH);
// TODO: (#0) Move paths to a shared package, similar to `utils/paths.py`.
const LEXICON_DIR: string = path.join(DIRNAME, '..', '..', 'docs', 'crum');
const OUTPUT_DIR: string = path.join(DIRNAME, 'data', 'output', 'wiki');

// A lexicon page. The directory also holds category pages (`adjective.html`)
// and the search page, which carry no Wiki content.
const PAGE_RE = /^(\d+)\.html$/;

const SHARD_FLAG = '--shard';
const SHARD_RE = new RegExp(`^${RegExp.escape(SHARD_FLAG)}=(\\d+)/(\\d+)$`);

/**
 * DOM_GLOBALS are the constructors that the enrichment engine dereferences
 * globally at call time — `Node.TEXT_NODE`, the `NodeFilter` constants that
 * `white.warnPotentiallyMissingReferences` passes to `createTreeWalker`, and
 * so on. jsdom hangs them off its window; Node.js has no such globals.
 *
 * NOTE: `navigator` is deliberately absent. Node.js >= 21 defines it as a
 * getter-only global, so assigning to it throws — and nothing on the
 * enrichment path reads it.
 */
const DOM_GLOBALS: readonly string[] = [
  'DocumentFragment',
  'Element',
  'HTMLElement',
  'Node',
  'NodeFilter',
  'Text',
  'TreeWalker',
];

/** The enriched-span kinds. */
const KINDS: readonly string[] = [
  cls.BIBLE,
  cls.REFERENCE,
  cls.ANNOTATION,
  cls.PAGE,
  cls.SEMICOLON,
];

/**
 * The classes whose content is a foreign script. The script is evident from
 * the characters, so they are bracketed without a label.
 *
 * They are all in `EXCLUDE` (`docs/crum/wiki.ts`), meaning enrichment provably
 * never touches a character inside them — which is what makes the bracket
 * worth reading: it marks off text that cannot hide a missed abbreviation.
 */
const LANGUAGES: readonly string[] = [
  cls.AMHARIC,
  cls.ARABIC,
  cls.ARAMAIC,
  cls.COPTIC,
  cls.DEMOTIC,
  cls.GREEK,
  cls.HEBREW,
  cls.HIEROGLYPHIC,
];

/**
 * Dialect codes double as classes on a `.dialect` span, so the allow-list has
 * to admit them. Taken from the same source `crum.handleDialect` validates
 * against, rather than re-spelled.
 */
const DIALECT_CODES: readonly string[] = [
  ...Object.keys(dial.DIALECTS),
  ...Object.keys(dial.NON_STANDARD),
];

/**
 * The `EXCLUDE` classes whose content is Latin. Same immunity as `LANGUAGES`,
 * but the characters do not announce it, so they carry a label to distinguish
 * them from text enrichment merely declined to touch.
 *
 * That is not all of the rest of `EXCLUDE`. `cls.DIALECT` brackets itself in
 * `wrapper`, and the four `KINDS` sit in `EXCLUDE` only so that enrichment
 * does not revisit its own output.
 */
const LABELLED: readonly string[] = [cls.BULLET, cls.GLOSS];

/**
 * Non-content. Dropped from the output.
 */
const AFFORDANCES: readonly string[] = [cls.COPY, cls.FINE_PRINT];

/**
 * Every tag that may appear inside an entry. See `KNOWN_CLASSES`.
 */
const KNOWN_TAGS: ReadonlySet<string> = new Set<string>([
  'A',
  'DEL',
  'I',
  'INS',
  'P',
  'SPAN',
  'SUP',
]);

/**
 * The classes that carry no notation of their own, and may therefore reach the
 * tag fallback in `wrapper` wearing nothing else.
 *
 * The list is load-bearing: `wrapper` exempts exactly these before falling
 * through to `tag`, and an element that arrives there carrying anything else
 * raises. Listing a class here asserts that the dump loses nothing by
 * rendering its element as a bare tag.
 */
const UNINTERESTING: readonly string[] = [
  // Addenda are handled through the nested <ins> and / or <del> tags.
  cls.ADDENDUM,
  // Enrichment marks its own triggers, and reparents the popovers away.
  tool.CLS.TIPPER,
  // Presentational, so they need no notation of their own.
  cls.STACK,
  cls.STACK_TOP,
  cls.STACK_BOTTOM,
];

/**
 * The classes that never reach the tag fallback, because they only ever occur
 * beside a class `wrapper` claims first: `.headword` and `.old` are always on
 * a script span (`span.headword.coptic`), which `LANGUAGES` brackets. They are
 * listed only so that `KNOWN_CLASSES` admits them; nothing dispatches on them,
 * and `UNINTERESTING` need not exempt them.
 *
 * `DIALECT_CODES` is the same case — a code only ever rides on a `.dialect`
 * span — and stands apart only because it is derived rather than spelled out.
 */
const SUBSUMED: readonly string[] = [cls.HEADWORD, cls.OLD];

/**
 * Every class that may appear inside an entry.
 *
 * The two allow-lists exist so that a construct this serializer does not
 * understand cannot pass through it silently. Bare text in the output means
 * "enrichment looked here and declined to act"; an unrecognized element
 * rendered transparently would forge exactly that claim, which is the worst
 * failure this artifact can have. So an element is accepted only when its tag
 * is known *and* every one of its classes is known — catching both a new tag
 * and a new class, while letting a known combination such as
 * `span.headword.coptic` through.
 */
const KNOWN_CLASSES: ReadonlySet<string> = new Set<string>([
  ...KINDS,
  ...LANGUAGES,
  ...LABELLED,
  ...DIALECT_CODES,
  ...AFFORDANCES,
  cls.DIALECT,
  cls.FOOTNOTED,
  cls.MARK,
  cls.SUBPARAGRAPH,
  ...UNINTERESTING,
  ...SUBSUMED,
]);

/** The separator between entries, and between folios. */
const RULE = '___';

/**
 * Emitted when a Bible citation names a chapter our Bible index does not
 * have. It keeps its tooltip but loses its hyperlink, which would only point
 * at a page that does not exist (`Citation.anchor`, `docs/crum/wiki.ts`).
 *
 * Bible is the only kind that can emit this. A `.page` is a link too, but
 * `paths.crumScan` always builds one with a query, so a `.page` without one is
 * an engine defect and raises instead. The remaining three kinds are spans
 * with tooltips, never links at all.
 */
const NO_LINK = 'NO-LINK';

/**
 * The base that page hrefs are resolved against.
 *
 * NOTE: A base is not optional. `SITE_URL` in `docs/paths.ts` is empty off an
 * Anki card, so every link a page carries is root-relative — `/crum?query=…`,
 * `/bible?book=…` — and `new URL` throws on those unless given one. Which base
 * is immaterial: only the query string is ever read.
 */
const BASE_URL = 'http://localhost';

/**
 * The two engine classes that read an enriched element back into the decision
 * it was built from. They arrive as an argument because the engine can only be
 * loaded once a DOM exists; see the NOTE in `generate`.
 */
interface Engine {
  readonly citation: typeof engine.Citation;
  readonly reference: typeof references.Reference;
}

/**
 * Install an empty DOM as the global one. Called once per process.
 *
 * NOTE: The document's own address only has to be well-formed. Nothing on the
 * enrichment path reads it, and this serializer resolves the hrefs it inspects
 * against `BASE_URL` explicitly rather than against the document's base — see
 * the note there.
 */
function install(): void {
  const dom: jsdom.JSDOM = new jsdom.JSDOM('<html><body></body></html>', {
    url: `${BASE_URL}/crum/`,
  });
  const win = dom.window as unknown as Record<string, unknown>;
  const glob = globalThis as unknown as Record<string, unknown>;
  glob['window'] = dom.window;
  glob['document'] = dom.window.document;
  glob['localStorage'] = dom.window.localStorage;
  for (const name of DOM_GLOBALS) {
    const ctor: unknown = win[name];
    // A missing constructor would install `undefined` and surface much later,
    // as a bewildering `TypeError` from deep inside the engine.
    log.ensure(ctor !== undefined, 'jsdom exposes no', name);
    glob[name] = ctor;
  }
}

/**
 * Load a page into the global document, replacing whatever it held.
 *
 * NOTE: One document is reused for the entire run, rather than a fresh jsdom
 * per page, and that is a hard requirement rather than an optimization.
 * `Source` in `references.ts` memoizes each bibliographic title as a parsed
 * `DocumentFragment` — sound in a browser, where a document outlives every
 * page render, but across documents each memo pins the document that happened
 * to be current when the source was first cited. A page costs ~14 MB, so a
 * document-per-page run exhausts the heap within a few hundred pages.
 * `document.open` reuses the `Document` object itself, so the memos stay valid
 * and nothing accumulates.
 *
 * @param html - The page's HTML.
 */
function load(html: string): void {
  document.open();
  // `document.write` is deprecated for web pages, where it blocks the parser
  // and can clobber a live document. Neither applies to a headless serializer,
  // and clobbering the document is precisely what is wanted: it is the only
  // API that reparses into the *same* `Document`, which is what keeps the
  // memos above valid. See the note on this function.
  // TODO: (#0) Avoid using a deprecated signature.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.write(html);
  document.close();
}

/**
 * Serialize one page's enrichment.
 *
 * Built after `wiki.handle` has run, against the resulting document.
 */
class Serializer {
  /** Popovers by the anchor name of their trigger. */
  private readonly tips: Map<string, HTMLElement> = new Map<
    string,
    HTMLElement
  >();

  /** The page being serialized, for error messages. */
  private readonly key: string;

  /**
   * Accumulator, from element signature to an example page. Shared across the
   * shard this process serializes, so that one pass reports every offender it
   * meets rather than dying on the first. Workers do not pool theirs, so a
   * signature that occurs on several shards is reported once per shard.
   */
  private readonly unknown: Map<string, string>;

  /** See `Engine`. */
  private readonly engine: Engine;

  /**
   * NOTE: Fields are assigned explicitly rather than declared as constructor
   * parameter properties, which Node's strip-only TypeScript loader rejects.
   *
   * @param key - See `key`.
   * @param unknown - See `unknown`.
   * @param engine - See `engine`.
   */
  public constructor(
    key: string,
    unknown: Map<string, string>,
    engine: Engine
  ) {
    this.key = key;
    this.unknown = unknown;
    this.engine = engine;
    document
      .querySelectorAll<HTMLElement>(`.${tool.CLS.TOOLTIP}[popover]`)
      .forEach((tip: HTMLElement): void => {
        const anchor: string = tip.style.getPropertyValue(tool.POSITION_ANCHOR);
        if (anchor) {
          this.tips.set(anchor, tip);
        }
      });
  }

  /**
   * @returns The whole page, or the empty string if it holds no entry.
   */
  public page(): string {
    const page: readonly string[] = Array.from(this.pageAux());
    if (!page.length) {
      return '';
    }
    return `${page.join('\n\n')}\n`;
  }

  /**
   * @yields The page's chunks, to be joined by a blank line: each folio's, in
   * document order, separated by a rule.
   */
  private *pageAux(): Generator<string> {
    let first = true;
    for (const folio of document.querySelectorAll<HTMLElement>(
      css.nested(cls.WIKI, cls.FOLIO)
    )) {
      if (!first) {
        yield RULE;
      }
      first = false;
      yield* this.folio(folio);
    }
  }

  /**
   * @param folio - A `.folio`, holding a Crum page label and its entries.
   * @yields Its chunks, the label first, its entries separated by a rule.
   */
  private *folio(folio: HTMLElement): Generator<string> {
    const label: Element | null = folio.querySelector(css.c(cls.CRUM_PAGE));
    log.ensure(label, 'Folio with no', cls.CRUM_PAGE, 'on page', this.key);
    yield label.textContent.trim();
    let first = true;
    for (const entry of folio.querySelectorAll<HTMLElement>(css.c(cls.ENTRY))) {
      if (!first) {
        yield RULE;
      }
      first = false;
      yield this.entry(entry);
    }
  }

  /**
   * @param entry - An `.entry`.
   * @returns Its serialization.
   *
   * Text nodes carry the HTML's indentation, so the two substitutions below
   * are what make every line break in the result one this serializer placed: a
   * blank line between paragraphs, and a `¶` line per subparagraph. They are
   * load-bearing rather than cosmetic — see `node` for why absorbing every
   * newline a text node carries is sound, and when it would stop being.
   *
   * Lines are left long on purpose — the project
   * reads its diffs with `--word-diff` (see the `diff` rule in the `Makefile`),
   * and re-wrapping would make an early edit reflow everything after it.
   */
  private entry(entry: HTMLElement): string {
    // TODO: (#0) Restructure the code such as trimming / squashing extra
    // whitespace is unnecessary.
    return this.nodes(entry.childNodes)
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * @param nodes - Nodes to serialize in order.
   * @returns Their concatenated serialization.
   */
  private nodes(nodes: Iterable<Node>): string {
    return Array.from(nodes, (node: Node): string => this.node(node)).join('');
  }

  /**
   * @param node - A text node or an element. An entry holds nothing else — no
   * comments, no CDATA — so anything else is a construct this serializer has
   * never seen and must not silently drop.
   * @returns Its serialization.
   *
   * A text node passes through verbatim, newlines and all. The HTML is
   * indented, so text nodes do carry newlines — but only ever as indentation:
   * Tidy never wraps text (`wrap: 0` in `tidy_config.txt`), and an entry's
   * prose lives inside `<p>`, whose content is inline throughout. So every
   * newline arriving here is white space the reader sees as nothing, which is
   * why `entry` can absorb them all and still promise that each line break in
   * the dump is one the serializer placed.
   *
   * That promise rests on the Tidy setting, not on anything this file does.
   * Were the HTML ever wrapped, a text node would carry a newline the reader
   * sees as a space, and `entry` would break a line where the page breaks
   * none.
   */
  private node(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue!;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      return this.element(node as HTMLElement);
    }
    return log.fatal(
      'Unexpected node type',
      node.nodeType,
      'on page',
      this.key
    );
  }

  /**
   * @param el - An element.
   * @returns Its serialization.
   */
  private element(el: HTMLElement): string {
    this.check(el);

    if (
      AFFORDANCES.some((klass: string): boolean => el.classList.contains(klass))
    ) {
      return '';
    }

    // The kinds are mutually exclusive, so a span carrying two of them means
    // the engine classified it twice and one of the two is being silently
    // dropped here — along with whatever it was going to say.
    const kinds: readonly string[] = KINDS.filter((k: string): boolean =>
      el.classList.contains(k)
    );
    log.ensure(kinds.length <= 1, 'Span of several kinds:', kinds, this.key);
    const kind: string | undefined = kinds[0];
    if (kind !== undefined) {
      const resolution: string | undefined = this.resolution(el, kind);
      const suffix: string = resolution === undefined ? '' : `{${resolution}}`;
      return `⟦${this.nodes(el.childNodes)}⟧${suffix}`;
    }

    return this.wrapper(el);
  }

  /**
   * @param el - An element carrying none of the enriched-span classes.
   * @returns Its serialization.
   */
  private wrapper(el: HTMLElement): string {
    const kids = (): string => this.nodes(el.childNodes);

    if (el.classList.contains(cls.MARK)) {
      // The footnote or addendum text, which is itself enriched. A `.mark`
      // exists only to carry that text, so one without a tooltip is a defect
      // in the engine, not an outcome worth reporting to a reader.
      const tip: HTMLElement | undefined = this.tip(el);
      log.ensure(tip, 'Mark with no tooltip on page', this.key);
      return `«${this.nodes(tip.childNodes)}»`;
    }
    // The extent of the footnoted text. Its `.mark` nests inside.
    if (el.classList.contains(cls.FOOTNOTED)) {
      return `⌈${kids()}⌉`;
    }
    if (el.classList.contains(cls.DIALECT)) {
      return `⟪${kids()}⟫`;
    }
    const labelled: string | undefined = LABELLED.find((c: string): boolean =>
      el.classList.contains(c)
    );
    if (labelled !== undefined) {
      return `⟨${labelled}: ${kids()}⟩`;
    }
    if (LANGUAGES.some((c: string): boolean => el.classList.contains(c))) {
      return `⟨${kids()}⟩`;
    }
    if (el.classList.contains(cls.SUBPARAGRAPH)) {
      return `\n¶ ${kids()}`;
    }

    const strange: string = el.classList
      .values()
      .filter((klass: string): boolean => !UNINTERESTING.includes(klass))
      .map(css.c)
      .toArray()
      .join('');
    log.ensure(
      !strange,
      el.nodeName.toLowerCase() + strange,
      'on page',
      this.key,
      'carries classes with no notation and no exemption'
    );

    return this.tag(el, kids);
  }

  /**
   * @param el - An element whose class list carries nothing of interest.
   * @param kids - Its serialized children, deferred.
   * @returns Its serialization, by tag name.
   */
  private tag(el: HTMLElement, kids: () => string): string {
    switch (el.nodeName) {
      // Half of `STYLED` in `wiki.ts`, on which `styledParent` and
      // `noStyledParent` turn. `/…/` would be ambiguous: `/` occurs thousands
      // of times in Crum's own text.
      case 'I':
        return `‹${kids()}›`;
      // The other half. A trailing one is a suffix or a Coptic form
      // superscript; see `suffixFollowups`.
      case 'SUP': {
        const tip: HTMLElement | undefined = this.tip(el);
        return `^(${kids()}${tip ? `=${this.gist(tip)}` : ''})`;
      }
      case 'DEL':
        return `--${kids()}--`;
      case 'INS':
        return `++${kids()}++`;
      case 'P':
        return `\n\n${kids()}\n\n`;
      // Carry no notation of their own: an `A` is always an enriched span,
      // handled above by kind, and a `SPAN` that reached here was classified
      // by `wrapper`.
      case 'A':
      case 'SPAN':
        return kids();
      default:
        // Outside `KNOWN_TAGS`. `check` has already recorded it, and the run
        // fails once every offender is collected — so do not die here, or one
        // pass would only ever name the first.
        log.ensure(
          !KNOWN_TAGS.has(el.nodeName),
          el.nodeName,
          'known but not explicitly handled, on page',
          this.key
        );
        return kids();
    }
  }

  /**
   * @param el - An enriched span.
   * @param kind - Its kind, one of `KINDS`.
   * @returns The `kind: payload` the span resolved to, or undefined when the
   * span carries no resolution worth printing.
   *
   * NOTE: A Bible citation and a reference are read back through the data
   * attributes the engine wrote them from — `Citation.fromAnchor` and
   * `Reference.fromSpan` — so what is printed is the decision itself, not a
   * reading of how the decision was rendered. The other two kinds record their
   * decision nowhere else: an annotation's tooltip holds its full form and
   * nothing besides, and a `.page`'s query is the scan it resolved to, so both
   * are taken verbatim from there.
   */
  private resolution(el: HTMLElement, kind: string): string | undefined {
    if (kind === cls.BIBLE) {
      return `${kind}: ${this.bible(el)}`;
    }

    if (kind === cls.REFERENCE) {
      return `${kind}: ${this.engine.reference.fromSpan(el).key()}`;
    }

    if (kind === cls.ANNOTATION) {
      // An annotation's tooltip is its full form, and it always has one, so a
      // missing tooltip is an engine defect rather than an unresolved
      // annotation.
      const tip: HTMLElement | undefined = this.tip(el);
      log.ensure(tip, 'Annotation with no tooltip on page', this.key);
      return `${kind}: ${this.gist(tip)}`;
    }

    if (kind === cls.PAGE) {
      // `paths.crumScan` always sets the query, so a `.page` without one is an
      // engine defect rather than an unresolved citation.
      const href: string | null = el.getAttribute('href');
      log.ensure(href, 'Page span with no href on page', this.key);
      const query: string | null = new URL(href, BASE_URL).searchParams.get(
        params.QUERY
      );
      log.ensure(query, 'Page link with no', params.QUERY, ':', href, this.key);
      return `${kind}: ${query}`;
    }

    if (kind === cls.SEMICOLON) {
      // A semicolon resolves to the same constant sentence every time, and the
      // marked-up character is already a semicolon, so naming the kind would
      // be pure noise — thousands of times over.
      return undefined;
    }

    return log.fatal('Unknown kind:', kind, 'on page', this.key);
  }

  /**
   * @param el - A `.bible` element.
   * @returns The citation it resolved to, in full — book, chapter and verse —
   * prefixed by `NO_LINK` when it resolved to no hyperlink. Generating the dump
   * also warns `Bible citation references unknown chapter` for each of those.
   */
  private bible(el: HTMLElement): string {
    if (!this.engine.citation.tagged(el)) {
      // A `.bible` element carrying no citation data is an unnumbered book
      // link. See `Citation.tagged`.
      const href: string | null = el.getAttribute('href');
      log.ensure(href, 'Book link with no href on page', this.key);
      const books: readonly string[] = new URL(
        href,
        BASE_URL
      ).searchParams.getAll(params.BOOK);
      log.ensure(books.length, 'Book link naming no book:', href, this.key);
      return books.join(' ');
    }

    const name: string = this.engine.citation.fromAnchor(el).name();
    // `Citation.anchor` builds a plain span, rather than an anchor, in exactly
    // the case it declines to link. See `NO_LINK`.
    // TODO: (#778) Mark unknown verses too. Only the chapter is checked against
    // the book's index, so a citation naming a verse the chapter does not have
    // still links — and nothing, the enrichment dump included, reports it.
    // Decide whether to check verses in the enricher as well (which we were
    // reluctant to do to avoid inflating it), or only here in the materializer.
    // The former is arguably unnecessary, and would inflate the enricher's
    // Bible index without real value.
    return el.nodeName === 'A' ? name : `${NO_LINK}: ${name}`;
  }

  /**
   * @param el - A tooltip trigger.
   * @returns Its popover, if it has one.
   */
  private tip(el: HTMLElement): HTMLElement | undefined {
    return this.tips.get(el.style.getPropertyValue(tool.ANCHOR_NAME));
  }

  /**
   * @param tip - A popover.
   * @returns A copy with the bibliographic descriptions dropped.
   */
  private static bare(tip: HTMLElement): HTMLElement {
    const copy: HTMLElement = tip.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('ul').forEach((ul: HTMLElement): void => {
      ul.remove();
    });
    log.ensure(copy.textContent.trim(), 'tip empty after removing `ul`', tip);
    return copy;
  }

  /**
   * @param tip - A popover.
   * @returns Its whole text, whitespace collapsed.
   */
  private gist(tip: HTMLElement): string {
    return Serializer.bare(tip).textContent.replace(/\s+/g, ' ').trim();
  }

  /**
   * Record an element this serializer does not understand. See
   * `KNOWN_CLASSES`.
   *
   * @param el - An element.
   */
  private check(el: HTMLElement): void {
    // CSS-selector shape. The tag name is always present. Only offending
    // classes are included.
    const strange: string = el.classList
      .values()
      .filter((c: string): boolean => !KNOWN_CLASSES.has(c))
      .map(css.c)
      .toArray()
      .join('');
    if (KNOWN_TAGS.has(el.nodeName) && !strange) {
      // Familiar tag and familiar classes! Nothing to do!
      return;
    }
    const signature: string = el.nodeName.toLowerCase() + strange;
    // `this.unknown` maps a signature to an example key – it doesn't matter
    // which one.
    this.unknown.set(signature, this.key);
  }
}

/**
 * @returns Every lexicon page key, in numeric order.
 */
function keys(): string[] {
  return fs
    .readdirSync(LEXICON_DIR)
    .map((name: string): string | undefined => PAGE_RE.exec(name)?.[1])
    .filter((key: string | undefined): key is string => key !== undefined)
    .sort((a: string, b: string): number => Number(a) - Number(b));
}

/**
 * Enrich the given pages and write their dumps.
 *
 * @param pages - Page keys.
 * @returns Unknown element signatures encountered, to an example page.
 */
async function generate(
  pages: readonly string[]
): Promise<Map<string, string>> {
  // The engine has to be imported *after* a DOM exists: `docs/crum/mode.js`,
  // pulled in transitively, calls `document.getElementById` at module scope.
  // TODO: (#0) Fix this anti-pattern, and import the engine in the top-level
  // scope.
  install();
  const wiki = await import('../../docs/crum/wiki.js');
  const refs = await import('../../docs/crum/references.js');
  const engine: Engine = {
    citation: wiki.Citation,
    reference: refs.Reference,
  };

  const unknown: Map<string, string> = new Map<string, string>();
  for (const key of pages) {
    const file: string = path.join(LEXICON_DIR, `${key}.html`);
    load(fs.readFileSync(file, 'utf8'));
    wiki.handle(document.body);
    // Some pages don't contain a `.wiki` element.
    const text: string = new Serializer(key, unknown, engine).page();
    if (text) {
      fs.writeFileSync(path.join(OUTPUT_DIR, `${key}.txt`), text, 'utf8');
    }
  }
  return unknown;
}

/**
 * Report unknown elements and fail, if there are any.
 *
 * @param unknown - Signatures to an example page.
 */
function report(unknown: ReadonlyMap<string, string>): void {
  if (!unknown.size) {
    return;
  }
  for (const [signature, key] of unknown) {
    log.error('Unknown element', signature, 'on page', key);
  }
  log.fatal(
    unknown.size,
    'unknown element(s). Teach',
    path.basename(PATH),
    'how to serialize them, then regenerate.'
  );
}

/**
 * Run the pipeline.
 */
async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  const match: RegExpExecArray | null = args[0] ? SHARD_RE.exec(args[0]) : null;

  if (match) {
    // A worker: take every `jobs`-th page, and write into the directory the
    // parent has already prepared.
    const index = Number(match[1]);
    const jobs = Number(match[2]);
    log.ensure(index < jobs); // Sanity check.
    const mine: readonly string[] = keys().filter(
      (_: string, i: number): boolean => i % jobs === index
    );
    report(await generate(mine));
    return;
  }

  if (args.length) {
    // Named pages, for a spot check. Leaves the rest of the dump alone.
    report(await generate(args));
    return;
  }

  const jobs: number = Math.min(os.availableParallelism(), keys().length);
  const workers: childProcess.ChildProcess[] = Array.from(
    { length: jobs },
    (_: unknown, i: number): childProcess.ChildProcess =>
      childProcess.fork(PATH, [`${SHARD_FLAG}=${i}/${jobs}`])
  );
  const codes: number[] = await Promise.all(
    workers.map(
      (worker: childProcess.ChildProcess): Promise<number> =>
        new Promise<number>((resolve: (code: number) => void): void => {
          worker.on('exit', (code: number | null): void => {
            resolve(code ?? 1);
          });
        })
    )
  );
  log.ensure(
    codes.every((code: number): boolean => code === 0),
    'Worker(s) failed:',
    codes.join(' ')
  );
}

await main();
