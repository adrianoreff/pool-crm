import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddressAutocomplete, AddressResult } from '@/components/ui/address-autocomplete';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomers } from '@/hooks/useCustomers';
import { useServices } from '@/hooks/useServices';
import { useTechnicians } from '@/hooks/useTeam';
import { useCheckTechnicianConflict } from '@/hooks/useTechnicianConflict';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TechnicianConflictModal } from './TechnicianConflictModal';
import type { AppointmentWithRelations } from '@/types/database';

const appointmentSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  service_id: z.string().optional(),
  technician_id: z.string().optional(),
  scheduled_date: z.date({ required_error: 'Date is required' }),
  scheduled_start_time: z.string().min(1, 'Start time is required'),
  scheduled_end_time: z.string().min(1, 'End time is required'),
  address: z.string().min(1, 'Address is required').max(255),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  customer_notes: z.string().max(1000).optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedDate?: Date;
}

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minutes = i % 2 === 0 ? '00' : '30';
  if (hour > 20) return null;
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}).filter(Boolean) as string[];

export function NewAppointmentModal({ open, onOpenChange, onSuccess, preselectedDate }: NewAppointmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictAppointment, setConflictAppointment] = useState<(AppointmentWithRelations & { conflictTimeLabel?: string }) | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<AppointmentFormData | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const checkConflict = useCheckTechnicianConflict();

  const { data: customers = [] } = useCustomers({});
  const { data: services = [] } = useServices();
  const { data: technicians = [] } = useTechnicians();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: '',
      service_id: '',
      technician_id: '',
      scheduled_date: preselectedDate || new Date(),
      scheduled_start_time: '09:00',
      scheduled_end_time: '10:00',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      customer_notes: '',
    },
  });

  // Auto-fill address when customer is selected
  const selectedCustomerId = form.watch('customer_id');
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        form.setValue('address', customer.address || '');
        form.setValue('city', customer.city || '');
        form.setValue('state', customer.state || '');
        form.setValue('zip_code', customer.zip_code || '');
      }
    }
  }, [selectedCustomerId, customers, form]);

  const performCreate = async (data: AppointmentFormData) => {
    if (!profile?.business_id) return;

    const { data: created, error } = await supabase.from('appointments').insert({
      business_id: profile.business_id,
      customer_id: data.customer_id,
      service_id: data.service_id || null,
      technician_id: data.technician_id || null,
      scheduled_date: format(data.scheduled_date, 'yyyy-MM-dd'),
      scheduled_start_time: data.scheduled_start_time,
      scheduled_end_time: data.scheduled_end_time,
      address: data.address,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      customer_notes: data.customer_notes || null,
      status: 'scheduled',
      source: 'manual',
    }).select('id').single();

    if (error) throw error;

    if (created?.id && data.technician_id) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'technician_assigned',
            appointmentId: created.id,
            appUrl: window.location.origin,
          },
        });
      } catch (emailError) {
        console.error('Failed to send technician assigned notification:', emailError);
      }
    }

    toast({ title: 'Success', description: 'Appointment created successfully' });
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSubmit = async (data: AppointmentFormData) => {
    if (!profile?.business_id) {
      toast({ title: 'Error', description: 'Business not found', variant: 'destructive' });
      return;
    }

    const dateStr = format(data.scheduled_date, 'yyyy-MM-dd');
    if (data.technician_id) {
      const result = await checkConflict(
        data.technician_id,
        dateStr,
        data.scheduled_start_time,
        data.scheduled_end_time
      );
      if (result.hasConflict && result.conflictAppointment) {
        setConflictAppointment(result.conflictAppointment);
        setPendingCreateData(data);
        setConflictModalOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await performCreate(data);
    } catch (error: unknown) {
      console.error('Failed to create appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create appointment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignAnywayCreate = async () => {
    if (!pendingCreateData) return;
    setIsSubmitting(true);
    try {
      await performCreate(pendingCreateData);
      setPendingCreateData(null);
      setConflictModalOpen(false);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create appointment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const newAppointmentTechnicianName = pendingCreateData?.technician_id
    ? (() => {
        const t = technicians.find((x) => x.id === pendingCreateData.technician_id);
        return t ? `${t.first_name} ${t.last_name || ''}`.trim() : '';
      })()
    : '';

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name} - {customer.phone}
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
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
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
              name="technician_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technician</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign a technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
              name="scheduled_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
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
                name="scheduled_end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <AddressAutocomplete 
                      placeholder="123 Main St" 
                      value={field.value}
                      onChange={field.onChange}
                      onAddressSelect={(result: AddressResult) => {
                        form.setValue('address', result.address);
                        if (result.city) form.setValue('city', result.city);
                        if (result.state) form.setValue('state', result.state);
                        if (result.zipCode) form.setValue('zip_code', result.zipCode);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Austin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="TX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip</FormLabel>
                    <FormControl>
                      <Input placeholder="78701" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="customer_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Special instructions..." {...field} />
                  </FormControl>
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
                Create Appointment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <TechnicianConflictModal
      open={conflictModalOpen}
      onOpenChange={(open) => {
        setConflictModalOpen(open);
        if (!open) setPendingCreateData(null);
      }}
      conflictAppointment={conflictAppointment}
      technicianName={newAppointmentTechnicianName}
      onSelectDifferentTechnician={() => setConflictModalOpen(false)}
      onSelectDifferentTime={() => setConflictModalOpen(false)}
      onAssignAnyway={handleAssignAnywayCreate}
    />
    </>
  );
}
