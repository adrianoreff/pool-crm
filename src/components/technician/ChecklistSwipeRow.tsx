import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD = 56;
const MAX_OFFSET = 88;

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
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const clampRight = (value: number) => Math.max(0, Math.min(MAX_OFFSET, value));
  const clampLeft = (value: number) => Math.max(-MAX_OFFSET, Math.min(0, value));

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
    if (completed) {
      setOffset(clampLeft(startOffset.current + delta));
    } else {
      setOffset(clampRight(startOffset.current + delta));
    }
  };

  const finishDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    if (!completed && offset >= SWIPE_THRESHOLD) {
      setOffset(0);
      onToggle(true);
      return;
    }
    if (completed && offset <= -SWIPE_THRESHOLD) {
      setOffset(0);
      onToggle(false);
      return;
    }
    setOffset(0);
  }, [dragging, offset, completed, onToggle]);

  const draggingRight = !completed && dragging && offset > 0;
  const draggingLeft = completed && dragging && offset < 0;

  return (
    <div className="relative overflow-hidden border-b border-border/60 last:border-b-0 select-none touch-pan-y">
      {draggingRight && (
        <div
          className="absolute inset-y-0 left-0 flex items-center bg-[#F97316] px-4 text-sm font-medium text-white"
          style={{ width: offset }}
          aria-hidden
        >
          {offset >= SWIPE_THRESHOLD && <span className="whitespace-nowrap pl-1">Complete</span>}
        </div>
      )}

      {draggingLeft && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-muted px-4 text-sm text-muted-foreground"
          style={{ width: Math.abs(offset) }}
          aria-hidden
        >
          {Math.abs(offset) >= SWIPE_THRESHOLD && <span className="whitespace-nowrap pr-1">Undo</span>}
        </div>
      )}

      <div
        className={cn(
          'relative z-10 flex w-full items-center gap-3 bg-background py-3.5 px-3',
          !dragging && 'transition-transform duration-200 ease-out',
          completed && 'opacity-80'
        )}
        style={offset !== 0 ? { transform: `translateX(${offset}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <span
          className={cn(
            'h-2.5 w-2.5 shrink-0 rounded-full',
            completed ? 'bg-[#F97316]' : 'bg-muted-foreground/35'
          )}
          aria-hidden
        />
        <span className={cn('flex-1 font-semibold text-sm text-foreground', completed && 'line-through')}>
          {label}
        </span>
        {!completed && statusLabel ? (
          <span className="text-sm text-muted-foreground shrink-0">{statusLabel}</span>
        ) : completed ? (
          <span className="text-xs text-muted-foreground shrink-0">Swipe ← undo</span>
        ) : null}
      </div>
    </div>
  );
}
