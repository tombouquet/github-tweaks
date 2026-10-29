import { Button } from '@/components/ui/button';
import { useAvailableUpdate } from '@/hooks/use-update';
import { cn } from '@/lib/utils';
import { RELEASES_URL, currentVersion } from '@/lib/version';

/** Shown while a newer release is out. `onOpen` opens a link; the popup also closes itself. */
export function UpdateBanner({ className, onOpen }: { className?: string; onOpen?: (url: string) => void }) {
  const update = useAvailableUpdate();
  if (!update) return null;
  const url = update.releaseUrl ?? RELEASES_URL;
  return (
    <div role="status" className={cn('border-accent-border bg-accent-subtle flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2', className)}>
      <div className="min-w-60 flex-1">
        <strong className="block">
          v{update.latestVersion} is available. You're on v{currentVersion()}.
        </strong>
        <span className="text-muted-foreground text-xs">
          Run <code>git pull</code> and <code>pnpm build</code> in your clone (or download the zip from the release), then reload.
        </span>
      </div>
      <div className="flex gap-2">
        {onOpen ? (
          <Button onClick={() => onOpen(url)}>What's new</Button>
        ) : (
          <Button nativeButton={false} render={<a href={url} target="_blank" rel="noreferrer" className="hover:no-underline" />}>
            What's new
          </Button>
        )}
        <Button variant="primary" onClick={() => chrome.runtime.reload()}>
          Reload extension
        </Button>
      </div>
    </div>
  );
}
