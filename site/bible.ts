document
  .querySelectorAll<HTMLElement>('.collapse')
  .forEach((collapse: HTMLElement): void => {
    collapse.addEventListener('click', function () {
      // TODO: Remove the dependency on the HTML structure.
      const collapsible = collapse.nextElementSibling! as HTMLElement;
      collapsible.style.maxHeight = collapsible.style.maxHeight
        ? ''
        : collapsible.scrollHeight.toString() + 'px';
    });
  });
