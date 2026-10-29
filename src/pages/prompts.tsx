// Prompts: edit, add, reorder and delete the Claude Code button's prompts. They're
// saved as `claudePrompts` in chrome.storage.sync as you type, with the default
// stored as `claudePrompt` like the popup's dropdown.
import { useEffect, useRef, useState } from 'react';
import { Intro, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { CLAUDE_PROMPTS, claudePrompts, loadSettings, saveSettings, type ClaudePrompt } from '@/lib/settings';
import { cn } from '@/lib/utils';

const MAX_PROMPT = 5000;
const SAVE_DELAY = 400;

type Status = { text: string; kind?: 'saved' | 'error' };

export function PromptsPage() {
  const [prompts, setPrompts] = useState<ClaudePrompt[]>();
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState<Status>({ text: '' });
  const [focusKey, setFocusKey] = useState<string>();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  useEffect(() => {
    void loadSettings().then((settings) => {
      const loaded = structuredClone(claudePrompts(settings));
      setPrompts(loaded);
      setSelected(loaded.some((prompt) => prompt.key === settings.claudePrompt) ? settings.claudePrompt : (loaded[0]?.key ?? ''));
    });
  }, []);

  // Saves a moment after the last change.
  useEffect(() => {
    if (!prompts || !dirty.current) return;
    clearTimeout(saveTimer.current);
    setStatus({ text: 'Saving…' });
    saveTimer.current = setTimeout(async () => {
      const cleaned = prompts.map(({ key, label, prompt }) => ({ key, label: label.trim() || 'Untitled prompt', prompt: prompt.slice(0, MAX_PROMPT) }));
      try {
        await saveSettings({ claudePrompts: cleaned, claudePrompt: selected });
        setStatus({ text: 'Saved. Reload GitHub to use the changes.', kind: 'saved' });
      } catch (error) {
        // chrome.storage.sync allows 8 KB per setting, which very long prompts can go over.
        setStatus({ text: `Couldn't save: ${error instanceof Error ? error.message : String(error)}. Try shorter prompts.`, kind: 'error' });
      }
    }, SAVE_DELAY);
  }, [prompts, selected]);

  if (!prompts) return null;

  const change = (next: ClaudePrompt[], nextSelected = selected) => {
    dirty.current = true;
    setPrompts(next);
    setSelected(nextSelected);
  };
  const edit = (index: number, patch: Partial<ClaudePrompt>) => change(prompts.map((prompt, i) => (i === index ? { ...prompt, ...patch } : prompt)));
  const move = (index: number, to: number) => {
    const next = [...prompts];
    [next[index], next[to]] = [next[to]!, next[index]!];
    change(next);
  };
  const remove = (index: number) => {
    const next = prompts.filter((_, i) => i !== index);
    change(next, prompts[index]?.key === selected ? next[0]!.key : selected);
  };
  const add = () => {
    const prompt = { key: `custom-${Date.now()}`, label: 'New prompt', prompt: 'Look at PR #{n} ({title}): {url}' };
    change([...prompts, prompt]);
    setFocusKey(prompt.key);
  };
  const reset = () => {
    if (!confirm('Replace your prompts with the built-in ones?')) return;
    const builtIn = structuredClone(CLAUDE_PROMPTS);
    change(builtIn, builtIn[0].key);
  };

  return (
    <>
      <PageHeader title="Claude Code prompts">
        <a href="#/" className="ml-auto self-center">
          All tweaks
        </a>
      </PageHeader>
      <Intro>
        The prompts the <strong>Claude Code</strong> button on a PR can type in for you. The default is used when you click the button; pick another under the switch in the toolbar popup. These get filled in from the PR: <code>{'{n}'}</code> number, <code>{'{title}'}</code> title, <code>{'{url}'}</code> link, <code>{'{repo}'}</code> owner/name. Leave a prompt empty to just open the repo. Changes save as you type.
      </Intro>
      <main>
        {prompts.map((prompt, index) => {
          const isDefault = prompt.key === selected;
          const over = prompt.prompt.length > MAX_PROMPT;
          return (
            <section key={prompt.key} className={cn('mb-4 overflow-hidden rounded-md border', isDefault && 'border-accent')}>
              <div className="bg-muted flex items-center gap-2 border-b px-3 py-2">
                <input
                  type="text"
                  aria-label="Prompt name"
                  maxLength={60}
                  value={prompt.label}
                  ref={(input) => {
                    if (input && focusKey === prompt.key) {
                      input.select();
                      setFocusKey(undefined);
                    }
                  }}
                  onChange={(event) => edit(index, { label: event.target.value })}
                  className="hover:bg-background focus:bg-background min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold outline-none hover:border-border focus:border-border"
                />
                <label className={cn('flex items-center gap-1 text-xs whitespace-nowrap', isDefault ? 'text-accent font-semibold' : 'text-muted-foreground')}>
                  <input type="radio" name="default" checked={isDefault} onChange={() => change(prompts, prompt.key)} /> Default
                </label>
                <Button className="px-2" aria-label="Move up" title="Move up" disabled={index === 0} onClick={() => move(index, index - 1)}>
                  ↑
                </Button>
                <Button className="px-2" aria-label="Move down" title="Move down" disabled={index === prompts.length - 1} onClick={() => move(index, index + 1)}>
                  ↓
                </Button>
                <Button variant="danger" disabled={prompts.length === 1} onClick={() => remove(index)}>
                  Delete
                </Button>
              </div>
              <textarea
                aria-label="Prompt"
                spellCheck={false}
                placeholder="Empty: open the repo with no prompt"
                value={prompt.prompt}
                onChange={(event) => edit(index, { prompt: event.target.value })}
                className="bg-background block min-h-24 w-full resize-y p-3 font-mono text-[13px]/normal outline-none"
              />
              <div className={cn('flex justify-end px-3 pt-1 pb-2 text-xs', over ? 'text-danger' : 'text-muted-foreground')}>
                {prompt.prompt.length.toLocaleString()} / {MAX_PROMPT.toLocaleString()}
              </div>
            </section>
          );
        })}
      </main>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={add}>
          Add prompt
        </Button>
        <Button onClick={reset}>Reset to built-in prompts</Button>
        <span role="status" className={cn('ml-auto text-xs', status.kind === 'error' ? 'text-danger' : status.kind === 'saved' ? 'text-success' : 'text-muted-foreground')}>
          {status.text}
        </span>
      </div>
    </>
  );
}
