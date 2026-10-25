(() => {
  'use strict';

  // GitHub renders every timestamp with the <relative-time> element. We switch
  // it to its absolute "datetime" mode (so it stops re-rendering as "2 minutes
  // ago") and then replace its text with the format picked in the popup
  // (GH_TWEAKS_DATE_FORMATS in src/settings.js).
  const DONE_ATTR = 'data-gh-tweaks-date';
  // Durations ("3m 12s" on Actions runs) aren't dates, so leave them alone.
  const DURATION_FORMATS = new Set(['duration', 'elapsed']);

  let scheduled = false;
  let formatDate = GH_TWEAKS_DATE_FORMATS[0].format;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.absoluteDates) return;
    const chosen = GH_TWEAKS_DATE_FORMATS.find(({ key }) => key === settings.dateFormat);
    if (chosen) formatDate = chosen.format;
    injectStyles();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    apply();
  });

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      apply();
    }, 50);
  }

  function apply() {
    for (const element of document.querySelectorAll(`relative-time:not([${DONE_ATTR}])`)) {
      element.setAttribute(DONE_ATTR, '');
      if (DURATION_FORMATS.has(element.getAttribute('format'))) continue;
      element.setAttribute('format', 'datetime');
      // The element renders asynchronously, so rewrite whenever its output changes.
      // Waiting a task lets it attach its shadow root and do the first render.
      setTimeout(() => {
        render(element);
        if (!element.shadowRoot) return;
        new MutationObserver(() => render(element)).observe(element.shadowRoot, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
    }
  }

  function render(element) {
    const date = new Date(element.getAttribute('datetime'));
    if (Number.isNaN(date.getTime())) return;
    const text = formatDate(date);
    const target = element.shadowRoot ?? element;
    if (target.textContent !== text) target.textContent = text;
  }

  function injectStyles() {
    // The repo file list sizes its last-commit column for "last week".
    const style = document.createElement('style');
    style.textContent = `
      .react-directory-row td:last-child, .react-directory-row ~ * td:last-child { width: auto; }
      .react-directory-commit-age { width: auto !important; white-space: nowrap; }
      table:has(.react-directory-commit-age) thead th:last-child { width: 170px !important; }
    `;
    document.documentElement.append(style);
  }
})();
