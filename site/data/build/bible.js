'use strict';
document.querySelectorAll('.collapse').forEach((collapse) => {
  collapse.addEventListener('click', function () {
    // TODO: Remove the dependency on the HTML structure.
    const collapsible = collapse.nextElementSibling;
    collapsible.style.maxHeight = collapsible.style.maxHeight
      ? ''
      : collapsible.scrollHeight.toString() + 'px';
  });
});
