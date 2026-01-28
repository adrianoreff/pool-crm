import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import { useJobChecklist } from '@/hooks/useJobChecklist';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Camera, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function CompleteJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(id || '');
  const { progress, checklistTemplate } = useJobChecklist(id || '', appointment?.service_id || null);
  const { uploadPhoto, isUploading } = usePhotoUpload();

  const [workSummary, setWorkSummary] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [timeSpentHours, setTimeSpentHours] = useState('');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate time spent from started_at
  const calculatedTime = useMemo(() => {
    if (!appointment?.started_at) return null;
    const started = new Date(appointment.started_at);
    const now = new Date();
    const diffMs = now.getTime() - started.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return { hours, minutes };
  }, [appointment?.started_at]);

  // Set calculated time on mount
  useEffect(() => {
    if (calculatedTime && !timeSpentHours && !timeSpentMinutes) {
      setTimeSpentHours(calculatedTime.hours.toString());
      setTimeSpentMinutes(calculatedTime.minutes.toString());
    }
  }, [calculatedTime]);

  if (isLoadingAppointment || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const result = await uploadPhoto(file, id);
    if (result) {
      setPhotos([...photos, result.url]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workSummary.trim()) {
      toast({
        title: 'Work summary is required',
        variant: 'destructive',
      });
      return;
    }

    if (!id) return;

    setIsSubmitting(true);

    try {
      // Calculate time spent in minutes
      const hours = parseInt(timeSpentHours) || 0;
      const minutes = parseInt(timeSpentMinutes) || 0;
      const timeSpentTotalMinutes = hours * 60 + minutes;

      // Update appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          work_summary: workSummary,
          technician_notes: technicianNotes,
          completed_at: new Date().toISOString(),
          time_spent_minutes: timeSpentTotalMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send completion email to customer
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'custom_email',
            to: appointment.customer?.email,
            toName: `${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}`.trim(),
            subject: `Service Completed - Thank You!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #22C55E; color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0;">✓ Service Completed</h1>
                </div>
                <div style="padding: 20px; background: #fff;">
                  <p>Hi ${appointment.customer?.first_name},</p>
                  <p>Thank you for choosing us! Your service has been completed.</p>
                  <p><strong>Service:</strong> ${appointment.service?.name || 'Service'}</p>
                  <p><strong>Date:</strong> ${appointment.scheduled_date}</p>
                  ${workSummary ? `<p><strong>Work Summary:</strong></p><p>${workSummary}</p>` : ''}
                  <p>If you have any questions or need further assistance, please don't hesitate to contact us.</p>
                  <p>We'd love to hear your feedback!</p>
                </div>
              </div>
            `,
            businessId: profile?.business_id,
            emailType: 'appointment_completed',
            recipientType: 'customer',
            appointmentId: id,
            customerId: appointment.customer?.id,
          },
        });
      } catch (emailError) {
        console.error('Failed to send completion email:', emailError);
      }

      // Send notification to admin
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'custom_email',
            to: profile?.email || '',
            toName: 'Admin',
            subject: `Job Completed - ${appointment.ref_code || id}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #22C55E; color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0;">Job Completed</h1>
                </div>
                <div style="padding: 20px; background: #fff;">
                  <p><strong>Customer:</strong> ${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}</p>
                  <p><strong>Service:</strong> ${appointment.service?.name || 'Service'}</p>
                  <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                  <p><strong>Time Spent:</strong> ${hours}h ${minutes}m</p>
                  <p>The job has been completed successfully.</p>
                </div>
              </div>
            `,
            businessId: profile?.business_id,
            emailType: 'technician_completed',
            recipientType: 'admin',
            appointmentId: id,
          },
        });
      } catch (adminEmailError) {
        console.error('Failed to send admin notification:', adminEmailError);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['technician-appointments'] });

      toast({
        title: 'Job completed successfully!',
        description: 'The customer and admin have been notified.',
      });

      navigate('/technician/dashboard');
    } catch (error: any) {
      console.error('Error completing job:', error);
      toast({
        title: 'Failed to complete job',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Complete Job</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="font-semibold">
            Completing job for: {appointment.customer?.first_name} {appointment.customer?.last_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {appointment.service?.name}
          </div>
        </CardContent>
      </Card>

      {/* Work Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Work Summary *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            placeholder="Describe what was done..."
            rows={5}
            required
          />
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Tap + to add before/after pics</p>
        </CardContent>
      </Card>

      {/* Checklist Status */}
      {checklistTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Checklist Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Progress: {progress}%</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/technician/jobs/${id}/checklist`)}
              >
                View Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Spent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Spent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                value={timeSpentHours}
                onChange={(e) => setTimeSpentHours(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={timeSpentMinutes}
                onChange={(e) => setTimeSpentMinutes(e.target.value)}
              />
            </div>
          </div>
          {calculatedTime && (
            <p className="text-xs text-muted-foreground mt-2">
              Auto-calculated: {calculatedTime.hours}h {calculatedTime.minutes}m (from start time)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
          <p className="text-sm text-muted-foreground">(Only visible to admin)</p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
            placeholder="Notes for the office..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-[#F97316] hover:bg-[#EA580C] h-12 text-lg"
        disabled={isSubmitting || !workSummary.trim()}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Completing...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Mark as Complete
          </>
        )}
      </Button>
    </form>
  );
}
