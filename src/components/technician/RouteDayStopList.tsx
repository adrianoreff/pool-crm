import { useNavigate } from 'react-router-dom';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMiles } from '@/lib/mapbox/route-metrics';
import type { RouteDayStop } from '@/hooks/useRouteDay';

function SortableRow({
  stop,
  index,
  onNavigate,
}: {
  stop: RouteDayStop;
  index: number;
  onNavigate: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !stop.canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completed = stop.status === 'completed';
  const name = `${stop.customer?.first_name ?? ''} ${stop.customer?.last_name ?? ''}`.trim();
  const address = [stop.address, stop.city].filter(Boolean).join(', ');
  const legMi = stop.legMiles ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-stretch border-b border-slate-200/80 bg-white',
        index % 2 === 1 && 'bg-slate-50/80',
        isDragging && 'opacity-90 shadow-lg z-10',
        completed && 'opacity-70'
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-[#F97316] text-white">
        {stop.canReorder ? (
          <button
            type="button"
            className="touch-none p-1 mb-0.5 text-white/80 hover:text-white"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <span className="text-xl font-bold leading-none">{index + 1}</span>
      </div>
      <button
        type="button"
        className="flex flex-1 min-w-0 items-center gap-2 py-3 px-3 text-left"
        onClick={() => onNavigate(stop.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 truncate">{name || 'Customer'}</div>
          <div className="text-sm text-slate-500 truncate">{address}</div>
          <div className="text-xs text-slate-400 mt-1">{stop.schedule?.estArrivalLabel ?? ''}</div>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1">
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            index > 0 && legMi > 0 && (
              <span className="text-sm font-medium text-slate-600">
                &gt; {formatMiles(legMi)}
              </span>
            )
          )}
        </div>
      </button>
    </div>
  );
}

interface RouteDayStopListProps {
  stops: RouteDayStop[];
  onReorder: (stops: RouteDayStop[]) => void;
  onPersistReorder: (stops: RouteDayStop[]) => Promise<void>;
}

export function RouteDayStopList({ stops, onReorder, onPersistReorder }: RouteDayStopListProps) {
  const navigate = useNavigate();
  const sortableIds = stops.filter((s) => s.canReorder).map((s) => s.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(stops, oldIndex, newIndex);
    onReorder(reordered);
    await onPersistReorder(reordered);
  };

  if (!stops.length) {
    return (
      <p className="text-center text-muted-foreground py-12 px-4">
        No stops on this route. Ask the office to generate visits for this day.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="pb-36">
          {stops.map((stop, index) => (
            <SortableRow
              key={stop.id}
              stop={stop}
              index={index}
              onNavigate={(id) => navigate(`/technician/jobs/${id}`)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
