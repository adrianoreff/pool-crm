import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTechnicianAppointments } from '@/hooks/useTechnicianAppointments';
import { JobCard } from '@/components/technician/JobCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentWithRelations } from '@/types/database';

type DateFilter = 'today' | 'tomorrow' | 'week';

export default function JobsList() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      return { from: todayStr, to: todayStr };
    }
    
    if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      return { from: tomorrowStr, to: tomorrowStr };
    }
    
    // This week
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    return {
      from: weekStart.toISOString().split('T')[0],
      to: weekEnd.toISOString().split('T')[0],
    };
  }, [dateFilter]);

  const { data: appointments = [], isLoading } = useTechnicianAppointments({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, AppointmentWithRelations[]> = {
      completed: [],
      in_progress: [],
      scheduled: [],
      other: [],
    };

    appointments.forEach((apt) => {
      if (apt.status === 'completed') {
        groups.completed.push(apt);
      } else if (apt.status === 'in_progress') {
        groups.in_progress.push(apt);
      } else if (apt.status === 'scheduled' || apt.status === 'confirmed') {
        groups.scheduled.push(apt);
      } else {
        groups.other.push(apt);
      }
    });

    return groups;
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
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-muted-foreground">View and manage your assigned jobs</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Jobs List */}
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No jobs found for the selected filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Completed */}
          {groupedAppointments.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">COMPLETED</h2>
              <div className="space-y-2">
                {groupedAppointments.completed.map((apt) => (
                  <JobCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Progress */}
          {groupedAppointments.in_progress.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">IN PROGRESS</h2>
              <div className="space-y-2">
                {groupedAppointments.in_progress.map((apt) => (
                  <JobCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scheduled */}
          {groupedAppointments.scheduled.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">SCHEDULED</h2>
              <div className="space-y-2">
                {groupedAppointments.scheduled.map((apt) => (
                  <JobCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other */}
          {groupedAppointments.other.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">OTHER</h2>
              <div className="space-y-2">
                {groupedAppointments.other.map((apt) => (
                  <JobCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => navigate(`/technician/jobs/${apt.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
