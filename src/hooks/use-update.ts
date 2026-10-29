import { useEffect, useState } from 'react';
import type { AppMessage } from '@/lib/messages';
import { UPDATE_KEY, currentVersion, getUpdateInfo, isNewer, type UpdateInfo } from '@/lib/version';

/** The newer release, if the background worker has seen one. Asks it to re-check if stale. */
export function useAvailableUpdate(): UpdateInfo | undefined {
  const [update, setUpdate] = useState<UpdateInfo>();
  useEffect(() => {
    void getUpdateInfo().then(setUpdate);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[UPDATE_KEY]) setUpdate(changes[UPDATE_KEY].newValue as UpdateInfo);
    };
    chrome.storage.onChanged.addListener(onChanged);
    chrome.runtime.sendMessage({ type: 'checkForUpdate' } satisfies AppMessage).catch(() => {});
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);
  return isNewer(update?.latestVersion, currentVersion()) ? update : undefined;
}
