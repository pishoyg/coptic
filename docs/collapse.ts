// Handle .collapse elements.
export function addListeners(triggerUponLoad = false) {
  document
    .querySelectorAll<HTMLElement>('.collapse')
    .forEach((collapse: HTMLElement): void => {
      collapse.addEventListener('click', () => {
        // TODO: Remove the dependency on the HTML structure.
        const collapsible = collapse.nextElementSibling! as HTMLElement;
        collapsible.style.maxHeight = collapsible.style.maxHeight
          ? ''
          : collapsible.scrollHeight.toString() + 'px';
      });
      if (triggerUponLoad) {
        collapse.click();
      }
    });
}
