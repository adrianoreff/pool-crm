import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import { useUpdateJobStatus } from '@/hooks/useUpdateJobStatus';
import { useJobMessages } from '@/hooks/useJobMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/technician/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { MapPreview } from '@/components/technician/MapPreview';
import { MapPin, Phone, Mail, Clock, Wrench, Navigation, CheckCircle2, AlertCircle, FileText, Camera, History, MessageSquare, Send } from 'lucide-react';
import { formatTime, formatAppointmentDateLong } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';

function formatTimeShort(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: business } = useBusiness();
  const { data: appointment, isLoading, error } = useAppointment(id || '');
  const updateStatus = useUpdateJobStatus();
  const { messages, sendMessage, isSending } = useJobMessages(id);
  const [messageDraft, setMessageDraft] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('JobDetails - Component state:', {
      id,
      isLoading,
      hasAppointment: !!appointment,
      hasError: !!error,
      errorMessage: error?.message,
    });

    if (appointment) {
      console.log('JobDetails - Appointment loaded:', {
        id: appointment.id,
        hasCustomer: !!appointment.customer,
        customerName: appointment.customer ? `${appointment.customer.first_name} ${appointment.customer.last_name}` : 'No customer',
        hasService: !!appointment.service,
        serviceName: appointment.service?.name || 'No service',
        address: appointment.address,
        customer: appointment.customer,
        service: appointment.service,
      });
    }
    if (error) {
      console.error('JobDetails - Error loading appointment:', error);
    }
  }, [id, appointment, isLoading, error]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading job details...</p>
        <p className="text-xs text-muted-foreground">ID: {id}</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Error loading appointment</h2>
          <p className="text-muted-foreground mt-2">{error.message}</p>
          <Button onClick={() => navigate('/technician/jobs')} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Appointment not found</h2>
          <p className="text-muted-foreground mt-2">
            The appointment you're looking for doesn't exist or you don't have access to it.
          </p>
          <p className="text-xs text-muted-foreground mt-2">ID: {id}</p>
          <Button onClick={() => navigate('/technician/jobs')} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const handleOnMyWay = () => {
    if (!id) return;
    updateStatus.mutateAsync({
      id,
      status: 'scheduled',
      sendNotification: true,
      enRouteAt: new Date().toISOString(),
    });
  };

  const handleArrived = () => {
    if (!id) return;
    updateStatus.mutateAsync({
      id,
      status: 'scheduled',
      sendNotification: true,
      arrivedAt: new Date().toISOString(),
    });
  };

  const handleStartJob = () => {
    if (!id) return;
    updateStatus.mutateAsync({
      id,
      status: 'in_progress',
      sendNotification: true,
      startedAt: new Date().toISOString(),
    });
  };

  const handleNavigate = () => {
    const address = `${appointment.address}, ${appointment.city || ''} ${appointment.state || ''} ${appointment.zip_code || ''}`.trim();
    const mapboxToken = business?.mapbox_public_token;
    
    if (mapboxToken && appointment.latitude && appointment.longitude) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          window.open(
            `https://www.mapbox.com/directions/?origin=${latitude},${longitude}&destination=${appointment.latitude},${appointment.longitude}`,
            '_blank'
          );
        },
        () => {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        }
      );
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const getStatusActions = () => {
    const status = appointment.status;
    const hasEnRoute = !!appointment.en_route_at;
    const hasArrived = !!appointment.arrived_at;

    if (status === 'completed' || status === 'cancelled') {
      return null;
    }

    if (status === 'scheduled' && !hasEnRoute && !hasArrived) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleOnMyWay}
            disabled={updateStatus.isPending}
          >
            On My Way
          </Button>
          <Button
            variant="destructive"
            onClick={() => navigate(`/technician/jobs/${id}/problem`)}
          >
            Problem
          </Button>
        </div>
      );
    }

    if (hasEnRoute && !hasArrived) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleArrived}
            disabled={updateStatus.isPending}
          >
            Arrived
          </Button>
          <Button
            variant="destructive"
            onClick={() => navigate(`/technician/jobs/${id}/problem`)}
          >
            Problem
          </Button>
        </div>
      );
    }

    if (hasArrived && status !== 'in_progress') {
      return (
        <div className="flex gap-2">
          <Button
            className="bg-[#F97316] hover:bg-[#EA580C]"
            onClick={handleStartJob}
            disabled={updateStatus.isPending}
          >
            Start Job
          </Button>
          <Button
            variant="destructive"
            onClick={() => navigate(`/technician/jobs/${id}/problem`)}
          >
            Problem
          </Button>
        </div>
      );
    }

    if (status === 'in_progress') {
      return (
        <div className="flex gap-2">
          <Button
            className="bg-[#F97316] hover:bg-[#EA580C]"
            onClick={() => navigate(`/technician/jobs/${id}/complete`)}
          >
            Complete Job
          </Button>
          <Button
            variant="destructive"
            onClick={() => navigate(`/technician/jobs/${id}/problem`)}
          >
            Problem
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Details</h1>
          <StatusBadge status={appointment.status} className="mt-2" />
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {/* Status Actions */}
      {getStatusActions() && (
        <Card>
          <CardContent className="p-4">
            {getStatusActions()}
          </CardContent>
        </Card>
      )}

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>👤</span> Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointment.customer ? (
            <>
              <div className="font-semibold text-lg">
                {appointment.customer.first_name || ''} {appointment.customer.last_name || ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {appointment.customer.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${appointment.customer?.phone}`, '_self')}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {appointment.customer.phone}
                  </Button>
                )}
                {appointment.customer.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:${appointment.customer?.email}`, '_self')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Customer information not available</div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="font-medium">{appointment.address || 'Address not provided'}</div>
            {(appointment.city || appointment.state || appointment.zip_code) && (
              <div className="text-sm text-muted-foreground">
                {appointment.city}{appointment.city && appointment.state ? ', ' : ''} {appointment.state} {appointment.zip_code}
              </div>
            )}
          </div>
          <MapPreview
            latitude={appointment.latitude ? Number(appointment.latitude) : null}
            longitude={appointment.longitude ? Number(appointment.longitude) : null}
            address={`${appointment.address}, ${appointment.city || ''} ${appointment.state || ''} ${appointment.zip_code || ''}`}
            mapboxToken={business?.mapbox_public_token}
          />
        </CardContent>
      </Card>

      {/* Service */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-medium">{appointment.service?.name || 'Service'}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Duration: ~{Math.round(
              (new Date(`2000-01-01T${appointment.scheduled_end_time}`).getTime() -
               new Date(`2000-01-01T${appointment.scheduled_start_time}`).getTime()) /
              60000
            )} minutes
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {formatAppointmentDateLong(appointment.scheduled_date)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {formatTime(appointment.scheduled_start_time)} - {formatTime(appointment.scheduled_end_time)}
          </div>
        </CardContent>
      </Card>

      {/* Customer Notes */}
      {appointment.customer_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Customer Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{appointment.customer_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Service Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Service Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/technician/jobs/${id}/checklist`)}
          >
            Open Checklist →
          </Button>
        </CardContent>
      </Card>

      {/* Messages with office */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages with office
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="h-[160px] pr-2 rounded border p-2">
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
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {/* Photo upload will be handled in complete job */}}
          >
            + Add Photo
          </Button>
          <div className="text-sm text-muted-foreground mt-2 text-center">
            (No photos yet)
          </div>
        </CardContent>
      </Card>

      {/* Complete Job Button */}
      {appointment.status === 'in_progress' && (
        <Button
          className="w-full bg-[#F97316] hover:bg-[#EA580C] h-12 text-lg"
          onClick={() => navigate(`/technician/jobs/${id}/complete`)}
        >
          ✅ Complete Job
        </Button>
      )}
    </div>
  );
}
