import { useState } from 'react';
import { 
  Plus,
  MoreHorizontal,
  Droplets,
  Zap,
  Thermometer,
  Home,
  Waves,
  Wrench,
  Edit,
  Trash,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useServices, useServiceCategories, useToggleServiceActive } from '@/hooks/useServices';
import { ServiceWithCategory, ServiceCategory } from '@/types/database';
import { AddServiceModal, AddCategoryModal } from '@/components/modals';

const categoryIcons: Record<string, React.ElementType> = {
  Droplets, Zap, Thermometer, Home, Waves, Wrench,
};

const formatDuration = (min: number | null, max: number | null) => {
  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  if (!min) return 'N/A';
  if (!max || min === max) return formatHours(min);
  return `${formatHours(min)} - ${formatHours(max)}`;
};

const formatPrice = (basePrice: number | null, maxPrice: number | null) => {
  if (!basePrice) return 'Quote';
  if (!maxPrice || basePrice === maxPrice) return `$${basePrice}`;
  return `$${basePrice} - $${maxPrice}`;
};

function ServiceRow({ service, categoryColor }: { service: ServiceWithCategory; categoryColor: string }) {
  const toggleActive = useToggleServiceActive();

  return (
    <TableRow className="group">
      <TableCell className="w-[30px]">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: categoryColor }} />
          <span className="font-medium">{service.name}</span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <p className="text-sm text-muted-foreground line-clamp-1">{service.description || 'No description'}</p>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline">{formatDuration(service.duration_min, service.duration_max)}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className="font-medium">{formatPrice(service.base_price_min, service.base_price_max)}</span>
      </TableCell>
      <TableCell>
        <Switch
          checked={service.is_active ?? true}
          onCheckedChange={(checked) => toggleActive.mutate({ id: service.id, isActive: checked })}
          className="data-[state=checked]:bg-primary"
        />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function Services() {
  const { data: services = [], isLoading: loadingServices } = useServices();
  const { data: categories = [], isLoading: loadingCategories } = useServiceCategories();
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  const totalServices = services.length;
  const activeServices = services.filter(s => s.is_active).length;

  if (loadingServices || loadingCategories) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-10 w-32" /></div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">{activeServices} of {totalServices} services active</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddCategoryOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button className="bg-primary hover:bg-primary-hover" onClick={() => setIsAddServiceOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No service categories yet</p>
            <Button onClick={() => setIsAddCategoryOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={categories.map(c => c.id)}>
          {categories.map((category) => {
            const categoryServices = services.filter(s => s.category_id === category.id);
            const Icon = categoryIcons[category.icon || 'Wrench'] || Wrench;
            const activeCount = categoryServices.filter(s => s.is_active).length;

            return (
              <AccordionItem key={category.id} value={category.id} className="border rounded-lg shadow-card mb-4 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${category.color}20` }}>
                      <Icon className="h-5 w-5" style={{ color: category.color || '#888' }} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{activeCount} of {categoryServices.length} services active</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  {categoryServices.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground mb-4">No services in this category</p>
                      <Button variant="outline" size="sm" onClick={() => setIsAddServiceOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30px]"></TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead className="hidden md:table-cell">Description</TableHead>
                          <TableHead className="hidden sm:table-cell">Duration</TableHead>
                          <TableHead className="hidden lg:table-cell">Price</TableHead>
                          <TableHead className="w-[60px]">Active</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryServices.map((service) => (
                          <ServiceRow key={service.id} service={service} categoryColor={category.color || '#888'} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Modals */}
      <AddServiceModal 
        open={isAddServiceOpen} 
        onOpenChange={setIsAddServiceOpen} 
      />
      <AddCategoryModal 
        open={isAddCategoryOpen} 
        onOpenChange={setIsAddCategoryOpen} 
      />
    </div>
  );
}
