// Toolbar popup: one switch per tweak in FEATURES (lib/settings.ts), with any dropdown or
// sub-switch under it. Changes save straight away and apply when the GitHub tab reloads.
import { BookIcon } from '@primer/octicons-react';
import { useState } from 'react';
import { ChoiceSelect, ToggleSwitch, groupBy } from '@/components/feature-options';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { UpdateBanner } from '@/components/update-banner';
import { useSettings } from '@/hooks/use-settings';
import { appUrl, openFromPopup } from '@/lib/extension';
import { FEATURES, saveSettings } from '@/lib/settings';
import { currentVersion } from '@/lib/version';

export function Popup() {
  const settings = useSettings();
  const [changed, setChanged] = useState(false);
  const flash = () => setChanged(true);

  return (
    <div className="w-[360px] p-4">
      {/* Text sits on the title's baseline, so the smaller version reads as level with it; icons stay centred. */}
      <header className="mb-4 flex items-baseline gap-2">
        <img src="/icon/48.png" alt="" className="size-6 self-center" />
        <h1 className="text-base font-semibold">GitHub Tweaks</h1>
        <a
          href={appUrl('/changelog')}
          title="Changelog"
          className="text-muted-foreground hover:text-link text-xs"
          onClick={(event) => {
            event.preventDefault();
            openFromPopup(appUrl('/changelog'));
          }}
        >
          v{currentVersion()}
        </a>
        <Button variant="ghost" size="icon" className="ml-auto self-center" title="All tweaks" aria-label="All tweaks" onClick={() => openFromPopup(appUrl('/'))}>
          <BookIcon size={16} />
        </Button>
      </header>
      <UpdateBanner className="mb-4" onOpen={openFromPopup} />
      <main>
        {settings &&
          groupBy(FEATURES).map(([group, features]) => (
            <section key={group}>
              <h2 className="text-muted-foreground mt-4 mb-2 text-xs font-semibold first:mt-0">{group}</h2>
              <div className="divide-y overflow-hidden rounded-md border">
                {features.map((feature) => (
                  <div key={feature.key}>
                    <label className="hover:bg-muted flex cursor-pointer items-center gap-4 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{feature.label}</span>
                        <span className="text-muted-foreground block text-xs">{feature.description}</span>
                      </span>
                      <Switch
                        checked={settings[feature.key]}
                        onCheckedChange={(checked) => {
                          void saveSettings({ [feature.key]: checked });
                          flash();
                        }}
                      />
                    </label>
                    {/* Sub-options sit on a tinted background to show they belong to the row above, and only matter while it's on. */}
                    {feature.choice && (
                      <div className="bg-muted flex items-center gap-4 border-t px-4 py-2">
                        <span className={settings[feature.key] ? 'flex-1' : 'text-muted-foreground flex-1'}>{feature.choice.label}</span>
                        <ChoiceSelect
                          choice={feature.choice}
                          settings={settings}
                          disabled={!settings[feature.key]}
                          onChange={flash}
                          onEdit={() => void chrome.runtime.openOptionsPage()}
                        />
                      </div>
                    )}
                    {feature.toggle && (
                      <label className="bg-muted flex items-center gap-4 border-t px-4 py-2">
                        <span className="min-w-0 flex-1">
                          <span className={settings[feature.key] ? 'block' : 'text-muted-foreground block'}>{feature.toggle.label}</span>
                          <span className="text-muted-foreground block text-xs">{feature.toggle.description}</span>
                        </span>
                        <ToggleSwitch toggle={feature.toggle} settings={settings} disabled={!settings[feature.key]} onChange={flash} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
      </main>
      {/* Sticks to the bottom of the popup, so it shows however far the list is scrolled. */}
      {changed && (
        <div
          role="status"
          className="border-accent-border animate-flash-in sticky bottom-3 mt-4 flex items-center gap-2 rounded-md border bg-[linear-gradient(var(--accent-subtle),var(--accent-subtle)),var(--background)] py-2 pr-2 pl-4 font-semibold shadow-[0_8px_24px_#1f23284d]"
        >
          <span className="flex-1">Reload GitHub to apply changes.</span>
          <Button
            variant="primary"
            onClick={async () => {
              await chrome.tabs.reload();
              window.close();
            }}
          >
            Reload tab
          </Button>
        </div>
      )}
    </div>
  );
}
