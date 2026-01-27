import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceAreaWithTechnician } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useServiceAreas() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['service-areas', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('service_areas')
        .select(`
          *,
          default_technician:users(id, first_name, last_name, color)
        `)
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      return data as ServiceAreaWithTechnician[];
    },
    enabled: !!businessId,
  });
}

export function useToggleServiceAreaActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('service_areas')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update service area', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteServiceArea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      toast({ title: 'Service area deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete service area', description: error.message, variant: 'destructive' });
    },
  });
}
