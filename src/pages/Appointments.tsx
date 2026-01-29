import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  Phone,
  Globe,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Eye,
  Pencil,
  CalendarClock,
  Trash,
  Mail,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { cn, formatAppointmentDate, parseLocalDate, getLocalDateString } from '@/lib/utils';
import { useAppointments, useTodayAppointments, usePendingAppointments, useCancelAppointment } from '@/hooks/useAppointments';
import { useTechnicians } from '@/hooks/useTeam';
import { useServiceCategories } from '@/hooks/useServices';
import { useAppointmentsLatestEmailStatus } from '@/hooks/useLatestEmailStatus';
import { AppointmentWithRelations, AppointmentStatus } from '@/types/database';
import { NewAppointmentModal, AppointmentDetailModal } from '@/components/modals';
import { EmailStatusBadge } from '@/components/ui/email-status-badge';

type SortField = 'date' | 'customer' | 'status';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

const APPOINTMENTS_VIEW_KEY = 'appointments_view_mode';
function getStoredViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(APPOINTMENTS_VIEW_KEY);
    if (v === 'list' || v === 'grid') return v;
  } catch {}
  return 'list';
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending_confirmation', label: 'Pending' },
];

const sourceIcons = {
  ai_call: Phone,
  widget: Globe,
  manual: User,
  phone: Phone,
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatDate = (dateStr: string) => {
  return formatAppointmentDate(dateStr);
};

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

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'today' | 'week' | null>(null);
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);

  const setViewModeAndStore = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(APPOINTMENTS_VIEW_KEY, mode);
    } catch {}
  };

  // Sync URL params to filters (e.g. from dashboard stat card links)
  useEffect(() => {
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    if (date === 'today' || date === 'week') setDatePreset(date);
    if (status && statusOptions.some(o => o.value === status)) setStatusFilter(status);
  }, [searchParams]);

  const { data: allAppointments = [], isLoading } = useAppointments(
    statusFilter !== 'all' ? { status: statusFilter as AppointmentStatus } : undefined
  );
  const { data: todaysAppointments = [] } = useTodayAppointments();
  const { data: pendingAppointments = [] } = usePendingAppointments();
  const { data: technicians = [] } = useTechnicians();
  const { data: categories = [] } = useServiceCategories();
  const cancelMutation = useCancelAppointment();

  // Get appointment IDs for email status lookup
  const appointmentIds = allAppointments.map(a => a.id);
  const { data: emailStatusMap = {} } = useAppointmentsLatestEmailStatus(appointmentIds);

  const todaysCount = todaysAppointments.length;
  const pendingCount = pendingAppointments.length;

  // Filter appointments
  let filteredAppointments = allAppointments.filter(apt => {
    if (technicianFilter !== 'all' && apt.technician_id !== technicianFilter) return false;
    if (datePreset === 'today' && apt.scheduled_date !== getLocalDateString()) return false;
    if (datePreset === 'week') {
      const aptDate = parseLocalDate(apt.scheduled_date);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      if (aptDate < weekStart || aptDate >= weekEnd) return false;
    }
    if (searchQuery) {
      const customer = apt.customer;
      const searchLower = searchQuery.toLowerCase();
      const customerMatch = customer && (
        customer.first_name.toLowerCase().includes(searchLower) ||
        (customer.last_name?.toLowerCase().includes(searchLower)) ||
        customer.phone.includes(searchQuery) ||
        (customer.email?.toLowerCase().includes(searchLower))
      );
      const addressMatch = apt.address.toLowerCase().includes(searchLower);
      if (!customerMatch && !addressMatch) return false;
    }
    return true;
  });

  // Sort appointments
  filteredAppointments = [...filteredAppointments].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'date') {
      comparison = new Date(`${a.scheduled_date}T${a.scheduled_start_time}`).getTime() - 
                   new Date(`${b.scheduled_date}T${b.scheduled_start_time}`).getTime();
    } else if (sortField === 'customer') {
      const custA = a.customer;
      const custB = b.customer;
      comparison = `${custA?.last_name}`.localeCompare(`${custB?.last_name}`);
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Stats - calculate this week's appointments
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thisWeekCount = allAppointments.filter(a => {
    const aptDate = parseLocalDate(a.scheduled_date);
    return aptDate >= weekStart && aptDate < weekEnd;
  }).length;

  const stats = [
    { label: 'Total', value: allAppointments.length },
    { label: 'Today', value: todaysCount },
    { label: 'This Week', value: thisWeekCount },
    { label: 'Pending', value: pendingCount, highlight: pendingCount > 0 },
  ];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleViewDetails = (apt: AppointmentWithRelations) => {
    setSelectedAppointment(apt);
    setIsDetailModalOpen(true);
  };

  const handleCancelClick = (aptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAppointmentToCancel(aptId);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (appointmentToCancel) {
      cancelMutation.mutate({ id: appointmentToCancel });
    }
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage and track all service appointments</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={() => setIsNewAppointmentOpen(true)}>
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.label} 
            className={cn(
              'shadow-card',
              stat.highlight && 'ring-2 ring-warning/50'
            )}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{isLoading ? '-' : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, phone, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: tech.color || '#888' }}
                      />
                      {tech.first_name} {tech.last_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewModeAndStore('list')}
                className="gap-1.5"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewModeAndStore('grid')}
                className="gap-1.5"
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List or Grid */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {viewMode === 'grid' ? (
            <div className="p-4">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-lg" />
                  ))}
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No appointments found</p>
                  <Button className="mt-4" onClick={() => setIsNewAppointmentOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Appointment
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAppointments.map((apt) => {
                    const customer = apt.customer;
                    const technician = apt.technician;
                    const service = apt.service;
                    const category = categories.find(c => c.id === service?.category_id);
                    return (
                      <Card
                        key={apt.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border"
                        onClick={() => handleViewDetails(apt)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            {getStatusBadge(apt.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(apt); }}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(apt); }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(apt); }}>
                                  <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                                </DropdownMenuItem>
                                {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleCancelClick(apt.id, e); }}
                                  >
                                    <Trash className="mr-2 h-4 w-4" /> Cancel
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="font-medium">
                            {customer?.first_name} {customer?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(apt.scheduled_date)} · {formatTime(apt.scheduled_start_time)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" style={{ borderColor: category?.color, color: category?.color }}>
                              {service?.name || 'Service'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {apt.address}
                          </p>
                          {technician && (
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs text-white" style={{ backgroundColor: technician.color || '#888' }}>
                                  {technician.first_name?.[0]}{technician.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {technician.first_name} {technician.last_name}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date & Time <SortIcon field="date" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('customer')}
                >
                  <div className="flex items-center gap-1">
                    Customer <SortIcon field="customer" />
                  </div>
                </TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="hidden lg:table-cell">Technician</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-8 w-28" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No appointments found</p>
                    <Button className="mt-4" onClick={() => setIsNewAppointmentOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Appointment
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((apt) => {
                  const customer = apt.customer;
                  const technician = apt.technician;
                  const service = apt.service;
                  const category = categories.find(c => c.id === service?.category_id);
                  const SourceIcon = sourceIcons[apt.source] || User;

                  return (
                    <TableRow 
                      key={apt.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(apt)}
                    >
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatDate(apt.scheduled_date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(apt.scheduled_start_time)} - {formatTime(apt.scheduled_end_time)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {customer?.first_name} {customer?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {customer?.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            style={{ 
                              borderColor: category?.color,
                              color: category?.color,
                            }}
                          >
                            {service?.name || 'Service'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="truncate max-w-[200px] text-sm text-muted-foreground">
                          {apt.address}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {technician ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback 
                                className="text-xs text-white"
                                style={{ backgroundColor: technician.color || '#888' }}
                              >
                                {technician.first_name?.[0]}{technician.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {technician.first_name} {technician.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {emailStatusMap[apt.id] ? (
                          <EmailStatusBadge status={emailStatusMap[apt.id].status as any} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <SourceIcon className="h-4 w-4" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(apt); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(apt); }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(apt); }}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => handleCancelClick(apt.id, e)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive hover:bg-destructive/90">
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
