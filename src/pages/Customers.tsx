import { useState } from 'react';
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  X,
  Edit,
  Trash,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  mockCustomers,
  mockAppointments,
  getServiceById,
  Customer,
} from '@/data/mockData';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'appointments' | 'spent'>('name');

  // Filter and sort customers
  let filteredCustomers = mockCustomers.filter((customer) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(searchLower) ||
      customer.lastName.toLowerCase().includes(searchLower) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.addresses.some(a => 
        a.street.toLowerCase().includes(searchLower) ||
        a.city.toLowerCase().includes(searchLower) ||
        a.zip.includes(searchQuery)
      )
    );
  });

  // Sort
  filteredCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'appointments':
        return b.totalAppointments - a.totalAppointments;
      case 'spent':
        return b.totalSpent - a.totalSpent;
      default:
        return 0;
    }
  });

  // Get customer appointments
  const getCustomerAppointments = (customerId: string) => {
    return mockAppointments
      .filter(a => a.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">{mockCustomers.length} customers in your database</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex rounded-lg border p-1">
                {(['name', 'date', 'appointments', 'spent'] as const).map((option) => (
                  <Button
                    key={option}
                    variant={sortBy === option ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSortBy(option)}
                    className="capitalize text-xs"
                  >
                    {option === 'spent' ? 'Total Spent' : option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Appointments</TableHead>
                <TableHead className="hidden lg:table-cell">Last Service</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Total Spent</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No customers found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const primaryAddress = customer.addresses.find(a => a.isPrimary) || customer.addresses[0];

                  return (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getInitials(customer.firstName, customer.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Customer since {formatDate(customer.createdAt)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {customer.phone}
                          </p>
                          <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{customer.email}</span>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {primaryAddress && (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {primaryAddress.street}, {primaryAddress.city}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant="secondary">{customer.totalAppointments}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {customer.lastServiceDate ? formatDate(customer.lastServiceDate) : 'Never'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="font-medium">{formatCurrency(customer.totalSpent)}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Phone className="mr-2 h-4 w-4" />
                              Call
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              Book Appointment
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Detail Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedCustomer && (
            <>
              <SheetHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                        {getInitials(selectedCustomer.firstName, selectedCustomer.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        Customer since {formatDate(selectedCustomer.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-180px)] mt-6 -mx-6 px-6">
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{selectedCustomer.totalAppointments}</p>
                            <p className="text-xs text-muted-foreground">Appointments</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-success/10 p-2">
                            <DollarSign className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                            <p className="text-xs text-muted-foreground">Total Spent</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
                    <Card className="shadow-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.phone}</span>
                          </div>
                          <Button variant="ghost" size="sm">Call</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{selectedCustomer.email}</span>
                          </div>
                          <Button variant="ghost" size="sm">Email</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Addresses */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Addresses</h3>
                    <div className="space-y-2">
                      {selectedCustomer.addresses.map((address) => (
                        <Card key={address.id} className="shadow-card">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="font-medium">{address.street}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, {address.state} {address.zip}
                                  </p>
                                </div>
                              </div>
                              {address.isPrimary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedCustomer.notes && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Notes</h3>
                      <Card className="shadow-card">
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Appointment History */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Appointment History</h3>
                    <div className="space-y-2">
                      {getCustomerAppointments(selectedCustomer.id).slice(0, 5).map((apt) => {
                        const service = getServiceById(apt.serviceId);
                        
                        return (
                          <Card key={apt.id} className="shadow-card">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{service?.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(apt.date)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      apt.status === 'completed' && 'border-success/50 text-success',
                                      apt.status === 'cancelled' && 'border-destructive/50 text-destructive',
                                      apt.status === 'scheduled' && 'border-info/50 text-info',
                                    )}
                                  >
                                    {apt.status.replace('_', ' ')}
                                  </Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Button className="flex-1 bg-primary hover:bg-primary-hover">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
