import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPanel() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState('');
  const [woTitle, setWoTitle] = useState('');
  const [woCustomer, setWoCustomer] = useState('');

  const { data: shopping = [] } = useQuery({
    queryKey: ['pool-shopping', profile?.business_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_shopping_items')
        .select('*, added_by_user:users(first_name, last_name)')
        .eq('business_id', profile!.business_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.business_id,
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['pool-work-orders', profile?.business_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_work_orders')
        .select('*, customer:customers(first_name, last_name)')
        .eq('business_id', profile!.business_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.business_id,
  });

  const addShopping = useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase.from('pool_shopping_items').insert({
        business_id: profile!.business_id,
        label,
        added_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-shopping'] });
      setNewItem('');
    },
  });

  const togglePurchased = useMutation({
    mutationFn: async ({ id, purchased }: { id: string; purchased: boolean }) => {
      const { error } = await supabase
        .from('pool_shopping_items')
        .update({
          is_purchased: purchased,
          purchased_at: purchased ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool-shopping'] }),
  });

  const addWorkOrder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pool_work_orders').insert({
        business_id: profile!.business_id,
        customer_id: woCustomer,
        title: woTitle,
        work_type: 'repair',
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pool-work-orders'] });
      setWoTitle('');
      toast({ title: 'Work order created' });
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list-mini', profile?.business_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('business_id', profile!.business_id)
        .eq('is_active', true)
        .limit(200);
      return data || [];
    },
    enabled: !!profile?.business_id,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <Tabs defaultValue="shopping">
        <TabsList>
          <TabsTrigger value="shopping">Shopping List</TabsTrigger>
          <TabsTrigger value="workorders">Work Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="shopping">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Shopping List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Liquid Chlorine - 10 gallons"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                />
                <Button onClick={() => newItem && addShopping.mutate(newItem)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {shopping.map((item: {
                  id: string;
                  label: string;
                  is_purchased: boolean;
                  added_by_user?: { first_name: string | null; last_name: string | null };
                }) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.is_purchased ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                      />
                      <span>{item.label}</span>
                      {item.added_by_user && (
                        <span className="text-xs text-muted-foreground">
                          (added by {item.added_by_user.first_name})
                        </span>
                      )}
                    </div>
                    {!item.is_purchased && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          togglePurchased.mutate({ id: item.id, purchased: true })
                        }
                      >
                        Mark purchased
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="workorders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={woCustomer}
                  onChange={(e) => setWoCustomer(e.target.value)}
                >
                  <option value="">Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Title e.g. filter clean"
                  value={woTitle}
                  onChange={(e) => setWoTitle(e.target.value)}
                />
                <Button
                  onClick={() => woCustomer && woTitle && addWorkOrder.mutate()}
                  disabled={!woCustomer || !woTitle}
                >
                  Add
                </Button>
              </div>
              {workOrders.map((wo: {
                id: string;
                title: string;
                work_type: string;
                description: string | null;
                customer?: { first_name: string; last_name: string | null };
              }) => (
                <div key={wo.id} className="border rounded-lg p-4">
                  <Badge className="mb-2">{wo.work_type}</Badge>
                  <p className="font-medium">{wo.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {wo.customer?.first_name} {wo.customer?.last_name}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
