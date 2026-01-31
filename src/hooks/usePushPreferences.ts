import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPushPreferences } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

/** Default preferences when no row exists (all true). */
export const DEFAULT_PUSH_PREFERENCES: Omit<UserPushPreferences, 'id' | 'created_at' | 'updated_at'> = {
  user_id: '',
  business_id: '',
  push_new_appointment: true,
  push_cancellation: true,
  push_reschedule: true,
  push_chat_direct: true,
  push_chat_job: true,
  push_job_problem: true,
  push_assigned: true,
};

export type PushPreferencesUpdate = Partial<Pick<UserPushPreferences,
  | 'push_new_appointment'
  | 'push_cancellation'
  | 'push_reschedule'
  | 'push_chat_direct'
  | 'push_chat_job'
  | 'push_job_problem'
  | 'push_assigned'
>>;

export function usePushPreferences() {
  const { user, profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['push-preferences', user?.id, businessId],
    queryFn: async (): Promise<UserPushPreferences | null> => {
      if (!user?.id || !businessId) return null;

      const { data, error } = await supabase
        .from('user_push_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return data as UserPushPreferences | null;
    },
    enabled: !!user?.id && !!businessId,
  });
}

export function useUpdatePushPreferences() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const businessId = profile?.business_id;

  return useMutation({
    mutationFn: async (updates: PushPreferencesUpdate) => {
      if (!user?.id || !businessId) throw new Error('Not authenticated or no business');

      const row = {
        user_id: user.id,
        business_id: businessId,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_push_preferences')
        .upsert(row, {
          onConflict: 'user_id,business_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserPushPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-preferences'] });
      toast({ title: 'Push preferences saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save preferences', description: error.message, variant: 'destructive' });
    },
  });
}
