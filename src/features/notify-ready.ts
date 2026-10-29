// While a PR's Conversation tab is open, sends a desktop notification when it
// becomes ready to merge, or when something starts failing (checks, changes
// requested, conflicts). It stays quiet while you're looking at the tab. The
// tab title gets a ✅ or ❌ in front, so you can spot it among your tabs.
import { mergeBox, readMergeStatus, summarize, type Chip } from '@/lib/merge-status';
import type { AppMessage } from '@/lib/messages';
import { batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

type State = 'ready' | 'fail' | 'pending';

const CONVERSATION_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
const PREFIXES: Partial<Record<State, string>> = { ready: '✅ ', fail: '❌ ' };
const PREFIX_PATTERN = /^(✅|❌) /;

let last: string | null = null;
let lastPath: string | null = null;

export function notifyReady(settings: Settings): void {
  if (!settings.notifyReady) return;
  const schedule = batched(update, 200);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  schedule();
}

function update(): void {
  const box = CONVERSATION_PATH.test(location.pathname) ? mergeBox() : null;
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    last = null;
  }
  if (!box) return setTitle(null);

  const partial = box.closest('[data-testid="mergebox-partial"]') ?? box;
  const { chips } = readMergeStatus(box, partial);
  const { lead, ready } = summarize(chips);
  if (!lead) return;
  const state: State = ready ? 'ready' : lead.state === 'fail' ? 'fail' : 'pending';
  // Failing for a new reason (say checks, then conflicts) counts as a change too.
  const key = state === 'fail' ? `fail:${lead.kind}` : state;
  setTitle(state);

  // The first reading on a page is where things stand, not a change.
  if (last !== null && key !== last && state !== 'pending' && !watching()) notify(state, lead);
  last = key;
}

// Looking at the tab already shows the change, so a notification would be noise.
function watching(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function notify(state: State, lead: Chip): void {
  const title = document.querySelector('h1 .markdown-title')?.textContent?.trim() ?? document.title;
  const [, owner, repo, , number] = location.pathname.split('/');
  void chrome.runtime.sendMessage({
    type: 'notify',
    tag: location.pathname,
    title: state === 'ready' ? 'Ready to merge' : lead.title,
    message: title,
    context: `${owner}/${repo}#${number}`,
  } satisfies AppMessage);
}

// GitHub rewrites the title as you navigate, so the prefix is stripped and re-added each time.
function setTitle(state: State | null): void {
  const plain = document.title.replace(PREFIX_PATTERN, '');
  const wanted = (state ? (PREFIXES[state] ?? '') : '') + plain;
  if (document.title !== wanted) document.title = wanted;
}
