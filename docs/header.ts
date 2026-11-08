/**
 * Package header renders the shared page header and footer.
 *
 * A page that has a header contains an empty `<header></header>` at the top of
 * its body, and an empty `<footer></footer>` at the end. Neither carries an ID
 * or a class: there is at most one of each per page, so CSS and TypeScript
 * refer to them by tag name. The placeholders never change; the page's data
 * (such as `<link rel="prev|next|search">`) lives in `<head>`, and the page's
 * entry point picks the units it wants and calls {@link mount}.
 *
 * NOTE: Text fragments (`#:~:text=`) constrain how we fill the placeholders
 * (#740, #754, #702):
 * 1. Call {@link mount} once per slot, synchronously, at module evaluation,
 *    before the entry point's first `await` (never in a `setTimeout`). In
 *    #740, a macrotask let the browser compute the text-fragment position
 *    before we changed the page, so it scrolled to the wrong place. Entry
 *    points that use top-level `await main()` must mount before the first
 *    `await` inside `main`.
 * 2. The header's height is reserved in CSS (see `header.css`), so mounting
 *    never moves content. The footer is the last thing in the body, so
 *    filling it can't move content above it.
 * 3. Only add new nodes inside the placeholders. Never split or splice existing
 *    text nodes (see the NOTE in `html.ts`, #754): that breaks Firefox's
 *    fragment highlighting.
 *
 * NOTE: This module must not import, at runtime, anything that imports it back.
 * In particular, it must not import `dev.ts` or `logger.ts`: the chain
 * `logger.ts → dev.ts → highlight.ts → header.ts` exists, and `dev.ts` extends
 * a class from `highlight.ts` while it loads, so a page that reached
 * `highlight.ts` first would throw a `ReferenceError`. Hence, actions are
 * events (see {@link EVENT}), and a missing placeholder is a silent no-op
 * rather than a logged error.
 */
import * as paths from './paths.js';
import * as browser from './browser.js';

enum CLS {
  /** EITHER is the class of a slot that holds alternative units, of which the
   * page shows one at a time. */
  EITHER = 'either',
  /** LEGEND is the class of the text that explains a unit's icon, which a
   * crowded nav on a small screen hides. See {@link iconAndLegend}. */
  LEGEND = 'legend',
}

enum ID {
  RESET = 'reset',
  DEV = 'dev',
  HELP = 'help',
  PREV = 'prev',
  NEXT = 'next',
}

/**
 * Names of events the header module dispatches on `document`. Each value
 * is the string used as the event type so consumers can subscribe with
 * `document.addEventListener(head.EVENT.X, …)`.
 *
 * Consumers gate their handlers however they see fit — e.g. RESET is
 * routed to whichever dictionary is currently in view by having each
 * listener check its own active-view predicate.
 *
 * TODO: (#203) Contemplate a clean design for mode-guarded events.
 * Today every listener re-implements the same `if (this.isActive())`
 * check, and the dispatcher has no idea which mode it is targeting —
 * which is brittle (each new listener has to remember the guard) and
 * scatters mode awareness across unrelated modules. Possible directions:
 * tag each dispatch with the originating mode and let the registry
 * filter; expose `head.on(event, mode, handler)` so the mode binding
 * lives at subscription time; or have the host re-register the listener
 * set wholesale on mode change so inactive views simply do not hear
 * the event.
 */
export enum EVENT {
  /** Triggered when the user asks to reset the current view. */
  RESET = 'reset',
  /** Triggered when the user asks to toggle developer mode. */
  DEV = 'dev',
  /** Triggered when the user asks for the previous page of the current
   * view. */
  PREV = 'prev',
  /** Triggered when the user asks for the next page of the current view. */
  NEXT = 'next',
  /** Triggered when the user asks to toggle the Help panel. */
  HELP = 'help',
}

/**
 * Dispatch the given header event on `document`.
 * @param event - The event type to dispatch.
 */
export function dispatch(event: EVENT): void {
  document.dispatchEvent(new CustomEvent(event));
}

/**
 * Fill the page's `<header>` or `<footer>` placeholder with a `<nav>` of the
 * given units, in order.
 *
 * A missing placeholder is a silent no-op: some pages legitimately lack one,
 * and the Playwright tests enforce presence where it's required.
 *
 * See the NOTE at the top of this module for when to call this.
 *
 * @param slot - The placeholder to fill.
 * @param units - The units to place in it.
 */
export function mount(
  slot: 'header' | 'footer',
  ...units: HTMLElement[]
): void {
  const placeholder: HTMLElement | null = document.querySelector(slot);
  if (!placeholder) {
    return;
  }
  const nav: HTMLElement = document.createElement('nav');
  nav.append(...units);
  placeholder.append(nav);
}

/**
 * @param href - The link target.
 * @param children - The link content.
 * @returns
 */
function anchor(
  href: string,
  ...children: (Node | string)[]
): HTMLAnchorElement {
  const a: HTMLAnchorElement = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.append(...children);
  return a;
}

/**
 * A unit's content comes in one of two modes:
 * - A unit with an icon and a legend shows both, except in a crowded nav on a
 *   small screen, where it shows only the icon (see `header.css`). Its content
 *   comes from this function.
 * - A unit with a single mode (such as prev, next, and labels) shows the same
 *   content everywhere. Its content is plain text.
 *
 * @param icon - The content that is always shown.
 * @param legend - The text that explains the icon, which may be hidden.
 * @returns The content of a unit.
 */
function iconAndLegend(icon: string, legend: string): Node[] {
  const span: HTMLSpanElement = document.createElement('span');
  span.classList.add(CLS.LEGEND);
  // The space belongs to the legend, so it disappears along with it.
  span.textContent = ` ${legend}`;
  return [document.createTextNode(icon), span];
}

/**
 * @param event - The event to dispatch on click.
 * @param id - The button's ID.
 * @param children - The button content.
 * @returns A button.
 */
function button(
  event: EVENT,
  id: string,
  ...children: (Node | string)[]
): HTMLButtonElement {
  const b: HTMLButtonElement = document.createElement('button');
  b.type = 'button';
  b.append(...children);
  b.addEventListener('click', (): void => {
    dispatch(event);
  });
  b.id = id;
  return b;
}

/**
 * @returns A link to the homepage.
 */
export function home(): HTMLElement {
  return anchor(paths.HOME, ...iconAndLegend('⌂', 'Home'));
}

/**
 * @param href - The link target. Defaults to the page's
 * `<link rel="search">`, which must then exist.
 * @param legend - The text that explains the search icon.
 * @returns A search link.
 */
export function search(href?: string, legend = 'Search'): HTMLElement {
  return anchor(
    href ?? browser.getLinkHref('search')!,
    ...iconAndLegend('⌕', legend)
  );
}

/**
 *
 * @param rel
 * @param text
 * @param event
 * @param id
 * @returns
 */
function neighbor(
  rel: 'prev' | 'next',
  text: string,
  event: EVENT,
  id: string
): HTMLElement {
  const b: HTMLButtonElement = button(event, id, text);
  // If the link is available, register a default listener.
  // On pages where a different listener is needed, the link should be absent,
  // and this listener won't be registered.
  const href: string | null = browser.getLinkHref(rel);
  if (href) {
    document.addEventListener(event, () => {
      browser.open(href, false);
    });
  }
  return b;
}

/**
 * @returns A unit that goes to the previous page.
 */
export function prev(): HTMLElement {
  return neighbor('prev', '⇐', EVENT.PREV, ID.PREV);
}

/**
 * @returns A unit that goes to the next page.
 */
export function next(): HTMLElement {
  return neighbor('next', '⇒', EVENT.NEXT, ID.NEXT);
}

/**
 * @param text - The label, such as the page's key or title.
 * @param href - The link target, if the label is a link.
 * @returns A label.
 */
export function label(text: string, href?: string): HTMLElement {
  if (href) {
    return anchor(href, text);
  }
  const span: HTMLSpanElement = document.createElement('span');
  span.textContent = text;
  return span;
}

/**
 * @returns A link to the reports form, opening in a new tab.
 */
export function reports(): HTMLElement {
  return anchor(paths.reports(), ...iconAndLegend('⚑', 'Reports'));
}

/**
 * @returns A button that dispatches {@link EVENT.RESET}.
 */
export function reset(): HTMLElement {
  return button(EVENT.RESET, ID.RESET, ...iconAndLegend('⟳', 'Reset'));
}

/**
 * @returns A button that dispatches {@link EVENT.DEV}.
 */
export function dev(): HTMLElement {
  return button(EVENT.DEV, ID.DEV, ...iconAndLegend('λ', 'Dev'));
}

/**
 * The button only dispatches the event. The Help panel listens for it, so on a
 * page without the panel, the button does nothing.
 *
 * @returns A button that dispatches {@link EVENT.HELP}.
 */
export function help(): HTMLElement {
  return button(EVENT.HELP, ID.HELP, ...iconAndLegend('?', 'Help'));
}

/**
 * The slot renders all the units; the page's CSS shows only one of them at a
 * time (for example, depending on the mode).
 *
 * @param units - The alternative units.
 * @returns A slot that holds alternative units.
 */
export function either(...units: HTMLElement[]): HTMLElement {
  const span: HTMLSpanElement = document.createElement('span');
  span.classList.add(CLS.EITHER);
  span.append(...units);
  return span;
}
