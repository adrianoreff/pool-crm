import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD = 56;
const MAX_OFFSET = 100;

interface ChecklistSwipeRowProps {
  label: string;
  statusLabel?: string;
  completed: boolean;
  disabled?: boolean;
  onToggle: (completed: boolean) => void;
}

export function ChecklistSwipeRow({
  label,
  statusLabel,
  completed,
  disabled,
  onToggle,
}: ChecklistSwipeRowProps) {
  const startX = useRef(0);
  const startOffset = useRef(0);
  const [offset, setOffset] = useState(completed ? MAX_OFFSET : 0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setOffset(completed ? MAX_OFFSET : 0);
  }, [completed]);

  const clamp = (value: number) => Math.max(0, Math.min(MAX_OFFSET, value));

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startOffset.current = offset;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    const delta = e.clientX - startX.current;
    setOffset(clamp(startOffset.current + delta));
  };

  const finishDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    if (!completed && offset >= SWIPE_THRESHOLD) {
      setOffset(MAX_OFFSET);
      onToggle(true);
      return;
    }
    if (completed && offset <= MAX_OFFSET - SWIPE_THRESHOLD) {
      setOffset(0);
      onToggle(false);
      return;
    }
    setOffset(completed ? MAX_OFFSET : 0);
  }, [dragging, offset, completed, onToggle]);

  return (
    <div className="relative overflow-hidden border-b border-border/60 last:border-b-0 select-none touch-pan-y">
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-end px-4 text-sm',
          completed ? 'bg-muted/80' : 'bg-emerald-500/85 text-white'
        )}
        aria-hidden
      >
        {completed ? 'Swipe left to undo' : 'Complete'}
      </div>

      <div
        className={cn(
          'relative z-10 flex items-center gap-3 bg-background py-3.5 px-3',
          !dragging && 'transition-transform duration-200 ease-out',
          completed && 'opacity-75'
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500"
          aria-hidden
        />
        <span className={cn('flex-1 font-semibold text-sm text-foreground', completed && 'line-through')}>
          {label}
        </span>
        {!completed && statusLabel ? (
          <span className="text-sm text-muted-foreground shrink-0">{statusLabel}</span>
        ) : null}
      </div>
    </div>
  );
}
