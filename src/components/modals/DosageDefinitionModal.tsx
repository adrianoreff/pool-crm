import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { slugifyKey } from '@/lib/pool-chemistry-types';
import type { DosageDef } from '@/hooks/usePoolChemistry';
import { X } from 'lucide-react';

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  unit: z.string().optional(),
  direction: z.enum(['none', 'up', 'down']),
});

type FormData = z.infer<typeof schema>;

interface DosageDefinitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dosage?: DosageDef | null;
  onSave: (data: {
    key: string;
    label: string;
    unit: string | null;
    direction: string | null;
    preset_values: string[];
  }) => void;
  isSaving?: boolean;
}

export function DosageDefinitionModal({
  open,
  onOpenChange,
  dosage,
  onSave,
  isSaving,
}: DosageDefinitionModalProps) {
  const isEdit = !!dosage;
  const [presets, setPresets] = useState<string[]>([]);
  const [presetInput, setPresetInput] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      unit: '',
      direction: 'none',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (dosage) {
      form.reset({
        description: dosage.label,
        unit: dosage.unit ?? '',
        direction: (dosage.direction as 'up' | 'down') ?? 'none',
      });
      setPresets(Array.isArray(dosage.preset_values) ? (dosage.preset_values as string[]) : []);
    } else {
      form.reset({ description: '', unit: '', direction: 'none' });
      setPresets([]);
    }
    setPresetInput('');
  }, [open, dosage, form]);

  const addPreset = () => {
    const v = presetInput.trim();
    if (!v || presets.includes(v)) return;
    setPresets([...presets, v]);
    setPresetInput('');
  };

  const handleSubmit = (values: FormData) => {
    const key = dosage?.key ?? slugifyKey(values.description);
    onSave({
      key,
      label: values.description.trim(),
      unit: values.unit?.trim() || null,
      direction: values.direction === 'none' ? null : values.direction,
      preset_values: presets,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Dosage' : 'Add Dosage'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Liquid Chlorine" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UOM</FormLabel>
                  <FormControl>
                    <Input placeholder="gal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction (optional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="up">↑ Up</SelectItem>
                      <SelectItem value="down">↓ Down</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Preset values</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={presetInput}
                  onChange={(e) => setPresetInput(e.target.value)}
                  placeholder="½"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPreset();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addPreset}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <Badge key={p} variant="secondary" className="gap-1">
                    {p}
                    <button type="button" onClick={() => setPresets(presets.filter((x) => x !== p))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
