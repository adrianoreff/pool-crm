import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadJobChats, UNREAD_JOB_CHATS_QUERY_KEY, type JobChatItem } from '@/hooks/useUnreadJobChats';
import { useDirectMessageThreads } from '@/hooks/useDirectMessages';
import { useToast } from '@/hooks/use-toast';

const DIRECT_MESSAGES_QUERY_KEY = 'direct-messages';

interface NotificationContextValue {
  jobChatItems: JobChatItem[];
  jobChatTotalUnread: number;
  directTotalUnread: number;
  totalChatUnread: number;
  jobChatsLoading: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { items, totalUnread, isLoading } = useUnreadJobChats({ subscribeRealtime: false });
  const { threads: directThreads } = useDirectMessageThreads();

  const directTotalUnread = useMemo(
    () => directThreads.reduce((sum, t) => sum + t.unreadCount, 0),
    [directThreads]
  );
  const totalChatUnread = totalUnread + directTotalUnread;

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('notification_job_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: [UNREAD_JOB_CHATS_QUERY_KEY] });
          const newRow = payload.new as { sender_id?: string };
          if (newRow?.sender_id && newRow.sender_id !== profile.id) {
            const isTechnician = profile.role === 'technician';
            toast({
              title: isTechnician ? 'New message' : 'New message from technician',
              description: isTechnician
                ? 'You have a new message from the office.'
                : 'A technician sent a message in job chat.',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_chat_read_receipts' },
        () => {
          queryClient.invalidateQueries({ queryKey: [UNREAD_JOB_CHATS_QUERY_KEY] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: [DIRECT_MESSAGES_QUERY_KEY] });
          const newRow = payload.new as { sender_id?: string };
          if (newRow?.sender_id && newRow.sender_id !== profile.id) {
            toast({
              title: 'New direct message',
              description: 'You have a new message.',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: [DIRECT_MESSAGES_QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient, toast]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      jobChatItems: items,
      jobChatTotalUnread: totalUnread,
      directTotalUnread,
      totalChatUnread,
      jobChatsLoading: isLoading,
    }),
    [items, totalUnread, directTotalUnread, totalChatUnread, isLoading]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}

export function useNotificationOptional(): NotificationContextValue | null {
  return useContext(NotificationContext);
}
