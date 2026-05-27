import { useEffect, useState } from 'react';
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
import { CustomerWithAddresses } from '@/types/database';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import { usePoolProfile, useUpsertPoolProfile } from '@/hooks/usePoolProfile';
import { useCustomerRouteStop } from '@/hooks/useCustomerRoute';
import { useSaveCustomerRouteAssignment } from '@/hooks/useRoutes';
import {
  customerToFormData,
  formDataToCustomerPayload,
  type CustomerFormData,
} from '@/lib/customer-form';
import {
  defaultPoolProfileFormValues,
  poolProfileToFormData,
  type PoolProfileFormData,
} from '@/lib/pool-profile-form';
import {
  defaultRouteAssignmentFormValues,
  routeStopToAssignmentForm,
  type RouteAssignmentFormData,
} from '@/lib/route-assignment-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithAddresses | null;
}

export function EditCustomerModal({ open, onOpenChange, customer }: EditCustomerModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CustomerFormData | null>(null);
  const [poolProfile, setPoolProfile] = useState<PoolProfileFormData>(defaultPoolProfileFormValues);
  const [routeAssignment, setRouteAssignment] = useState<RouteAssignmentFormData>(
    defaultRouteAssignmentFormValues
  );
  const updateCustomer = useUpdateCustomer();
  const upsertPool = useUpsertPoolProfile();
  const saveRoute = useSaveCustomerRouteAssignment();
  const { data: existingPool } = usePoolProfile(customer?.id);
  const { data: existingStop } = useCustomerRouteStop(customer?.id);

  useEffect(() => {
    if (customer) setFormData(customerToFormData(customer));
  }, [customer]);

  useEffect(() => {
    if (existingPool) setPoolProfile(poolProfileToFormData(existingPool));
    else if (open && customer) setPoolProfile(defaultPoolProfileFormValues);
  }, [existingPool, open, customer]);

  useEffect(() => {
    if (existingStop) setRouteAssignment(routeStopToAssignmentForm(existingStop));
    else if (open) setRouteAssignment(defaultRouteAssignmentFormValues);
  }, [existingStop, open]);

  const isPending = updateCustomer.isPending || upsertPool.isPending || saveRoute.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !formData) return;

    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        ...formDataToCustomerPayload(formData),
      });
      await upsertPool.mutateAsync({ customerId: customer.id, data: poolProfile });
      const minutes = poolProfile.minutes_at_stop?.trim()
        ? parseInt(poolProfile.minutes_at_stop, 10)
        : 15;
      await saveRoute.mutateAsync({
        customer_id: customer.id,
        assignment: routeAssignment,
        est_minutes: Number.isNaN(minutes) ? 15 : minutes,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (!customer || !formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <CustomerFormFields
            value={formData}
            onChange={setFormData}
            disabled={isPending}
            idPrefix="edit"
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
