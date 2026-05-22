import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type ReadingDef = Database['public']['Tables']['pool_reading_definitions']['Row'];
export type DosageDef = Database['public']['Tables']['pool_dosage_definitions']['Row'];

export function usePoolReadingDefinitions() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['pool-reading-defs', profile?.business_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_reading_definitions')
        .select('*')
        .eq('business_id', profile!.business_id)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as ReadingDef[];
    },
    enabled: !!profile?.business_id,
  });
}

export function usePoolDosageDefinitions() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['pool-dosage-defs', profile?.business_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_dosage_definitions')
        .select('*')
        .eq('business_id', profile!.business_id)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as DosageDef[];
    },
    enabled: !!profile?.business_id,
  });
}

export function useSeedPoolDefaults() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_pool_business_defaults', {
        p_business_id: profile!.business_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-reading-defs'] });
      queryClient.invalidateQueries({ queryKey: ['pool-dosage-defs'] });
    },
  });
}

export function useUpsertReadingDef() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<ReadingDef> & { key: string; label: string }) => {
      const { error } = await supabase.from('pool_reading_definitions').upsert({
        business_id: profile!.business_id,
        key: input.key,
        label: input.label,
        unit: input.unit ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      }, { onConflict: 'business_id,key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool-reading-defs'] }),
  });
}

export function useUpsertDosageDef() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<DosageDef> & { key: string; label: string }) => {
      const { error } = await supabase.from('pool_dosage_definitions').upsert({
        business_id: profile!.business_id,
        key: input.key,
        label: input.label,
        unit: input.unit ?? null,
        direction: input.direction ?? null,
        sort_order: input.sort_order ?? 0,
        preset_values: input.preset_values ?? [],
        is_active: input.is_active ?? true,
      }, { onConflict: 'business_id,key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool-dosage-defs'] }),
  });
}
