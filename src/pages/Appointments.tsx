import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import {
  mockAppointments,
  mockTeam,
  mockServiceCategories,
  getCustomerById,
  getTeamMemberById,
  getServiceById,
  getTodaysAppointments,
  getPendingConfirmationCount,
} from '@/data/mockData';

type SortField = 'date' | 'customer' | 'status';
type SortDirection = 'asc' | 'desc';

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
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const technicians = mockTeam.filter(t => t.role === 'technician');
  const todaysCount = getTodaysAppointments().length;
  const pendingCount = getPendingConfirmationCount();

  // Filter appointments
  let filteredAppointments = mockAppointments.filter(apt => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (technicianFilter !== 'all' && apt.technicianId !== technicianFilter) return false;
    
    if (searchQuery) {
      const customer = getCustomerById(apt.customerId);
      const searchLower = searchQuery.toLowerCase();
      const customerMatch = customer && (
        customer.firstName.toLowerCase().includes(searchLower) ||
        customer.lastName.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchQuery) ||
        customer.email.toLowerCase().includes(searchLower)
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
      comparison = new Date(`${a.date}T${a.startTime}`).getTime() - 
                   new Date(`${b.date}T${b.startTime}`).getTime();
    } else if (sortField === 'customer') {
      const custA = getCustomerById(a.customerId);
      const custB = getCustomerById(b.customerId);
      comparison = `${custA?.lastName}`.localeCompare(`${custB?.lastName}`);
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Stats
  const stats = [
    { label: 'Total', value: mockAppointments.length },
    { label: 'Today', value: todaysCount },
    { label: 'This Week', value: mockAppointments.filter(a => {
      const aptDate = new Date(a.date);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return aptDate >= weekStart && aptDate < weekEnd;
    }).length },
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
        <Button className="gap-2 bg-primary hover:bg-primary-hover">
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
              <p className="text-2xl font-bold">{stat.value}</p>
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
                        style={{ backgroundColor: tech.color }}
                      />
                      {tech.firstName} {tech.lastName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
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
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No appointments found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((apt) => {
                  const customer = getCustomerById(apt.customerId);
                  const technician = apt.technicianId ? getTeamMemberById(apt.technicianId) : null;
                  const service = getServiceById(apt.serviceId);
                  const category = service 
                    ? mockServiceCategories.find(c => c.id === service.categoryId)
                    : null;
                  const SourceIcon = sourceIcons[apt.source];
                  const isExpanded = expandedRow === apt.id;

                  return (
                    <>
                      <TableRow 
                        key={apt.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(isExpanded ? null : apt.id)}
                      >
                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatDate(apt.date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {customer?.firstName} {customer?.lastName}
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
                              {service?.name}
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
                                  style={{ backgroundColor: technician.color }}
                                >
                                  {technician.firstName[0]}{technician.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {technician.firstName} {technician.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
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
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>Reschedule</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Create Invoice</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={8} className="p-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Address</h4>
                                <p className="text-sm text-muted-foreground flex items-start gap-2">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  {apt.address}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Customer Notes</h4>
                                <p className="text-sm text-muted-foreground">
                                  {apt.notes || 'No notes'}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Internal Notes</h4>
                                <p className="text-sm text-muted-foreground">
                                  {apt.internalNotes || 'No internal notes'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                              <Button size="sm" variant="outline">
                                <Phone className="h-4 w-4 mr-2" />
                                Call Customer
                              </Button>
                              <Button size="sm" variant="outline">
                                View Full Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
