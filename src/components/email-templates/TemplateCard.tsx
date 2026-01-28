import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mail, Edit, Eye, Trash2 } from 'lucide-react';
import { EmailTemplate, EmailTemplateCategory } from '@/types/database';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: EmailTemplate;
  onEdit: (template: EmailTemplate) => void;
  onPreview: (template: EmailTemplate) => void;
  onDelete?: (template: EmailTemplate) => void;
  onToggleActive?: (template: EmailTemplate, isActive: boolean) => void;
}

const categoryColors: Record<EmailTemplateCategory, string> = {
  customer: 'bg-blue-100 text-blue-700 border-blue-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  technician: 'bg-orange-100 text-orange-700 border-orange-200',
  custom: 'bg-green-100 text-green-700 border-green-200',
};

const categoryLabels: Record<EmailTemplateCategory, string> = {
  customer: 'Customer',
  admin: 'Admin',
  technician: 'Technician',
  custom: 'Custom',
};

export function TemplateCard({ 
  template, 
  onEdit, 
  onPreview, 
  onDelete,
  onToggleActive,
}: TemplateCardProps) {
  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      !template.is_active && 'opacity-60'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <Badge 
              variant="outline" 
              className={cn('font-medium', categoryColors[template.category])}
            >
              {categoryLabels[template.category]}
            </Badge>
          </div>
          {onToggleActive && (
            <Switch
              checked={template.is_active}
              onCheckedChange={(checked) => onToggleActive(template, checked)}
              aria-label="Toggle template active"
            />
          )}
        </div>
        <CardTitle className="text-base mt-2">{template.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {template.description || template.subject}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(template)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(template)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          {onDelete && !template.is_default && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(template)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!template.is_active && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This template is inactive and won't be sent
          </p>
        )}
      </CardContent>
    </Card>
  );
}
