import { useParams, useNavigate } from 'react-router-dom';
import { useAppointment } from '@/hooks/useAppointments';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Wrench, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function JobChecklist() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(id || '');
  const { checklistTemplate, completedItems, progress, toggleItem } = useJobChecklist(
    id || '',
    appointment?.service_id || null
  );
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  if (isLoadingAppointment || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!checklistTemplate || checklistTemplate.items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Checklist</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No checklist available for this service</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = async (item: { id: string; text: string; category: string }) => {
    const existing = completedItems.find(ci => ci.item_id === item.id);
    const newCompleted = !existing?.completed;
    
    await toggleItem.mutateAsync({
      itemId: item.id,
      itemText: item.text,
      completed: newCompleted,
      notes: itemNotes[item.id],
    });
  };

  const isItemCompleted = (itemId: string) => {
    return completedItems.find(ci => ci.item_id === itemId)?.completed || false;
  };

  const getItemNotes = (itemId: string) => {
    return completedItems.find(ci => ci.item_id === itemId)?.notes || '';
  };

  // Group items by category
  const groupedItems = checklistTemplate.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof checklistTemplate.items>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Checklist</h1>
          <div className="flex items-center gap-2 mt-1">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{checklistTemplate.name}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {completedItems.filter(ci => ci.completed).length} of {checklistTemplate.items.length} completed
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Category */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">{category.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const completed = isItemCompleted(item.id);
              const notes = getItemNotes(item.id);

              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={item.id}
                      checked={completed}
                      onCheckedChange={() => handleToggle(item)}
                      disabled={toggleItem.isPending}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={item.id}
                      className={`flex-1 cursor-pointer ${completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.text}
                    </Label>
                  </div>
                  {completed && (
                    <Textarea
                      placeholder="Add notes about this item..."
                      value={itemNotes[item.id] || notes}
                      onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                      onBlur={() => {
                        if (itemNotes[item.id] !== notes) {
                          toggleItem.mutate({
                            itemId: item.id,
                            itemText: item.text,
                            completed: true,
                            notes: itemNotes[item.id],
                          });
                        }
                      }}
                      className="ml-8 text-sm"
                      rows={2}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
