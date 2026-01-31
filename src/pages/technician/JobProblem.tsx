import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PROBLEM_TYPES = [
  { value: 'customer_not_home', label: 'Customer not home' },
  { value: 'no_access', label: 'No access to property' },
  { value: 'need_parts', label: 'Need parts / materials' },
  { value: 'wrong_address', label: 'Wrong address' },
  { value: 'customer_cancelled', label: 'Customer cancelled' },
  { value: 'other', label: 'Other' },
] as const;

export default function JobProblem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: appointment, isLoading } = useAppointment(id || '');

  const [problemType, setProblemType] = useState<string>('');
  const [details, setDetails] = useState('');
  const [cancelJob, setCancelJob] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const typeLabel = PROBLEM_TYPES.find((t) => t.value === problemType)?.label || problemType || 'Problem';
    const problemNote = `[Problem reported] ${typeLabel}${details.trim() ? `: ${details.trim()}` : ''}`;
    const existingNotes = appointment?.technician_notes?.trim() || '';
    const newNotes = existingNotes ? `${existingNotes}\n\n${problemNote}` : problemNote;

    setIsSubmitting(true);
    try {
      const updateData: { technician_notes: string; status?: 'cancelled'; updated_at: string } = {
        technician_notes: newNotes,
        updated_at: new Date().toISOString(),
      };
      if (cancelJob) {
        updateData.status = 'cancelled' as const;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      // When "Report only", notify admins by email and push (fire-and-forget)
      if (!cancelJob) {
        supabase.functions.invoke('send-notification', {
          body: { type: 'admin_job_problem', appointmentId: id },
        }).then(({ error: emailErr }) => {
          if (emailErr) {
            console.error('Admin job problem email failed:', emailErr);
            toast({ title: 'Problem reported', description: 'Office notification could not be sent.', variant: 'destructive' });
          }
        });

        // Send push notification to admins
        (async () => {
          try {
            const { data: recipients } = await supabase
              .from('notification_recipients')
              .select('email')
              .eq('business_id', appointment.business_id)
              .eq('is_active', true);

            if (recipients && recipients.length > 0) {
              const emails = recipients.map(r => r.email);
              const { data: adminUsers } = await supabase
                .from('users')
                .select('id')
                .eq('business_id', appointment.business_id)
                .in('email', emails);

              const customerName = appointment.customer
                ? `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim()
                : 'Customer';

              for (const adminUser of adminUsers || []) {
                await supabase.functions.invoke('send-push-notification', {
                  body: {
                    user_id: adminUser.id,
                    business_id: appointment.business_id,
                    notification_type: 'job_problem',
                    payload: {
                      title: 'Problem reported',
                      body: `${typeLabel} – ${customerName}`,
                      url: `/appointments`,
                    },
                  },
                });
              }
            }
          } catch (pushErr) {
            console.error('Failed to send job problem push:', pushErr);
          }
        })();
      }

      toast({
        title: cancelJob ? 'Job cancelled and problem reported' : 'Problem reported',
        description: cancelJob ? 'The job has been cancelled.' : 'The office will be notified.',
      });
      navigate(`/technician/jobs/${id}`);
    } catch (err) {
      toast({
        title: 'Failed to report problem',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-2">Loading job...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/technician/jobs/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Report a Problem</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {appointment.service?.name || 'Job'} – {appointment.customer ? `${appointment.customer.first_name} ${appointment.customer.last_name}` : 'Customer'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Describe the issue so the office can follow up.
          </p>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Problem type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={problemType} onValueChange={setProblemType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any details (optional)"
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What should happen?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="action"
                checked={!cancelJob}
                onChange={() => setCancelJob(false)}
                className="rounded-full"
              />
              <span>Report only – keep job on schedule (office will decide)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="action"
                checked={cancelJob}
                onChange={() => setCancelJob(true)}
                className="rounded-full"
              />
              <span>Cancel this job</span>
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/technician/jobs/${id}`)}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="flex-1"
            disabled={isSubmitting || !problemType}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Submit report
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
