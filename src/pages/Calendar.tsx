import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Plus,
  Clock,
  MapPin,
  Loader2,
  GripVertical,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useAppointments';
import { useRescheduleAppointment } from '@/hooks/useRescheduleAppointment';
import { useTechnicians } from '@/hooks/useTeam';
import { NewAppointmentModal, AppointmentDetailModal } from '@/components/modals';
import { AppointmentWithRelations } from '@/types/database';

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

// Calculate overlapping appointments and assign positions
interface OverlapInfo {
  index: number;
  total: number;
}

function calculateOverlaps(appointments: AppointmentWithRelations[]): Map<string, OverlapInfo> {
  const overlapMap = new Map<string, OverlapInfo>();
  
  if (appointments.length <= 1) {
    appointments.forEach(apt => overlapMap.set(apt.id, { index: 0, total: 1 }));
    return overlapMap;
  }

  // Sort by start time
  const sorted = [...appointments].sort((a, b) => 
    a.scheduled_start_time.localeCompare(b.scheduled_start_time)
  );

  // Find overlapping groups
  const groups: AppointmentWithRelations[][] = [];
  let currentGroup: AppointmentWithRelations[] = [];

  for (const apt of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(apt);
      continue;
    }

    // Check if this appointment overlaps with any in current group
    const overlaps = currentGroup.some(existing => {
      const existingStart = existing.scheduled_start_time;
      const existingEnd = existing.scheduled_end_time;
      const aptStart = apt.scheduled_start_time;
      const aptEnd = apt.scheduled_end_time;
      
      return aptStart < existingEnd && aptEnd > existingStart;
    });

    if (overlaps) {
      currentGroup.push(apt);
    } else {
      groups.push(currentGroup);
      currentGroup = [apt];
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Assign positions within each group
  for (const group of groups) {
    group.forEach((apt, idx) => {
      overlapMap.set(apt.id, { index: idx, total: group.length });
    });
  }

  return overlapMap;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Drag and drop state
  const [draggingAppointment, setDraggingAppointment] = useState<AppointmentWithRelations | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; time: string } | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<{ date: string; time: string } | null>(null);

  const rescheduleAppointment = useRescheduleAppointment();

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
  const getAppointmentsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredAppointments.filter(apt => apt.scheduled_date === dateStr);
  }, [filteredAppointments]);

  // Calculate appointment position and height
  const getAppointmentStyle = (startTime: string, endTime: string, overlapInfo?: OverlapInfo) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = (startHour - 7) * 60 + startMin;
    const endMinutes = (endHour - 7) * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    
    const top = (startMinutes / 60) * 64; // 64px per hour
    // Limit height to maximum 1 slot (64px) to prevent appointments from taking multiple slots
    const height = Math.min(Math.max((durationMinutes / 60) * 64, 40), 64);
    
    // Calculate width and left position for overlapping appointments
    const total = overlapInfo?.total || 1;
    const index = overlapInfo?.index || 0;
    const widthPercent = 100 / total;
    const leftPercent = index * widthPercent;
    
    return { top, height, widthPercent, leftPercent };
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

  const handleEventClick = (apt: AppointmentWithRelations, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draggingAppointment) {
      setSelectedAppointment(apt);
      setIsDetailModalOpen(true);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (apt: AppointmentWithRelations, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggingAppointment(apt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', apt.id);
    // Allow drop on any element
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    // Only clear if drop didn't happen (no dragOverSlot means no drop)
    // If dragOverSlot exists, the drop handler will handle it
    if (!dragOverSlot) {
      setDraggingAppointment(null);
      setDragOverSlot(null);
    }
  };

  const handleDragOver = (date: string, time: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ date, time });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Check if mouse is actually outside the element
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      // Use a small delay to avoid flickering when moving between time slots
      setTimeout(() => {
        setDragOverSlot(prev => {
          // Only clear if we're still not over any slot
          if (prev) {
            return null;
          }
          return prev;
        });
      }, 100);
    }
  };

  const handleDrop = (date: string, time: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingAppointment) {
      setRescheduleTarget({ date, time });
      setShowRescheduleDialog(true);
      // Don't clear draggingAppointment here - we need it for confirmReschedule
    }
    setDragOverSlot(null);
  };

  const confirmReschedule = () => {
    if (draggingAppointment && rescheduleTarget) {
      // Calculate new end time based on original duration
      const [startH, startM] = draggingAppointment.scheduled_start_time.split(':').map(Number);
      const [endH, endM] = draggingAppointment.scheduled_end_time.split(':').map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      
      // Ensure time is in HH:MM format (time slots are in HH:00 format)
      const [newStartH, newStartM = 0] = rescheduleTarget.time.split(':').map(Number);
      const newStartTime = `${String(newStartH).padStart(2, '0')}:${String(newStartM).padStart(2, '0')}`;
      
      const newEndMinutes = newStartH * 60 + newStartM + durationMinutes;
      const newEndH = Math.floor(newEndMinutes / 60);
      const newEndM = newEndMinutes % 60;
      const newEndTime = `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}`;

      console.log('Rescheduling appointment:', {
        appointmentId: draggingAppointment.id,
        oldDate: draggingAppointment.scheduled_date,
        oldTime: `${draggingAppointment.scheduled_start_time} - ${draggingAppointment.scheduled_end_time}`,
        newDate: rescheduleTarget.date,
        newTime: `${newStartTime} - ${newEndTime}`,
      });

      rescheduleAppointment.mutate(
        {
          appointment: draggingAppointment,
          newDate: rescheduleTarget.date,
          newStartTime: newStartTime,
          newEndTime: newEndTime,
        },
        {
          onSuccess: () => {
            // Only clear state after successful mutation
            setShowRescheduleDialog(false);
            setDraggingAppointment(null);
            setRescheduleTarget(null);
          },
          onError: () => {
            // Keep dialog open on error so user can try again
            // State will be cleared when dialog is closed manually
          },
        }
      );
    } else {
      // If no appointment or target, just close dialog
      setShowRescheduleDialog(false);
      setDraggingAppointment(null);
      setRescheduleTarget(null);
    }
  };

  const cancelReschedule = () => {
    setShowRescheduleDialog(false);
    setDraggingAppointment(null);
    setRescheduleTarget(null);
  };

  const isLoading = isLoadingAppointments || isLoadingTechnicians;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your appointments • Drag to reschedule</p>
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
                        const overlapMap = calculateOverlaps(dayAppointments);
                        const dateStr = date.toISOString().split('T')[0];

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
                              {timeSlots.map((time) => {
                                const isDragOver = dragOverSlot?.date === dateStr && dragOverSlot?.time === time;
                                return (
                                  <div 
                                    key={time} 
                                    className={cn(
                                      'h-16 border-b cursor-pointer transition-colors',
                                      isToday && 'bg-primary/5',
                                      isDragOver && 'bg-primary/20 ring-2 ring-primary ring-inset',
                                      !isDragOver && 'hover:bg-muted/30'
                                    )}
                                    onClick={(e) => {
                                      if (!draggingAppointment) {
                                        setIsNewAppointmentOpen(true);
                                      }
                                    }}
                                    onDragOver={(e) => handleDragOver(dateStr, time, e)}
                                    onDragLeave={(e) => handleDragLeave(e)}
                                    onDrop={(e) => handleDrop(dateStr, time, e)}
                                  />
                                );
                              })}

                              {/* Appointments */}
                              {dayAppointments.map((apt) => {
                                const overlapInfo = overlapMap.get(apt.id);
                                const { top, height, widthPercent, leftPercent } = getAppointmentStyle(
                                  apt.scheduled_start_time, 
                                  apt.scheduled_end_time,
                                  overlapInfo
                                );
                                const techColor = apt.technician?.color || '#F97316';
                                const isAppointmentDragging = draggingAppointment?.id === apt.id;

                                return (
                                  <div
                                    key={apt.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(apt, e)}
                                    onDragEnd={(e) => handleDragEnd(e)}
                                    className={cn(
                                      "absolute rounded-md p-1.5 transition-all overflow-hidden group select-none",
                                      isAppointmentDragging && "opacity-50 cursor-grabbing shadow-lg scale-105 z-50",
                                      !isAppointmentDragging && "cursor-grab hover:shadow-md hover:z-10"
                                    )}
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      left: `calc(${leftPercent}% + 2px)`,
                                      width: `calc(${widthPercent}% - 4px)`,
                                      backgroundColor: `${techColor}20`,
                                      borderLeft: `3px solid ${techColor}`,
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                      touchAction: 'none',
                                    }}
                                    onClick={(e) => {
                                      // Only handle click if not dragging
                                      if (!draggingAppointment) {
                                        handleEventClick(apt, e);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start gap-1">
                                      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
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
                                    </div>
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
                    {timeSlots.map((time) => {
                      const dateStr = currentDate.toISOString().split('T')[0];
                      const isDragOver = dragOverSlot?.date === dateStr && dragOverSlot?.time === time;
                      return (
                        <div 
                          key={time} 
                          className={cn(
                            'h-16 border-b cursor-pointer transition-colors',
                            isDragOver && 'bg-primary/20 ring-2 ring-primary ring-inset',
                            !isDragOver && 'hover:bg-muted/30'
                          )}
                          onClick={(e) => {
                            if (!draggingAppointment) {
                              setIsNewAppointmentOpen(true);
                            }
                          }}
                          onDragOver={(e) => handleDragOver(dateStr, time, e)}
                          onDragLeave={(e) => handleDragLeave(e)}
                          onDrop={(e) => handleDrop(dateStr, time, e)}
                        />
                      );
                    })}

                    {/* Appointments */}
                    {(() => {
                      const dayAppointments = getAppointmentsForDate(currentDate);
                      const overlapMap = calculateOverlaps(dayAppointments);
                      
                      return dayAppointments.map((apt) => {
                        const overlapInfo = overlapMap.get(apt.id);
                        const { top, height, widthPercent, leftPercent } = getAppointmentStyle(
                          apt.scheduled_start_time, 
                          apt.scheduled_end_time,
                          overlapInfo
                        );
                        const techColor = apt.technician?.color || '#F97316';
                        const isAppointmentDragging = draggingAppointment?.id === apt.id;

                        return (
                          <div
                            key={apt.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(apt, e)}
                            onDragEnd={(e) => handleDragEnd(e)}
                            className={cn(
                              "absolute rounded-lg p-3 transition-all group select-none",
                              isAppointmentDragging && "opacity-50 cursor-grabbing shadow-lg z-50",
                              !isAppointmentDragging && "cursor-grab hover:shadow-md hover:scale-[1.01]"
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              left: `calc(${leftPercent}% + 8px)`,
                              width: `calc(${widthPercent}% - 16px)`,
                              backgroundColor: `${techColor}15`,
                              borderLeft: `4px solid ${techColor}`,
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              touchAction: 'none',
                            }}
                            onClick={(e) => {
                              // Only handle click if not dragging
                              if (!draggingAppointment) {
                                handleEventClick(apt, e);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium">
                                    {apt.customer?.first_name} {apt.customer?.last_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {apt.service?.name}
                                  </p>
                                </div>
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
                      });
                    })()}
                  </div>
                </div>
              )}

              {view === 'month' && (
                <MonthView 
                  currentDate={currentDate} 
                  appointments={filteredAppointments}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <NewAppointmentModal 
        open={isNewAppointmentOpen} 
        onOpenChange={setIsNewAppointmentOpen} 
      />
      <AppointmentDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        appointment={selectedAppointment}
      />

      {/* Reschedule Confirmation Dialog */}
      <AlertDialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reschedule Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              {draggingAppointment && rescheduleTarget && (
                <>
                  Move <strong>{draggingAppointment.customer?.first_name} {draggingAppointment.customer?.last_name}</strong>'s appointment from{' '}
                  <strong>{draggingAppointment.scheduled_date}</strong> at{' '}
                  <strong>{formatTime(draggingAppointment.scheduled_start_time)}</strong> to{' '}
                  <strong>{rescheduleTarget.date}</strong> at{' '}
                  <strong>{formatTime(rescheduleTarget.time)}</strong>?
                  <br /><br />
                  The customer and admin will be notified of this change via email.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelReschedule}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReschedule}
              disabled={rescheduleAppointment.isPending}
            >
              {rescheduleAppointment.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm Reschedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Month View Component
function MonthView({ 
  currentDate, 
  appointments,
  onEventClick,
}: { 
  currentDate: Date; 
  appointments: AppointmentWithRelations[];
  onEventClick: (apt: AppointmentWithRelations, e: React.MouseEvent) => void;
}) {
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  let d = new Date(startDate);
  
  while (d <= lastDayOfMonth || currentWeek.length > 0) {
    currentWeek.push(new Date(d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
      if (d > lastDayOfMonth) break;
    }
    d.setDate(d.getDate() + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.scheduled_date === dateStr);
  };

  return (
    <div>
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map((date) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === today.toDateString();
            const dayAppointments = getAppointmentsForDate(date);

            return (
              <div 
                key={date.toISOString()} 
                className={cn(
                  'min-h-[100px] border-r last:border-r-0 p-1',
                  !isCurrentMonth && 'bg-muted/30',
                  isToday && 'bg-primary/5'
                )}
              >
                <p className={cn(
                  'text-sm font-medium text-center mb-1',
                  !isCurrentMonth && 'text-muted-foreground',
                  isToday && 'text-primary'
                )}>
                  {date.getDate()}
                </p>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: `${apt.technician?.color || '#F97316'}20`,
                        color: apt.technician?.color || '#F97316',
                      }}
                      onClick={(e) => onEventClick(apt, e)}
                    >
                      {apt.customer?.first_name}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{dayAppointments.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
