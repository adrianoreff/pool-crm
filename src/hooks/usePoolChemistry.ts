import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
      toast({ title: 'Defaults restored' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not restore defaults', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateReadingDef() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      key: string;
      label: string;
      unit?: string | null;
      sort_order?: number;
    }) => {
      const { error } = await supabase.from('pool_reading_definitions').insert({
        business_id: profile!.business_id,
        key: input.key,
        label: input.label,
        unit: input.unit ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-reading-defs'] });
      toast({ title: 'Reading added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not add reading', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateReadingDef() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      key: string;
      label: string;
      unit?: string | null;
    }) => {
      const { error } = await supabase
        .from('pool_reading_definitions')
        .update({
          key: input.key,
          label: input.label,
          unit: input.unit ?? null,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-reading-defs'] });
      toast({ title: 'Reading updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update reading', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteReadingDef() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pool_reading_definitions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-reading-defs'] });
      toast({ title: 'Reading deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not delete reading', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderReadingDefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('pool_reading_definitions').update({ sort_order: index }).eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool-reading-defs'] }),
  });
}

export function useCreateDosageDef() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      key: string;
      label: string;
      unit?: string | null;
      direction?: string | null;
      preset_values?: string[];
      sort_order?: number;
    }) => {
      const { error } = await supabase.from('pool_dosage_definitions').insert({
        business_id: profile!.business_id,
        key: input.key,
        label: input.label,
        unit: input.unit ?? null,
        direction: input.direction ?? null,
        preset_values: input.preset_values ?? [],
        sort_order: input.sort_order ?? 0,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-dosage-defs'] });
      toast({ title: 'Dosage added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not add dosage', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDosageDef() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      key: string;
      label: string;
      unit?: string | null;
      direction?: string | null;
      preset_values?: string[];
    }) => {
      const { error } = await supabase
        .from('pool_dosage_definitions')
        .update({
          key: input.key,
          label: input.label,
          unit: input.unit ?? null,
          direction: input.direction ?? null,
          preset_values: input.preset_values ?? [],
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-dosage-defs'] });
      toast({ title: 'Dosage updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update dosage', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteDosageDef() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pool_dosage_definitions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-dosage-defs'] });
      toast({ title: 'Dosage deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not delete dosage', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderDosageDefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('pool_dosage_definitions').update({ sort_order: index }).eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool-dosage-defs'] }),
  });
}
