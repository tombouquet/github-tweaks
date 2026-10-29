(() => {
  'use strict';

  // Hides the Checks tab on PRs. Check results still show in the merge box and the sticky merge bar.
  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.hideChecksTab) return;
    const style = document.createElement('style');
    style.textContent = 'nav[aria-label="Pull request navigation"] a[href$="/checks"] { display: none !important; }';
    document.documentElement.append(style);
  });
})();
