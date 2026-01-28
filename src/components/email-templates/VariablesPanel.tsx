import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  RefreshCw, 
  Wrench, 
  Building,
  Copy,
  Check
} from 'lucide-react';
import { TEMPLATE_VARIABLES } from '@/hooks/useEmailTemplates';
import { useState } from 'react';

interface VariablesPanelProps {
  onInsert: (variable: string) => void;
}

const categoryIcons = {
  customer: User,
  appointment: Calendar,
  reschedule: RefreshCw,
  technician: Wrench,
  business: Building,
};

const categoryLabels = {
  customer: 'Customer',
  appointment: 'Appointment',
  reschedule: 'Reschedule',
  technician: 'Technician',
  business: 'Business',
};

export function VariablesPanel({ onInsert }: VariablesPanelProps) {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleInsert = (key: string) => {
    onInsert(`{{${key}}}`);
    setCopiedVar(key);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  return (
    <div className="border rounded-lg bg-muted/30">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Available Variables</h3>
        <p className="text-xs text-muted-foreground">Click to insert at cursor</p>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-3 space-y-4">
          {(Object.keys(TEMPLATE_VARIABLES) as (keyof typeof TEMPLATE_VARIABLES)[]).map((category) => {
            const Icon = categoryIcons[category];
            const variables = TEMPLATE_VARIABLES[category];
            
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{categoryLabels[category]}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {variables.map((v) => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-mono"
                      onClick={() => handleInsert(v.key)}
                      title={v.description}
                    >
                      {copiedVar === v.key ? (
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1 opacity-50" />
                      )}
                      {`{{${v.key}}}`}
                    </Button>
                  ))}
                </div>
                <Separator className="mt-3" />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Compact version for inline use
export function VariablesBadges({ onInsert }: VariablesPanelProps) {
  const allVariables = Object.values(TEMPLATE_VARIABLES).flat();
  
  return (
    <div className="flex flex-wrap gap-1">
      {allVariables.slice(0, 10).map((v) => (
        <Badge
          key={v.key}
          variant="secondary"
          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-xs"
          onClick={() => onInsert(`{{${v.key}}}`)}
          title={v.description}
        >
          {`{{${v.key}}}`}
        </Badge>
      ))}
      <Badge variant="outline" className="text-xs">
        +{allVariables.length - 10} more
      </Badge>
    </div>
  );
}
