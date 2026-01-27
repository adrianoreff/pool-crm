import { useParams, useNavigate } from 'react-router-dom';
import { useAppointment } from '@/hooks/useAppointments';
import { useUpdateJobStatus } from '@/hooks/useUpdateJobStatus';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/technician/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Clock, Wrench, Navigation, CheckCircle2, AlertCircle, FileText, Camera, History } from 'lucide-react';
import { formatTime } from '@/lib/utils';
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
  const { data: appointment, isLoading } = useAppointment(id || '');
  const updateStatus = useUpdateJobStatus();

  if (isLoading || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusUpdate = async (newStatus: string, timestamp?: string) => {
    if (!id) return;
    
    const updateParams: any = {
      id,
      status: newStatus as any,
      sendNotification: true,
    };

    if (newStatus === 'scheduled' && timestamp) {
      updateParams.enRouteAt = timestamp;
    } else if (timestamp && newStatus === 'scheduled') {
      updateParams.arrivedAt = timestamp;
    } else if (newStatus === 'in_progress') {
      updateParams.startedAt = new Date().toISOString();
    }

    await updateStatus.mutateAsync(updateParams);
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
            onClick={() => handleStatusUpdate('scheduled', new Date().toISOString())}
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
            onClick={() => handleStatusUpdate('scheduled', new Date().toISOString())}
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
            onClick={() => handleStatusUpdate('in_progress')}
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
          <div className="font-semibold text-lg">
            {appointment.customer?.first_name} {appointment.customer?.last_name}
          </div>
          <div className="flex flex-wrap gap-2">
            {appointment.customer?.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${appointment.customer?.phone}`, '_self')}
              >
                <Phone className="h-4 w-4 mr-2" />
                {appointment.customer.phone}
              </Button>
            )}
            {appointment.customer?.email && (
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
            <div>{appointment.address}</div>
            <div className="text-sm text-muted-foreground">
              {appointment.city}, {appointment.state} {appointment.zip_code}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleNavigate}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Open in Maps
          </Button>
          {/* Map preview would go here - simplified for now */}
          <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            Map Preview
          </div>
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
            {new Date(appointment.scheduled_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
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
