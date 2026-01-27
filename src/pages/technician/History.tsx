import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTechnicianAppointments } from '@/hooks/useTechnicianAppointments';
import { JobCard } from '@/components/technician/JobCard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTime } from '@/lib/utils';

type PeriodFilter = 'week' | 'month' | 'all';

function formatTimeShort(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDuration(minutes: number) {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function History() {
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [statusFilter, setStatusFilter] = useState<string>('completed');

  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (periodFilter === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return {
        from: weekStart.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    }

    if (periodFilter === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: monthStart.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    }

    // All time
    return {
      from: '2020-01-01', // Arbitrary old date
      to: today.toISOString().split('T')[0],
    };
  }, [periodFilter]);

  const { data: appointments = [], isLoading } = useTechnicianAppointments({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    status: statusFilter,
  });

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof appointments> = {};
    
    appointments.forEach((apt) => {
      const dateKey = apt.scheduled_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(apt);
    });

    // Sort dates descending
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [appointments]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = appointments.length;
    const totalMinutes = appointments.reduce((sum, apt) => {
      return sum + (apt.time_spent_minutes || 0);
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    
    return { totalJobs, totalHours, totalMinutes };
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">View your completed jobs</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="no_show">No Show</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      {periodFilter === 'week' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalJobs}</div>
                <div className="text-sm text-muted-foreground">Jobs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalHours}h</div>
                <div className="text-sm text-muted-foreground">Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No jobs found for the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, dateAppointments]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }).toUpperCase()}
              </h2>
              <div className="space-y-2">
                {dateAppointments.map((apt) => (
                  <Card
                    key={apt.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base mb-1">
                            {apt.customer?.first_name} {apt.customer?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            {apt.service?.name}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {formatTimeShort(apt.scheduled_start_time)} - {formatTimeShort(apt.scheduled_end_time)}
                            </span>
                            {apt.time_spent_minutes && (
                              <span>• {formatDuration(apt.time_spent_minutes)}</span>
                            )}
                          </div>
                          {apt.completed_at && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Completed at {new Date(apt.completed_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
