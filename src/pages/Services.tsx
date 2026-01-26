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
import { mockServiceCategories, mockServices, ServiceCategory, Service } from '@/data/mockData';

const categoryIcons: Record<string, React.ElementType> = {
  Droplets,
  Zap,
  Thermometer,
  Home,
  Waves,
  Wrench,
};

const formatDuration = (min: number, max: number) => {
  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  
  if (min === max) return formatHours(min);
  return `${formatHours(min)} - ${formatHours(max)}`;
};

const formatPrice = (basePrice: number | null, maxPrice: number | null) => {
  if (!basePrice) return 'Quote';
  if (!maxPrice || basePrice === maxPrice) return `$${basePrice}`;
  return `$${basePrice} - $${maxPrice}`;
};

function ServiceRow({ service, categoryColor }: { service: Service; categoryColor: string }) {
  const [isActive, setIsActive] = useState(service.active);

  return (
    <TableRow className="group">
      <TableCell className="w-[30px]">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div 
            className="w-1 h-8 rounded-full" 
            style={{ backgroundColor: categoryColor }}
          />
          <span className="font-medium">{service.name}</span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <p className="text-sm text-muted-foreground line-clamp-1">
          {service.description}
        </p>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline">{formatDuration(service.durationMin, service.durationMax)}</Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className="font-medium">{formatPrice(service.basePrice, service.maxPrice)}</span>
      </TableCell>
      <TableCell>
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          className="data-[state=checked]:bg-primary"
        />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function CategorySection({ category, services }: { category: ServiceCategory; services: Service[] }) {
  const Icon = categoryIcons[category.icon] || Wrench;
  const activeCount = services.filter(s => s.active).length;

  return (
    <AccordionItem value={category.id} className="border rounded-lg shadow-card mb-4 overflow-hidden">
      <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline [&[data-state=open]]:bg-muted/30">
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="rounded-lg p-2"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: category.color }} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">{category.name}</h3>
            <p className="text-sm text-muted-foreground">
              {activeCount} of {services.length} services active
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0">
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
            {services.map((service) => (
              <ServiceRow 
                key={service.id} 
                service={service} 
                categoryColor={category.color}
              />
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Service to {category.name}
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function Services() {
  const totalServices = mockServices.length;
  const activeServices = mockServices.filter(s => s.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">
            {activeServices} of {totalServices} services active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Categories */}
      <Accordion type="multiple" defaultValue={mockServiceCategories.map(c => c.id)}>
        {mockServiceCategories.map((category) => {
          const categoryServices = mockServices.filter(s => s.categoryId === category.id);
          return (
            <CategorySection 
              key={category.id} 
              category={category} 
              services={categoryServices}
            />
          );
        })}
      </Accordion>
    </div>
  );
}
