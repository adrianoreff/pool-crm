import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppointmentWithRelations } from '@/types/database';

export interface JobChatItem {
  appointmentId: string;
  appointment: AppointmentWithRelations;
  lastMessageAt: string;
  lastMessageSenderId: string;
  lastMessagePreview: string;
  unreadCount: number;
}

const QUERY_KEY = 'unread-job-chats';

export function useUnreadJobChats() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, profile?.id, profile?.business_id, profile?.role],
    queryFn: async (): Promise<JobChatItem[]> => {
      if (!profile?.id || !profile?.business_id) return [];

      const isTechnician = profile.role === 'technician';

      const appointmentsQuery = supabase
        .from('appointments')
        .select(`
          id,
          ref_code,
          scheduled_date,
          scheduled_start_time,
          status,
          business_id,
          technician_id,
          customer:customers(id, first_name, last_name),
          service:services(id, name)
        `)
        .eq('business_id', profile.business_id);

      if (isTechnician) {
        appointmentsQuery.eq('technician_id', profile.id);
      }

      const { data: appointments, error: aptError } = await appointmentsQuery;
      if (aptError || !appointments?.length) return [];

      const appointmentIds = appointments.map((a) => a.id);

      const { data: messages, error: msgError } = await supabase
        .from('job_messages')
        .select('appointment_id, created_at, sender_id, body')
        .in('appointment_id', appointmentIds)
        .order('created_at', { ascending: false });

      if (msgError) return [];

      const lastByAppointment = new Map<string, { created_at: string; sender_id: string; body: string }>();
      for (const m of messages || []) {
        if (!lastByAppointment.has(m.appointment_id)) {
          lastByAppointment.set(m.appointment_id, {
            created_at: m.created_at || '',
            sender_id: m.sender_id,
            body: (m.body || '').slice(0, 60),
          });
        }
      }

      const appointmentIdsWithMessages = Array.from(lastByAppointment.keys());
      if (appointmentIdsWithMessages.length === 0) return [];

      const { data: receipts } = await supabase
        .from('job_chat_read_receipts')
        .select('appointment_id, last_read_at')
        .eq('user_id', profile.id)
        .in('appointment_id', appointmentIdsWithMessages);

      const receiptByApt = new Map<string, string>();
      for (const r of receipts || []) {
        receiptByApt.set(r.appointment_id, r.last_read_at);
      }

      const { data: allMessages } = await supabase
        .from('job_messages')
        .select('appointment_id, created_at, sender_id')
        .in('appointment_id', appointmentIdsWithMessages)
        .order('created_at', { ascending: true });

      const unreadByApt = new Map<string, number>();
      const lastReadByApt = receiptByApt;
      for (const m of allMessages || []) {
        if (m.sender_id === profile.id) continue;
        const lastRead = lastReadByApt.get(m.appointment_id);
        const msgTime = new Date(m.created_at || 0).getTime();
        const readTime = lastRead ? new Date(lastRead).getTime() : 0;
        if (msgTime > readTime) {
          unreadByApt.set(m.appointment_id, (unreadByApt.get(m.appointment_id) || 0) + 1);
        }
      }

      const aptMap = new Map(appointments.map((a) => [a.id, a as unknown as AppointmentWithRelations]));
      const items: JobChatItem[] = [];
      for (const aptId of appointmentIdsWithMessages) {
        const apt = aptMap.get(aptId);
        const last = lastByAppointment.get(aptId);
        if (!apt || !last) continue;
        items.push({
          appointmentId: aptId,
          appointment: apt,
          lastMessageAt: last.created_at,
          lastMessageSenderId: last.sender_id,
          lastMessagePreview: last.body,
          unreadCount: unreadByApt.get(aptId) || 0,
        });
      }
      items.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      return items;
    },
    enabled: !!profile?.id && !!profile?.business_id,
  });

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('job_messages_unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_chat_read_receipts' },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const items = query.data ?? [];
  const totalUnread = items.reduce((s, i) => s + i.unreadCount, 0);

  return {
    items,
    totalUnread,
    isLoading: query.isLoading,
  };
}
