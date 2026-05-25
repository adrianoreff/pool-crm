import { useRef, useState, useCallback, useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD = 72;
const MAX_OFFSET = 120;

interface ChecklistSwipeItemProps {
  label: string;
  completedLabel: string;
  completed: boolean;
  disabled?: boolean;
  onToggle: (completed: boolean) => void;
}

export function ChecklistSwipeItem({
  label,
  completedLabel,
  completed,
  disabled,
  onToggle,
}: ChecklistSwipeItemProps) {
  const trackRef = useRef<HTMLDivElement>(null);
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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startOffset.current = offset;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    const delta = e.clientX - startX.current;
    const next = clamp(startOffset.current + delta);
    setOffset(next);
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

  const onPointerUp = () => finishDrag();
  const onPointerCancel = () => finishDrag();

  const displayText = completed ? completedLabel : label;
  const progress = offset / MAX_OFFSET;

  return (
    <div
      ref={trackRef}
      className="relative overflow-hidden rounded-lg border bg-card select-none touch-pan-y"
    >
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-end px-4 transition-colors',
          completed ? 'bg-muted' : 'bg-emerald-500/90'
        )}
        aria-hidden
      >
        {completed ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <RotateCcw className="h-4 w-4" />
            Swipe left to undo
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-white font-medium">
            <Check className="h-4 w-4" />
            Complete
          </span>
        )}
      </div>

      <div
        className={cn(
          'relative z-10 flex items-center gap-3 bg-background px-4 py-4 shadow-sm',
          !dragging && 'transition-transform duration-200 ease-out',
          completed && 'border-l-4 border-l-primary'
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
            completed
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 text-muted-foreground'
          )}
          style={{ opacity: 0.4 + progress * 0.6 }}
        >
          {completed ? <Check className="h-5 w-5" /> : <span className="text-lg">›</span>}
        </div>
        <p
          className={cn(
            'flex-1 text-base font-medium leading-snug',
            completed && 'text-muted-foreground'
          )}
        >
          {displayText}
        </p>
        {!completed && (
          <span className="text-xs text-muted-foreground shrink-0">Swipe →</span>
        )}
      </div>
    </div>
  );
}
