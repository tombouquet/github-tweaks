// Every tweak that runs on github.com. GitHub is a single-page app, so each one starts
// once per page load and watches the page for the parts it changes.
import { absoluteDates } from '@/features/absolute-dates';
import { claudeCode } from '@/features/claude-code';
import { fridayWarning } from '@/features/friday';
import { hideChecksTab } from '@/features/hide-checks-tab';
import { hideMergeHint } from '@/features/merge-hint';
import { jumpToFile } from '@/features/jump-to-file';
import { lightbox } from '@/features/lightbox';
import { markdownOutline } from '@/features/md-outline';
import { markdownReview } from '@/features/md-review';
import { mergeBar } from '@/features/merge-bar';
import { notifyReady } from '@/features/notify-ready';
import { prReview } from '@/features/pr-review';
import { readmeToc } from '@/features/readme-toc';
import { repoFiles } from '@/features/repo-files';
import { sinceReview } from '@/features/since-review';
import { loadSettings, type Settings } from '@/lib/settings';
import './hide-copilot.css';

// Repo files comes before Jump to file, which uses its icons and Quick view.
const TWEAKS: ((settings: Settings) => void)[] = [
  lightbox,
  prReview,
  absoluteDates,
  repoFiles,
  jumpToFile,
  readmeToc,
  markdownOutline,
  mergeBar,
  notifyReady,
  hideMergeHint,
  hideChecksTab,
  fridayWarning,
  sinceReview,
  claudeCode,
  markdownReview,
];

export default defineContentScript({
  matches: ['https://github.com/*'],
  runAt: 'document_idle',
  async main() {
    const settings = await loadSettings();
    // hide-copilot.css applies unless this attribute is set.
    if (!settings.hideCopilot) document.documentElement.setAttribute('data-gh-tweaks-show-copilot', '');
    for (const start of TWEAKS) {
      try {
        start(settings);
      } catch (error) {
        console.error('[GitHub Tweaks]', error);
      }
    }
  },
});
