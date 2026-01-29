import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Business, OperatingHour, BookingRule, NotificationSetting, WidgetConfig } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useBusiness() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      return data as Business;
    },
    enabled: !!businessId,
  });
}

export function useOperatingHours() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['operating-hours', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('business_id', businessId);

      if (error) throw error;
      return data as OperatingHour[];
    },
    enabled: !!businessId,
  });
}

export function useBookingRules() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['booking-rules', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from('booking_rules')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return data as BookingRule | null;
    },
    enabled: !!businessId,
  });
}

export function useNotificationSettings() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['notification-settings', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationSetting | null;
    },
    enabled: !!businessId,
  });
}

export function useWidgetConfig() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['widget-config', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from('widget_config')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return data as WidgetConfig | null;
    },
    enabled: !!businessId,
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<{
      name: string;
      phone: string;
      email: string;
      website: string;
      address: string;
      city: string;
      state: string;
      zip_code: string;
      logo_url: string | null;
      vapi_assistant_id: string | null;
      mapbox_public_token: string | null;
    }>) => {
      const { error } = await supabase
        .from('businesses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile!.business_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      refreshProfile();
      toast({ title: 'Settings updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update settings', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBookingRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<BookingRule>) => {
      const { error } = await supabase
        .from('booking_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('business_id', profile!.business_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-rules'] });
      toast({ title: 'Booking rules updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update booking rules', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<NotificationSetting>) => {
      const { error } = await supabase
        .from('notification_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('business_id', profile!.business_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Notification settings updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update notification settings', description: error.message, variant: 'destructive' });
    },
  });
}
