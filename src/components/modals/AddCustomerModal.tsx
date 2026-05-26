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
import { useCreateCustomer } from '@/hooks/useCustomers';
import {
  customerFormSchema,
  defaultCustomerFormValues,
  formDataToCustomerPayload,
  type CustomerFormData,
} from '@/lib/customer-form';
import { Loader2 } from 'lucide-react';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCustomerModal({ open, onOpenChange, onSuccess }: AddCustomerModalProps) {
  const createCustomer = useCreateCustomer();
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultCustomerFormValues,
  });

  useEffect(() => {
    if (!open) form.reset(defaultCustomerFormValues);
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await createCustomer.mutateAsync(formDataToCustomerPayload(data));
    onOpenChange(false);
    onSuccess?.();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
            disabled={createCustomer.isPending}
            idPrefix="add"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
