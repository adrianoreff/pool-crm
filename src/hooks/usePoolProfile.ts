import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { poolProfileFormToPayload, type PoolProfileFormData } from '@/lib/pool-profile-form';

export function usePoolProfile(customerId: string | undefined) {
  return useQuery({
    queryKey: ['pool-profile', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_profiles')
        .select('*')
        .eq('customer_id', customerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useUpsertPoolProfile() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      customerId,
      data,
    }: {
      customerId: string;
      data: PoolProfileFormData;
    }) => {
      if (!profile?.business_id) throw new Error('Business not set up');
      const payload = poolProfileFormToPayload(data);
      const { error } = await supabase.from('pool_profiles').upsert(
        {
          business_id: profile.business_id,
          customer_id: customerId,
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pool-profile', vars.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', vars.customerId] });
    },
  });
}
