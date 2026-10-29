// Reads GitHub's merge box on a PR's Conversation tab: one status per section
// (checks, review, conflicts) plus the label of its merge button. Shared by the
// sticky merge bar and the ready-to-merge notifications.
globalThis.GH_TWEAKS_MERGE_STATUS = (() => {
  // Which status leads when several need attention.
  const STATE_RANK = { fail: 0, pending: 1, ok: 2 };
  const KIND_RANK = ['review', 'checks', 'base'];

  function mergeBox() {
    return document.querySelector('[data-testid="mergebox-border-container"]');
  }

  function read(box, partial) {
    const chips = [];
    for (const section of box.children) {
      const heading = section.querySelector('h3');
      if (!heading) continue;
      const title = heading.textContent.trim();
      const detail = heading.nextElementSibling?.textContent.trim() ?? '';
      const chip = classify(title, detail);
      if (chip) chips.push({ ...chip, title, detail: chip.detail ?? detail });
    }
    const native = mergeButton(partial);
    return {
      chips,
      mergeLabel: native?.textContent.trim().replace(/\d*\s*\(\d+\)$/, '') ?? null,
    };
  }

  function classify(title, detail) {
    if (/check/i.test(title)) {
      const count = (word) => Number(detail.match(new RegExp(`(\\d+)\\s+${word}`, 'i'))?.[1] ?? 0);
      const failing = count('failing') + count('failed') + count('cancelled') + count('timed out') + count('error');
      const pending = count('pending') + count('in progress') + count('queued') + count('expected') + count('waiting');
      const total = failing + pending + count('successful') + count('skipped') + count('neutral');
      if (failing) return { kind: 'checks', state: 'fail', label: `${failing} failing`, detail: `${total - failing} of ${total} checks passed` };
      if (pending) return { kind: 'checks', state: 'pending', label: `${pending} pending`, detail: `${total - pending} of ${total} checks done` };
      return { kind: 'checks', state: 'ok', label: total ? `${total} passed` : 'Checks passed' };
    }
    if (/changes requested/i.test(title)) return { kind: 'review', state: 'fail', label: 'Changes requested' };
    if (/approved/i.test(title)) return { kind: 'review', state: 'ok', label: 'Approved' };
    if (/review/i.test(title)) return { kind: 'review', state: 'pending', label: 'Review required' };
    if (/no conflicts/i.test(title)) return { kind: 'base', state: 'ok', label: 'No conflicts' };
    if (/conflict/i.test(title)) return { kind: 'base', state: 'fail', label: 'Conflicts' };
    if (/out-of-date|behind/i.test(title)) return { kind: 'base', state: 'pending', label: 'Out of date' };
    return null;
  }

  // The real merge button ("Merge pull request", "Squash and merge", "Squash and merge stack"…).
  function mergeButton(partial) {
    return [...partial.querySelectorAll('button')].find(
      (button) => /merge/i.test(button.textContent) && !/^rebase|command line/i.test(button.textContent.trim()) && !button.disabled,
    );
  }

  // The most pressing status, and whether everything has passed.
  function summarize(chips) {
    const lead = [...chips].sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || KIND_RANK.indexOf(a.kind) - KIND_RANK.indexOf(b.kind))[0];
    return { lead, ready: chips.length > 0 && chips.every((chip) => chip.state === 'ok') };
  }

  return { mergeBox, read, mergeButton, summarize };
})();
