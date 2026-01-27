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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'dispatcher', 'technician'], {
    required_error: 'Please select a role',
  }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteTeamModal({ open, onOpenChange, onSuccess }: InviteTeamModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'technician',
    },
  });

  const handleSubmit = async (data: InviteFormData) => {
    if (!profile?.business_id || !user?.id) {
      toast({ title: 'Error', description: 'Business not found', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if user already exists in the team
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('business_id', profile.business_id)
        .eq('email', data.email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        toast({ 
          title: 'User Already Exists', 
          description: `${data.email} is already a member of your team.`, 
          variant: 'destructive' 
        });
        setIsSubmitting(false);
        return;
      }

      // Check if there's a pending invitation
      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id, email, expires_at, accepted_at')
        .eq('business_id', profile.business_id)
        .eq('email', data.email.toLowerCase().trim())
        .is('accepted_at', null)
        .maybeSingle();

      if (existingInvitation) {
        const expiresAt = new Date(existingInvitation.expires_at);
        const isExpired = expiresAt < new Date();
        
        if (isExpired) {
          // Delete expired invitation and create a new one
          await supabase
            .from('team_invitations')
            .delete()
            .eq('id', existingInvitation.id);
        } else {
          toast({ 
            title: 'Invitation Already Sent', 
            description: `An invitation has already been sent to ${data.email}. It expires on ${expiresAt.toLocaleDateString()}.`, 
            variant: 'destructive' 
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Create new invitation
      const { error } = await supabase.from('team_invitations').insert({
        business_id: profile.business_id,
        email: data.email.toLowerCase().trim(),
        role: data.role,
        invited_by: user.id,
      });

      if (error) {
        // Handle specific error codes
        if (error.code === '23505') { // Unique violation
          toast({ 
            title: 'Invitation Already Exists', 
            description: `An invitation for ${data.email} already exists. Please wait or delete the existing invitation first.`, 
            variant: 'destructive' 
          });
        } else {
          throw error;
        }
        return;
      }

      toast({ 
        title: 'Invitation Sent', 
        description: `An invitation has been sent to ${data.email}` 
      });
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send invitation', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new team member to your business.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="teammate@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="dispatcher">Dispatcher - Manage appointments</SelectItem>
                      <SelectItem value="technician">Technician - Field worker</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary-hover">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
