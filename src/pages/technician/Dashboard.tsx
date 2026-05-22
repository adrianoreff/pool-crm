import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTodayTechnicianAppointments,
  useUpcomingTechnicianAppointments,
  sortTechnicianRouteStops,
} from '@/hooks/useTechnicianAppointments';
import { useUpdateJobStatus } from '@/hooks/useUpdateJobStatus';
import { useBusiness } from '@/hooks/useBusiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Wrench, Navigation, Play, ChevronRight } from 'lucide-react';
import { formatAppointmentDateLong, getLocalDateString } from '@/lib/utils';
import { TechnicianJobsMap } from '@/components/technician/TechnicianJobsMap';
import { EnablePushBanner } from '@/components/technician/EnablePushBanner';

function formatTimeShort(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function TechnicianDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'today' | 'upcoming'>('today');
  const { data: todayAppointments = [], isLoading: todayLoading } = useTodayTechnicianAppointments();
  const { data: upcomingAppointments = [], isLoading: upcomingLoading } =
    useUpcomingTechnicianAppointments();
  const { data: business } = useBusiness();
  const updateStatus = useUpdateJobStatus();
  const mapboxToken = business?.mapbox_public_token;

  const today = getLocalDateString();

  const todaySchedule = useMemo(
    () =>
      sortTechnicianRouteStops(
        todayAppointments.filter((a) => a.status !== 'cancelled' && a.scheduled_date === today)
      ),
    [todayAppointments, today]
  );

  const stats = useMemo(() => {
    const total = todaySchedule.length;
    const completed = todaySchedule.filter((a) => a.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, remaining: total - completed, pct };
  }, [todaySchedule]);

  const upcomingByDate = useMemo(() => {
    const active = upcomingAppointments.filter((a) => a.status !== 'cancelled');
    const sorted = sortTechnicianRouteStops(active);
    const groups: { date: string; stops: typeof sorted }[] = [];
    let currentDate = '';
    for (const apt of sorted) {
      if (apt.scheduled_date !== currentDate) {
        currentDate = apt.scheduled_date;
        groups.push({ date: currentDate, stops: [] });
      }
      groups[groups.length - 1].stops.push(apt);
    }
    return groups;
  }, [upcomingAppointments]);

  const nextJob = useMemo(() => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return todaySchedule
      .filter((a) => a.status !== 'completed' && a.status !== 'cancelled')
      .filter((a) => a.scheduled_start_time >= currentTime)[0];
  }, [todaySchedule]);

  const handleNavigate = (appointment: (typeof todaySchedule)[0]) => {
    if (!appointment) return;
    const address = `${appointment.address}, ${appointment.city || ''} ${appointment.state || ''} ${appointment.zip_code || ''}`.trim();
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

  const handleStart = async (appointment: (typeof todaySchedule)[0]) => {
    if (!appointment) return;
    await updateStatus.mutateAsync({
      id: appointment.id,
      status: 'in_progress',
      sendNotification: true,
    });
    navigate(`/technician/jobs/${appointment.id}`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTimeUntil = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentTime = new Date();
    appointmentTime.setHours(hours, minutes, 0, 0);
    if (appointmentTime < now) {
      const diffMinutes = Math.floor((now.getTime() - appointmentTime.getTime()) / 60000);
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m ago`;
    }
    const diffMinutes = Math.floor((appointmentTime.getTime() - now.getTime()) / 60000);
    if (diffMinutes < 60) return `in ${diffMinutes} min`;
    return `in ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
  };

  const isLoading = view === 'today' ? todayLoading : upcomingLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EnablePushBanner />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My route</h1>
          <p className="text-muted-foreground">
            {getGreeting()}, {profile?.first_name || 'Technician'}
          </p>
        </div>
        {view === 'today' && (
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className="stroke-[#F97316]"
                strokeWidth="3"
                strokeDasharray={`${stats.pct} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-bold">
              {stats.completed}/{stats.total}
            </span>
          </div>
        )}
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'today' | 'upcoming')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingByDate.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-xs text-primary">
                {upcomingAppointments.filter((a) => a.status !== 'cancelled').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6 mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{formatAppointmentDateLong(today)}</p>
            {todaySchedule.length > 0 && (
              <Button
                size="sm"
                className="bg-[#F97316] hover:bg-[#EA580C] shrink-0"
                onClick={() => navigate(`/technician/route/${today}`)}
              >
                Open route
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          <TechnicianJobsMap
            appointments={todayAppointments}
            mapboxToken={mapboxToken}
            onMarkerClick={(id) => navigate(`/technician/jobs/${id}`)}
          />

          {nextJob && (
            <Card className="border-2 border-[#F97316]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-[#F97316]" />
                  Next stop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-semibold text-lg">
                    {nextJob.customer?.first_name} {nextJob.customer?.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {nextJob.address}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{nextJob.service?.name || 'Service'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatTimeShort(nextJob.scheduled_start_time)} ({getTimeUntil(nextJob.scheduled_start_time)})
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleNavigate(nextJob)}>
                    <Navigation className="h-4 w-4 mr-2" />
                    Navigate
                  </Button>
                  <Button
                    className="flex-1 bg-[#F97316] hover:bg-[#EA580C]"
                    onClick={() => handleStart(nextJob)}
                    disabled={updateStatus.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {todaySchedule.length > 0 ? (
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => navigate(`/technician/route/${today}`)}
            >
              View full route ({todaySchedule.length} stops)
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pools on your route today. Check Upcoming or ask the office to generate stops.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Scheduled route stops for the next 3 weeks (after today).
          </p>

          {upcomingByDate.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No upcoming stops yet. When the office generates future visits, they will appear here.
              </CardContent>
            </Card>
          ) : (
            upcomingByDate.map(({ date, stops }) => (
              <Card
                key={date}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/technician/route/${date}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{formatAppointmentDateLong(date)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {stops.length} pool{stops.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
