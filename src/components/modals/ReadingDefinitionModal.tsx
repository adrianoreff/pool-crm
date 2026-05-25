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
import { Label } from '@/components/ui/label';
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
import { READING_TYPE_OPTIONS, slugifyKey } from '@/lib/pool-chemistry-types';
import { DEFAULT_READING_PRESETS } from '@/lib/pool-reading-presets';
import type { ReadingDef } from '@/hooks/usePoolChemistry';
import { X } from 'lucide-react';

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  unit: z.string().optional(),
  readingType: z.string().min(1, 'Reading type is required'),
  customKey: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ReadingDefinitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reading?: ReadingDef | null;
  onSave: (data: {
    key: string;
    label: string;
    unit: string | null;
    preset_values: string[];
  }) => void;
  isSaving?: boolean;
}

export function ReadingDefinitionModal({
  open,
  onOpenChange,
  reading,
  onSave,
  isSaving,
}: ReadingDefinitionModalProps) {
  const isEdit = !!reading;
  const [presets, setPresets] = useState<string[]>([]);
  const [presetInput, setPresetInput] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      unit: '',
      readingType: 'free_chlorine',
      customKey: '',
    },
  });

  const readingType = form.watch('readingType');

  useEffect(() => {
    if (!open) return;
    if (reading) {
      const known = READING_TYPE_OPTIONS.find((o) => o.key === reading.key);
      form.reset({
        description: reading.label,
        unit: reading.unit ?? '',
        readingType: known ? reading.key : 'custom',
        customKey: known ? '' : reading.key,
      });
      setPresets(
        Array.isArray(reading.preset_values) && reading.preset_values.length > 0
          ? (reading.preset_values as string[])
          : DEFAULT_READING_PRESETS[reading.key] ?? []
      );
    } else {
      form.reset({
        description: '',
        unit: '',
        readingType: 'free_chlorine',
        customKey: '',
      });
      setPresets(DEFAULT_READING_PRESETS.free_chlorine);
    }
    setPresetInput('');
  }, [open, reading, form]);

  useEffect(() => {
    if (!open || reading) return;
    const key = readingType === 'custom' ? form.getValues('customKey') : readingType;
    if (key && key !== 'custom' && DEFAULT_READING_PRESETS[key]) {
      setPresets(DEFAULT_READING_PRESETS[key]);
    }
  }, [readingType, open, reading, form]);

  const addPreset = () => {
    const v = presetInput.trim();
    if (!v || presets.includes(v)) return;
    setPresets([...presets, v]);
    setPresetInput('');
  };

  const handleSubmit = (values: FormData) => {
    let key = values.readingType;
    if (values.readingType === 'custom') {
      key = values.customKey?.trim() || slugifyKey(values.description);
    }
    onSave({
      key,
      label: values.description.trim(),
      unit: values.unit?.trim() || null,
      preset_values: presets,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Reading' : 'Add Reading'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                The dosing calculator interprets readings as ppm and degrees as F°. Consider before
                changing UOM.
              </p>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Free Chlorine" {...field} />
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
                      <Input placeholder="ppm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="readingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Reading Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {READING_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {readingType === 'custom' && (
                <FormField
                  control={form.control}
                  name="customKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom key</FormLabel>
                      <FormControl>
                        <Input placeholder="my_reading" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="px-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>

          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-primary border-b pb-2">Values</h3>
            <p className="text-sm text-muted-foreground">
              Tap values technicians scroll through on each visit (Skimmer-style).
            </p>
            <div className="space-y-2">
              <Label>Preset values</Label>
              <div className="flex gap-2">
                <Input
                  value={presetInput}
                  onChange={(e) => setPresetInput(e.target.value)}
                  placeholder="3"
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
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
