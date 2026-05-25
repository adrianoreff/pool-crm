import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useServiceChecklist } from '@/hooks/useServiceChecklist';
import { AddChecklistItemModal } from '@/components/modals/AddChecklistItemModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Plus, Trash2, Loader2 } from 'lucide-react';
import type { ServiceChecklistItem } from '@/types/service-checklist';
import {
  createDefaultWeeklyPoolChecklistItems,
  DEFAULT_WEEKLY_POOL_CHECKLIST_DESCRIPTIONS,
} from '@/lib/service-checklist-utils';

interface ServiceChecklistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  serviceName: string;
}

function SortableChecklistRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ServiceChecklistItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 odd:bg-muted/30"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium">{item.description}</span>
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Edit
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onDelete}>
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}

export function ServiceChecklistManager({
  open,
  onOpenChange,
  serviceId,
  serviceName,
}: ServiceChecklistManagerProps) {
  const { items: remoteItems, isLoading, saveChecklist } = useServiceChecklist(
    open ? serviceId : null,
    serviceName
  );
  const [localItems, setLocalItems] = useState<ServiceChecklistItem[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceChecklistItem | null>(null);

  useEffect(() => {
    if (open) setLocalItems(remoteItems);
  }, [open, remoteItems]);

  const persist = useCallback(
    async (next: ServiceChecklistItem[]) => {
      setLocalItems(next);
      await saveChecklist.mutateAsync(next);
    },
    [saveChecklist]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    void persist(arrayMove(localItems, oldIndex, newIndex));
  };

  const handleSaveItem = (item: ServiceChecklistItem) => {
    const exists = localItems.some((i) => i.id === item.id);
    const next = exists
      ? localItems.map((i) => (i.id === item.id ? item : i))
      : [...localItems, { ...item, sortOrder: localItems.length }];
    void persist(next);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    void persist(localItems.filter((i) => i.id !== id));
  };

  const handleLoadDefaults = () => {
    void persist(createDefaultWeeklyPoolChecklistItems());
  };

  const isWeeklyPool = serviceName.trim().toLowerCase() === 'weekly pool service';
  const showDefaultsHint =
    isWeeklyPool && localItems.length === 0 && !isLoading && !saveChecklist.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Service Checklist — {serviceName}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <span className="text-sm font-medium text-muted-foreground">Description</span>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Checklist Item
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
              {showDefaultsHint && (
                <div className="rounded-md border border-dashed p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Load the standard weekly pool tasks:{' '}
                    {DEFAULT_WEEKLY_POOL_CHECKLIST_DESCRIPTIONS.join(', ')}.
                  </p>
                  <Button type="button" variant="secondary" onClick={handleLoadDefaults}>
                    Load default checklist
                  </Button>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={localItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localItems.map((item) => (
                    <SortableChecklistRow
                      key={item.id}
                      item={item}
                      onEdit={() => {
                        setEditingItem(item);
                        setItemModalOpen(true);
                      }}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {localItems.length === 0 && !showDefaultsHint && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No checklist items yet. Add your first item above.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddChecklistItemModal
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        item={editingItem}
        sortOrder={localItems.length}
        onSave={handleSaveItem}
      />
    </>
  );
}
