import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Phone, 
  Plus, 
  UserPlus,
  PlayCircle,
  CheckCircle,
  CalendarPlus,
  MapPin,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTodayAppointments, usePendingAppointments } from '@/hooks/useAppointments';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useCallLogs } from '@/hooks/useCallLogs';
import { AppointmentWithRelations } from '@/types/database';
import { AddCustomerModal, NewAppointmentModal } from '@/components/modals';

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Format time from 24h to 12h
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Status badge colors
const getStatusBadge = (status: string) => {
  const styles = {
    scheduled: 'bg-info/10 text-info border-info/20',
    in_progress: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    pending_confirmation: 'bg-warning/10 text-warning border-warning/20',
  };
  const labels = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending_confirmation: 'Pending',
  };
  return (
    <Badge variant="outline" className={cn('font-medium', styles[status as keyof typeof styles])}>
      {labels[status as keyof typeof labels]}
    </Badge>
  );
};

// Get activity icon
const getActivityIcon = (type: string) => {
  const icons = {
    appointment_created: CalendarPlus,
    appointment_updated: PlayCircle,
    appointment_completed: CheckCircle,
    customer_added: UserPlus,
    payment_received: DollarSign,
    call_received: Phone,
  };
  return icons[type as keyof typeof icons] || Calendar;
};

function AppointmentSkeleton() {
  return (
    <div className="flex gap-4 rounded-lg border p-4">
      <div className="flex-shrink-0 text-center">
        <Skeleton className="h-4 w-16 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="w-1 h-16 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: todaysAppointments = [], isLoading: loadingAppointments } = useTodayAppointments();
  const { data: pendingAppointments = [], isLoading: loadingPending } = usePendingAppointments();
  const { data: activityFeed = [], isLoading: loadingActivity } = useActivityFeed(10);
  const { data: callLogs = [] } = useCallLogs();

  // Modal states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  const pendingCount = pendingAppointments.length;
  const inProgressCount = todaysAppointments.filter(a => a.status === 'in_progress').length;
  const scheduledCount = todaysAppointments.filter(a => a.status === 'scheduled').length;
  
  // Get today's calls
  const today = new Date().toISOString().split('T')[0];
  const newCallsToday = callLogs.filter(c => 
    c.started_at.split('T')[0] === today
  ).length;

  const stats = [
    {
      title: "Today's Jobs",
      value: loadingAppointments ? '-' : todaysAppointments.length.toString(),
      subtitle: `${inProgressCount} in progress, ${scheduledCount} scheduled`,
      icon: Calendar,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: 'Pending Requests',
      value: loadingPending ? '-' : pendingCount.toString(),
      subtitle: 'Awaiting confirmation',
      icon: Clock,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
      highlight: pendingCount > 0,
    },
    {
      title: 'This Week Revenue',
      value: '$0', // Will be calculated from invoices
      subtitle: 'From paid invoices',
      icon: DollarSign,
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      title: 'New Calls Today',
      value: newCallsToday.toString(),
      subtitle: 'via AI Assistant',
      icon: Phone,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {profile?.first_name || 'User'}
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsAddCustomerOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={() => setIsNewAppointmentOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Appointment</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.title} 
            className={cn(
              'shadow-card transition-shadow hover:shadow-elevated',
              stat.highlight && 'ring-2 ring-warning/50'
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={cn('rounded-lg p-2.5', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's Schedule */}
        <Card className="shadow-card lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <CardDescription>{todaysAppointments.length} appointments</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary-hover"
              onClick={() => navigate('/calendar')}
            >
              View Calendar
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {loadingAppointments ? (
                  <>
                    <AppointmentSkeleton />
                    <AppointmentSkeleton />
                    <AppointmentSkeleton />
                  </>
                ) : todaysAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No appointments scheduled for today</p>
                    <Button className="mt-4" size="sm" onClick={() => setIsNewAppointmentOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </div>
                ) : (
                  todaysAppointments
                    .sort((a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time))
                    .map((appointment) => {
                      const customer = appointment.customer;
                      const technician = appointment.technician;
                      const service = appointment.service;

                      return (
                        <div
                          key={appointment.id}
                          className="group flex gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                        >
                          {/* Time Column */}
                          <div className="flex-shrink-0 text-center">
                            <p className="text-sm font-semibold text-foreground">
                              {formatTime(appointment.scheduled_start_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(appointment.scheduled_end_time)}
                            </p>
                          </div>

                          {/* Divider */}
                          <div 
                            className="w-1 rounded-full" 
                            style={{ backgroundColor: technician?.color || '#F97316' }}
                          />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-foreground">
                                  {customer?.first_name} {customer?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <span>{service?.name || 'Service'}</span>
                                </p>
                              </div>
                              {getStatusBadge(appointment.status)}
                            </div>

                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{appointment.address}</span>
                              </span>
                            </div>

                            {technician && (
                              <div className="mt-2 flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback 
                                    className="text-xs text-white"
                                    style={{ backgroundColor: technician.color || '#888' }}
                                  >
                                    {technician.first_name?.[0]}{technician.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">
                                  {technician.first_name} {technician.last_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pending Confirmations */}
          {pendingCount > 0 && (
            <Card className="shadow-card border-warning/50 bg-warning/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <CardTitle className="text-lg">Pending Confirmation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingAppointments
                    .slice(0, 3)
                    .map((appointment) => {
                      const customer = appointment.customer;
                      const service = appointment.service;

                      return (
                        <div 
                          key={appointment.id}
                          className="flex items-center justify-between rounded-lg bg-background p-3"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {customer?.first_name} {customer?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {service?.name} • {formatTime(appointment.scheduled_start_time)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-xs">
                              Contact
                            </Button>
                            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary-hover">
                              Confirm
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className={cn(pendingCount > 0 ? 'h-[250px]' : 'h-[400px]')}>
                <div className="space-y-4 pr-4">
                  {loadingActivity ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))
                  ) : activityFeed.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                  ) : (
                    activityFeed.map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      const iconColors = {
                        appointment_created: 'text-info bg-info/10',
                        appointment_updated: 'text-primary bg-primary/10',
                        appointment_completed: 'text-success bg-success/10',
                        customer_added: 'text-info bg-info/10',
                        payment_received: 'text-success bg-success/10',
                        call_received: 'text-primary bg-primary/10',
                      };

                      return (
                        <div key={activity.id} className="flex gap-3">
                          <div className={cn(
                            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                            iconColors[activity.type as keyof typeof iconColors]
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {activity.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddCustomerModal 
        open={isAddCustomerOpen} 
        onOpenChange={setIsAddCustomerOpen} 
      />
      <NewAppointmentModal 
        open={isNewAppointmentOpen} 
        onOpenChange={setIsNewAppointmentOpen} 
      />
    </div>
  );
}
