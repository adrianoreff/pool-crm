import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { DrawBoundaryMap } from '@/components/maps/DrawBoundaryMap';
import { useUpdateServiceAreaGeojson } from '@/hooks/useServiceAreas';
import { ServiceAreaWithTechnician } from '@/types/database';
import { useState } from 'react';

interface DrawBoundaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceArea: ServiceAreaWithTechnician | null;
  mapboxToken: string | null;
}

export function DrawBoundaryModal({ open, onOpenChange, serviceArea, mapboxToken }: DrawBoundaryModalProps) {
  const [deleteBoundaryOpen, setDeleteBoundaryOpen] = useState(false);
  const updateGeojson = useUpdateServiceAreaGeojson();

  const handleSave = (geojson: GeoJSON.Polygon) => {
    if (!serviceArea?.id) return;
    updateGeojson.mutate(
      { id: serviceArea.id, geojson },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleDeleteBoundary = () => {
    if (!serviceArea?.id) return;
    updateGeojson.mutate(
      { id: serviceArea.id, geojson: null },
      {
        onSuccess: () => {
          setDeleteBoundaryOpen(false);
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => onOpenChange(false);

  if (!serviceArea || !mapboxToken) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Draw boundary: {serviceArea.name}</DialogTitle>
            {serviceArea.geojson && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteBoundaryOpen(true)}
                disabled={updateGeojson.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete boundary
              </Button>
            )}
          </div>
        </DialogHeader>
        <DrawBoundaryMap
          token={mapboxToken}
          initialGeoJSON={serviceArea.geojson as GeoJSON.Polygon | null}
          onSave={handleSave}
          onCancel={handleCancel}
          areaName={serviceArea.name}
        />
      </DialogContent>

      <AlertDialog open={deleteBoundaryOpen} onOpenChange={setDeleteBoundaryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete boundary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the drawn boundary from this service area. You can draw a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBoundary} className="bg-destructive hover:bg-destructive/90" disabled={updateGeojson.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
