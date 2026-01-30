import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface JobMessageRow {
  id: string;
  appointment_id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string | null;
  sender?: { id: string; first_name: string | null; last_name: string | null } | null;
}

const QUERY_KEY = 'job-messages';

export function useJobMessages(appointmentId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: [QUERY_KEY, appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];
      const { data, error } = await supabase
        .from('job_messages')
        .select(`
          id,
          appointment_id,
          sender_id,
          sender_role,
          body,
          created_at,
          sender:users!job_messages_sender_id_fkey(id, first_name, last_name)
        `)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as JobMessageRow[];
    },
    enabled: !!appointmentId,
  });

  // Realtime: refetch when a new message is inserted for this appointment
  useEffect(() => {
    if (!appointmentId) return;

    const channel = supabase
      .channel(`job_messages:${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_messages',
          filter: `appointment_id=eq.${appointmentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, appointmentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!appointmentId || !profile?.id) throw new Error('Missing appointment or user');
      const senderRole = profile.role as 'technician' | 'admin' | 'dispatcher' | 'owner';
      const { data, error } = await supabase
        .from('job_messages')
        .insert({
          appointment_id: appointmentId,
          sender_id: profile.id,
          sender_role: senderRole,
          body: body.trim(),
        })
        .select('id, created_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, appointmentId] });
    },
    onError: (err) => {
      toast({ title: 'Failed to send message', description: (err as Error).message, variant: 'destructive' });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
  };
}
