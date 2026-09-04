import { useState } from 'react';

export type DisplayMode = 'standard' | 'compact' | 'large';

interface DisplaySettingsProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

const options: Array<{ id: DisplayMode; label: string; note: string }> = [
  { id: 'standard', label: '标准', note: '默认扫读节奏' },
  { id: 'compact', label: '紧凑', note: '适合桌面副屏' },
  { id: 'large', label: '大字', note: '适合远距离旁读' },
];

export function DisplaySettings({ mode, onChange }: DisplaySettingsProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="display-settings">
      <button type="button" className="settings-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>显示设置</button>
      {open ? (
        <section className="settings-popover" aria-label="显示设置">
          <div><b>Tweaks</b><span>选择信息密度</span></div>
          {options.map((option) => (
            <button
              type="button"
              key={option.id}
              className={mode === option.id ? 'active' : ''}
              aria-pressed={mode === option.id}
              onClick={() => onChange(option.id)}
            >
              <b>{option.label}</b><span>{option.note}</span>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}
