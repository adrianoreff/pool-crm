import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  Plus,
  Clock,
  MapPin,
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
import {
  mockAppointments,
  mockTeam,
  mockServiceCategories,
  getCustomerById,
  getTeamMemberById,
  getServiceById,
} from '@/data/mockData';

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

  const technicians = mockTeam.filter(t => t.role === 'technician');

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

  // Get week dates
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter appointments
  const filteredAppointments = mockAppointments.filter(apt => {
    if (selectedTechnician !== 'all' && apt.technicianId !== selectedTechnician) {
      return false;
    }
    return apt.status !== 'cancelled';
  });

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredAppointments.filter(apt => apt.date === dateStr);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover">
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
                          style={{ backgroundColor: tech.color }}
                        />
                        {tech.firstName} {tech.lastName}
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
                            />
                          ))}

                          {/* Appointments */}
                          {dayAppointments.map((apt) => {
                            const { top, height } = getAppointmentStyle(apt.startTime, apt.endTime);
                            const customer = getCustomerById(apt.customerId);
                            const technician = apt.technicianId ? getTeamMemberById(apt.technicianId) : null;
                            const service = getServiceById(apt.serviceId);

                            return (
                              <div
                                key={apt.id}
                                className="absolute left-1 right-1 rounded-md p-1.5 cursor-pointer transition-all hover:shadow-md overflow-hidden"
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  backgroundColor: `${technician?.color || '#F97316'}20`,
                                  borderLeft: `3px solid ${technician?.color || '#F97316'}`,
                                }}
                              >
                                <p className="text-xs font-medium truncate">
                                  {customer?.firstName} {customer?.lastName}
                                </p>
                                {height > 40 && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {service?.name}
                                  </p>
                                )}
                                {height > 56 && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatTime(apt.startTime)}
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
                  />
                ))}

                {/* Appointments */}
                {getAppointmentsForDate(currentDate).map((apt) => {
                  const { top, height } = getAppointmentStyle(apt.startTime, apt.endTime);
                  const customer = getCustomerById(apt.customerId);
                  const technician = apt.technicianId ? getTeamMemberById(apt.technicianId) : null;
                  const service = getServiceById(apt.serviceId);

                  return (
                    <div
                      key={apt.id}
                      className="absolute left-2 right-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: `${technician?.color || '#F97316'}15`,
                        borderLeft: `4px solid ${technician?.color || '#F97316'}`,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {customer?.firstName} {customer?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {service?.name}
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
                            {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {apt.address}
                          </p>
                          {technician && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback 
                                  className="text-xs text-white"
                                  style={{ backgroundColor: technician.color }}
                                >
                                  {technician.firstName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{technician.firstName} {technician.lastName}</span>
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
              <div className="grid grid-cols-7 gap-px bg-border">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-muted/30 p-2 text-center text-sm font-medium">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {(() => {
                  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                  const startPadding = firstDay.getDay();
                  const days: (Date | null)[] = [];

                  // Add padding for days before month starts
                  for (let i = 0; i < startPadding; i++) {
                    days.push(null);
                  }

                  // Add actual days
                  for (let i = 1; i <= lastDay.getDate(); i++) {
                    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
                  }

                  return days.map((date, idx) => {
                    const dayAppointments = date ? getAppointmentsForDate(date) : [];
                    const isToday = date && date.toDateString() === today.toDateString();

                    return (
                      <div 
                        key={idx}
                        className={cn(
                          'min-h-[100px] bg-background p-1',
                          !date && 'bg-muted/20'
                        )}
                      >
                        {date && (
                          <>
                            <p className={cn(
                              'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                              isToday && 'bg-primary text-primary-foreground'
                            )}>
                              {date.getDate()}
                            </p>
                            <div className="space-y-1">
                              {dayAppointments.slice(0, 3).map((apt) => {
                                const technician = apt.technicianId 
                                  ? getTeamMemberById(apt.technicianId)
                                  : null;
                                const customer = getCustomerById(apt.customerId);

                                return (
                                  <div
                                    key={apt.id}
                                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                                    style={{
                                      backgroundColor: `${technician?.color || '#F97316'}20`,
                                      borderLeft: `2px solid ${technician?.color || '#F97316'}`,
                                    }}
                                  >
                                    {formatTimeShort(apt.startTime)} {customer?.lastName}
                                  </div>
                                );
                              })}
                              {dayAppointments.length > 3 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  +{dayAppointments.length - 3} more
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technician Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {technicians.map((tech) => (
          <div key={tech.id} className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: tech.color }}
            />
            <span className="text-muted-foreground">
              {tech.firstName} {tech.lastName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
