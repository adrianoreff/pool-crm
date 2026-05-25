import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Service, ServiceCategory, ServiceWithCategory } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { filterPoolCategories, isPoolServiceCategory } from '@/lib/pool-service-categories';

type ServicesQueryOptions = { poolOnly?: boolean };

export function useServices(options?: ServicesQueryOptions) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const poolOnly = options?.poolOnly !== false;

  return useQuery({
    queryKey: ['services', businessId, poolOnly],
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
      const rows = data as ServiceWithCategory[];
      if (!poolOnly) return rows;
      return rows.filter((s) => !s.category || isPoolServiceCategory(s.category));
    },
    enabled: !!businessId,
  });
}

export function useServiceCategories(options?: ServicesQueryOptions) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const poolOnly = options?.poolOnly !== false;

  return useQuery({
    queryKey: ['service-categories', businessId, poolOnly],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      const rows = data as ServiceCategory[];
      if (!poolOnly) return rows;
      return filterPoolCategories(rows);
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

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      category_id,
      duration_min,
      duration_max,
      base_price_min,
      base_price_max,
    }: {
      id: string;
      name?: string;
      description?: string | null;
      category_id?: string;
      duration_min?: number | null;
      duration_max?: number | null;
      base_price_min?: number | null;
      base_price_max?: number | null;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .update({
          name,
          description,
          category_id,
          duration_min,
          duration_max,
          base_price_min,
          base_price_max,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: 'Service updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update service', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: 'Service deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Could not delete service',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error: servicesError } = await supabase
        .from('services')
        .delete()
        .eq('category_id', categoryId);
      if (servicesError) throw servicesError;

      const { error } = await supabase.from('service_categories').delete().eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast({ title: 'Category deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Could not delete category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
