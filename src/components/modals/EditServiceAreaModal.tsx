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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Plus } from 'lucide-react';
import { ServiceAreaWithTechnician } from '@/types/database';
import { useTechnicians } from '@/hooks/useTeam';
import { useBusiness } from '@/hooks/useBusiness';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';

interface EditServiceAreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceArea: ServiceAreaWithTechnician | null;
}

export function EditServiceAreaModal({ open, onOpenChange, serviceArea }: EditServiceAreaModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    zip_codes: [] as string[],
    default_technician_id: '',
    travel_surcharge: '',
  });
  const [newZipCode, setNewZipCode] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: technicians = [] } = useTechnicians();
  const { data: business } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapboxToken = business?.mapbox_public_token;

  useEffect(() => {
    if (serviceArea) {
      setFormData({
        name: serviceArea.name || '',
        zip_codes: serviceArea.zip_codes || [],
        default_technician_id: serviceArea.default_technician_id || '',
        travel_surcharge: serviceArea.travel_surcharge?.toString() || '',
      });
    }
  }, [serviceArea]);

  const handleAddZipCode = () => {
    const trimmed = newZipCode.trim();
    if (trimmed && !formData.zip_codes.includes(trimmed)) {
      setFormData({ ...formData, zip_codes: [...formData.zip_codes, trimmed] });
      setNewZipCode('');
    }
  };

  const handleRemoveZipCode = (zip: string) => {
    setFormData({ ...formData, zip_codes: formData.zip_codes.filter(z => z !== zip) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceArea) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_areas')
        .update({
          name: formData.name,
          zip_codes: formData.zip_codes,
          default_technician_id: formData.default_technician_id === 'none' ? null : formData.default_technician_id || null,
          travel_surcharge: formData.travel_surcharge ? parseFloat(formData.travel_surcharge) : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceArea.id);

      if (error) throw error;

      toast({ title: 'Service area updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['service-areas'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to update service area', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!serviceArea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Service Area</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Area Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Zip Codes</Label>
            {mapboxToken && (
              <div className="mb-2">
                <AddressAutocomplete
                  value={addressSearch}
                  onChange={setAddressSearch}
                  onAddressSelect={(address) => {
                    if (address.zipCode && !formData.zip_codes.includes(address.zipCode)) {
                      setFormData({ ...formData, zip_codes: [...formData.zip_codes, address.zipCode] });
                    }
                    setAddressSearch('');
                  }}
                  mapboxToken={mapboxToken}
                  placeholder="Search address to add zip code..."
                />
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newZipCode}
                onChange={(e) => setNewZipCode(e.target.value)}
                placeholder="Or enter zip code manually"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddZipCode();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddZipCode}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.zip_codes.map((zip) => (
                <Badge key={zip} variant="secondary" className="gap-1">
                  {zip}
                  <button
                    type="button"
                    onClick={() => handleRemoveZipCode(zip)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default Technician</Label>
            <Select
              value={formData.default_technician_id || 'none'}
              onValueChange={(v) => setFormData({ ...formData, default_technician_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surcharge">Travel Surcharge ($)</Label>
            <Input
              id="surcharge"
              type="number"
              step="0.01"
              min="0"
              value={formData.travel_surcharge}
              onChange={(e) => setFormData({ ...formData, travel_surcharge: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
