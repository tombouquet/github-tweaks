// All tweaks: every tweak in FEATURES with a longer rundown of what it does and where,
// and a switch that works like the popup's.
import { MarkGithubIcon } from '@primer/octicons-react';
import { useState } from 'react';
import { ChoiceSelect, ToggleSwitch, groupBy } from '@/components/feature-options';
import { Intro, PageHeader } from '@/components/page-header';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/hooks/use-settings';
import { navigate } from '@/hooks/use-route';
import { FEATURES, saveSettings, type FeatureKey } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { REPO, currentVersion } from '@/lib/version';

const Keys = ({ keys }: { keys: string[] }) => (
  <>
    {keys.map((key, i) => (
      <span key={key}>
        {i > 0 && '+'}
        {key === 'Cmd/Ctrl' ? (
          <>
            <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>
          </>
        ) : (
          <kbd>{key}</kbd>
        )}
      </span>
    ))}
  </>
);

// Longer than the popup's one-liners: where each tweak shows up and how to use it.
const DETAILS: Record<FeatureKey, React.ReactNode> = {
  lightbox: 'Click any image in a PR description or comment to open every image in the PR as a gallery. Zoom with the scroll wheel or pinch, drag to pan, and use the arrow keys to move between images.',
  claudeCode: 'The Code dropdown at the top right of a PR becomes a Claude Code button. It opens Claude Code in your local clone with a prompt about the PR typed in, ready to send. Pick the prompt below, or edit them with the cog.',
  reviewButton: 'Floating buttons at the bottom right of a PR\'s Conversation, Commits and Files changed tabs. Submit review opens the review dialog, switching to Files changed if needed; LGTM approves with an "LGTM" comment and throws confetti. LGTM hides on your own PRs.',
  mergeBar: "While the merge box is off screen, a bar floats over the timeline with the PR's most important blocker, its other statuses and the merge button. Click it to jump to the merge box.",
  sinceReview: 'When commits have been pushed since your last review, a "2 new commits" button appears in the PR header. It opens Files changed with only those commits.',
  fileTriage: "Chips above the Files changed file tree hide lockfiles, generated files, tests, docs, config or source, with a progress bar of the files you've marked viewed.",
  notifyReady: 'Leave a PR open in a tab and get a desktop notification when it becomes ready to merge or starts failing. The tab title also starts with ✅ or ❌.',
  hideChecksTab: 'Removes the Checks tab from PRs. Check results still show in the merge box and the sticky merge bar.',
  hideMergeHint: 'Removes "You can also merge this with the command line" from beside the merge button.',
  fridayWarning: 'On Fridays, a row in the merge card asks if you really want to merge, with a random message that gets more worried as the day goes on.',
  markdownReview: 'Markdown files on Files changed open as rendered diffs. Select paragraphs, list items or table rows and click + to comment on their source lines.',
  pdfPreview: 'PDF files that GitHub shows as "Binary file not shown." are replaced with an inline preview of the new version, plus a link to open it in a tab. Private repositories included.',
  jumpToFile: (
    <>
      Press <Keys keys={['Cmd/Ctrl', 'K']} /> anywhere in a repo to fuzzy-find any file. <Keys keys={['Enter']} /> opens it, <Keys keys={['Cmd/Ctrl', 'Enter']} /> opens a new tab, <Keys keys={['Shift', 'Enter']} /> previews it in Quick view.
    </>
  ),
  readmeToc: "On a repo's home page, a Contents list of the README's headings sticks to the sidebar and highlights the section you're reading.",
  markdownOutline: "GitHub's outline panel opens with every Markdown file. Close it and it stays closed until you open it again.",
  fileIcons: 'VS Code-style file icons from Material Icon Theme in repo file lists, the file tree and the PR file tree.',
  thumbnails: 'Image files in a file list show a small preview in place of their icon. Hover it to enlarge.',
  downloads: 'Hover a file list row for a download button. Folders download as a ZIP, with no clone needed.',
  quickView: "Click a file row (anywhere but its name) to preview it in a modal with syntax highlighting, or rendered if it's Markdown.",
  absoluteDates: 'Every timestamp shows the real date and time, such as 4:29PM Oct 16, 2026, instead of "last week". Pick the format in the popup.',
  hideCopilot: 'Hides Copilot buttons across GitHub, including header chat, the Copilot panel and "Ask about this diff", plus the Agents tab.',
};

export function AllTweaksPage() {
  const settings = useSettings();
  const [saved, setSaved] = useState(false);
  const flash = () => setSaved(true);

  return (
    <>
      <PageHeader title="GitHub Tweaks">
        <a href="#/changelog" title="Changelog" className="text-muted-foreground hover:text-link">
          v{currentVersion()}
        </a>
      </PageHeader>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <a href="https://github.com/tombouquet" target="_blank" rel="noreferrer" className="text-foreground inline-flex items-center gap-2 font-semibold">
          <img src="https://github.com/tombouquet.png?size=48" alt="" className="size-6 rounded-full" />
          Tom Bouquet
        </a>
        <a href="https://github.com/tombouquet" target="_blank" rel="noreferrer">
          @tombouquet on GitHub
        </a>
        <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
          <MarkGithubIcon size={16} />
          Source and README
        </a>
        <a href="#/changelog">Changelog</a>
      </div>
      <Intro>Every tweak, what it does and where to find it. Turn any of them off here or from the toolbar popup; changes apply when you reload GitHub.</Intro>
      <main>
        {settings &&
          groupBy(FEATURES).map(([group, features]) => (
            <section key={group}>
              <h2 className="mt-8 mb-2 text-base font-semibold">{group}</h2>
              <div className="divide-y overflow-hidden rounded-md border">
                {features.map((feature) => {
                  const on = settings[feature.key];
                  return (
                    <div key={feature.key}>
                      <section className="flex gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-0.5 flex items-center gap-2 font-semibold">
                            {feature.label}
                            <span className={cn('rounded-full px-2 text-xs/5 font-medium', on ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{on ? 'On' : 'Off'}</span>
                          </h3>
                          <p className="text-muted-foreground">{feature.description}</p>
                          <p className="mt-2">{DETAILS[feature.key]}</p>
                        </div>
                        <Switch
                          aria-label={feature.label}
                          checked={on}
                          onCheckedChange={(checked) => {
                            void saveSettings({ [feature.key]: checked });
                            flash();
                          }}
                        />
                      </section>
                      {/* Sub-options, laid out like the popup's: tinted, under their tweak, and only while it's on. */}
                      {feature.choice && (
                        <div className="bg-muted flex items-center gap-2 border-t px-4 py-2">
                          <span className={cn('flex-1', !on && 'text-muted-foreground')}>{feature.choice.label}</span>
                          <ChoiceSelect choice={feature.choice} settings={settings} disabled={!on} onChange={flash} onEdit={() => navigate('/prompts')} />
                        </div>
                      )}
                      {feature.toggle && (
                        <label className="bg-muted flex items-center gap-2 border-t px-4 py-2">
                          <span className={cn('flex-1', !on && 'text-muted-foreground')}>
                            {feature.toggle.label}: {feature.toggle.description}
                          </span>
                          <ToggleSwitch toggle={feature.toggle} settings={settings} disabled={!on} onChange={flash} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
      </main>
      {saved && (
        <div role="status" className="border-accent bg-background sticky bottom-4 mt-6 rounded-md border px-4 py-2 font-semibold">
          Saved. Reload GitHub to apply changes.
        </div>
      )}
      <footer className="text-muted-foreground mt-8 text-xs">
        Made by Tom Bouquet. File icons from Material Icon Theme (MIT), confetti.js (ISC), highlight.js (BSD-3-Clause), Claude logo from Simple Icons (CC0).
      </footer>
    </>
  );
}
