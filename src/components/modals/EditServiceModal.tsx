import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useServiceCategories, useUpdateService } from '@/hooks/useServices';
import { Loader2 } from 'lucide-react';
import { ServiceWithCategory } from '@/types/database';

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  category_id: z.string().min(1, 'Category is required'),
  duration_min: z.coerce.number().min(15).optional(),
  duration_max: z.coerce.number().min(15).optional(),
  base_price_min: z.coerce.number().min(0).optional(),
  base_price_max: z.coerce.number().min(0).optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface EditServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithCategory | null;
  onSuccess?: () => void;
}

export function EditServiceModal({ open, onOpenChange, service, onSuccess }: EditServiceModalProps) {
  const { toast } = useToast();
  const { data: categories = [] } = useServiceCategories();
  const updateService = useUpdateService();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      duration_min: 60,
      duration_max: 120,
      base_price_min: 0,
      base_price_max: 0,
    },
  });

  useEffect(() => {
    if (service && open) {
      form.reset({
        name: service.name,
        description: service.description ?? '',
        category_id: service.category_id ?? '',
        duration_min: service.duration_min ?? 60,
        duration_max: service.duration_max ?? 120,
        base_price_min: service.base_price_min ?? 0,
        base_price_max: service.base_price_max ?? 0,
      });
    }
  }, [service, open, form]);

  const handleSubmit = (data: ServiceFormData) => {
    if (!service?.id) {
      toast({ title: 'Error', description: 'Service not found', variant: 'destructive' });
      return;
    }

    updateService.mutate(
      {
        id: service.id,
        name: data.name,
        description: data.description || null,
        category_id: data.category_id,
        duration_min: data.duration_min ?? null,
        duration_max: data.duration_max ?? null,
        base_price_min: data.base_price_min ?? null,
        base_price_max: data.base_price_max ?? null,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly Pool Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the service..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="base_price_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="base_price_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateService.isPending} className="bg-primary hover:bg-primary-hover">
                {updateService.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
