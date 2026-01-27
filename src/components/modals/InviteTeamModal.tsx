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
      setPassword: false,
      password: '',
    },
  });

  const setPassword = form.watch('setPassword');

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
      const { data: newInvitation, error } = await supabase
        .from('team_invitations')
        .insert({
          business_id: profile.business_id,
          email: data.email.toLowerCase().trim(),
          role: data.role,
          invited_by: user.id,
        })
        .select()
        .single();

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

      // If password is set, create user in Auth via Edge Function
      if (data.setPassword && data.password) {
        try {
          const { error: createUserError } = await supabase.functions.invoke('create-team-user', {
            body: {
              email: data.email.toLowerCase().trim(),
              password: data.password,
              invitationToken: newInvitation.token,
            },
          });

          if (createUserError) {
            console.error('Error creating user:', createUserError);
            toast({
              title: 'Warning',
              description: 'Invitation created but user account setup had issues. You may need to create the account manually.',
              variant: 'destructive',
            });
          }
        } catch (authError: any) {
          console.error('Auth error:', authError);
          // Continue with invitation even if auth creation fails
          toast({
            title: 'Warning',
            description: 'Invitation created but user account setup had issues. You may need to create the account manually.',
            variant: 'destructive',
          });
        }
      }

      // Send invitation email
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', profile.business_id)
          .single();

        const loginUrl = data.role === 'technician' 
          ? `${window.location.origin}/technician/login`
          : `${window.location.origin}/login`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #F97316; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">You've been invited to ${business?.name || 'TradeFlow'}</h1>
            </div>
            <div style="padding: 20px; background: #fff;">
              <p>Hi there,</p>
              <p>You've been invited to join <strong>${business?.name || 'our team'}</strong> as a <strong>${data.role}</strong>.</p>
              ${data.setPassword && data.password ? `
                <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #E2E8F0;">
                  <p style="margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
                  <p style="margin: 5px 0;"><strong>Password:</strong> ${data.password}</p>
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748B;">⚠️ Please change your password after first login for security.</p>
                </div>
              ` : `
                <p>You'll need to set up your account when you accept the invitation.</p>
              `}
              <p>Click the button below to accept the invitation and get started:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                  Accept Invitation
                </a>
              </div>
              ${newInvitation.expires_at ? `
                <p style="font-size: 12px; color: #64748B; margin-top: 20px; text-align: center;">
                  This invitation expires on ${new Date(newInvitation.expires_at).toLocaleDateString()}.
                </p>
              ` : ''}
            </div>
          </div>
        `;

        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'custom_email',
            to: data.email.toLowerCase().trim(),
            toName: data.email.split('@')[0],
            subject: `Invitation to join ${business?.name || 'TradeFlow'}`,
            html: emailHtml,
            businessId: profile.business_id,
            emailType: 'team_invitation',
            recipientType: 'team_member',
          },
        });
      } catch (emailError: any) {
        console.error('Email send error:', emailError);
        // Don't fail the whole operation if email fails
        toast({
          title: 'Invitation Created',
          description: `Invitation created but email failed to send: ${emailError.message}. You may need to send it manually.`,
          variant: 'destructive',
        });
      }

      toast({ 
        title: 'Invitation Sent', 
        description: `An invitation email has been sent to ${data.email}` 
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
                    <FormLabel>Set temporary password</FormLabel>
                    <FormDescription>
                      Create account with temporary password. User will be prompted to change it on first login.
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
                    <FormLabel>Temporary Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter temporary password (min 6 characters)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      This password will be sent via email. User must change it on first login.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
