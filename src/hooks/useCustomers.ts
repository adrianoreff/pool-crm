import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerWithAddresses, CustomerFilters } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useCustomers(filters?: CustomerFilters) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['customers', businessId, filters],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from('customers')
        .select(`
          *,
          customer_addresses(*)
        `)
        .eq('business_id', businessId);

      // Apply sorting
      switch (filters?.sortBy) {
        case 'name':
          query = query.order('last_name', { ascending: filters?.sortDirection !== 'desc' });
          break;
        case 'date':
          query = query.order('created_at', { ascending: filters?.sortDirection !== 'desc' });
          break;
        case 'appointments':
          query = query.order('total_appointments', { ascending: filters?.sortDirection !== 'desc' });
          break;
        case 'spent':
          query = query.order('total_spent', { ascending: filters?.sortDirection !== 'desc' });
          break;
        default:
          query = query.order('last_name', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply client-side search filter
      let results = data as CustomerWithAddresses[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(customer => 
          customer.first_name.toLowerCase().includes(searchLower) ||
          (customer.last_name?.toLowerCase().includes(searchLower)) ||
          customer.phone.includes(filters.search!) ||
          (customer.email?.toLowerCase().includes(searchLower)) ||
          customer.customer_addresses?.some(a => 
            a.address.toLowerCase().includes(searchLower) ||
            (a.city?.toLowerCase().includes(searchLower)) ||
            (a.zip_code?.includes(filters.search!))
          )
        );
      }

      return results;
    },
    enabled: !!businessId,
  });
}

export function useCustomer(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_addresses(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as CustomerWithAddresses;
    },
    enabled: !!businessId && !!id,
  });
}

export function useCustomerAppointments(customerId: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(*)
        `)
        .eq('customer_id', customerId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!businessId && !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (customer: {
      first_name: string;
      last_name?: string;
      phone: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          business_id: profile!.business_id,
          ...customer,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create customer', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
      notes: string;
    }>) => {
      const { error } = await supabase
        .from('customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
      toast({ title: 'Customer updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update customer', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete customer', description: error.message, variant: 'destructive' });
    },
  });
}
