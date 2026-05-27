import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/hooks/useTeam';
import { DAY_LABELS } from '@/lib/route-assignments';
import {
  ASSIGNMENT_DAYS,
  FREQUENCY_OPTIONS,
  defaultStartOnForDay,
  type RouteAssignmentFormData,
} from '@/lib/route-assignment-form';

type SheetField = 'tech' | 'day' | 'frequency' | 'start' | 'stop' | null;

interface RouteAssignmentSectionProps {
  value: RouteAssignmentFormData;
  onChange: (next: RouteAssignmentFormData) => void;
  disabled?: boolean;
}

function RowButton({
  label,
  display,
  onClick,
  disabled,
}: {
  label: string;
  display: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between py-3 px-1 border-b last:border-b-0 text-left hover:bg-muted/50 rounded-sm disabled:opacity-50"
    >
      <span className="text-sm font-medium text-primary">{label}</span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {display}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

export function RouteAssignmentSection({ value, onChange, disabled }: RouteAssignmentSectionProps) {
  const [openSheet, setOpenSheet] = useState<SheetField>(null);
  const { data: team = [] } = useTeam();
  const technicians = team.filter((m) => m.role === 'technician' && m.is_active !== false);

  const set = (patch: Partial<RouteAssignmentFormData>) => onChange({ ...value, ...patch });

  const techDisplay =
    technicians.find((t) => t.id === value.technician_id)?.first_name != null
      ? `${technicians.find((t) => t.id === value.technician_id)?.first_name || ''} ${technicians.find((t) => t.id === value.technician_id)?.last_name || ''}`.trim()
      : value.technician_id
        ? 'Technician'
        : 'Not set';

  const dayDisplay = value.day_of_week ? DAY_LABELS[value.day_of_week] : 'Not set';
  const freqDisplay =
    FREQUENCY_OPTIONS.find((f) => f.value === value.frequency_weeks)?.label ?? 'Weekly';

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Route Assignment Info</h3>
          <p className="text-xs text-muted-foreground">Optional. More can be added later.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="route-enabled" className="text-xs text-muted-foreground">
            Assign route
          </Label>
          <Switch
            id="route-enabled"
            checked={value.enabled}
            onCheckedChange={(c) => set({ enabled: c })}
            disabled={disabled}
          />
        </div>
      </div>

      {value.enabled && (
        <div className="rounded-md border bg-card">
          <RowButton
            label="Tech"
            display={techDisplay}
            onClick={() => setOpenSheet('tech')}
            disabled={disabled}
          />
          <RowButton
            label="Day of Week"
            display={dayDisplay}
            onClick={() => setOpenSheet('day')}
            disabled={disabled}
          />
          <RowButton
            label="Frequency"
            display={freqDisplay}
            onClick={() => setOpenSheet('frequency')}
            disabled={disabled}
          />
          <RowButton
            label="Start On"
            display={value.start_on || 'Not set'}
            onClick={() => setOpenSheet('start')}
            disabled={disabled}
          />
          <RowButton
            label="Stop After"
            display={value.stop_after || 'No end date'}
            onClick={() => setOpenSheet('stop')}
            disabled={disabled}
          />
        </div>
      )}

      <Sheet open={openSheet === 'tech'} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Select technician</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2">
            {technicians.map((t) => (
              <Button
                key={t.id}
                variant={value.technician_id === t.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => {
                  set({ technician_id: t.id });
                  setOpenSheet(null);
                }}
              >
                {t.first_name} {t.last_name}
              </Button>
            ))}
            {technicians.length === 0 && (
              <p className="text-sm text-muted-foreground">No technicians on your team.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'day'} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Day of week</SheetTitle>
            <SheetDescription>Monday through Saturday</SheetDescription>
          </SheetHeader>
          <div className="py-4 grid grid-cols-2 gap-2">
            {ASSIGNMENT_DAYS.map((day) => (
              <Button
                key={day}
                variant={value.day_of_week === day ? 'default' : 'outline'}
                onClick={() => {
                  set({
                    day_of_week: day,
                    frequency_weeks: value.frequency_weeks || 1,
                    start_on: defaultStartOnForDay(day),
                  });
                  setOpenSheet(null);
                }}
              >
                {DAY_LABELS[day]}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'frequency'} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Frequency</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2">
            {FREQUENCY_OPTIONS.map((f) => (
              <Button
                key={f.value}
                variant={value.frequency_weeks === f.value ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => {
                  set({ frequency_weeks: f.value });
                  setOpenSheet(null);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'start'} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Start on</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Input
              type="date"
              value={value.start_on}
              onChange={(e) => set({ start_on: e.target.value })}
            />
            <Button className="mt-3 w-full" onClick={() => setOpenSheet(null)}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'stop'} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Stop after</SheetTitle>
            <SheetDescription>Leave empty for ongoing service</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-2">
            <Input
              type="date"
              value={value.stop_after}
              onChange={(e) => set({ stop_after: e.target.value })}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                set({ stop_after: '' });
                setOpenSheet(null);
              }}
            >
              Clear (no end date)
            </Button>
            <Button className="w-full" onClick={() => setOpenSheet(null)}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
