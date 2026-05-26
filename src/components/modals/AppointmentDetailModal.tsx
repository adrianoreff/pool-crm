import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete, AddressResult } from '@/components/ui/address-autocomplete';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatAppointmentDateLong } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  User,
  Wrench,
  Edit,
  X,
  Check,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { AppointmentWithRelations, AppointmentStatus } from '@/types/database';
import { useUpdateAppointmentStatus, useCancelAppointment, useDeleteAppointment } from '@/hooks/useAppointments';
import { useTechnicians } from '@/hooks/useTeam';
import { useServices } from '@/hooks/useServices';
import { useCheckTechnicianConflict } from '@/hooks/useTechnicianConflict';
import { useJobMessages } from '@/hooks/useJobMessages';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { SendEmailModal } from './SendEmailModal';
import { TechnicianConflictModal } from './TechnicianConflictModal';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppointmentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentWithRelations | null;
}

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getStatusStyles = (status: string) => {
  const styles = {
    scheduled: 'bg-info/10 text-info border-info/20',
    in_progress: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    pending_confirmation: 'bg-warning/10 text-warning border-warning/20',
    no_show: 'bg-muted text-muted-foreground border-muted',
  };
  const labels = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending_confirmation: 'Pending',
    no_show: 'No Show',
  };
  return { style: styles[status as keyof typeof styles], label: labels[status as keyof typeof labels] };
};

export function AppointmentDetailModal({ open, onOpenChange, appointment }: AppointmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictAppointment, setConflictAppointment] = useState<(AppointmentWithRelations & { conflictTimeLabel?: string }) | null>(null);
  const [editData, setEditData] = useState({
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_end_time: '',
    technician_id: '',
    service_id: '',
    address: '',
    internal_notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateAppointmentStatus();
  const cancelAppointment = useCancelAppointment();
  const deleteAppointment = useDeleteAppointment();
  const { data: technicians = [] } = useTechnicians();
  const { data: services = [] } = useServices();
  const checkConflict = useCheckTechnicianConflict();
  const { messages, sendMessage, isSending, markAsRead } = useJobMessages(appointment?.id);
  const [messageDraft, setMessageDraft] = useState('');

  useEffect(() => {
    if (open && appointment?.id) markAsRead();
  }, [open, appointment?.id, markAsRead]);

  if (!appointment) return null;

  const customer = appointment.customer;
  const technician = appointment.technician;
  const service = appointment.service;
  const statusInfo = getStatusStyles(appointment.status);

  const handleStartEdit = () => {
    setEditData({
      scheduled_date: appointment.scheduled_date,
      scheduled_start_time: appointment.scheduled_start_time,
      scheduled_end_time: appointment.scheduled_end_time,
      technician_id: appointment.technician_id || '',
      service_id: appointment.service_id || '',
      address: appointment.address,
      internal_notes: appointment.internal_notes || '',
    });
    setIsEditing(true);
  };

  const performSave = async () => {
    const oldDate = appointment.scheduled_date;
    const oldStartTime = appointment.scheduled_start_time;
    const oldEndTime = appointment.scheduled_end_time;
    const dateChanged = editData.scheduled_date !== oldDate;
    const timeChanged = editData.scheduled_start_time !== oldStartTime || editData.scheduled_end_time !== oldEndTime;

    const { error } = await supabase
      .from('appointments')
      .update({
        scheduled_date: editData.scheduled_date,
        scheduled_start_time: editData.scheduled_start_time,
        scheduled_end_time: editData.scheduled_end_time,
        technician_id: editData.technician_id === 'none' ? null : (editData.technician_id || null),
        service_id: editData.service_id || null,
        address: editData.address,
        internal_notes: editData.internal_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id);

    if (error) throw error;

    const previousTechnicianId = appointment.technician_id ?? '';
    const newTechnicianId = editData.technician_id === 'none' ? '' : (editData.technician_id || '');
    if (newTechnicianId && newTechnicianId !== previousTechnicianId) {
      // Send email notification
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'technician_assigned',
            appointmentId: appointment.id,
            appUrl: window.location.origin,
          },
        });
      } catch (emailError) {
        console.error('Failed to send technician assigned notification:', emailError);
      }

      // Send push notification to technician
      try {
        const customerName = appointment.customer
          ? `${appointment.customer.first_name} ${appointment.customer.last_name || ''}`.trim()
          : 'Customer';
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: newTechnicianId,
            business_id: appointment.business_id,
            notification_type: 'assigned',
            payload: {
              title: 'New job assigned',
              body: `${appointment.scheduled_date} – ${customerName}`,
              url: '/technician/jobs',
            },
          },
        });
      } catch (pushError) {
        console.error('Failed to send technician assigned push:', pushError);
      }
    }

    if (dateChanged || timeChanged) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: { type: 'appointment_rescheduled', appointmentId: appointment.id },
        });
        const { data: recipients } = await supabase
          .from('notification_recipients')
          .select('email, name')
          .eq('business_id', appointment.business_id)
          .eq('is_active', true);

        if (recipients && recipients.length > 0) {
          for (const recipient of recipients) {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'custom_email',
                to: recipient.email,
                toName: recipient.name || 'Admin',
                subject: `Appointment Rescheduled - ${appointment.ref_code || appointment.id}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #2563EB; color: white; padding: 20px; text-align: center;">
                      <h1 style="margin: 0;">📅 Appointment Rescheduled</h1>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                      <p><strong>Customer:</strong> ${appointment.customer?.first_name} ${appointment.customer?.last_name || ''}</p>
                      <p><strong>Reference:</strong> ${appointment.ref_code || 'N/A'}</p>
                      <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 0;"><strong>Previous:</strong> ${oldDate} at ${oldStartTime} - ${oldEndTime}</p>
                      </div>
                      <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 0;"><strong>New:</strong> ${editData.scheduled_date} at ${editData.scheduled_start_time} - ${editData.scheduled_end_time}</p>
                      </div>
                    </div>
                  </div>
                `,
                businessId: appointment.business_id,
                emailType: 'admin_appointment_rescheduled',
                recipientType: 'admin',
                appointmentId: appointment.id,
              },
            });
          }
        }
        toast({ title: 'Appointment rescheduled and notifications sent' });
      } catch (emailError) {
        console.error('Failed to send reschedule notifications:', emailError);
      }
    } else {
      toast({ title: 'Appointment updated successfully' });
    }

    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const newTechnicianId = editData.technician_id === 'none' ? '' : (editData.technician_id || '');
    if (newTechnicianId) {
      const result = await checkConflict(
        newTechnicianId,
        editData.scheduled_date,
        editData.scheduled_start_time,
        editData.scheduled_end_time,
        appointment.id
      );
      if (result.hasConflict && result.conflictAppointment) {
        setConflictAppointment(result.conflictAppointment);
        setConflictModalOpen(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      await performSave();
    } catch (error: unknown) {
      toast({
        title: 'Failed to update appointment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignAnyway = async () => {
    setIsSaving(true);
    try {
      await performSave();
    } catch (error: unknown) {
      toast({
        title: 'Failed to update appointment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTech = technicians.find((t) => t.id === editData.technician_id);
  const technicianName = editData.technician_id && editData.technician_id !== 'none' && selectedTech
    ? `${selectedTech.first_name} ${selectedTech.last_name || ''}`.trim()
    : '';

  const handleConfirm = () => {
    updateStatus.mutate({ id: appointment.id, status: 'scheduled' });
  };

  const handleCancel = () => {
    cancelAppointment.mutate({ id: appointment.id, reason: cancelReason });
    setShowCancelDialog(false);
    setCancelReason('');
    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteAppointment.mutate(appointment.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onOpenChange(false);
      },
    });
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: appointment.id, status: newStatus as AppointmentStatus });
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.open(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      setIsEmailModalOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">
                  Appointment Details
                </DialogTitle>
                <Badge variant="outline" className={cn('font-medium', statusInfo.style)}>
                  {statusInfo.label}
                </Badge>
              </div>
              {appointment.ref_code && (
                <span className="text-sm text-muted-foreground font-mono">
                  {appointment.ref_code}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Customer Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {customer?.first_name} {customer?.last_name}
                    </p>
                    <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {customer?.phone}
                      </span>
                      {customer?.email && (
                        <span className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCall}>
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    {customer?.email && (
                      <Button size="sm" variant="outline" onClick={handleEmail}>
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Appointment Details */}
            {isEditing ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Edit Appointment</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editData.scheduled_date}
                      onChange={(e) => setEditData({ ...editData, scheduled_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service</Label>
                    <Select
                      value={editData.service_id}
                      onValueChange={(v) => setEditData({ ...editData, service_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={editData.scheduled_start_time}
                      onChange={(e) => setEditData({ ...editData, scheduled_start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={editData.scheduled_end_time}
                      onChange={(e) => setEditData({ ...editData, scheduled_end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Technician</Label>
                  <Select
                    value={editData.technician_id}
                    onValueChange={(v) => setEditData({ ...editData, technician_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.first_name} {t.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <AddressAutocomplete
                    value={editData.address}
                    onChange={(value) => setEditData({ ...editData, address: value })}
                    onAddressSelect={(result: AddressResult) => {
                      setEditData({ ...editData, address: result.fullAddress });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={editData.internal_notes}
                    onChange={(e) => setEditData({ ...editData, internal_notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Schedule
                  </h3>
                  <Button size="sm" variant="ghost" onClick={handleStartEdit}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">
                      {formatAppointmentDateLong(appointment.scheduled_date)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Time</p>
                    <p className="font-medium">
                      {formatTime(appointment.scheduled_start_time)} - {formatTime(appointment.scheduled_end_time)}
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {appointment.address}
                    {appointment.city && `, ${appointment.city}`}
                    {appointment.state && `, ${appointment.state}`}
                    {appointment.zip_code && ` ${appointment.zip_code}`}
                  </p>
                </div>

                {service && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Service</p>
                    <p className="font-medium flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      {service.name}
                    </p>
                  </div>
                )}

                {technician && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Technician</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-xs text-white"
                          style={{ backgroundColor: technician.color || '#888' }}
                        >
                          {technician.first_name?.[0]}{technician.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {technician.first_name} {technician.last_name}
                      </span>
                    </div>
                  </div>
                )}

                {appointment.internal_notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Internal Notes</p>
                    <p className="text-sm">{appointment.internal_notes}</p>
                  </div>
                )}

                {appointment.customer_notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Customer Notes</p>
                    <p className="text-sm">{appointment.customer_notes}</p>
                  </div>
                )}

                {/* Messages with technician */}
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Messages with technician
                  </p>
                  <ScrollArea className="h-[160px] pr-2">
                    <div className="space-y-2">
                      {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No messages yet.</p>
                      ) : (
                        messages.map((m) => {
                          const name = m.sender ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() || m.sender_role : m.sender_role;
                          return (
                            <div key={m.id} className="text-sm">
                              <span className="font-medium text-muted-foreground">{name}:</span>{' '}
                              <span className="whitespace-pre-wrap">{m.body}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!messageDraft.trim() || isSending) return;
                      await sendMessage(messageDraft);
                      setMessageDraft('');
                    }}
                  >
                    <Input
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={!messageDraft.trim() || isSending}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {appointment.status === 'pending_confirmation' && (
              <Button 
                onClick={handleConfirm} 
                disabled={updateStatus.isPending}
                className="bg-success hover:bg-success/90"
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Confirm Appointment
              </Button>
            )}
            
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Select onValueChange={handleStatusChange} value={appointment.status}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_confirmation">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            )}

            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Button 
                variant="destructive" 
                onClick={() => setShowCancelDialog(true)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Appointment
              </Button>
            )}
            {appointment.status !== 'in_progress' && (
              <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => setShowDeleteDialog(true)}>
                Delete Appointment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete this appointment? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TechnicianConflictModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflictAppointment={conflictAppointment}
        technicianName={technicianName}
        onSelectDifferentTechnician={() => setConflictModalOpen(false)}
        onSelectDifferentTime={() => setConflictModalOpen(false)}
        onAssignAnyway={handleAssignAnyway}
      />

      {/* Email Modal */}
      {customer && (
        <SendEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipient={{
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
            email: customer.email || '',
          }}
          appointmentId={appointment.id}
        />
      )}
    </>
  );
}
