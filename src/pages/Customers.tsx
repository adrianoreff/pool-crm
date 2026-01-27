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
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCustomers, useCustomerAppointments, useDeleteCustomer } from '@/hooks/useCustomers';
import { useCustomerEmailLogs } from '@/hooks/useEmailLogs';
import { CustomerWithAddresses } from '@/types/database';
import { AddCustomerModal, EditCustomerModal, SendEmailModal } from '@/components/modals';
import { EmailStatusBadge } from '@/components/ui/email-status-badge';

const formatCurrency = (amount: number | null) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const getInitials = (firstName: string, lastName: string | null) => {
  return `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
};

function CustomerDetailPanel({ customer, onClose, onEdit, onSendEmail }: { customer: CustomerWithAddresses; onClose: () => void; onEdit: () => void; onSendEmail: () => void }) {
  const { data: appointments = [], isLoading } = useCustomerAppointments(customer.id);
  const { data: emailLogs = [], isLoading: emailsLoading } = useCustomerEmailLogs(customer.id);
  const primaryAddress = customer.customer_addresses?.find(a => a.is_primary) || customer.customer_addresses?.[0];

  const handleCall = () => {
    window.open(`tel:${customer.phone}`);
  };

  const formatEmailDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'appointment_confirmation': 'Confirmation',
      'appointment_reminder': 'Reminder',
      'appointment_rescheduled': 'Rescheduled',
      'appointment_cancelled': 'Cancelled',
      'appointment_completed': 'Completed',
      'technician_en_route': 'Tech En Route',
      'custom_email': 'Manual Email',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  return (
    <>
      <SheetHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {getInitials(customer.first_name, customer.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">
                {customer.first_name} {customer.last_name}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                Customer since {formatDate(customer.created_at)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </SheetHeader>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-2">
            <Mail className="h-4 w-4" />
            Email History
            {emailLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {emailLogs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ScrollArea className="h-[calc(100vh-280px)] -mx-6 px-6">
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
                        <p className="text-2xl font-bold">{customer.total_appointments || 0}</p>
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
                        <p className="text-2xl font-bold">{formatCurrency(customer.total_spent)}</p>
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
                        <span>{customer.phone}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleCall}>Call</Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{customer.email || 'No email'}</span>
                      </div>
                      <Button variant="ghost" size="sm" disabled={!customer.email} onClick={onSendEmail}>Email</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Address - Direct from customer record */}
              {(customer.address || customer.city || customer.state || customer.zip_code) && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Primary Address</h3>
                  <Card className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          {customer.address && <p className="font-medium">{customer.address}</p>}
                          <p className="text-sm text-muted-foreground">
                            {[customer.city, customer.state, customer.zip_code].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Additional Addresses - From customer_addresses table */}
              {customer.customer_addresses && customer.customer_addresses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Service Addresses</h3>
                  <div className="space-y-2">
                    {customer.customer_addresses.map((address) => (
                      <Card key={address.id} className="shadow-card">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-medium">{address.address}</p>
                                <p className="text-sm text-muted-foreground">
                                  {address.city}, {address.state} {address.zip_code}
                                </p>
                              </div>
                            </div>
                            {address.is_primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Notes</h3>
                  <Card className="shadow-card">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{customer.notes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Appointment History */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Appointment History</h3>
                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="shadow-card">
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </CardContent>
                      </Card>
                    ))
                  ) : appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No appointments yet</p>
                  ) : (
                    appointments.slice(0, 5).map((apt) => (
                      <Card key={apt.id} className="shadow-card hover:shadow-elevated cursor-pointer transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{apt.service?.name || 'Service'}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(apt.scheduled_date)}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn(
                              apt.status === 'completed' && 'bg-success/10 text-success',
                              apt.status === 'cancelled' && 'bg-destructive/10 text-destructive',
                              apt.status === 'scheduled' && 'bg-info/10 text-info',
                            )}>
                              {apt.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          <ScrollArea className="h-[calc(100vh-280px)] -mx-6 px-6">
            <div className="space-y-3">
              {emailsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="shadow-card">
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32 mb-2" />
                      <Skeleton className="h-5 w-20" />
                    </CardContent>
                  </Card>
                ))
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No emails sent to this customer yet</p>
                </div>
              ) : (
                emailLogs.map((email) => (
                  <Card key={email.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{email.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {getEmailTypeLabel(email.email_type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatEmailDate(email.sent_at || email.created_at)}</span>
                          </div>
                        </div>
                        <EmailStatusBadge status={email.status as 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'} />
                      </div>
                      {email.error_message && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                          {email.error_message}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAddresses | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'appointments' | 'spent'>('name');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerWithAddresses | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<{ id: string; name: string; email: string } | null>(null);

  const { data: customers = [], isLoading } = useCustomers({
    search: searchQuery,
    sortBy,
  });
  const deleteCustomer = useDeleteCustomer();

  const handleEditCustomer = (customer: CustomerWithAddresses) => {
    setCustomerToEdit(customer);
    setIsEditCustomerOpen(true);
    setSelectedCustomer(null);
  };

  const handleDeleteClick = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToDelete(customerId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer.mutate(customerToDelete);
    }
    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
    setSelectedCustomer(null);
  };

  const handleSendEmail = (customer: CustomerWithAddresses, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!customer.email) return;
    setEmailRecipient({
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
      email: customer.email,
    });
    setIsEmailModalOpen(true);
  };

  const handleCall = (customer: CustomerWithAddresses, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${customer.phone}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">{customers.length} customers in your database</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={() => setIsAddCustomerOpen(true)}>
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-20" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No customers found</p>
                      <Button className="mt-4" onClick={() => setIsAddCustomerOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Customer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const primaryAddress = customer.customer_addresses?.find(a => a.is_primary) || customer.customer_addresses?.[0];

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
                              {getInitials(customer.first_name, customer.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Customer since {formatDate(customer.created_at)}
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
                            <span className="truncate max-w-[150px]">{customer.email || 'No email'}</span>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {(customer.address || customer.city) ? (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant="secondary">{customer.total_appointments || 0}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(customer.last_appointment_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="font-medium">{formatCurrency(customer.total_spent)}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleCall(customer, e)}>
                              <Phone className="mr-2 h-4 w-4" />
                              Call
                            </DropdownMenuItem>
                            {customer.email && (
                              <DropdownMenuItem onClick={(e) => handleSendEmail(customer, e)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => handleDeleteClick(customer.id, e)}
                            >
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
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedCustomer && (
            <CustomerDetailPanel 
              customer={selectedCustomer} 
              onClose={() => setSelectedCustomer(null)}
              onEdit={() => handleEditCustomer(selectedCustomer)}
              onSendEmail={() => handleSendEmail(selectedCustomer)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <AddCustomerModal 
        open={isAddCustomerOpen} 
        onOpenChange={setIsAddCustomerOpen} 
      />
      <EditCustomerModal
        open={isEditCustomerOpen}
        onOpenChange={setIsEditCustomerOpen}
        customer={customerToEdit}
      />

      {/* Email Modal */}
      {emailRecipient && (
        <SendEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setEmailRecipient(null);
          }}
          recipient={emailRecipient}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
