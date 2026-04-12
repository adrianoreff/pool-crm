import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DirectMessageRow {
  id: string;
  business_id: string;
  sender_id: string;
  recipient_id: string | null;
  recipient_type: 'user' | 'office';
  body: string;
  created_at: string;
  read_at: string | null;
  sender?: { id: string; first_name: string | null; last_name: string | null } | null;
}

const QUERY_KEY = 'direct-messages';

/** Office channel: technician ↔ office (recipient_type=office, recipient_id=null) */
export function useOfficeChannelMessages() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'office', profile?.business_id],
    queryFn: async (): Promise<DirectMessageRow[]> => {
      if (!profile?.business_id) return [];
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          business_id,
          sender_id,
          recipient_id,
          recipient_type,
          body,
          created_at,
          read_at,
          sender:users!direct_messages_sender_id_fkey(id, first_name, last_name)
        `)
        .eq('business_id', profile.business_id)
        .eq('recipient_type', 'office')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as DirectMessageRow[];
    },
    enabled: !!profile?.business_id,
  });

  const unreadCount = useMemo(() => {
    const messages = query.data ?? [];
    const myId = profile?.id;
    if (!myId) return 0;
    return messages.filter((m) => m.sender_id !== myId && !m.read_at).length;
  }, [query.data, profile?.id]);

  useEffect(() => {
    if (!profile?.business_id) return;
    const channel = supabase
      .channel('direct_messages_office')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `business_id=eq.${profile.business_id}`,
        },
        (payload) => {
          const newRow = payload.new as { recipient_type?: string };
          if (newRow?.recipient_type === 'office') {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'office'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.business_id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !profile?.business_id) return;
      const messages = query.data ?? [];
      const toUpdate = messages.filter((m) => m.sender_id !== profile.id && !m.read_at).map((m) => m.id);
      if (toUpdate.length === 0) return;
      await supabase.rpc('mark_dm_read', { p_message_ids: toUpdate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!profile?.id || !profile?.business_id) throw new Error('Missing user or business');
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          business_id: profile.business_id,
          sender_id: profile.id,
          recipient_id: null,
          recipient_type: 'office',
          body: body.trim(),
        })
        .select('id, created_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'office'] });
    },
    onError: (err) => {
      toast({ title: 'Failed to send message', description: (err as Error).message, variant: 'destructive' });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead: markAsRead.mutate,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
  };
}

/** 1:1 thread: admin ↔ specific technician */
export function useDirectThread(recipientUserId: string | undefined) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'thread', profile?.id, recipientUserId],
    queryFn: async (): Promise<DirectMessageRow[]> => {
      if (!profile?.id || !recipientUserId) return [];
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          business_id,
          sender_id,
          recipient_id,
          recipient_type,
          body,
          created_at,
          read_at,
          sender:users!direct_messages_sender_id_fkey(id, first_name, last_name)
        `)
        .eq('recipient_type', 'user')
        .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${recipientUserId}),and(sender_id.eq.${recipientUserId},recipient_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as DirectMessageRow[];
    },
    enabled: !!profile?.id && !!recipientUserId,
  });

  const unreadCount = useMemo(() => {
    const messages = query.data ?? [];
    const myId = profile?.id;
    if (!myId) return 0;
    return messages.filter((m) => m.sender_id !== myId && !m.read_at).length;
  }, [query.data, profile?.id]);

  useEffect(() => {
    if (!recipientUserId) return;
    const channel = supabase
      .channel(`direct_messages_thread:${recipientUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'thread', profile?.id, recipientUserId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [recipientUserId, profile?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const messages = query.data ?? [];
      const toUpdate = messages.filter((m) => m.sender_id !== profile.id && !m.read_at).map((m) => m.id);
      if (toUpdate.length === 0) return;
      await supabase.rpc('mark_dm_read', { p_message_ids: toUpdate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!profile?.id || !recipientUserId) throw new Error('Missing user or recipient');
      const businessId = profile.business_id;
      if (!businessId) throw new Error('Missing business');
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          business_id: businessId,
          sender_id: profile.id,
          recipient_id: recipientUserId,
          recipient_type: 'user',
          body: body.trim(),
        })
        .select('id, created_at')
        .single();

      if (error) throw error;
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: recipientUserId,
            business_id: businessId,
            notification_type: 'chat_direct',
            payload: {
              title: 'New message',
              body: body.trim().slice(0, 80) + (body.length > 80 ? '…' : ''),
              url: '/messages',
            },
          },
        });
      } catch (e) {
        console.error('Push notification failed:', e);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'thread'] });
    },
    onError: (err) => {
      toast({ title: 'Failed to send message', description: (err as Error).message, variant: 'destructive' });
    },
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !recipientUserId) throw new Error('Missing user or recipient');
      const messages = query.data ?? [];
      const ids = messages.map((m) => m.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from('direct_messages').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'thread', profile?.id, recipientUserId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'threads'] });
    },
    onError: (err) => {
      toast({ title: 'Failed to clear chat', description: (err as Error).message, variant: 'destructive' });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead: markAsRead.mutate,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    clearChat: clearChat.mutateAsync,
    isClearing: clearChat.isPending,
  };
}

/** Technician (or any user) view: 1:1 messages where I am sender or recipient (recipient_type=user) */
export function useMyDirectThread() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'my-thread', profile?.id],
    queryFn: async (): Promise<DirectMessageRow[]> => {
      if (!profile?.id || !profile?.business_id) return [];
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          business_id,
          sender_id,
          recipient_id,
          recipient_type,
          body,
          created_at,
          read_at,
          sender:users!direct_messages_sender_id_fkey(id, first_name, last_name)
        `)
        .eq('business_id', profile.business_id)
        .eq('recipient_type', 'user')
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as DirectMessageRow[];
    },
    enabled: !!profile?.id && !!profile?.business_id,
  });

  const unreadCount = useMemo(() => {
    const messages = query.data ?? [];
    const myId = profile?.id;
    if (!myId) return 0;
    return messages.filter((m) => m.sender_id !== myId && !m.read_at).length;
  }, [query.data, profile?.id]);

  const lastAdminId = useMemo(() => {
    const messages = query.data ?? [];
    const myId = profile?.id;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id !== myId) return messages[i].sender_id;
    }
    return null;
  }, [query.data, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('direct_messages_my_thread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'my-thread', profile.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const messages = query.data ?? [];
      const toUpdate = messages.filter((m) => m.sender_id !== profile.id && !m.read_at).map((m) => m.id);
      if (toUpdate.length === 0) return;
      await supabase.rpc('mark_dm_read', { p_message_ids: toUpdate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!profile?.id || !profile?.business_id) throw new Error('Missing user or business');
      const recipientId = lastAdminId;
      if (!recipientId) {
        toast({
          title: 'Cannot send yet',
          description: 'Send a message from Office Chat first, or wait for the office to message you here.',
          variant: 'destructive',
        });
        throw new Error('No recipient');
      }
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          business_id: profile.business_id,
          sender_id: profile.id,
          recipient_id: recipientId,
          recipient_type: 'user',
          body: body.trim(),
        })
        .select('id, created_at')
        .single();

      if (error) throw error;
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: recipientId,
            business_id: profile.business_id,
            notification_type: 'chat_direct',
            payload: {
              title: 'New message',
              body: body.trim().slice(0, 80) + (body.length > 80 ? '…' : ''),
              url: '/messages',
            },
          },
        });
      } catch (e) {
        console.error('Push notification failed:', e);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'my-thread'] });
    },
    onError: (err) => {
      toast({ title: 'Failed to send message', description: (err as Error).message, variant: 'destructive' });
    },
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Missing user');
      const messages = query.data ?? [];
      const ids = messages.map((m) => m.id);
      if (ids.length === 0) return;
      const { error } = await supabase.from('direct_messages').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'my-thread', profile?.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'threads'] });
    },
    onError: (err) => {
      toast({ title: 'Failed to clear chat', description: (err as Error).message, variant: 'destructive' });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    lastAdminId,
    markAsRead: markAsRead.mutate,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    clearChat: clearChat.mutateAsync,
    isClearing: clearChat.isPending,
  };
}

export interface DirectThreadItem {
  type: 'office';
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageSenderId: string;
}
export interface DirectThreadUserItem {
  type: 'user';
  userId: string;
  userName: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageSenderId: string;
}

/** Admin: list of direct message threads (1:1 with technicians only) */
export function useDirectMessageThreads() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'threads', profile?.id, profile?.business_id],
    queryFn: async (): Promise<(DirectThreadItem | DirectThreadUserItem)[]> => {
      if (!profile?.business_id) return [];

      const { data: allMessages, error } = await supabase
        .from('direct_messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          recipient_type,
          body,
          created_at,
          read_at,
          sender:users!direct_messages_sender_id_fkey(id, first_name, last_name)
        `)
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });

      if (error) return [];

      const userMessages = (allMessages || []).filter((m) => m.recipient_type === 'user');

      const threads: (DirectThreadItem | DirectThreadUserItem)[] = [];

      const userThreadPartners = new Set<string>();
      for (const m of userMessages) {
        const other = m.sender_id === profile.id ? m.recipient_id : m.sender_id;
        if (other) userThreadPartners.add(other);
      }
      const partnerIds = Array.from(userThreadPartners);
      const { data: partnerProfiles } = partnerIds.length
        ? await supabase.from('users').select('id, first_name, last_name').in('id', partnerIds)
        : { data: [] };
      const nameByUserId = new Map(
        (partnerProfiles || []).map((u) => [
          u.id,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Technician',
        ])
      );
      for (const userId of userThreadPartners) {
        const threadMessages = userMessages
          .filter((m) => m.sender_id === userId || m.recipient_id === userId)
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const last = threadMessages[0];
        const unread = threadMessages.filter((m) => m.sender_id !== profile.id && !m.read_at).length;
        const userName = nameByUserId.get(userId) || 'Technician';
        threads.push({
          type: 'user',
          userId,
          userName,
          unreadCount: unread,
          lastMessageAt: last?.created_at || '',
          lastMessagePreview: (last?.body || '').slice(0, 60),
          lastMessageSenderId: last?.sender_id || '',
        });
      }

      threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      return threads;
    },
    enabled: !!profile?.business_id,
  });

  useEffect(() => {
    if (!profile?.business_id) return;
    const channel = supabase
      .channel('direct_messages_threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'threads'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.business_id, queryClient]);

  return {
    threads: query.data ?? [],
    isLoading: query.isLoading,
  };
}
