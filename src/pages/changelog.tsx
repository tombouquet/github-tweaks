// Changelog: renders CHANGELOG.md (written by Release Please, bundled at build time),
// marks the installed version, and shows an update banner when a newer release is out.
import changelog from '@@/CHANGELOG.md?raw';
import { Fragment } from 'react';
import { Intro, PageHeader } from '@/components/page-header';
import { UpdateBanner } from '@/components/update-banner';
import { cn } from '@/lib/utils';
import { currentVersion } from '@/lib/version';

interface Release {
  version: string;
  date?: string;
  blocks: ({ type: 'heading'; text: string } | { type: 'list'; items: string[] })[];
}

/** One release per `## version` section, with `###` headings and `*` lists inside. */
function parse(markdown: string): Release[] {
  const releases: Release[] = [];
  for (const line of markdown.split('\n')) {
    const version = line.match(/^## \[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?\s*(?:\(([^)]+)\))?/);
    const release = releases.at(-1);
    if (version) {
      releases.push({ version: version[1]!, date: version[2], blocks: [] });
    } else if (!release) {
      continue;
    } else if (line.startsWith('### ')) {
      release.blocks.push({ type: 'heading', text: line.slice(4) });
    } else if (/^[*-] /.test(line)) {
      const last = release.blocks.at(-1);
      if (last?.type === 'list') last.items.push(line.slice(2));
      else release.blocks.push({ type: 'list', items: [line.slice(2)] });
    }
  }
  return releases;
}

/** Just what Release Please writes: `code`, **bold** and [text](url) links (http(s) only). */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/);
  return parts.map((part, i) => {
    if (/^`[^`]+`$/.test(part)) return <code key={i}>{part.slice(1, -1)}</code>;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const RELEASES = parse(changelog);

export function ChangelogPage() {
  const current = currentVersion();
  return (
    <>
      <PageHeader title="Changelog">
        <span className="text-muted-foreground">v{current}</span>
        <a href="#/" className="ml-auto self-center">
          All tweaks
        </a>
      </PageHeader>
      <Intro>What's new in each version of GitHub Tweaks.</Intro>
      <UpdateBanner className="mb-6 px-4 py-3" />
      <main>
        {RELEASES.map((release) => (
          <section key={release.version} className={cn('mb-4 rounded-md border p-4', release.version === current && 'border-accent')}>
            <h2 className="flex flex-wrap items-baseline gap-2 text-lg font-semibold">
              v{release.version}
              {release.date && <span className="text-muted-foreground text-xs font-normal">{release.date}</span>}
              {release.version === current && <span className="bg-accent/15 text-accent rounded-full px-2 text-xs/5 font-medium">Installed</span>}
            </h2>
            {release.blocks.map((block, i) =>
              block.type === 'heading' ? (
                <h3 key={i} className="mt-4 mb-1 font-semibold">
                  <Inline text={block.text} />
                </h3>
              ) : (
                <ul key={i} className="list-disc space-y-1 pl-5">
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <Inline text={item} />
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </main>
    </>
  );
}
