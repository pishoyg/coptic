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
/* eslint-disable max-lines */

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
import * as wiki from '../../docs/crum/wiki.js';
import * as ref from '../../docs/crum/references.js';

const PATH: string = fileURLToPath(import.meta.url);
const DIRNAME: string = path.dirname(PATH);
// TODO: (#0) Move paths to a shared package, similar to `utils/paths.py`.
// The site root, against which root-relative hrefs resolve to files.
const DOCS_DIR: string = path.join(DIRNAME, '..', '..', 'docs');
const LEXICON_DIR: string = path.join(DOCS_DIR, 'crum');
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
  // Node.js has a `CustomEvent` of its own, which jsdom's `dispatchEvent`
  // rejects.
  'CustomEvent',
  'DocumentFragment',
  'Element',
  'HTMLElement',
  'Node',
  'NodeFilter',
  'Text',
  'TreeWalker',
];

/**
 * The media queries the engine asks about, and the answers this dump is built
 * on.
 * `jsdom` implements no `matchMedia` whatsoever, so an unanswered query
 * surfaces as a `TypeError` from inside enrichment.
 *
 * Answering a query is choosing a media reader.
 */
const MEDIA: Readonly<Record<string, boolean>> = {
  // The dump describes the page as a hover-capable device sees it, which is
  // likely the richer rendering.
  // As of the time of writing, the dump would turn out identical either way.
  '(hover: hover)': true,
};

/**
 *
 * @param query
 *
 * @returns
 */
function matchMedia(query: string): { matches: boolean } {
  const matches: boolean | undefined = MEDIA[query];
  log.ensure(matches !== undefined, 'Unanswered media query:', query);
  return { matches };
}

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
  cls.TAB,
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
 * Emitted when a Bible citation links to a chapter page that has no element
 * for its verse. The link works, but lands at the top of the chapter rather
 * than on the verse.
 *
 * The check is against the chapter page itself, rather than against an index:
 * a fragment either names an element ID on the page or it does not, and the
 * page is the only place that is spelled out with certainty — verse IDs carry
 * foreign-chapter prefixes, suffixed verses are grouped under an unsuffixed
 * ID, and duplicates are disambiguated (see `bible/stshenouda_org/main.py`).
 * The enricher itself does not check verses, so as to keep its Bible index
 * small.
 */
const NO_VERSE = 'NO-VERSE';

/**
 * The base that page hrefs are resolved against.
 *
 * NOTE: A base is not optional. `SITE_URL` in `docs/paths.ts` is empty off an
 * Anki card, so every link a page carries is root-relative — `/crum?query=…`,
 * `/bible?book=…` — and `new URL` throws on those unless given one. Which base
 * is immaterial: only the path, query string and fragment are ever read, and
 * those of a root-relative href do not depend on it.
 */
const BASE_URL = 'http://localhost';

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
  // `matchMedia` is queries through `window` throughout our repository.
  win['matchMedia'] = matchMedia;
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

  /** Each anaphor's direct antecedent. See `links`. */
  private readonly antecedents: Map<HTMLElement, HTMLElement>;

  /** The chainable spans serialized so far, as serialized, in dump order. */
  private readonly chainable: string[] = [];

  /** The position of each chainable span serialized so far in `chainable`. */
  private readonly positions: Map<HTMLElement, number> = new Map<
    HTMLElement,
    number
  >();

  /**
   * NOTE: Fields are assigned explicitly rather than declared as constructor
   * parameter properties, which Node's strip-only TypeScript loader rejects.
   *
   * @param key - See `key`.
   */
  public constructor(key: string) {
    this.key = key;
    document
      .querySelectorAll<HTMLElement>(`.${tool.CLS.TOOLTIP}[popover]`)
      .forEach((tip: HTMLElement): void => {
        const anchor: string = tip.style.getPropertyValue(tool.POSITION_ANCHOR);
        if (anchor) {
          this.tips.set(anchor, tip);
        }
      });
    this.antecedents = this.links();
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
      const span = `⟦${this.nodes(el.childNodes)}⟧`;
      const link: string = wiki.ANTECEDENTS.includes(kind)
        ? this.link(el, span)
        : '';
      return `${span}${suffix}${link}`;
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
    if (el.classList.contains(cls.TAB)) {
      return '\n¶';
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
      // A paragraph opens with a `¶`, as does every subsequent subparagraph
      // (see the tab in `wrapper`).
      case 'P':
        return `\n\n¶ ${kids()}\n\n`;
      // Carry no notation of their own: an `A` is always an enriched span,
      // handled above by kind, and a `SPAN` that reached here was classified
      // by `wrapper`.
      case 'A':
      case 'SPAN':
        return kids();
      default:
        log.fatal(el.nodeName, 'not explicitly handled, on page', this.key);
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
   * nothing besides, and a `.page` carries only the search query it forwards
   * to the scan — `scan.Lookup` resolves that to a folio at read time — so both
   * are taken verbatim from there.
   */
  private resolution(el: HTMLElement, kind: string): string | undefined {
    if (kind === cls.BIBLE) {
      return `${kind}: ${this.bible(el)}`;
    }

    if (kind === cls.REFERENCE) {
      return `${kind}: ${ref.Reference.fromSpan(el).key()}`;
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
   * prefixed by `NO_LINK` when it resolved to no hyperlink, or by `NO_VERSE`
   * when the hyperlink misses its verse. Generating the dump also warns `Bible
   * citation references unknown chapter` for each of the former.
   */
  private bible(el: HTMLElement): string {
    if (!wiki.Citation.tagged(el)) {
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

    const name: string = wiki.Citation.fromAnchor(el).name();
    // `Citation.anchor` builds a plain span, rather than an anchor, in exactly
    // the case it declines to link. See `NO_LINK`.
    if (el.nodeName !== 'A') {
      return `${NO_LINK}: ${name}`;
    }
    return lands(el.getAttribute('href')!) ? name : `${NO_VERSE}: ${name}`;
  }

  /**
   * Read back every link the engine made on the page.
   *
   * @returns Each anaphor's direct antecedent.
   *
   * NOTE: The engine records a link nowhere but in a pair of event listeners
   * (`link` in `docs/crum/wiki.ts`), so the link is read back the way a reader
   * finds it: by hovering the anaphor, and seeing what lights up. Unlike the
   * resolutions, this is a reading of the rendering rather than of the
   * decision — but the link has no existence beyond that rendering.
   *
   * The highlight is transitive, so what lights up is the whole chain back to
   * its head. The direct antecedent is the one member of the chain whose own
   * chain is the rest of it. That is read off the chains alone, so it holds
   * whatever order the spans are later serialized in.
   */
  private links(): Map<HTMLElement, HTMLElement> {
    const lit = (): Set<HTMLElement> =>
      new Set(document.querySelectorAll<HTMLElement>(css.c(cls.ANTECEDENT)));

    const chains: Map<HTMLElement, Set<HTMLElement>> = new Map<
      HTMLElement,
      Set<HTMLElement>
    >();
    document
      .querySelectorAll<HTMLElement>(css.disjunction(...wiki.ANTECEDENTS))
      .forEach((el: HTMLElement): void => {
        el.dispatchEvent(new CustomEvent(wiki.EVENT.VISIT));
        chains.set(el, lit());
        el.dispatchEvent(new CustomEvent(wiki.EVENT.LEAVE));
        // Sanity check: leaving undoes the visit.
        log.ensure(!lit().size, 'Stale', cls.ANTECEDENT, 'on page', this.key);
      });

    const links: Map<HTMLElement, HTMLElement> = new Map<
      HTMLElement,
      HTMLElement
    >();
    chains.forEach((chain: Set<HTMLElement>, el: HTMLElement): void => {
      if (!chain.size) {
        return;
      }
      const direct: readonly HTMLElement[] = [...chain].filter(
        (c: HTMLElement): boolean => {
          const rest: Set<HTMLElement> | undefined = chains.get(c);
          return (
            rest?.size === chain.size - 1 &&
            [...rest].every((r: HTMLElement): boolean => chain.has(r))
          );
        }
      );
      // A chain is a path, so exactly one member heads the rest of it.
      // Anything else is a cycle, a fork, or a link to a span of a kind the
      // engine does not chain.
      const [head] = direct;
      log.ensure(
        head && direct.length === 1,
        'Antecedent chain is not a path on page',
        this.key
      );
      links.set(el, head);
    });
    return links;
  }

  /**
   * Record a chainable span, and print the antecedent it refers back to.
   *
   * @param el - A chainable span, not yet recorded.
   * @param span - Its serialization, brackets included.
   * @returns `{antecedent: ⟦text⟧}`, reproducing the antecedent as it was
   * serialized — or the empty string if the span refers back to nothing.
   *
   * The antecedent is always the nearest preceding chainable span with that
   * exact text, so the text alone identifies it: `⟦‹ib›⟧` or `⟦Mani 1⟧` may
   * well occur several times on a page, but only the last occurrence before
   * the anaphor is meant. That is not a property of the notation, and nothing
   * in the walk guarantees it — the walk steps over addenda and footnotes, and
   * a same-text span could sit in one of those. So it is enforced here: a link
   * the notation would misread raises rather than reach the dump.
   *
   * Text, rather than a label, is reproduced so that the dump is stable under
   * the changes it exists to review: a label would renumber every link after a
   * newly discovered antecedent, where text changes only on the links that
   * actually changed.
   *
   * The antecedent also carries its distance — how many chainable spans back
   * it sits, the same count a `{text}{n}` manual label forces — but only when
   * it is not the immediately preceding one. A distance of 1 is the
   * unremarkable case; anything more means the walk stepped over a nearer
   * citation, which is exactly what a reviewer must check.
   *
   * Counts are taken in dump order rather than document order, because the
   * dump is what they are read against. The two differ only where a popover's
   * content is serialized inline, at its mark.
   */
  private link(el: HTMLElement, span: string): string {
    log.ensure(!this.positions.has(el), 'Span serialized twice on', this.key);
    const position: number = this.chainable.length;
    this.positions.set(el, position);
    this.chainable.push(span);

    const antecedent: HTMLElement | undefined = this.antecedents.get(el);
    if (antecedent === undefined) {
      return '';
    }
    // The antecedent must already have been serialized. One yet to come is a
    // forward link.
    const from: number | undefined = this.positions.get(antecedent);
    log.ensure(
      from !== undefined && from < position,
      'Antecedent not strictly backwards on page',
      this.key
    );
    const text: string | undefined = this.chainable[from];
    log.ensure(
      text && this.chainable.lastIndexOf(text, position - 1) === from,
      'The antecedent of',
      span,
      'is not the last',
      text,
      'before it, on page',
      this.key
    );
    const distance: number = position - from;
    return distance > 1
      ? `{antecedent: ${text}, distance: ${String(distance)}}`
      : `{antecedent: ${text}}`;
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
   * Fail on an element this serializer does not understand. See
   * `KNOWN_CLASSES`.
   *
   * @param el - An element.
   */
  private check(el: HTMLElement): void {
    // CSS-selector shape. The tag name is always present. Only offending
    // classes are included.
    const strange: string = css.conjunction(
      ...el.classList
        .values()
        .filter((c: string): boolean => !KNOWN_CLASSES.has(c))
    );
    log.ensure(
      KNOWN_TAGS.has(el.nodeName) && !strange,
      'Unknown element',
      el.nodeName.toLowerCase() + strange,
      'on page',
      this.key,
      '. Teach',
      path.basename(PATH),
      'how to serialize it, then regenerate.'
    );
  }
}

/** The element IDs on each site page read so far, by path. See `ids`. */
const IDS: Map<string, ReadonlySet<string>> = new Map<
  string,
  ReadonlySet<string>
>();

/**
 * @param file - A site page.
 * @returns The element IDs it carries.
 *
 * A regex is enough here, and much cheaper than a DOM: the pages are written by
 * our own pipeline, which always double-quotes its attributes.
 */
function ids(file: string): ReadonlySet<string> {
  if (!IDS.has(file)) {
    IDS.set(
      file,
      new Set<string>(
        fs
          .readFileSync(file, 'utf8')
          .matchAll(/\sid="([^"]*)"/g)
          .map((match: RegExpExecArray): string => match[1]!)
      )
    );
  }

  return IDS.get(file)!;
}

/**
 * @param href - A root-relative hyperlink to a site page.
 * @returns Whether the page carries the element its fragment names. A link with
 * no fragment lands on the page itself, so it always does.
 */
function lands(href: string): boolean {
  const url: URL = new URL(href, BASE_URL);
  return (
    !url.hash ||
    ids(path.join(DOCS_DIR, url.pathname)).has(
      decodeURIComponent(url.hash.slice(1))
    )
  );
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
 */
function generate(pages: readonly string[]): void {
  install();

  for (const key of pages) {
    const file: string = path.join(LEXICON_DIR, `${key}.html`);
    load(fs.readFileSync(file, 'utf8'));
    try {
      wiki.handle(document.body);
    } catch (cause: unknown) {
      log.error('Failed to enrich', key, 'Cause:', cause);
    }
    // Some pages don't contain a `.wiki` element.
    const text: string = new Serializer(key).page();
    if (text) {
      fs.writeFileSync(path.join(OUTPUT_DIR, `${key}.txt`), text, 'utf8');
    }
  }
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
    generate(mine);
    return;
  }

  if (args.length) {
    // Named pages, for a spot check. Leaves the rest of the dump alone.
    generate(args);
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
