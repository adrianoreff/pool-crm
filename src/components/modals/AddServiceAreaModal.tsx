import { useState } from 'react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useTechnicians } from '@/hooks/useTeam';
import { Loader2 } from 'lucide-react';

const serviceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  zip_codes: z.string().min(1, 'At least one zip code is required'),
  default_technician_id: z.string().optional(),
  travel_surcharge: z.coerce.number().min(0).optional(),
});

type ServiceAreaFormData = z.infer<typeof serviceAreaSchema>;

interface AddServiceAreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddServiceAreaModal({ open, onOpenChange, onSuccess }: AddServiceAreaModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: technicians = [] } = useTechnicians();

  const form = useForm<ServiceAreaFormData>({
    resolver: zodResolver(serviceAreaSchema),
    defaultValues: {
      name: '',
      zip_codes: '',
      default_technician_id: '',
      travel_surcharge: 0,
    },
  });

  const handleSubmit = async (data: ServiceAreaFormData) => {
    if (!profile?.business_id) {
      toast({ title: 'Error', description: 'Business not found', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse zip codes from comma-separated string
      const zipCodes = data.zip_codes
        .split(',')
        .map(z => z.trim())
        .filter(z => z.length > 0);

      const { error } = await supabase.from('service_areas').insert({
        business_id: profile.business_id,
        name: data.name,
        zip_codes: zipCodes,
        default_technician_id: data.default_technician_id || null,
        travel_surcharge: data.travel_surcharge || 0,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Service area added successfully' });
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to add service area:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add service area', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Service Area</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Downtown Austin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zip_codes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Codes *</FormLabel>
                  <FormControl>
                    <Input placeholder="78701, 78702, 78703" {...field} />
                  </FormControl>
                  <FormDescription>Enter comma-separated zip codes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_technician_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Technician</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign a default technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No default</SelectItem>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: tech.color || '#888' }} 
                            />
                            {tech.first_name} {tech.last_name}
                          </div>
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
              name="travel_surcharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel Surcharge ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>Additional fee for this service area</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary-hover">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Service Area
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
