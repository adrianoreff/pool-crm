import { z } from 'zod';
import type { CustomerDisplayStatus } from '@/lib/customer-status';

export const customerFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  gate_code: z.string().max(100).optional(),
  dog_name: z.string().max(100).optional(),
  customer_status: z.enum(['active', 'lead', 'inactive']),
  tags: z.array(z.string().max(50)).max(20),
  notes: z.string().max(1000).optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

export const defaultCustomerFormValues: CustomerFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  gate_code: '',
  dog_name: '',
  customer_status: 'active',
  tags: [],
  notes: '',
};

export function customerToFormData(customer: {
  first_name: string;
  last_name?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  gate_code?: string | null;
  dog_name?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  customer_status?: string | null;
  is_active?: boolean | null;
}): CustomerFormData {
  let status: CustomerDisplayStatus = 'active';
  if (customer.customer_status === 'active' || customer.customer_status === 'lead' || customer.customer_status === 'inactive') {
    status = customer.customer_status;
  } else if (customer.is_active === false) {
    status = 'inactive';
  }

  return {
    first_name: customer.first_name || '',
    last_name: customer.last_name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    city: customer.city || '',
    state: customer.state || '',
    zip_code: customer.zip_code || '',
    gate_code: customer.gate_code || '',
    dog_name: customer.dog_name || '',
    customer_status: status,
    tags: customer.tags ?? [],
    notes: customer.notes || '',
  };
}

export function formDataToCustomerPayload(data: CustomerFormData) {
  return {
    first_name: data.first_name,
    last_name: data.last_name || null,
    phone: data.phone,
    email: data.email || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zip_code: data.zip_code || null,
    gate_code: data.gate_code?.trim() || null,
    dog_name: data.dog_name?.trim() || null,
    customer_status: data.customer_status,
    is_active: data.customer_status !== 'inactive',
    tags: data.tags.length > 0 ? data.tags : null,
    notes: data.notes || null,
  };
}
