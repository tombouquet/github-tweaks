(() => {
  'use strict';

  // While a PR's Conversation tab is open, sends a desktop notification when it
  // becomes ready to merge, or when something starts failing (checks, changes
  // requested, conflicts). It stays quiet while you're looking at the tab. The
  // tab title gets a ✅ or ❌ in front, so you can spot it among your tabs.
  const CONVERSATION_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
  const PREFIXES = { ready: '✅ ', fail: '❌ ' };
  const PREFIX_PATTERN = /^(✅|❌) /;

  let last = null;
  let lastPath = null;
  let scheduled = false;

  GH_TWEAKS_SETTINGS.then((settings) => {
    if (!settings.notifyReady) return;
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    schedule();
  });

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      update();
    }, 200);
  }

  function update() {
    const box = CONVERSATION_PATH.test(location.pathname) && GH_TWEAKS_MERGE_STATUS.mergeBox();
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      last = null;
    }
    if (!box) return setTitle(null);

    const partial = box.closest('[data-testid="mergebox-partial"]') ?? box;
    const { chips } = GH_TWEAKS_MERGE_STATUS.read(box, partial);
    if (!chips.length) return;
    const { lead, ready } = GH_TWEAKS_MERGE_STATUS.summarize(chips);
    const state = ready ? 'ready' : lead.state === 'fail' ? 'fail' : 'pending';
    // Failing for a new reason (say checks, then conflicts) counts as a change too.
    const key = state === 'fail' ? `fail:${lead.kind}` : state;
    setTitle(state);

    // The first reading on a page is where things stand, not a change.
    if (last !== null && key !== last && state !== 'pending' && !watching()) notify(state, lead);
    last = key;
  }

  // Looking at the tab already shows the change, so a notification would be noise.
  function watching() {
    return document.visibilityState === 'visible' && document.hasFocus();
  }

  function notify(state, lead) {
    const title = document.querySelector('h1 .markdown-title')?.textContent.trim() ?? document.title;
    const [, owner, repo, , number] = location.pathname.split('/');
    chrome.runtime.sendMessage({
      type: 'notify',
      tag: location.pathname,
      title: state === 'ready' ? 'Ready to merge' : lead.title,
      message: title,
      context: `${owner}/${repo}#${number}`,
    });
  }

  // GitHub rewrites the title as you navigate, so the prefix is stripped and re-added each time.
  function setTitle(state) {
    const plain = document.title.replace(PREFIX_PATTERN, '');
    const wanted = (PREFIXES[state] ?? '') + plain;
    if (document.title !== wanted) document.title = wanted;
  }
})();
