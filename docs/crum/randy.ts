import * as cls from './cls.js';

/**
 *
 * @param elem
 * @param {...any} content
 */
export function addFinePrint(
  elem: HTMLElement,
  ...content: (Node | string)[]
): void {
  const div: HTMLDivElement = document.createElement('div');
  div.append(...content);
  div.classList.add(cls.FINE_PRINT);
  elem.insertAdjacentElement('beforeend', div);
}
