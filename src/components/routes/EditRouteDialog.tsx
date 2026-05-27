import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateRoute, type RouteWithStops } from '@/hooks/useRoutes';
import { DAYS } from '@/lib/route-assignments';
import type { Database } from '@/integrations/supabase/types';
import type { User } from '@/types/database';

type DayOfWeek = Database['public']['Enums']['day_of_week'];

interface EditRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteWithStops | null;
  technicians: User[];
}

export function EditRouteDialog({
  open,
  onOpenChange,
  route,
  technicians,
}: EditRouteDialogProps) {
  const { toast } = useToast();
  const updateRoute = useUpdateRoute();

  const [name, setName] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [day, setDay] = useState<DayOfWeek>('wednesday');

  useEffect(() => {
    if (route && open) {
      setName(route.name);
      setTechnicianId(route.technician_id);
      setDay(route.day_of_week);
    }
  }, [route, open]);

  const handleSave = async () => {
    if (!route || !name.trim() || !technicianId) return;
    try {
      await updateRoute.mutateAsync({
        id: route.id,
        name: name.trim(),
        technician_id: technicianId,
        day_of_week: day,
      });
      toast({ title: 'Route updated' });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: 'Could not update route',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit route</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Route name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Technician</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tech" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Day of week</Label>
            <Select value={day} onValueChange={(v) => setDay(v as DayOfWeek)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d} className="capitalize">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateRoute.isPending || !name.trim()}>
            {updateRoute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
