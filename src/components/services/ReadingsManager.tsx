import { useCallback, useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReadingDefinitionModal } from '@/components/modals/ReadingDefinitionModal';
import {
  usePoolReadingDefinitions,
  useCreateReadingDef,
  useUpdateReadingDef,
  useDeleteReadingDef,
  useReorderReadingDefs,
  useSeedPoolDefaults,
  type ReadingDef,
} from '@/hooks/usePoolChemistry';

function SortableRow({
  reading,
  onEdit,
  onDelete,
}: {
  reading: ReadingDef;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: reading.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="odd:bg-muted/30">
      <TableCell className="w-10">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{reading.label}</TableCell>
      <TableCell className="text-muted-foreground">{reading.unit || '—'}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ReadingsManager() {
  const { data: readings = [], isLoading } = usePoolReadingDefinitions();
  const createReading = useCreateReadingDef();
  const updateReading = useUpdateReadingDef();
  const deleteReading = useDeleteReadingDef();
  const reorder = useReorderReadingDefs();
  const seedDefaults = useSeedPoolDefaults();

  const [localItems, setLocalItems] = useState<ReadingDef[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReadingDef | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReadingDef | null>(null);

  useEffect(() => {
    setLocalItems(readings);
  }, [readings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = localItems.findIndex((i) => i.id === active.id);
      const newIndex = localItems.findIndex((i) => i.id === over.id);
      const next = arrayMove(localItems, oldIndex, newIndex);
      setLocalItems(next);
      reorder.mutate(next.map((i) => i.id));
    },
    [localItems, reorder]
  );

  const handleSave = async (data: { key: string; label: string; unit: string | null }) => {
    if (editing) {
      await updateReading.mutateAsync({ id: editing.id, ...data });
    } else {
      await createReading.mutateAsync({
        ...data,
        sort_order: localItems.length,
      });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const isSaving = createReading.isPending || updateReading.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Readings</h2>
          <p className="text-sm text-muted-foreground">
            Water tests technicians record on each pool visit.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
            Reset to defaults
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Reading
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : localItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No readings configured. Add one or reset to defaults.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Description</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={localItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localItems.map((reading) => (
                      <SortableRow
                        key={reading.id}
                        reading={reading}
                        onEdit={() => {
                          setEditing(reading);
                          setModalOpen(true);
                        }}
                        onDelete={() => setDeleteTarget(reading)}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <ReadingDefinitionModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        reading={editing}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reading?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deleteTarget?.label}&quot; from active readings?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteReading.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
