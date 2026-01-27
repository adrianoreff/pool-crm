import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
}

interface ServiceChecklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

interface AppointmentChecklistItem {
  id: string;
  item_id: string;
  item_text: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export function useJobChecklist(appointmentId: string, serviceId: string | null) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch checklist template
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
      return data as ServiceChecklist | null;
    },
    enabled: !!serviceId,
  });

  // Fetch completed items
  const { data: completedItems = [] } = useQuery({
    queryKey: ['appointment-checklist-items', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_checklist_items')
        .select('*')
        .eq('appointment_id', appointmentId);

      if (error) throw error;
      return data as AppointmentChecklistItem[];
    },
    enabled: !!appointmentId,
  });

  // Calculate progress
  const progress = checklistTemplate
    ? completedItems.filter(item => item.completed).length / checklistTemplate.items.length
    : 0;

  // Mutation to toggle item completion
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, itemText, completed, notes }: {
      itemId: string;
      itemText: string;
      completed: boolean;
      notes?: string;
    }) => {
      // Check if item already exists
      const existing = completedItems.find(item => item.item_id === itemId);

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('appointment_checklist_items')
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            notes: notes || null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('appointment_checklist_items')
          .insert({
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
    onError: (error) => {
      toast({ title: 'Failed to update checklist', description: error.message, variant: 'destructive' });
    },
  });

  return {
    checklistTemplate,
    completedItems,
    progress: Math.round(progress * 100),
    toggleItem,
  };
}
