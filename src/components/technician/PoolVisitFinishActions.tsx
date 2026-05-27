import { Button } from '@/components/ui/button';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';

interface PoolVisitFinishActionsProps {
  hasTopPhoto: boolean;
  isSubmitting: boolean;
  checklistBlocked: boolean;
  onFinishWithEmail: () => void;
  onFinishWithoutPhoto: () => void;
  compact?: boolean;
}

export function PoolVisitFinishActions({
  hasTopPhoto,
  isSubmitting,
  checklistBlocked,
  onFinishWithEmail,
  onFinishWithoutPhoto,
  compact = false,
}: PoolVisitFinishActionsProps) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <Button
        type="button"
        className="w-full h-12 bg-[#F97316] hover:bg-[#EA580C] text-base"
        onClick={onFinishWithEmail}
        disabled={isSubmitting || checklistBlocked || !hasTopPhoto}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Send className="h-5 w-5 mr-2" />
            Finish visit &amp; email customer
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full h-11"
        onClick={onFinishWithoutPhoto}
        disabled={isSubmitting || checklistBlocked}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete without photo
          </>
        )}
      </Button>
      {checklistBlocked && (
        <p className="text-xs text-amber-600 text-center">
          Complete required checklist items above first.
        </p>
      )}
      {!hasTopPhoto && !checklistBlocked && (
        <p className="text-xs text-muted-foreground text-center">
          Add a pool photo above to finish with images, or use complete without photo.
        </p>
      )}
    </div>
  );
}
