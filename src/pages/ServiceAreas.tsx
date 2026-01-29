import { useState } from 'react';
import { 
  Plus,
  MoreHorizontal,
  MapPin,
  Edit,
  Trash,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useServiceAreas, useToggleServiceAreaActive, useDeleteServiceArea } from '@/hooks/useServiceAreas';
import { useBusiness } from '@/hooks/useBusiness';
import { ServiceAreaWithTechnician } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { AddServiceAreaModal, EditServiceAreaModal, DrawBoundaryModal } from '@/components/modals';
import { ServiceAreasMap } from '@/components/maps/ServiceAreasMap';

// Generate a color based on index for visual differentiation
const areaColors = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

// Placeholder map component
function MapPlaceholder({ areas }: { areas: ServiceAreaWithTechnician[] }) {
  return (
    <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-hidden">
      {/* Simulated map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
        {/* Grid lines to simulate map */}
        <svg className="w-full h-full opacity-20">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Simulated area overlays */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[80%] h-[70%]">
          {areas.map((area, idx) => {
            const positions = [
              { top: '10%', left: '20%', width: '35%', height: '40%' },
              { top: '15%', left: '45%', width: '40%', height: '35%' },
              { top: '50%', left: '10%', width: '30%', height: '35%' },
              { top: '55%', left: '50%', width: '35%', height: '30%' },
            ];
            const pos = positions[idx % positions.length];
            const color = areaColors[idx % areaColors.length];
            
            return (
              <div
                key={area.id}
                className="absolute rounded-lg border-2 flex items-center justify-center transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  ...pos,
                  backgroundColor: `${color}20`,
                  borderColor: color,
                }}
              >
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color }}>
                    {area.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {area.zip_codes?.length || 0} zip codes
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map overlay text */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-card">
        <p className="text-xs text-muted-foreground">
          Mapbox integration ready • {areas.length} service areas defined
        </p>
      </div>
    </div>
  );
}

function ServiceAreaCard({ 
  area, 
  colorIndex, 
  onEdit, 
  onDrawBoundary,
  onDelete 
}: { 
  area: ServiceAreaWithTechnician; 
  colorIndex: number;
  onEdit: () => void;
  onDrawBoundary: () => void;
  onDelete: () => void;
}) {
  const toggleActive = useToggleServiceAreaActive();
  const color = areaColors[colorIndex % areaColors.length];

  const handleToggle = (checked: boolean) => {
    toggleActive.mutate({ id: area.id, isActive: checked });
  };

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div>
              <h3 className="font-semibold">{area.name}</h3>
              <p className="text-sm text-muted-foreground">
                {area.zip_codes?.length || 0} zip codes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={area.is_active ?? true}
              onCheckedChange={handleToggle}
              disabled={toggleActive.isPending}
              className="data-[state=checked]:bg-primary"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Zone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDrawBoundary}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Draw boundary on map
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Zip Codes */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1.5">Zip Codes</p>
          <div className="flex flex-wrap gap-1">
            {(area.zip_codes || []).slice(0, 5).map((zip) => (
              <Badge key={zip} variant="secondary" className="text-xs">
                {zip}
              </Badge>
            ))}
            {(area.zip_codes?.length || 0) > 5 && (
              <Badge variant="outline" className="text-xs">
                +{area.zip_codes!.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {/* Default Technician */}
        {area.default_technician && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1.5">Default Technician</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarFallback 
                  className="text-xs text-white"
                  style={{ backgroundColor: area.default_technician.color || '#F97316' }}
                >
                  {area.default_technician.first_name?.[0]}{area.default_technician.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {area.default_technician.first_name} {area.default_technician.last_name}
              </span>
            </div>
          </div>
        )}

        {/* Surcharge */}
        {area.travel_surcharge && area.travel_surcharge > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Travel Surcharge: <span className="font-medium text-foreground">${area.travel_surcharge}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ServiceAreas() {
  const { data: serviceAreas = [], isLoading } = useServiceAreas();
  const { data: business } = useBusiness();
  const mapboxToken = business?.mapbox_public_token;
  const deleteServiceArea = useDeleteServiceArea();
  const activeAreas = serviceAreas.filter(a => a.is_active).length;
  
  const [isAddServiceAreaOpen, setIsAddServiceAreaOpen] = useState(false);
  const [isEditServiceAreaOpen, setIsEditServiceAreaOpen] = useState(false);
  const [serviceAreaToEdit, setServiceAreaToEdit] = useState<ServiceAreaWithTechnician | null>(null);
  const [drawBoundaryArea, setDrawBoundaryArea] = useState<ServiceAreaWithTechnician | null>(null);
  const [isDrawBoundaryOpen, setIsDrawBoundaryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  const handleEdit = (area: ServiceAreaWithTechnician) => {
    setServiceAreaToEdit(area);
    setIsEditServiceAreaOpen(true);
  };

  const handleDrawBoundary = (area: ServiceAreaWithTechnician) => {
    setDrawBoundaryArea(area);
    setIsDrawBoundaryOpen(true);
  };

  const handleDeleteClick = (areaId: string) => {
    setAreaToDelete(areaId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (areaToDelete) {
      deleteServiceArea.mutate(areaToDelete);
    }
    setDeleteDialogOpen(false);
    setAreaToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-[500px] w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Areas</h1>
          <p className="text-muted-foreground">
            {activeAreas} of {serviceAreas.length} areas active
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover" onClick={() => setIsAddServiceAreaOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service Area
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              {mapboxToken ? (
                <ServiceAreasMap areas={serviceAreas} token={mapboxToken} />
              ) : (
                <MapPlaceholder areas={serviceAreas} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Areas List */}
        <div>
          <ScrollArea className="h-[500px] pr-4">
            {serviceAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">No service areas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define your service areas to optimize scheduling
                </p>
                <Button className="bg-primary hover:bg-primary-hover" onClick={() => setIsAddServiceAreaOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Area
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceAreas.map((area, idx) => (
                  <ServiceAreaCard 
                    key={area.id} 
                    area={area} 
                    colorIndex={idx}
                    onEdit={() => handleEdit(area)}
                    onDrawBoundary={() => handleDrawBoundary(area)}
                    onDelete={() => handleDeleteClick(area.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Modals */}
      <AddServiceAreaModal 
        open={isAddServiceAreaOpen} 
        onOpenChange={setIsAddServiceAreaOpen} 
      />
      <EditServiceAreaModal
        open={isEditServiceAreaOpen}
        onOpenChange={setIsEditServiceAreaOpen}
        serviceArea={serviceAreaToEdit}
      />
      <DrawBoundaryModal
        open={isDrawBoundaryOpen}
        onOpenChange={(open) => {
          setIsDrawBoundaryOpen(open);
          if (!open) setDrawBoundaryArea(null);
        }}
        serviceArea={drawBoundaryArea}
        mapboxToken={mapboxToken || null}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Area</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service area? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
