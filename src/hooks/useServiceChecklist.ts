import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  createDefaultWeeklyPoolChecklistItems,
  itemsToLegacyPayload,
  parseChecklistItems,
} from '@/lib/service-checklist-utils';
import type { ServiceChecklistItem, ServiceChecklistRecord } from '@/types/service-checklist';

function mapRow(row: Record<string, unknown>): ServiceChecklistRecord {
  return {
    id: row.id as string,
    business_id: row.business_id as string,
    service_id: (row.service_id as string | null) ?? null,
    name: row.name as string,
    items: parseChecklistItems(row.items),
    is_active: row.is_active as boolean | null,
    created_at: row.created_at as string | null,
    updated_at: row.updated_at as string | null,
  };
}

export function useServiceChecklist(serviceId: string | null, serviceName?: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['service-checklist-admin', serviceId],
    queryFn: async () => {
      if (!serviceId || !businessId) return null;

      const { data, error } = await supabase
        .from('service_checklists')
        .select('*')
        .eq('service_id', serviceId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },
    enabled: !!serviceId && !!businessId,
  });

  const saveChecklist = useMutation({
    mutationFn: async (items: ServiceChecklistItem[]) => {
      if (!serviceId || !businessId) throw new Error('Service not found');

      const payload = itemsToLegacyPayload(items);
      const name = serviceName ? `${serviceName} Checklist` : 'Service Checklist';

      if (query.data?.id) {
        const { error } = await supabase
          .from('service_checklists')
          .update({
            items: JSON.parse(JSON.stringify(payload)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', query.data.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('service_checklists').insert({
        business_id: businessId,
        service_id: serviceId,
        name,
        items: JSON.parse(JSON.stringify(payload)),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-checklist-admin', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service-checklist', serviceId] });
      toast({ title: 'Checklist saved' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not save checklist',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const items = createDefaultWeeklyPoolChecklistItems();
      await saveChecklist.mutateAsync(items);
    },
  });

  return {
    checklist: query.data,
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    saveChecklist,
    seedDefaults,
  };
}
