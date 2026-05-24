import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete, AddressResult } from '@/components/ui/address-autocomplete';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, KeyRound, Dog } from 'lucide-react';
import { CustomerWithAddresses } from '@/types/database';
import { useUpdateCustomer } from '@/hooks/useCustomers';

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithAddresses | null;
}

export function EditCustomerModal({ open, onOpenChange, customer }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    notes: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    gate_code: '',
    dog_name: '',
  });

  const updateCustomer = useUpdateCustomer();

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip_code: customer.zip_code || '',
        gate_code: customer.gate_code || '',
        dog_name: customer.dog_name || '',
      });
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    updateCustomer.mutate(
      {
        id: customer.id,
        ...formData,
        gate_code: formData.gate_code.trim() || null,
        dog_name: formData.dog_name.trim() || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              id="address"
              value={formData.address}
              onChange={(value) => setFormData({ ...formData, address: value })}
              onAddressSelect={(result: AddressResult) => {
                setFormData({
                  ...formData,
                  address: result.address,
                  city: result.city || formData.city,
                  state: result.state || formData.state,
                  zip_code: result.zipCode || formData.zip_code,
                });
              }}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="San Diego"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="CA"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="92101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gate_code" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Gate code
              </Label>
              <Input
                id="gate_code"
                value={formData.gate_code}
                onChange={(e) => setFormData({ ...formData, gate_code: e.target.value })}
                placeholder="#1234 or access notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dog_name" className="flex items-center gap-1.5">
                <Dog className="h-3.5 w-3.5" />
                Dog&apos;s name
              </Label>
              <Input
                id="dog_name"
                value={formData.dog_name}
                onChange={(e) => setFormData({ ...formData, dog_name: e.target.value })}
                placeholder="e.g. Max"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

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
