import { prChanges } from '@/lib/pr-data';
import { addStyle, batched } from '@/lib/schedule';
import type { Settings } from '@/lib/settings';

// PDFs on Files changed (and commit pages) show "Binary file not shown." This
// swaps that note for a preview of the new version, plus a link to open it in a
// tab. The bytes come from /raw/ on github.com, so private repos work too.
const DIFF_PAGE = /^\/([^/]+)\/([^/]+)\/(?:pull\/\d+\/changes(?:\/([^/]+))?|commit\/([0-9a-f]{7,40}))/;
const PDF = /\.pdf$/i;
const NOTE = 'Binary file not shown.';
const PREVIEW_CLASS = 'gh-tweaks-pdf';
const HIDDEN_ATTR = 'data-gh-tweaks-pdf-note';
// Octicon link-external (MIT).
const EXTERNAL_SVG =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"></path></svg>';

// PDF bytes by raw URL, shared across re-renders of the same file.
const pdfs = new Map<string, Promise<Blob | null>>();

const schedule = batched(() => void update(), 100);

export function pdfPreview(settings: Settings): void {
  if (!settings.pdfPreview) return;
  injectStyles();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}

async function update(): Promise<void> {
  const match = location.pathname.match(DIFF_PAGE);
  if (!match) return;
  const [, owner, repo, range, commit] = match as unknown as [string, string, string, string?, string?];
  const notes = [...document.querySelectorAll('[data-testid="progressive-diffs-list"] > div')].flatMap((entry) => {
    const path = filePath(entry);
    const note = path && PDF.test(path) ? binaryNote(entry) : null;
    return path && note ? [{ path, note }] : [];
  });
  if (!notes.length) return;
  const oid = commit ?? range?.split('..').pop() ?? (await headOid());
  if (!oid) return;
  for (const { path, note } of notes) {
    if (note.hasAttribute(HIDDEN_ATTR)) continue;
    void preview(note, `/${owner}/${repo}`, oid, path);
  }
}

async function headOid(): Promise<string | undefined> {
  const changes = await prChanges();
  return changes?.pullRequest?.comparison?.headOid ?? changes?.comparison?.fullDiff?.headOid;
}

function filePath(entry: Element): string | undefined {
  // GitHub wraps the path in left-to-right marks.
  return entry
    .querySelector('[data-diff-header-wrapper] h3 code')
    ?.textContent?.replace(/[‎‏]/g, '')
    .trim();
}

// The innermost element reading "Binary file not shown."
function binaryNote(entry: Element): HTMLElement | null {
  const matches = [...entry.querySelectorAll<HTMLElement>('*')].filter((element) => element.textContent?.trim() === NOTE);
  return matches.at(-1) ?? null;
}

async function preview(note: HTMLElement, repoBase: string, oid: string, path: string): Promise<void> {
  note.setAttribute(HIDDEN_ATTR, '');
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const raw = `${repoBase}/raw/${oid}/${encoded}`;
  const box = document.createElement('div');
  box.className = PREVIEW_CLASS;
  const link = document.createElement('a');
  link.href = `${repoBase}/blob/${oid}/${encoded}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.innerHTML = `${EXTERNAL_SVG}<span>Open in a new tab</span>`;
  const frame = document.createElement('iframe');
  frame.title = `Preview of ${path}`;
  frame.src = chrome.runtime.getURL('/pdf.html');
  box.append(link, frame);
  note.after(box);

  let blob = pdfs.get(raw);
  if (!blob) {
    blob = fetch(raw)
      .then((response) => (response.ok ? response.blob() : null))
      .catch(() => null);
    pdfs.set(raw, blob);
  }
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  const [data] = await Promise.all([blob, loaded]);
  // Deleted files have no new version, and a failed load leaves GitHub's note as it was.
  if (!data) {
    box.remove();
    return;
  }
  frame.contentWindow?.postMessage(data, new URL(frame.src).origin);
}

function injectStyles(): void {
  addStyle(`
    [${HIDDEN_ATTR}]:has(+ .${PREVIEW_CLASS}) { display: none !important; }
    .${PREVIEW_CLASS} { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
    .${PREVIEW_CLASS} > a { display: inline-flex; align-items: center; gap: 4px; align-self: flex-end; font-size: 12px; }
    .${PREVIEW_CLASS} > iframe { width: 100%; height: 80vh; min-height: 400px; border: 1px solid var(--borderColor-default, #d0d7de); border-radius: 6px; background: var(--bgColor-muted, #f6f8fa); }
  `);
}
