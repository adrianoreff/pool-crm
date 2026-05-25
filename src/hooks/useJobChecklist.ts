import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseChecklistItems, getItemDisplayText } from '@/lib/service-checklist-utils';
import type { ServiceChecklistItem } from '@/types/service-checklist';

interface ServiceChecklistTemplate {
  id: string;
  name: string;
  items: ServiceChecklistItem[];
  business_id: string;
  service_id: string | null;
  is_active: boolean;
}

interface AppointmentChecklistItem {
  id: string;
  appointment_id: string;
  item_id: string;
  item_text: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useJobChecklist(appointmentId: string, serviceId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: checklistTemplate } = useQuery({
    queryKey: ['service-checklist', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;

      const { data, error } = await supabase
        .from('service_checklists')
        .select('*')
        .eq('service_id', serviceId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        items: parseChecklistItems(data.items),
      } as ServiceChecklistTemplate;
    },
    enabled: !!serviceId,
  });

  const { data: completedItems = [] } = useQuery({
    queryKey: ['appointment-checklist-items', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_checklist_items')
        .select('*')
        .eq('appointment_id', appointmentId);

      if (error) throw error;
      return (data || []) as AppointmentChecklistItem[];
    },
    enabled: !!appointmentId,
  });

  const totalItems = checklistTemplate?.items.length ?? 0;
  const progress =
    totalItems > 0
      ? completedItems.filter((item) => item.completed).length / totalItems
      : 0;

  const toggleItem = useMutation({
    mutationFn: async ({
      itemId,
      itemText,
      completed,
      notes,
    }: {
      itemId: string;
      itemText: string;
      completed: boolean;
      notes?: string;
    }) => {
      const existing = completedItems.find((item) => item.item_id === itemId);

      if (existing) {
        const { error } = await supabase
          .from('appointment_checklist_items')
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            notes: notes || null,
            item_text: itemText,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('appointment_checklist_items').insert({
          appointment_id: appointmentId,
          item_id: itemId,
          item_text: itemText,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          notes: notes || null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-checklist-items', appointmentId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update checklist',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const requiredIncomplete = (checklistTemplate?.items ?? []).filter((item) => {
    if (!item.requireToFinishStop) return false;
    const done = completedItems.find((ci) => ci.item_id === item.id)?.completed;
    return !done;
  });

  return {
    checklistTemplate,
    completedItems,
    progress: Math.round(progress * 100),
    toggleItem,
    requiredIncomplete,
    getDisplayText: (item: ServiceChecklistItem, completed: boolean) =>
      getItemDisplayText(item, completed),
  };
}
