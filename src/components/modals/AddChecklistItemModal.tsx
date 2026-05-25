import { useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createChecklistItem } from '@/lib/service-checklist-utils';
import type { ServiceChecklistItem } from '@/types/service-checklist';

const checklistItemSchema = z
  .object({
    description: z.string().min(1, 'Description is required'),
    descriptionWhenComplete: z.string().min(1, 'Description when complete is required'),
    frequencyType: z.enum(['every_stop', 'interval']),
    intervalCount: z.coerce.number().min(1).max(99),
    intervalUnit: z.enum(['week', 'month']),
    startOn: z.enum(['next_stop']),
    requireToFinishStop: z.boolean(),
    requirePhoto: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.frequencyType === 'interval' && data.intervalCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Interval must be at least 1',
        path: ['intervalCount'],
      });
    }
  });

type ChecklistItemFormData = z.infer<typeof checklistItemSchema>;

interface AddChecklistItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ServiceChecklistItem | null;
  sortOrder?: number;
  onSave: (item: ServiceChecklistItem) => void;
}

export function AddChecklistItemModal({
  open,
  onOpenChange,
  item,
  sortOrder = 0,
  onSave,
}: AddChecklistItemModalProps) {
  const isEdit = !!item;

  const form = useForm<ChecklistItemFormData>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      description: '',
      descriptionWhenComplete: '',
      frequencyType: 'every_stop',
      intervalCount: 1,
      intervalUnit: 'month',
      startOn: 'next_stop',
      requireToFinishStop: false,
      requirePhoto: false,
    },
  });

  const frequencyType = form.watch('frequencyType');

  useEffect(() => {
    if (!open) return;
    if (item) {
      form.reset({
        description: item.description,
        descriptionWhenComplete: item.descriptionWhenComplete,
        frequencyType: item.frequencyType,
        intervalCount: item.intervalCount,
        intervalUnit: item.intervalUnit,
        startOn: item.startOn,
        requireToFinishStop: item.requireToFinishStop,
        requirePhoto: item.requirePhoto,
      });
    } else {
      form.reset({
        description: '',
        descriptionWhenComplete: '',
        frequencyType: 'every_stop',
        intervalCount: 1,
        intervalUnit: 'month',
        startOn: 'next_stop',
        requireToFinishStop: false,
        requirePhoto: false,
      });
    }
  }, [open, item, form]);

  const handleSubmit = (values: ChecklistItemFormData) => {
    const saved = createChecklistItem({
      id: item?.id,
      description: values.description,
      descriptionWhenComplete: values.descriptionWhenComplete,
      frequencyType: values.frequencyType,
      intervalCount: values.intervalCount,
      intervalUnit: values.intervalUnit,
      startOn: values.startOn,
      requireToFinishStop: values.requireToFinishStop,
      requirePhoto: values.requirePhoto,
      sortOrder: item?.sortOrder ?? sortOrder,
    });
    onSave(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Checklist Item' : 'Add Checklist Item'}</DialogTitle>
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
                    <Input placeholder="Skim Surface" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descriptionWhenComplete"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description When Complete <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Skimmed Surface" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Frequency</FormLabel>
              <FormField
                control={form.control}
                name="frequencyType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="every_stop" id="freq-every-stop" />
                          <label htmlFor="freq-every-stop" className="text-sm cursor-pointer">
                            Due every time stop is performed
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <RadioGroupItem value="interval" id="freq-interval" />
                          <label htmlFor="freq-interval" className="text-sm cursor-pointer">
                            Due Every
                          </label>
                          <FormField
                            control={form.control}
                            name="intervalCount"
                            render={({ field: countField }) => (
                              <Input
                                type="number"
                                min={1}
                                max={99}
                                className="w-16 h-8"
                                disabled={frequencyType !== 'interval'}
                                {...countField}
                              />
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="intervalUnit"
                            render={({ field: unitField }) => (
                              <Select
                                value={unitField.value}
                                onValueChange={unitField.onChange}
                                disabled={frequencyType !== 'interval'}
                              >
                                <SelectTrigger className="w-28 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="week">Week(s)</SelectItem>
                                  <SelectItem value="month">Month(s)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <span className="text-sm text-muted-foreground">
                            after checklist item is complete
                          </span>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start On</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="next_stop">Next Stop</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requireToFinishStop"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Require checklist item to finish stop
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirePhoto"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Require photo to complete checklist item
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
