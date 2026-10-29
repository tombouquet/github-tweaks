// app.html: the extension's full pages, on hash routes so the popup and the
// background worker can link straight to one.
import { useEffect } from 'react';
import { useRoute } from '@/hooks/use-route';
import { AllTweaksPage } from '@/pages/all-tweaks';
import { ChangelogPage } from '@/pages/changelog';
import { PromptsPage } from '@/pages/prompts';

const TITLES: Record<string, string> = {
  '/': 'GitHub Tweaks · All tweaks',
  '/prompts': 'GitHub Tweaks · Claude Code prompts',
  '/changelog': 'GitHub Tweaks · Changelog',
};

function Page({ path }: { path: string }) {
  switch (path) {
    case '/prompts':
      return <PromptsPage />;
    case '/changelog':
      return <ChangelogPage />;
    default:
      return <AllTweaksPage />;
  }
}

export function App() {
  const path = useRoute();
  useEffect(() => {
    document.title = TITLES[path] ?? TITLES['/']!;
    window.scrollTo(0, 0);
  }, [path]);
  return (
    <div className="mx-auto max-w-[760px] px-6 pt-8 pb-16">
      <Page path={path} />
    </div>
  );
}
