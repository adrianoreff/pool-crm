import { KeyRound, Dog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddressAutocomplete, AddressResult } from '@/components/ui/address-autocomplete';
import { TagsInput } from '@/components/customers/TagsInput';
import { CUSTOMER_STATUS_LABELS } from '@/lib/customer-status';
import type { CustomerFormData } from '@/lib/customer-form';

interface CustomerFormFieldsProps {
  value: CustomerFormData;
  onChange: (next: CustomerFormData) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function CustomerFormFields({
  value,
  onChange,
  disabled,
  idPrefix = '',
}: CustomerFormFieldsProps) {
  const pid = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);
  const set = <K extends keyof CustomerFormData>(key: K, val: CustomerFormData[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={pid('first_name')}>First Name *</Label>
          <Input
            id={pid('first_name')}
            value={value.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            required
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={pid('last_name')}>Last Name</Label>
          <Input
            id={pid('last_name')}
            value={value.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={pid('phone')}>Phone *</Label>
        <Input
          id={pid('phone')}
          type="tel"
          value={value.phone}
          onChange={(e) => set('phone', e.target.value)}
          required
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={pid('email')}>Email</Label>
        <Input
          id={pid('email')}
          type="email"
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={pid('address')}>Address</Label>
        <AddressAutocomplete
          id={pid('address')}
          value={value.address}
          onChange={(v) => set('address', v)}
          onAddressSelect={(result: AddressResult) => {
            onChange({
              ...value,
              address: result.address,
              city: result.city || value.city,
              state: result.state || value.state,
              zip_code: result.zipCode || value.zip_code,
            });
          }}
          placeholder="123 Main St"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={pid('city')}>City</Label>
          <Input
            id={pid('city')}
            value={value.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="San Diego"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={pid('state')}>State</Label>
          <Input
            id={pid('state')}
            value={value.state}
            onChange={(e) => set('state', e.target.value)}
            placeholder="CA"
            maxLength={2}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={pid('zip_code')}>ZIP Code</Label>
          <Input
            id={pid('zip_code')}
            value={value.zip_code}
            onChange={(e) => set('zip_code', e.target.value)}
            placeholder="92101"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={pid('gate_code')} className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Gate code
          </Label>
          <Input
            id={pid('gate_code')}
            value={value.gate_code}
            onChange={(e) => set('gate_code', e.target.value)}
            placeholder="#1234 or access notes"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={pid('dog_name')} className="flex items-center gap-1.5">
            <Dog className="h-3.5 w-3.5" />
            Dog&apos;s name
          </Label>
          <Input
            id={pid('dog_name')}
            value={value.dog_name}
            onChange={(e) => set('dog_name', e.target.value)}
            placeholder="e.g. Max"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={pid('customer_status')}>Status</Label>
        <Select
          value={value.customer_status}
          onValueChange={(v) => set('customer_status', v as CustomerFormData['customer_status'])}
          disabled={disabled}
        >
          <SelectTrigger id={pid('customer_status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CUSTOMER_STATUS_LABELS) as Array<keyof typeof CUSTOMER_STATUS_LABELS>).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {CUSTOMER_STATUS_LABELS[key]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagsInput
          value={value.tags}
          onChange={(tags) => set('tags', tags)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={pid('notes')}>Notes</Label>
        <Textarea
          id={pid('notes')}
          value={value.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
