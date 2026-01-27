import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useResendInvitation } from '@/hooks/useTeamInvitations';
import { Loader2 } from 'lucide-react';

const resendSchema = z.object({
  setPassword: z.boolean().default(false),
  password: z.string().optional(),
}).refine((data) => {
  if (data.setPassword) {
    return data.password && data.password.length >= 6;
  }
  return true;
}, {
  message: 'Password must be at least 6 characters',
  path: ['password'],
});

type ResendFormData = z.infer<typeof resendSchema>;

interface ResendInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitationId: string;
  email: string;
  role: string;
}

export function ResendInvitationModal({ 
  open, 
  onOpenChange, 
  invitationId, 
  email, 
  role 
}: ResendInvitationModalProps) {
  const { toast } = useToast();
  const resendInvitation = useResendInvitation();

  const form = useForm<ResendFormData>({
    resolver: zodResolver(resendSchema),
    defaultValues: {
      setPassword: false,
      password: '',
    },
  });

  const setPassword = form.watch('setPassword');

  const handleSubmit = async (data: ResendFormData) => {
    try {
      await resendInvitation.mutateAsync({
        invitationId,
        email,
        role,
        password: data.setPassword ? data.password : undefined,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resend Invitation</DialogTitle>
          <DialogDescription>
            Resend invitation email to {email}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="setPassword"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set/Update password</FormLabel>
                    <FormDescription>
                      Optionally set or update the user's password
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            {setPassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter password (min 6 characters)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resendInvitation.isPending}>
                {resendInvitation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
