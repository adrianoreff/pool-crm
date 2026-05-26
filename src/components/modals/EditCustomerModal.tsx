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
import { CustomerWithAddresses } from '@/types/database';
import { useUpdateCustomer } from '@/hooks/useCustomers';
import {
  customerToFormData,
  formDataToCustomerPayload,
  type CustomerFormData,
} from '@/lib/customer-form';
import { Loader2 } from 'lucide-react';

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithAddresses | null;
}

export function EditCustomerModal({ open, onOpenChange, customer }: EditCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData | null>(null);
  const updateCustomer = useUpdateCustomer();

  useEffect(() => {
    if (customer) setFormData(customerToFormData(customer));
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !formData) return;

    updateCustomer.mutate(
      { id: customer.id, ...formDataToCustomerPayload(formData) },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  if (!customer || !formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <CustomerFormFields
            value={formData}
            onChange={setFormData}
            disabled={updateCustomer.isPending}
            idPrefix="edit"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
