import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomerFormFields } from '@/components/customers/CustomerFormFields';
import { PoolInfoSection } from '@/components/customers/PoolInfoSection';
import { RouteAssignmentSection } from '@/components/customers/RouteAssignmentSection';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useUpsertPoolProfile } from '@/hooks/usePoolProfile';
import { useSaveCustomerRouteAssignment } from '@/hooks/useRoutes';
import {
  customerFormSchema,
  defaultCustomerFormValues,
  formDataToCustomerPayload,
  type CustomerFormData,
} from '@/lib/customer-form';
import {
  defaultPoolProfileFormValues,
  type PoolProfileFormData,
} from '@/lib/pool-profile-form';
import {
  defaultRouteAssignmentFormValues,
  isRouteAssignmentComplete,
  type RouteAssignmentFormData,
} from '@/lib/route-assignment-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCustomerModal({ open, onOpenChange, onSuccess }: AddCustomerModalProps) {
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const upsertPool = useUpsertPoolProfile();
  const saveRoute = useSaveCustomerRouteAssignment();
  const [poolProfile, setPoolProfile] = useState<PoolProfileFormData>(defaultPoolProfileFormValues);
  const [routeAssignment, setRouteAssignment] = useState<RouteAssignmentFormData>(
    defaultRouteAssignmentFormValues
  );

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultCustomerFormValues,
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaultCustomerFormValues);
      setPoolProfile(defaultPoolProfileFormValues);
      setRouteAssignment(defaultRouteAssignmentFormValues);
    }
  }, [open, form]);

  const isPending = createCustomer.isPending || upsertPool.isPending || saveRoute.isPending;

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const customer = await createCustomer.mutateAsync(formDataToCustomerPayload(data));
      await upsertPool.mutateAsync({ customerId: customer.id, data: poolProfile });
      if (isRouteAssignmentComplete(routeAssignment)) {
        const minutes = poolProfile.minutes_at_stop?.trim()
          ? parseInt(poolProfile.minutes_at_stop, 10)
          : 15;
        await saveRoute.mutateAsync({
          customer_id: customer.id,
          assignment: routeAssignment,
          est_minutes: Number.isNaN(minutes) ? 15 : minutes,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({
        title: 'Could not create customer',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <CustomerFormFields
            value={form.watch()}
            onChange={(next) => {
              (Object.keys(next) as Array<keyof CustomerFormData>).forEach((key) => {
                form.setValue(key, next[key], { shouldValidate: true });
              });
            }}
            disabled={isPending}
            idPrefix="add"
          />
          <PoolInfoSection value={poolProfile} onChange={setPoolProfile} disabled={isPending} />
          <RouteAssignmentSection
            value={routeAssignment}
            onChange={setRouteAssignment}
            disabled={isPending}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
