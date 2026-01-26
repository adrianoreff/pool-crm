import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsDateRange {
  from: string;
  to: string;
}

export function useAnalytics(dateRange?: AnalyticsDateRange) {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  // Default to current week if no date range provided
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const from = dateRange?.from || weekStart.toISOString().split('T')[0];
  const to = dateRange?.to || now.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['analytics', businessId, from, to],
    queryFn: async () => {
      if (!businessId) return null;

      // Fetch completed appointments with invoices for revenue
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          status,
          source,
          service_id,
          technician_id,
          service:services(name, category:service_categories(name, color))
        `)
        .eq('business_id', businessId)
        .gte('scheduled_date', from)
        .lte('scheduled_date', to);

      if (aptError) throw aptError;

      // Fetch invoices for revenue
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('total, issue_date, status')
        .eq('business_id', businessId)
        .gte('issue_date', from)
        .lte('issue_date', to)
        .eq('status', 'paid');

      if (invError) throw invError;

      // Fetch new customers
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, created_at')
        .eq('business_id', businessId)
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`);

      if (custError) throw custError;

      // Calculate stats
      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const completedJobs = appointments?.filter(a => a.status === 'completed').length || 0;
      const newCustomers = customers?.length || 0;
      const avgJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

      // Revenue by day
      const revenueByDay = new Map<string, number>();
      invoices?.forEach(inv => {
        const day = new Date(inv.issue_date).toLocaleDateString('en-US', { weekday: 'short' });
        revenueByDay.set(day, (revenueByDay.get(day) || 0) + (inv.total || 0));
      });

      // Jobs by service category
      const jobsByCategory = new Map<string, { count: number; color: string }>();
      appointments?.forEach(apt => {
        if (apt.status !== 'cancelled' && apt.service?.category) {
          const catName = apt.service.category.name;
          const existing = jobsByCategory.get(catName) || { count: 0, color: apt.service.category.color || '#888' };
          jobsByCategory.set(catName, { count: existing.count + 1, color: existing.color });
        }
      });

      // Jobs by source
      const jobsBySource = new Map<string, number>();
      appointments?.filter(a => a.status !== 'cancelled').forEach(apt => {
        const source = apt.source || 'manual';
        jobsBySource.set(source, (jobsBySource.get(source) || 0) + 1);
      });

      return {
        stats: {
          totalRevenue,
          completedJobs,
          newCustomers,
          avgJobValue: Math.round(avgJobValue),
        },
        revenueData: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => ({
          name: day,
          value: revenueByDay.get(day) || 0,
        })),
        serviceData: Array.from(jobsByCategory.entries()).map(([name, data]) => ({
          name,
          value: data.count,
          color: data.color,
        })),
        sourceData: [
          { name: 'AI Call', value: jobsBySource.get('ai_call') || 0, color: '#F97316' },
          { name: 'Widget', value: jobsBySource.get('widget') || 0, color: '#3B82F6' },
          { name: 'Manual', value: jobsBySource.get('manual') || 0, color: '#8B5CF6' },
          { name: 'Phone', value: jobsBySource.get('phone') || 0, color: '#10B981' },
        ].filter(s => s.value > 0),
      };
    },
    enabled: !!businessId,
  });
}
