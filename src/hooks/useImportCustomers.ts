import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CsvCustomerRow } from '@/lib/csv/customer-import';

const BATCH_SIZE = 50;

export function useImportCustomers() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (rows: CsvCustomerRow[]) => {
      if (!profile?.business_id) throw new Error('Business not found');

      const payloads = rows.map((r) => ({
        business_id: profile.business_id,
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        city: r.city,
        state: r.state,
        zip_code: r.zip_code,
        notes: r.notes,
        is_active: r.is_active,
        tags: r.tags,
      }));

      let imported = 0;
      for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
        const chunk = payloads.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('customers').insert(chunk);
        if (error) throw error;
        imported += chunk.length;
      }
      return imported;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
