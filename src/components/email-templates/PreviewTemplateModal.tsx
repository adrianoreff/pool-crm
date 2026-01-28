import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EmailTemplate } from '@/types/database';
import { TemplatePreview } from './TemplatePreview';

interface PreviewTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

export function PreviewTemplateModal({ open, onOpenChange, template }: PreviewTemplateModalProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{template.name}</DialogTitle>
            <Badge variant="outline">
              {template.category}
            </Badge>
            {!template.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <TemplatePreview
            subject={template.subject}
            bodyHtml={template.body_html}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
