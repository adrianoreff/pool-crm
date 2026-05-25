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
import { DosageDefinitionModal } from '@/components/modals/DosageDefinitionModal';
import {
  usePoolDosageDefinitions,
  useCreateDosageDef,
  useUpdateDosageDef,
  useDeleteDosageDef,
  useReorderDosageDefs,
  useSeedPoolDefaults,
  type DosageDef,
} from '@/hooks/usePoolChemistry';

function SortableRow({
  dosage,
  onEdit,
  onDelete,
}: {
  dosage: DosageDef;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dosage.id,
  });

  const presets = Array.isArray(dosage.preset_values) ? (dosage.preset_values as string[]) : [];

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
      <TableCell className="font-medium">{dosage.label}</TableCell>
      <TableCell className="text-muted-foreground">{dosage.unit || '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
        {presets.length > 0 ? presets.join(', ') : '—'}
      </TableCell>
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

export function DosagesManager() {
  const { data: dosages = [], isLoading } = usePoolDosageDefinitions();
  const createDosage = useCreateDosageDef();
  const updateDosage = useUpdateDosageDef();
  const deleteDosage = useDeleteDosageDef();
  const reorder = useReorderDosageDefs();
  const seedDefaults = useSeedPoolDefaults();

  const [localItems, setLocalItems] = useState<DosageDef[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DosageDef | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DosageDef | null>(null);

  useEffect(() => {
    setLocalItems(dosages);
  }, [dosages]);

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

  const handleSave = async (data: {
    key: string;
    label: string;
    unit: string | null;
    direction: string | null;
    preset_values: string[];
  }) => {
    if (editing) {
      await updateDosage.mutateAsync({ id: editing.id, ...data });
    } else {
      await createDosage.mutateAsync({
        ...data,
        sort_order: localItems.length,
      });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const isSaving = createDosage.isPending || updateDosage.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dosages</h2>
          <p className="text-sm text-muted-foreground">
            Chemicals technicians apply on each visit, with quick-pick preset amounts.
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
            Add Dosage
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
              No dosages configured. Add one or reset to defaults.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Description</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="hidden md:table-cell">Presets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={localItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localItems.map((dosage) => (
                      <SortableRow
                        key={dosage.id}
                        dosage={dosage}
                        onEdit={() => {
                          setEditing(dosage);
                          setModalOpen(true);
                        }}
                        onDelete={() => setDeleteTarget(dosage)}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <DosageDefinitionModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        dosage={editing}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dosage?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deleteTarget?.label}&quot; from active dosages?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteDosage.mutate(deleteTarget.id);
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
