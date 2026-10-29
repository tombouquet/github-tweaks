(() => {
  'use strict';

  // A "~12 min review" chip next to a PR's line count. Lockfiles and generated
  // files don't count, nor do groups hidden with File triage. Tests, docs and
  // config read faster than source, and deletions faster than additions. Once you
  // mark files as Viewed it counts down what's left.
  const HIDDEN_KEY = 'gh-tweaks-hidden-categories';
  // Weighted lines a reviewer gets through per minute, and a fixed cost per file for context switching.
  const LINES_PER_MINUTE = 6;
  const MINUTES_PER_FILE = 0.5;
  const DELETION_WEIGHT = 0.25;
  const CATEGORY_WEIGHT = { Lockfiles: 0, Generated: 0, Tests: 0.6, Docs: 0.5, Config: 0.5, Source: 1 };
  // Octicon stopwatch (MIT).
  const STOPWATCH_SVG =
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M5.75.75A.75.75 0 0 1 6.5 0h3a.75.75 0 0 1 0 1.5h-.75v1l-.001.041a6.724 6.724 0 0 1 3.464 1.435l.007-.006.75-.75a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734l-.75.75-.006.007a6.75 6.75 0 1 1-10.548 0L2.72 5.03l-.75-.75a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018l.75.75.007.006A6.72 6.72 0 0 1 7.25 2.541V1.5H6.5a.75.75 0 0 1-.75-.75ZM8 14.5A5.25 5.25 0 1 0 8 4a5.25 5.25 0 0 0 0 10.5Zm.389-6.7 1.33-1.33a.75.75 0 1 1 1.061 1.06L9.45 8.861A1.503 1.503 0 0 1 8 10.75a1.499 1.499 0 1 1 .389-2.95Z"/></svg>';

  let chip = null;
  let scheduled = false;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.reviewEstimate) return;
    injectStyles();
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-pressed'],
    });
    schedule();
  });

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      update();
    }, 100);
  }

  async function update() {
    const diffstat = GH_TWEAKS_PR.current() && GH_TWEAKS_PR.headerDiffstat();
    if (!diffstat) {
      chip?.remove();
      return;
    }
    const data = await GH_TWEAKS_PR.changes();
    if (!data?.diffSummaries?.length) return chip?.remove();

    const hidden = loadHidden();
    const liveViewed = viewedOnPage();
    let total = 0;
    let left = 0;
    let lines = 0;
    for (const file of data.diffSummaries) {
      const category = GH_TWEAKS_FILE_CATEGORIES.find(([, pattern]) => pattern.test(file.path))[0];
      const weight = file.isVendored || hidden.has(category) ? 0 : CATEGORY_WEIGHT[category];
      if (!weight) continue;
      const minutes = ((file.linesAdded + file.linesDeleted * DELETION_WEIGHT) * weight) / LINES_PER_MINUTE + MINUTES_PER_FILE;
      total += minutes;
      lines += file.linesAdded + file.linesDeleted;
      if (!(liveViewed.get(file.path) ?? file.markedAsViewed)) left += minutes;
    }

    chip ??= createChip();
    const done = total > 0 && left === 0;
    const text = !total ? 'Nothing to review' : done ? 'All viewed' : left < total ? `${format(left)} left` : `${format(total)} review`;
    chip.lastChild.textContent = text;
    chip.dataset.done = String(done);
    chip.title = total
      ? `About ${format(total, true)} to review ${lines.toLocaleString()} changed lines${left < total ? `, ${format(left, true)} left` : ''}. Lockfiles, generated files and hidden groups don't count.`
      : 'Only lockfiles, generated files or hidden groups changed.';
    if (chip.parentElement !== diffstat.parentElement || chip.previousElementSibling !== diffstat) diffstat.after(chip);
  }

  // Viewed toggles on the Files changed page, which are newer than the JSON once you click them.
  function viewedOnPage() {
    const viewed = new Map();
    for (const entry of document.querySelectorAll('[data-testid="progressive-diffs-list"] > div')) {
      const path = entry.querySelector('[data-diff-header-wrapper] h3 code')?.textContent.replace(/[‎‏]/g, '').trim();
      const toggle = [...entry.querySelectorAll('[data-diff-header-wrapper] button[aria-pressed]')].find((b) => /viewed/i.test(b.textContent));
      if (path && toggle) viewed.set(path, toggle.getAttribute('aria-pressed') === 'true');
    }
    return viewed;
  }

  function loadHidden() {
    try {
      return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)) ?? []);
    } catch {
      return new Set();
    }
  }

  // "~12 min", "~1h 20m"; spelled out for the tooltip.
  function format(minutes, long = false) {
    const rounded = Math.max(1, Math.round(minutes));
    if (rounded < 60) return long ? `${rounded} minute${rounded === 1 ? '' : 's'}` : `~${rounded} min`;
    const hours = Math.floor(rounded / 60);
    const rest = rounded % 60;
    if (long) return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minutes` : ''}`;
    return `~${hours}h${rest ? ` ${rest}m` : ''}`;
  }

  function createChip() {
    const element = document.createElement('span');
    element.className = 'gh-tweaks-estimate';
    element.innerHTML = `${STOPWATCH_SVG}<span></span>`;
    return element;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .gh-tweaks-estimate {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
        padding: 0 8px;
        height: 20px;
        border-radius: 999px;
        background: var(--bgColor-neutral-muted, #818b981f);
        color: var(--fgColor-muted, #59636e);
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        cursor: default;
      }
      .gh-tweaks-estimate[data-done="true"] {
        background: var(--bgColor-success-muted, #dafbe1);
        color: var(--fgColor-success, #1a7f37);
      }
    `;
    document.documentElement.append(style);
  }
})();
