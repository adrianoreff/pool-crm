import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  POOL_TYPES,
  SANITIZER_TYPES,
  RATE_TYPES,
  type PoolProfileFormData,
} from '@/lib/pool-profile-form';

interface PoolInfoSectionProps {
  value: PoolProfileFormData;
  onChange: (next: PoolProfileFormData) => void;
  disabled?: boolean;
}

export function PoolInfoSection({ value, onChange, disabled }: PoolInfoSectionProps) {
  const set = <K extends keyof PoolProfileFormData>(key: K, val: PoolProfileFormData[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Pool Info</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose the bodies of water you take readings for. More can be added later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pool style</Label>
          <Select
            value={value.pool_type || 'none'}
            onValueChange={(v) => set('pool_type', v === 'none' ? '' : v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {POOL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sanitizer</Label>
          <Select
            value={value.sanitizer_type || 'none'}
            onValueChange={(v) => set('sanitizer_type', v === 'none' ? '' : v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Salt or chlorine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {SANITIZER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="has_pool">Pool</Label>
          <Switch
            id="has_pool"
            checked={value.has_pool}
            onCheckedChange={(c) => set('has_pool', c)}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="has_spa">Spa</Label>
          <Switch
            id="has_spa"
            checked={value.has_spa}
            onCheckedChange={(c) => set('has_spa', c)}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="has_water_feature">Water Feature</Label>
          <Switch
            id="has_water_feature"
            checked={value.has_water_feature}
            onCheckedChange={(c) => set('has_water_feature', c)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rate</Label>
          <Input
            type="number"
            step="0.01"
            value={value.service_rate}
            onChange={(e) => set('service_rate', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Rate type</Label>
          <Select
            value={value.service_rate_type || 'none'}
            onValueChange={(v) => set('service_rate_type', v === 'none' ? '' : v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_TYPES.map((t) => (
                <SelectItem key={t.value || 'none'} value={t.value || 'none'}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Labor cost</Label>
          <Input
            type="number"
            step="0.01"
            value={value.labor_cost}
            onChange={(e) => set('labor_cost', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Labor cost type</Label>
          <Select
            value={value.labor_cost_type || 'none'}
            onValueChange={(v) => set('labor_cost_type', v === 'none' ? '' : v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_TYPES.map((t) => (
                <SelectItem key={t.value || 'none'} value={t.value || 'none'}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Minutes at stop</Label>
        <Input
          type="number"
          min={1}
          placeholder="15"
          value={value.minutes_at_stop}
          onChange={(e) => set('minutes_at_stop', e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank for default of 15 minutes. Used to calculate route time.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Location notes</Label>
        <Textarea
          value={value.location_notes}
          onChange={(e) => set('location_notes', e.target.value)}
          rows={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
