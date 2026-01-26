import { useState } from 'react';
import { 
  Plus,
  MoreHorizontal,
  MapPin,
  Edit,
  Trash,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { mockServiceAreas, mockTeam, getTeamMemberById, ServiceArea } from '@/data/mockData';

// Placeholder map component
function MapPlaceholder({ areas }: { areas: ServiceArea[] }) {
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
            
            return (
              <div
                key={area.id}
                className="absolute rounded-lg border-2 flex items-center justify-center transition-all hover:scale-[1.02] cursor-pointer"
                style={{
                  ...pos,
                  backgroundColor: `${area.color}20`,
                  borderColor: area.color,
                }}
              >
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: area.color }}>
                    {area.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {area.zipCodes.length} zip codes
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

function ServiceAreaCard({ area }: { area: ServiceArea }) {
  const [isActive, setIsActive] = useState(area.active);
  const technicians = area.assignedTechnicianIds
    .map(id => getTeamMemberById(id))
    .filter(Boolean);

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: area.color }}
            />
            <div>
              <h3 className="font-semibold">{area.name}</h3>
              <p className="text-sm text-muted-foreground">
                {area.zipCodes.length} zip codes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-primary"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Zone
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MapPin className="mr-2 h-4 w-4" />
                  Draw on Map
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
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
            {area.zipCodes.slice(0, 5).map((zip) => (
              <Badge key={zip} variant="secondary" className="text-xs">
                {zip}
              </Badge>
            ))}
            {area.zipCodes.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{area.zipCodes.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {/* Assigned Technicians */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1.5">Assigned Technicians</p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {technicians.slice(0, 3).map((tech) => (
                <Avatar key={tech!.id} className="h-7 w-7 border-2 border-background">
                  <AvatarFallback 
                    className="text-xs text-white"
                    style={{ backgroundColor: tech!.color }}
                  >
                    {tech!.firstName[0]}{tech!.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {technicians.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{technicians.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Surcharge */}
        {area.travelSurcharge > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Travel Surcharge: <span className="font-medium text-foreground">${area.travelSurcharge}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ServiceAreas() {
  const activeAreas = mockServiceAreas.filter(a => a.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Areas</h1>
          <p className="text-muted-foreground">
            {activeAreas} of {mockServiceAreas.length} areas active
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
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
              <MapPlaceholder areas={mockServiceAreas} />
            </CardContent>
          </Card>
        </div>

        {/* Areas List */}
        <div>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {mockServiceAreas.map((area) => (
                <ServiceAreaCard key={area.id} area={area} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
