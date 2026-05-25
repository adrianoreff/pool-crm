import { X } from 'lucide-react';
import { PresetValueScroller } from '@/components/technician/PresetValueScroller';
import { cn } from '@/lib/utils';

interface ChemistryDefinitionRowProps {
  label: string;
  unit?: string | null;
  presets: string[];
  value?: string;
  lastLabel?: string;
  isActive: boolean;
  readOnly?: boolean;
  onSelect: (value: string) => void;
  onClear: () => void;
  onActivate: () => void;
}

export function ChemistryDefinitionRow({
  label,
  unit,
  presets,
  value,
  lastLabel,
  isActive,
  readOnly,
  onSelect,
  onClear,
  onActivate,
}: ChemistryDefinitionRowProps) {
  const hasValue = !!value;

  return (
    <div
      className={cn(
        'border-b border-border/60 last:border-b-0 py-3 px-3',
        isActive && 'bg-orange-50/60'
      )}
    >
      <div className="flex items-center justify-between gap-2 min-h-[28px]">
        <button
          type="button"
          className={cn(
            'text-left font-medium text-sm',
            !readOnly && !hasValue && 'cursor-pointer'
          )}
          onClick={() => !readOnly && !hasValue && onActivate()}
          disabled={readOnly || hasValue}
        >
          {label}
        </button>

        {hasValue ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[#F97316] font-semibold text-sm">
              {value}
              {unit ? ` ${unit}` : ''}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={onClear}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F97316] text-white hover:bg-[#EA580C]"
                aria-label="Clear value"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          lastLabel && (
            <span className="text-xs text-muted-foreground text-right shrink-0 max-w-[50%] truncate">
              {lastLabel}
            </span>
          )
        )}
      </div>

      {isActive && !hasValue && !readOnly && (
        <PresetValueScroller presets={presets} onSelect={onSelect} />
      )}
    </div>
  );
}
