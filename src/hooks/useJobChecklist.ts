import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  parseChecklistItems,
  getItemDisplayText,
  createDefaultWeeklyPoolChecklistItems,
  isWeeklyPoolServiceName,
  WEEKLY_POOL_SERVICE_NAME,
} from '@/lib/service-checklist-utils';
import type { ServiceChecklistItem } from '@/types/service-checklist';

interface ServiceChecklistTemplate {
  id: string;
  name: string;
  items: ServiceChecklistItem[];
  business_id: string;
  service_id: string | null;
  is_active: boolean;
  isFallback?: boolean;
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

async function fetchChecklistForService(
  businessId: string,
  serviceId: string | null,
  serviceName?: string | null
): Promise<ServiceChecklistTemplate | null> {
  if (serviceId) {
    const { data, error } = await supabase
      .from('service_checklists')
      .select('*')
      .eq('service_id', serviceId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return {
        ...data,
        items: parseChecklistItems(data.items),
        is_active: data.is_active ?? true,
      } as ServiceChecklistTemplate;
    }
  }

  const useWeeklyPool =
    isWeeklyPoolServiceName(serviceName) || !serviceId;

  if (useWeeklyPool) {
    let weeklyServiceId: string | null = null;
    const { data: weeklyService } = await supabase
      .from('services')
      .select('id')
      .eq('business_id', businessId)
      .eq('name', WEEKLY_POOL_SERVICE_NAME)
      .maybeSingle();

    if (weeklyService?.id) {
      weeklyServiceId = weeklyService.id;
      const { data, error } = await supabase
        .from('service_checklists')
        .select('*')
        .eq('service_id', weeklyService.id)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          ...data,
          items: parseChecklistItems(data.items),
          is_active: data.is_active ?? true,
        } as ServiceChecklistTemplate;
      }
    }

    return {
      id: 'fallback-weekly-pool',
      name: 'Weekly Pool Service Checklist',
      items: createDefaultWeeklyPoolChecklistItems(),
      business_id: businessId,
      service_id: weeklyServiceId ?? serviceId,
      is_active: true,
      isFallback: true,
    };
  }

  return null;
}

async function fetchLastDoneByItem(
  customerId: string,
  appointmentId: string,
  itemIds: string[]
): Promise<Record<string, string>> {
  if (!customerId || itemIds.length === 0) return {};

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .neq('id', appointmentId);

  if (apptError) throw apptError;
  const appointmentIds = (appointments || []).map((a) => a.id);
  if (appointmentIds.length === 0) return {};

  const { data, error } = await supabase
    .from('appointment_checklist_items')
    .select('item_id, completed_at')
    .in('appointment_id', appointmentIds)
    .in('item_id', itemIds)
    .eq('completed', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (!map[row.item_id] && row.completed_at) {
      map[row.item_id] = row.completed_at;
    }
  }
  return map;
}

export function useJobChecklist(
  appointmentId: string,
  serviceId: string | null,
  options?: {
    serviceName?: string | null;
    customerId?: string | null;
  }
) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const serviceName = options?.serviceName;
  const customerId = options?.customerId;

  const { data: checklistTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['service-checklist', serviceId, businessId, serviceName],
    queryFn: () => fetchChecklistForService(businessId!, serviceId, serviceName),
    enabled: !!businessId,
  });

  const itemIds = checklistTemplate?.items.map((i) => i.id) ?? [];

  const { data: lastDoneByItem = {} } = useQuery({
    queryKey: ['checklist-last-done', customerId, appointmentId, itemIds.join(',')],
    queryFn: () => fetchLastDoneByItem(customerId!, appointmentId, itemIds),
    enabled: !!customerId && !!appointmentId && itemIds.length > 0,
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
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: ['checklist-last-done', customerId],
        });
      }
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

  const checklistItems = checklistTemplate?.items ?? [];

  return {
    checklistTemplate,
    checklistItems,
    completedItems,
    lastDoneByItem,
    progress: Math.round(progress * 100),
    templateLoading,
    toggleItem,
    requiredIncomplete,
    getDisplayText: (item: ServiceChecklistItem, completed: boolean) =>
      getItemDisplayText(item, completed),
    showChecklist: checklistItems.length > 0,
  };
}
