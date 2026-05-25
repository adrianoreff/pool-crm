import { cn } from '@/lib/utils';

interface PresetValueScrollerProps {
  presets: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function PresetValueScroller({ presets, onSelect, disabled }: PresetValueScrollerProps) {
  if (presets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No preset values configured.</p>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-6 overflow-x-auto py-2 px-1 scroll-smooth snap-x snap-mandatory',
        '[-webkit-overflow-scrolling:touch]'
      )}
    >
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p)}
          className={cn(
            'shrink-0 snap-start text-3xl font-semibold text-sky-600',
            'min-w-[2rem] px-1 active:opacity-70 disabled:opacity-50'
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
