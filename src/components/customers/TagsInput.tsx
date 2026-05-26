import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TagsInput({ value, onChange, disabled, className }: TagsInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '');
    if (!tag || value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="rounded-full hover:bg-muted p-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && addTag(draft)}
        disabled={disabled}
        placeholder="Type a tag and press Enter"
      />
    </div>
  );
}
