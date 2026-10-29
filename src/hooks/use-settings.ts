import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, type Settings } from '@/lib/settings';

/** The saved settings, kept current when another page (popup, All tweaks, prompts) changes them. Undefined while loading. */
export function useSettings(): Settings | undefined {
  const [settings, setSettings] = useState<Settings>();
  useEffect(() => {
    void loadSettings().then(setSettings);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'sync') return;
      setSettings((current) => {
        if (!current) return current;
        const next = { ...current };
        for (const [key, { newValue }] of Object.entries(changes)) {
          if (!(key in DEFAULT_SETTINGS)) continue;
          (next as Record<string, unknown>)[key] = newValue ?? DEFAULT_SETTINGS[key as keyof Settings];
        }
        return next;
      });
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);
  return settings;
}
