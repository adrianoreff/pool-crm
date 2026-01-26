import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Plus,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useAppointments';
import { useTechnicians } from '@/hooks/useTeam';
import { Skeleton } from '@/components/ui/skeleton';
import { NewAppointmentModal } from '@/components/modals';

type ViewType = 'day' | 'week' | 'month';

const timeSlots = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatTimeShort = (time: string) => {
  const [hours] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${ampm}`;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  // Get week dates for filtering
  const getWeekDates = () => {
    const dates: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  
  // Calculate date range for query
  const dateRange = useMemo(() => {
    if (view === 'day') {
      const dateStr = currentDate.toISOString().split('T')[0];
      return { from: dateStr, to: dateStr };
    } else if (view === 'week') {
      return {
        from: weekDates[0].toISOString().split('T')[0],
        to: weekDates[6].toISOString().split('T')[0],
      };
    } else {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return {
        from: firstDay.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0],
      };
    }
  }, [currentDate, view, weekDates]);

  const { data: technicians = [], isLoading: isLoadingTechnicians } = useTechnicians();
  const { data: appointments = [], isLoading: isLoadingAppointments } = useAppointments({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    technicianId: selectedTechnician !== 'all' ? selectedTechnician : undefined,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter out cancelled appointments
  const filteredAppointments = appointments.filter(apt => apt.status !== 'cancelled');

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredAppointments.filter(apt => apt.scheduled_date === dateStr);
  };

  // Calculate appointment position and height
  const getAppointmentStyle = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = (startHour - 7) * 60 + startMin;
    const endMinutes = (endHour - 7) * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    
    const top = (startMinutes / 60) * 64; // 64px per hour
    const height = Math.max((durationMinutes / 60) * 64, 32);
    
    return { top, height };
  };

  // Navigation functions
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (view === 'week') {
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
      const year = endDate.getFullYear();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${year}`;
      }
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  const isLoading = isLoadingAppointments || isLoadingTechnicians;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={() => setIsNewAppointmentOpen(true)}>
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Controls */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold">{formatDateHeader()}</h2>
            </div>

            {/* View Toggle & Filters */}
            <div className="flex items-center gap-2">
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Technicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technicians</SelectItem>
                  {technicians.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: tech.color || '#F97316' }}
                        />
                        {tech.first_name} {tech.last_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex rounded-lg border p-1">
                {(['day', 'week', 'month'] as ViewType[]).map((v) => (
                  <Button
                    key={v}
                    variant={view === v ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setView(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {view === 'week' && (
                <div className="flex">
                  {/* Time Column */}
                  <div className="flex-shrink-0 w-16 border-r bg-muted/30">
                    <div className="h-12 border-b" /> {/* Header spacer */}
                    {timeSlots.map((time) => (
                      <div 
                        key={time} 
                        className="h-16 border-b px-2 text-right text-xs text-muted-foreground"
                      >
                        {formatTimeShort(time)}
                      </div>
                    ))}
                  </div>

                  {/* Days Columns */}
                  <ScrollArea className="flex-1">
                    <div className="flex min-w-[700px]">
                      {weekDates.map((date) => {
                        const isToday = date.toDateString() === today.toDateString();
                        const dayAppointments = getAppointmentsForDate(date);

                        return (
                          <div key={date.toISOString()} className="flex-1 min-w-[100px] border-r last:border-r-0">
                            {/* Day Header */}
                            <div className={cn(
                              'h-12 border-b px-2 py-1 text-center',
                              isToday && 'bg-primary/5'
                            )}>
                              <p className="text-xs text-muted-foreground">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                              <p className={cn(
                                'text-lg font-semibold',
                                isToday && 'text-primary'
                              )}>
                                {date.getDate()}
                              </p>
                            </div>

                            {/* Time Slots */}
                            <div className="relative">
                              {timeSlots.map((time) => (
                                <div 
                                  key={time} 
                                  className={cn(
                                    'h-16 border-b hover:bg-muted/30 cursor-pointer transition-colors',
                                    isToday && 'bg-primary/5'
                                  )}
                                  onClick={() => setIsNewAppointmentOpen(true)}
                                />
                              ))}

                              {/* Appointments */}
                              {dayAppointments.map((apt) => {
                                const { top, height } = getAppointmentStyle(apt.scheduled_start_time, apt.scheduled_end_time);
                                const techColor = apt.technician?.color || '#F97316';

                                return (
                                  <div
                                    key={apt.id}
                                    className="absolute left-1 right-1 rounded-md p-1.5 cursor-pointer transition-all hover:shadow-md overflow-hidden"
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      backgroundColor: `${techColor}20`,
                                      borderLeft: `3px solid ${techColor}`,
                                    }}
                                  >
                                    <p className="text-xs font-medium truncate">
                                      {apt.customer?.first_name} {apt.customer?.last_name}
                                    </p>
                                    {height > 40 && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {apt.service?.name}
                                      </p>
                                    )}
                                    {height > 56 && (
                                      <p className="text-xs text-muted-foreground">
                                        {formatTime(apt.scheduled_start_time)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {view === 'day' && (
                <div className="flex">
                  {/* Time Column */}
                  <div className="flex-shrink-0 w-20 border-r bg-muted/30">
                    {timeSlots.map((time) => (
                      <div 
                        key={time} 
                        className="h-16 border-b px-2 text-right text-sm text-muted-foreground flex items-start justify-end pt-1"
                      >
                        {formatTimeShort(time)}
                      </div>
                    ))}
                  </div>

                  {/* Day Content */}
                  <div className="flex-1 relative">
                    {timeSlots.map((time) => (
                      <div 
                        key={time} 
                        className="h-16 border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setIsNewAppointmentOpen(true)}
                      />
                    ))}

                    {/* Appointments */}
                    {getAppointmentsForDate(currentDate).map((apt) => {
                      const { top, height } = getAppointmentStyle(apt.scheduled_start_time, apt.scheduled_end_time);
                      const techColor = apt.technician?.color || '#F97316';

                      return (
                        <div
                          key={apt.id}
                          className="absolute left-2 right-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: `${techColor}15`,
                            borderLeft: `4px solid ${techColor}`,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {apt.customer?.first_name} {apt.customer?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {apt.service?.name}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {apt.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {height > 80 && (
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(apt.scheduled_start_time)} - {formatTime(apt.scheduled_end_time)}
                              </p>
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {apt.address}
                              </p>
                              {apt.technician && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback 
                                      className="text-xs text-white"
                                      style={{ backgroundColor: apt.technician.color || '#F97316' }}
                                    >
                                      {apt.technician.first_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{apt.technician.first_name} {apt.technician.last_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'month' && (
                <div className="p-4">
                  {/* Month View Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {(() => {
                      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                      const startOffset = firstDay.getDay();
                      const days = [];

                      // Empty cells for days before the first day of the month
                      for (let i = 0; i < startOffset; i++) {
                        days.push(<div key={`empty-${i}`} className="p-2 min-h-[100px]" />);
                      }

                      // Days of the month
                      for (let day = 1; day <= lastDay.getDate(); day++) {
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const isToday = date.toDateString() === today.toDateString();
                        const dayAppointments = getAppointmentsForDate(date);

                        days.push(
                          <div
                            key={day}
                            className={cn(
                              'p-2 min-h-[100px] border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors',
                              isToday && 'bg-primary/5 border-primary/20'
                            )}
                            onClick={() => setIsNewAppointmentOpen(true)}
                          >
                            <p className={cn(
                              'text-sm font-medium mb-1',
                              isToday && 'text-primary'
                            )}>
                              {day}
                            </p>
                            <div className="space-y-1">
                              {dayAppointments.slice(0, 3).map((apt) => (
                                <div
                                  key={apt.id}
                                  className="text-xs p-1 rounded truncate"
                                  style={{
                                    backgroundColor: `${apt.technician?.color || '#F97316'}20`,
                                    borderLeft: `2px solid ${apt.technician?.color || '#F97316'}`,
                                  }}
                                >
                                  {apt.customer?.first_name}
                                </div>
                              ))}
                              {dayAppointments.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{dayAppointments.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return days;
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* New Appointment Modal */}
      <NewAppointmentModal 
        open={isNewAppointmentOpen} 
        onOpenChange={setIsNewAppointmentOpen}
        preselectedDate={currentDate}
      />
    </div>
  );
}
