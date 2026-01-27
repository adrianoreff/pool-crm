import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  token: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
}

export function useTeamInvitations() {
  const { profile } = useAuth();
  const businessId = profile?.business_id;

  return useQuery({
    queryKey: ['team-invitations', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('business_id', businessId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeamInvitation[];
    },
    enabled: !!businessId,
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile, business } = useAuth();

  return useMutation({
    mutationFn: async ({ invitationId, email, role, password }: {
      invitationId: string;
      email: string;
      role: string;
      password?: string;
    }) => {
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;
      if (!invitation) throw new Error('Invitation not found');

      // If password is provided, create/update user in Auth via Edge Function
      if (password) {
        const { error: createUserError } = await supabase.functions.invoke('create-team-user', {
          body: {
            email,
            password,
            invitationToken: invitation.token,
          },
        });

        if (createUserError) {
          console.error('Error creating user:', createUserError);
          // Continue with email send even if user creation fails
        }
      }

      // Send invitation email
      const loginUrl = role === 'technician' 
        ? `${window.location.origin}/technician/login`
        : `${window.location.origin}/login`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #F97316; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">You've been invited to ${business?.name || 'TradeFlow'}</h1>
          </div>
          <div style="padding: 20px; background: #fff;">
            <p>Hi there,</p>
            <p>You've been invited to join <strong>${business?.name || 'our team'}</strong> as a <strong>${role}</strong>.</p>
            ${password ? `
              <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748B;">Please change your password after first login.</p>
              </div>
            ` : ''}
            <p>Click the button below to accept the invitation and get started:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            ${invitation.expires_at ? `
              <p style="font-size: 12px; color: #64748B; margin-top: 20px;">
                This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}.
              </p>
            ` : ''}
          </div>
        </div>
      `;

      // Send email via Edge Function
      const { error: emailError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'custom_email',
          to: email,
          toName: email.split('@')[0],
          subject: `Invitation to join ${business?.name || 'TradeFlow'}`,
          html: emailHtml,
          businessId: profile?.business_id,
          emailType: 'team_invitation',
          recipientType: 'team_member',
        },
      });

      if (emailError) throw emailError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast({ title: 'Invitation resent successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to resend invitation', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
