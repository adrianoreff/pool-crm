import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useTeam() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['team', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, business_id, email, first_name, last_name, phone, avatar_url, role, color, is_active, preferences, created_at, updated_at, last_seen_at')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data as User[];
    },
    enabled: !!businessId,
  });
}

export function useTechnicians() {
  const { data: team, ...rest } = useTeam();
  
  return {
    data: team?.filter(m => m.role === 'technician'),
    ...rest,
  };
}

export function useTeamMember(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['team-member', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, business_id, email, first_name, last_name, phone, avatar_url, role, color, is_active, preferences, created_at, updated_at, last_seen_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as User;
    },
    enabled: !!businessId && !!id,
  });
}

export function useTeamMemberAppointments(memberId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['team-member-appointments', memberId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('technician_id', memberId)
        .eq('scheduled_date', today)
        .neq('status', 'cancelled');

      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      first_name: string;
      last_name: string;
      phone: string;
      role: UserRole;
      color: string;
      is_active: boolean;
    }>) => {
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast({ title: 'Team member updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update team member', description: error.message, variant: 'destructive' });
    },
  });
}
