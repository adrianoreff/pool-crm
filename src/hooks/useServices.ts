import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Service, ServiceCategory, ServiceWithCategory } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useServices() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['services', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*)
        `)
        .eq('business_id', businessId)
        .order('sort_order');

      if (error) throw error;
      return data as ServiceWithCategory[];
    },
    enabled: !!businessId,
  });
}

export function useServiceCategories() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['service-categories', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as ServiceCategory[];
    },
    enabled: !!businessId,
  });
}

export function useToggleServiceActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update service', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (service: {
      name: string;
      description?: string;
      category_id?: string;
      duration_min?: number;
      duration_max?: number;
      base_price_min?: number;
      base_price_max?: number;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .insert({
          business_id: profile!.business_id,
          ...service,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: 'Service created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create service', description: error.message, variant: 'destructive' });
    },
  });
}
