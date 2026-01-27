import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Invoice, InvoiceWithItems, InvoiceStatus } from '@/types/database';
import { toast } from 'sonner';

export function useInvoices() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['invoices', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, phone)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });
}

export function useInvoice(id: string) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          invoice_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as InvoiceWithItems;
    },
    enabled: !!businessId && !!id,
  });
}

export function useInvoiceStats() {
  const { data: invoices, isLoading } = useInvoices();

  const stats = invoices ? {
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total || 0), 0),
    pendingAmount: invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + Number(i.total || 0), 0),
    overdueAmount: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + Number(i.total || 0), 0),
    paidThisMonth: invoices.filter(i => {
      if (i.status !== 'paid' || !i.paid_at) return false;
      const paidDate = new Date(i.paid_at);
      const now = new Date();
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    }).reduce((sum, i) => sum + Number(i.total || 0), 0),
    totalCount: invoices.length,
    draftCount: invoices.filter(i => i.status === 'draft').length,
    sentCount: invoices.filter(i => i.status === 'sent').length,
    paidCount: invoices.filter(i => i.status === 'paid').length,
    overdueCount: invoices.filter(i => i.status === 'overdue').length,
  } : {
    totalRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    totalCount: 0,
    draftCount: 0,
    sentCount: 0,
    paidCount: 0,
    overdueCount: 0,
  };

  return { stats, isLoading };
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, paidAt }: { id: string; status: InvoiceStatus; paidAt?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (paidAt) {
        updateData.paid_at = paidAt;
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update invoice', { description: error.message });
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (invoiceData: {
      customer_id: string;
      appointment_id?: string;
      subtotal: number;
      tax_rate?: number;
      tax_amount?: number;
      discount_amount?: number;
      total: number;
      due_date?: string;
      notes?: string;
    }) => {
      if (!profile?.business_id) throw new Error('No business ID');

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          business_id: profile.business_id,
          ...invoiceData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create invoice', { description: error.message });
    },
  });
}
