import { GearIcon } from '@primer/octicons-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { saveSettings, type Choice, type Settings, type Toggle } from '@/lib/settings';

/**
 * A dropdown under a tweak's switch, shared by the popup and All tweaks. Options show
 * their label, or the current time in that date format, so the list doubles as a preview.
 * Editable lists (the Claude Code prompts) get a cog that opens the prompt editor.
 */
export function ChoiceSelect({
  choice,
  settings,
  disabled,
  onChange,
  onEdit,
}: {
  choice: Choice;
  settings: Settings;
  disabled: boolean;
  onChange: () => void;
  onEdit: () => void;
}) {
  const saved = choice.optionsKey ? settings[choice.optionsKey] : undefined;
  const options = saved?.length ? saved : choice.options;
  const now = new Date();
  return (
    <>
      <Select
        aria-label={choice.label}
        className="max-w-[200px]"
        disabled={disabled}
        value={settings[choice.key]}
        onChange={(event) => {
          void saveSettings({ [choice.key]: event.target.value });
          onChange();
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {'label' in option && option.label !== undefined ? option.label : 'format' in option ? option.format?.(now) : option.key}
          </option>
        ))}
      </Select>
      {choice.editLabel && (
        <Button variant="ghost" size="icon" className="-ml-2" title={choice.editLabel} aria-label={choice.editLabel} disabled={disabled} onClick={onEdit}>
          <GearIcon size={16} />
        </Button>
      )}
    </>
  );
}

/** A secondary switch under a tweak's switch. */
export function ToggleSwitch({ toggle, settings, disabled, onChange }: { toggle: Toggle; settings: Settings; disabled: boolean; onChange: () => void }) {
  return (
    <Switch
      aria-label={toggle.label}
      disabled={disabled}
      checked={settings[toggle.key]}
      onCheckedChange={(checked) => {
        void saveSettings({ [toggle.key]: checked });
        onChange();
      }}
    />
  );
}

/** FEATURES grouped by their `group`, in order. */
export function groupBy<T extends { group: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return [...groups];
}
