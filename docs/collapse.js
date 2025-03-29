// Handle .collapse elements.
export function addListeners(triggerUponLoad = false) {
  document.querySelectorAll('.collapse').forEach((collapse) => {
    collapse.addEventListener('click', () => {
      // TODO: Remove the dependency on the HTML structure.
      const collapsible = collapse.nextElementSibling;
      collapsible.style.maxHeight = collapsible.style.maxHeight
        ? ''
        : collapsible.scrollHeight.toString() + 'px';
    });
    if (triggerUponLoad) {
      collapse.click();
    }
  });
}
